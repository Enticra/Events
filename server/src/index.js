import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as store from './db.js';
import { login, isAdmin, requireAdmin } from './auth.js';
import { FULFILLMENT, DEPOSIT_RATE, priceCart, availabilityOn, reservedOn, totalsForQuote, loadCatalog } from './pricing.js';
import { recommend } from './concierge.js';
import { bookingCheckout, quoteCheckout, verifySession, webhookHandler, paymentsEnabled } from './payments.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;

const app = express();
app.use(cors());
// Stripe signs the raw payload, so the webhook must be registered before the JSON parser.
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), webhookHandler);
app.use(express.json({ limit: '1mb' }));

// Where Stripe sends customers back to. PUBLIC_URL wins; otherwise the site that made the request.
const siteOrigin = (req) => (process.env.PUBLIC_URL || req.headers.origin || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

// Wrap handlers so thrown errors become JSON responses. Errors carrying a
// `status` are meant for the user; anything else is logged and hidden.
const h = (fn) => async (req, res) => {
  try {
    const out = await fn(req, res);
    if (!res.headersSent) res.json(out ?? { ok: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error(`[api] ${req.method} ${req.path}:`, err);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  }
};
const fail = (status, message) => Object.assign(new Error(message), { status });
const required = (obj, fields) => {
  const missing = fields.filter((f) => !String(obj?.[f] ?? '').trim());
  if (missing.length) throw fail(400, `Missing required field(s): ${missing.join(', ')}`);
};

// ---------- Auth ----------
app.post('/api/auth/login', h((req) => {
  const token = login(req.body?.password);
  if (!token) throw fail(401, 'Incorrect password.');
  return { token };
}));
app.get('/api/auth/me', h((req) => ({ admin: isAdmin(req) })));

// ---------- Generic entities ----------
// Catalog entities are publicly readable; customer/operational ones are admin-only.
const PUBLIC_READ = {
  Product: { active: true }, Package: { active: true }, ServiceOffering: { active: true },
  ServiceArea: { active: true }, BlogPost: { published: true }, GalleryItem: {}, Review: { published: true },
};

const parseValue = (v) => (v === 'true' ? true : v === 'false' ? false : v);
const checkEntity = (entity) => { if (!store.ENTITIES.includes(entity)) throw fail(404, 'Unknown entity.'); };

app.get('/api/entities/:entity', h((req) => {
  const { entity } = req.params;
  checkEntity(entity);
  const admin = isAdmin(req);
  if (!admin && !PUBLIC_READ[entity]) throw fail(401, 'Admin login required.');
  const { sort, limit, ...rest } = req.query;
  const filter = Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, parseValue(v)]));
  if (!admin) Object.assign(filter, PUBLIC_READ[entity]);
  return store.list(entity, { filter, sort, limit });
}));

app.get('/api/entities/:entity/:id', h(async (req) => {
  const { entity, id } = req.params;
  checkEntity(entity);
  const admin = isAdmin(req);
  if (!admin && !PUBLIC_READ[entity]) throw fail(401, 'Admin login required.');
  // Allow lookup by id or slug.
  const doc = (await store.get(entity, id)) || (await store.findOne(entity, { slug: id }));
  const visible = doc && (admin || Object.entries(PUBLIC_READ[entity]).every(([k, v]) => doc[k] === v));
  if (!visible) throw fail(404, 'Not found.');
  return doc;
}));

app.post('/api/entities/:entity', requireAdmin, h((req) => {
  checkEntity(req.params.entity);
  return store.create(req.params.entity, req.body);
}));
app.put('/api/entities/:entity/:id', requireAdmin, h(async (req) => {
  checkEntity(req.params.entity);
  const doc = await store.update(req.params.entity, req.params.id, req.body);
  if (!doc) throw fail(404, 'Not found.');
  return doc;
}));
app.delete('/api/entities/:entity/:id', requireAdmin, h(async (req) => {
  checkEntity(req.params.entity);
  if (!(await store.remove(req.params.entity, req.params.id))) throw fail(404, 'Not found.');
  return { ok: true };
}));

// ---------- Storefront ----------
app.get('/api/config', h(() => ({ fulfillment: FULFILLMENT, deposit_rate: DEPOSIT_RATE, payments_enabled: paymentsEnabled() })));

app.get('/api/availability', h((req) => availabilityOn(req.query.date)));

app.post('/api/cart/quote', h((req) => {
  const { items, event_date, fulfillment, payment_option } = req.body || {};
  return priceCart(items, { eventDate: event_date, fulfillment, paymentOption: payment_option });
}));

