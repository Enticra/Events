// Document-style storage on PostgreSQL. Every entity is a JSONB document in one
// `records` table, keyed by entity name. All functions are async.
import pg from 'pg';
import { randomUUID } from 'node:crypto';

if (!process.env.DATABASE_URL) {
  console.error('[db] DATABASE_URL is not set. Add it to server/.env, e.g.\n  DATABASE_URL=postgres://postgres:PASSWORD@localhost:5432/popcorn_events');
  process.exit(1);
}

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  // Hosted Postgres (Render, Neon, Supabase, RDS…) usually requires TLS.
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
});

export const ENTITIES = [
  'Product', 'Package', 'ServiceOffering', 'ServiceArea', 'BlogPost',
  'GalleryItem', 'Review', 'Performer', 'Booking', 'Quote', 'Message',
];

/** Create the database if the server has none by that name yet (Postgres error 3D000). */
async function ensureDatabase() {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    if (err.code !== '3D000') throw err;
    const url = new URL(process.env.DATABASE_URL);
    const name = decodeURIComponent(url.pathname.slice(1));
    url.pathname = '/postgres';
    const admin = new pg.Client({ connectionString: url.toString(), ssl: pool.options.ssl });
    await admin.connect();
    try {
      await admin.query(`CREATE DATABASE "${name.replace(/"/g, '""')}"`);
      console.log(`[db] Created database "${name}".`);
    } finally {
      await admin.end();
    }
  }
}

/** Create the database and schema if they don't exist. Safe to run on every boot. */
export async function init() {
  await ensureDatabase();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS records (
      id           uuid PRIMARY KEY,
      entity       text NOT NULL,
      data         jsonb NOT NULL DEFAULT '{}'::jsonb,
      created_date timestamptz NOT NULL DEFAULT now(),
      updated_date timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS records_entity_idx ON records (entity);
    CREATE INDEX IF NOT EXISTS records_data_idx ON records USING gin (data jsonb_path_ops);
  `);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLUMNS = ['id', 'created_date', 'updated_date'];

const toDoc = (row) => row && { ...row.data, id: row.id, created_date: row.created_date, updated_date: row.updated_date };

const clean = (data) => {
  const { id, created_date, updated_date, ...rest } = data || {};
  return rest;
};

/** Store operations bound to a pool or a transaction client. */
function makeStore(q) {
  const store = {
    /** List documents filtered by top-level field equality. sort: "field" or "-field". */
    async list(entity, { filter = {}, sort = '-created_date', limit } = {}) {
      const params = [entity, JSON.stringify(filter)];
      let sql = 'SELECT * FROM records WHERE entity = $1 AND data @> $2::jsonb';
      if (sort) {
        const desc = sort.startsWith('-');
        const key = desc ? sort.slice(1) : sort;
        if (COLUMNS.includes(key)) sql += ` ORDER BY ${key}`;
        else { params.push(key); sql += ` ORDER BY data -> $${params.length}`; }
        sql += desc ? ' DESC NULLS LAST' : ' ASC NULLS LAST';
      }
      if (limit) { params.push(Number(limit) || null); sql += ` LIMIT $${params.length}`; }
      const { rows } = await q.query(sql, params);
      return rows.map(toDoc);
    },

    /** Fetch by id. forUpdate locks the row until the surrounding transaction ends. */
    async get(entity, id, { forUpdate = false } = {}) {
      if (!UUID_RE.test(String(id))) return null;
      const { rows } = await q.query(
        `SELECT * FROM records WHERE entity = $1 AND id = $2${forUpdate ? ' FOR UPDATE' : ''}`, [entity, id]);
      return toDoc(rows[0]) || null;
    },

    async findOne(entity, filter) {
      return (await store.list(entity, { filter, sort: null, limit: 1 }))[0] || null;
    },

    async create(entity, data) {
      const { rows } = await q.query(
        'INSERT INTO records (id, entity, data) VALUES ($1, $2, $3::jsonb) RETURNING *',
        [randomUUID(), entity, JSON.stringify(clean(data))]);
      return toDoc(rows[0]);
    },

    /** Shallow-merge fields into a document (atomic, in SQL). */
    async update(entity, id, patch) {
      if (!UUID_RE.test(String(id))) return null;
      const { rows } = await q.query(
        `UPDATE records SET data = data || $3::jsonb, updated_date = now()
         WHERE entity = $1 AND id = $2 RETURNING *`,
        [entity, id, JSON.stringify(clean(patch))]);
      return toDoc(rows[0]) || null;
    },

    async remove(entity, id) {
      if (!UUID_RE.test(String(id))) return false;
      const { rowCount } = await q.query('DELETE FROM records WHERE entity = $1 AND id = $2', [entity, id]);
      return rowCount > 0;
    },

    async count(entity) {
      const { rows } = await q.query('SELECT COUNT(*)::int AS n FROM records WHERE entity = $1', [entity]);
      return rows[0].n;
    },

    /** Serialize work on a key (e.g. an event date) until the transaction ends. */
    async lock(key) {
      await q.query('SELECT pg_advisory_xact_lock(hashtext($1))', [String(key)]);
    },
  };
  return store;
}

const base = makeStore(pool);
export const { list, get, findOne, create, update, remove, count } = base;

/** Run fn(tx) inside a transaction; tx has the same API as this module. */
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(makeStore(client));
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
