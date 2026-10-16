// One-time import of the old SQLite database into PostgreSQL.
// Usage: npm run db:import-sqlite [-- path/to/events.db]
// Keeps ids and timestamps; rows that already exist in Postgres are skipped.
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, init } from '../src/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const file = process.argv[2] || path.join(__dirname, '..', 'data', 'events.db');

const sqlite = new DatabaseSync(file, { readOnly: true });
const rows = sqlite.prepare('SELECT * FROM records').all();
console.log(`Read ${rows.length} records from ${file}`);

await init();
const client = await pool.connect();
let inserted = 0;
try {
  await client.query('BEGIN');
  for (const r of rows) {
    const res = await client.query(
      `INSERT INTO records (id, entity, data, created_date, updated_date)
       VALUES ($1, $2, $3::jsonb, $4, $5) ON CONFLICT (id) DO NOTHING`,
      [r.id, r.entity, r.data, r.created_date, r.updated_date]);
    inserted += res.rowCount;
  }
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
  sqlite.close();
}

const { rows: counts } = await pool.query('SELECT entity, COUNT(*)::int AS n FROM records GROUP BY entity ORDER BY entity');
console.log(`Inserted ${inserted} new records (${rows.length - inserted} already present).`);
console.table(counts);
await pool.end();