app.post('/api/concierge', h((req) => recommend(req.body)));

app.post('/api/checkout', h(async (req) => {
  const b = req.body || {};
  required(b, ['customer_name', 'customer_email', 'customer_phone', 'event_date', 'event_type', 'agreement_signature']);
  if (!b.agreed_terms) throw fail(400, 'Please accept the rental and entertainment agreements.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.event_date)) throw fail(400, 'Invalid event date.');
  if (b.event_date < new Date().toISOString().slice(0, 10)) throw fail(400, 'Event date must be in the future.');

  // One checkout per event date at a time, so two customers can't both take the last units.
  return store.transaction(async (tx) => {
    await tx.lock(`booking-date:${b.event_date}`);
    const catalog = await loadCatalog(tx);
    const priced = await priceCart(b.items, { eventDate: b.event_date, fulfillment: b.fulfillment, paymentOption: b.payment_option, catalog });

    const reserved = await reservedOn(b.event_date, tx);
    for (const line of priced.lines.filter((l) => l.kind === 'product')) {
      const p = catalog.Product.get(line.ref_id);
      const free = (p.quantity_owned || 0) - (reserved[p.id] || 0);
      if (line.quantity > free) {
        throw fail(409, `${p.name}: only ${Math.max(0, free)} available on ${b.event_date}. Please adjust your cart.`);
      }
    }
    const needsFx = priced.lines.some((l) => catalog.ServiceOffering.get(l.ref_id)?.requires_venue_approval);
    if (needsFx && !b.fx_venue_approved) throw fail(400, 'Please tell us whether your venue has approved special effects.');

    const pick = (keys) => Object.fromEntries(keys.map((k) => [k, b[k] ?? '']));
    return tx.create('Booking', {
      ...pick(['customer_name', 'customer_email', 'customer_phone', 'event_type', 'event_date', 'start_time', 'end_time',
        'venue_name', 'venue_address', 'city', 'venue_contact', 'setup_time', 'special_instructions',
        'agreement_signature', 'fx_venue_approved', 'fulfillment', 'payment_option']),
      customer_email: String(b.customer_email).trim().toLowerCase(),
      guest_count: Number(b.guest_count) || null,
      items: priced.lines,
      subtotal: priced.subtotal,
      delivery_fee: priced.delivery_fee,
      total: priced.total,
      amount_due_now: priced.amount_due_now,
      amount_paid: 0,
      balance_due: priced.total,
      status: 'pending',
      payment_status: 'unpaid',
      dj_details: {},
    });
  });
}));

// Bookings are addressed by unguessable UUID, which acts as the customer's access key.
const publicBooking = (bk) => {
  const { special_instructions, venue_contact, ...rest } = bk;
  return rest;
};
const getBooking = async (id) => {
  const bk = await store.get('Booking', id);
  if (!bk) throw fail(404, 'Booking not found.');
  return bk;
};
app.get('/api/bookings/:id', h(async (req) => publicBooking(await getBooking(req.params.id))));

// Start a Stripe Checkout Session for whatever is currently due (deposit/full, then balance).
app.post('/api/bookings/:id/checkout-session', h(async (req) => bookingCheckout(await getBooking(req.params.id), siteOrigin(req))));
// Customer returned from Stripe: confirm the session with Stripe and record the payment.
app.post('/api/bookings/:id/verify-payment', h(async (req) => {
  const bk = await getBooking(req.params.id);
  return verifySession(req.body?.session_id, { type: 'booking', id: bk.id });
}));

// ---------- DJ client portal ----------
app.post('/api/portal/lookup', h(async (req) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const date = String(req.body?.event_date || '');
  if (!email || !date) throw fail(400, 'Enter the email and event date used at booking.');
  const bookings = await store.list('Booking', { filter: { customer_email: email, event_date: date } });
  return bookings
    .filter((b) => b.status !== 'cancelled')
    .map((b) => ({ id: b.id, event_type: b.event_type, event_date: b.event_date, venue_name: b.venue_name, items: b.items, dj_details: b.dj_details || {} }));
}));
app.put('/api/portal/:id', h(async (req) => {
  const bk = await store.get('Booking', req.params.id);
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!bk || bk.customer_email !== email) throw fail(404, 'Booking not found.');
  await store.update('Booking', bk.id, { dj_details: req.body.dj_details || {}, dj_details_updated_at: new Date().toISOString() });
  return { ok: true };
}));

// ---------- Leads & messages ----------
app.post('/api/leads', h((req) => {
  const b = req.body || {};
  required(b, ['customer_name', 'customer_email']);
  return store.create('Quote', {
    customer_name: b.customer_name, customer_email: String(b.customer_email).trim().toLowerCase(),
    customer_phone: b.customer_phone || '', event_type: b.event_type || '', event_date: b.event_date || '',
    venue: b.venue || '', city: b.city || '', guest_count: Number(b.guest_count) || null,
    services_requested: b.services || [], budget: b.budget || '', notes: b.notes || '',
    source: b.source || 'request-quote',
    stage: 'lead', contract_status: 'draft', line_items: [], deposit_percentage: 25,
    ...totalsForQuote({ line_items: [] }),
  });
}));

app.post('/api/messages', h((req) => {
  const b = req.body || {};
  required(b, ['name', 'email', 'message']);
  return store.create('Message', {
    name: b.name, email: b.email, phone: b.phone || '', subject: b.subject || 'General inquiry',
    message: b.message, status: 'new',
  });
}));

// ---------- Customer quote / contract ----------
const publicQuote = (q) => {
  const { internal_notes, ...rest } = q;
  return rest;
};
const getQuote = async (id) => {
  const q = await store.get('Quote', id);
  if (!q) throw fail(404, 'Quote not found.');
  return q;
};
app.get('/api/quotes/:id', h(async (req) => {
  const q = await store.get('Quote', req.params.id);
  if (!q || !['sent', 'signed', 'paid'].includes(q.contract_status)) throw fail(404, 'Quote not found.');
  return publicQuote(q);
}));
app.post('/api/quotes/:id/sign', h(async (req) => {
  const q = await store.get('Quote', req.params.id);
  if (!q || q.contract_status !== 'sent') throw fail(400, 'This quote cannot be signed.');
  const name = String(req.body?.signature || '').trim();
  if (name.length < 3) throw fail(400, 'Type your full legal name to sign.');
  return publicQuote(await store.update('Quote', q.id, { contract_status: 'signed', stage: 'signed', signature: name, signed_at: new Date().toISOString() }));
}));
app.post('/api/quotes/:id/checkout-session', h(async (req) => quoteCheckout(await getQuote(req.params.id), siteOrigin(req))));
app.post('/api/quotes/:id/verify-payment', h(async (req) => {
  const q = await getQuote(req.params.id);
  return verifySession(req.body?.session_id, { type: 'quote', id: q.id });
}));

// ---------- Admin ----------
app.post('/api/admin/quotes', requireAdmin, h(async (req) => {
  const q = req.body || {};
  const data = { ...q, ...totalsForQuote(q) };
  if (q.id) {
    const updated = await store.update('Quote', q.id, data);
    if (!updated) throw fail(404, 'Quote not found.');
    return updated;
  }
  return store.create('Quote', { quote_number: `Q-${Date.now().toString().slice(-6)}`, stage: 'building', contract_status: 'draft', ...data });
}));
app.post('/api/admin/quotes/:id/send', requireAdmin, h(async (req) => {
  const q = await getQuote(req.params.id);
  if (!q.line_items?.length) throw fail(400, 'Add at least one line item before sending.');
  // Email delivery is not configured; the admin UI shows the link to share with the customer.
  return store.update('Quote', q.id, { contract_status: 'sent', stage: 'sent', contract_sent_at: new Date().toISOString() });
}));

app.get('/api/admin/stats', requireAdmin, h(async () => {
  const [allBookings, quotes, newMessages] = await Promise.all([
    store.list('Booking'), store.list('Quote'), store.list('Message', { filter: { status: 'new' } }),
  ]);
  const bookings = allBookings.filter((b) => b.status !== 'cancelled');
  const counts = {};
  for (const b of bookings) for (const it of b.items || []) counts[it.name] = (counts[it.name] || 0) + (it.quantity || 1);
  const today = new Date().toISOString().slice(0, 10);
  return {
    bookings: bookings.length,
    revenue_booked: bookings.reduce((s, b) => s + (b.total || 0), 0),
    collected: bookings.reduce((s, b) => s + (b.amount_paid || 0), 0),
    upcoming: bookings.filter((b) => b.event_date >= today).length,
    open_quotes: quotes.filter((q) => q.contract_status !== 'paid').length,
    new_messages: newMessages.length,
    top_items: Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, qty]) => ({ name, qty })),
  };
}));

app.get('/api/health', h(async () => {
  await store.count('Product');
  return { ok: true, database: 'connected' };
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found.' }));

// ---------- Serve the built frontend in production ----------
const dist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')));
}

try {
  await store.init();
} catch (err) {
  console.error('[db] Could not connect to PostgreSQL:', err.message);
  process.exit(1);
}
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
