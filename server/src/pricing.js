// Server-side source of truth for prices. Cart items from the client only carry
// { kind, ref_id, quantity, hours }; every price is re-derived here.
import * as db from './db.js';

export const FULFILLMENT = [
  { id: 'pickup', label: 'Customer Pickup', fee: 0 },
  { id: 'delivery', label: 'Delivery', fee: 150 },
  { id: 'delivery_setup', label: 'Delivery + Setup', fee: 350 },
  { id: 'full_production', label: 'Full Production', fee: 750 },
];
export const DEPOSIT_RATE = 0.25;
// Bookings in these states hold inventory for their date.
export const HOLDING_STATUSES = ['pending', 'confirmed', 'in_progress'];

// Errors meant for the customer (shown as-is with a 400).
const userError = (message) => Object.assign(new Error(message), { status: 400 });

const KIND_ENTITY = { product: 'Product', service: 'ServiceOffering', package: 'Package' };

const isWeekend = (date) => {
  if (!date) return false;
  const d = new Date(`${date}T12:00:00`);
  return [0, 5, 6].includes(d.getDay());
};

/** Load every bookable catalog item, keyed by id per entity. */
export async function loadCatalog(store = db) {
  const [products, services, packages] = await Promise.all(
    ['Product', 'ServiceOffering', 'Package'].map((e) => store.list(e, { sort: null })));
  const byId = (docs) => new Map(docs.map((d) => [d.id, d]));
  return { Product: byId(products), ServiceOffering: byId(services), Package: byId(packages) };
}

/** Price one cart line against the catalog. Throws on unknown/unbookable items. */
export function priceLine(item, eventDate, catalog) {
  const quantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
  let hours = Math.max(0, Number(item.hours) || 0);
  const entity = KIND_ENTITY[item.kind];
  if (!entity) throw userError(`Unknown item type "${item.kind}".`);
  const doc = catalog[entity].get(item.ref_id);

  if (item.kind === 'product') {
    if (!doc || !doc.active) throw userError('A rental item in your cart is no longer available.');
    const unit = isWeekend(eventDate) && doc.weekend_price ? doc.weekend_price : doc.daily_price;
    return { kind: 'product', ref_id: doc.id, name: doc.name, quantity, hours: null, unit_price: unit, line_total: unit * quantity };
  }

  if (!doc || !doc.active) throw userError('A service in your cart is no longer available.');
  const model = doc.pricing_model;
  const unit = Number(entity === 'Package' ? doc.starting_price : doc.price) || 0;
  if (model === 'quote' || doc.quote_only) throw userError(`${doc.name} is quote-only — request a quote instead.`);

  if (model === 'hourly') {
    hours = Math.max(hours || doc.min_hours || 1, doc.min_hours || 1);
    return { kind: item.kind, ref_id: doc.id, name: doc.name, quantity, hours, unit_price: unit, line_total: unit * hours * quantity };
  }
  return { kind: item.kind, ref_id: doc.id, name: doc.name, quantity, hours: null, unit_price: unit, line_total: unit * quantity };
}

/** Units of each product already reserved on a date: { productId: qty }. */
export async function reservedOn(date, store = db) {
  const reserved = {};
  if (!date) return reserved;
  for (const b of await store.list('Booking', { filter: { event_date: date }, sort: null })) {
    if (!HOLDING_STATUSES.includes(b.status || 'pending')) continue;
    for (const it of b.items || []) {
      if (it.kind === 'product') reserved[it.ref_id] = (reserved[it.ref_id] || 0) + (it.quantity || 1);
    }
  }
  return reserved;
}

export async function availabilityOn(date) {
  const [reserved, products] = await Promise.all([reservedOn(date), db.list('Product', { sort: null })]);
  return Object.fromEntries(products.map((p) => [p.id, Math.max(0, (p.quantity_owned || 0) - (reserved[p.id] || 0))]));
}

export async function priceCart(items, { eventDate, fulfillment = 'pickup', paymentOption = 'deposit', catalog } = {}) {
  if (!Array.isArray(items) || !items.length) throw userError('Your cart is empty.');
  catalog ||= await loadCatalog();
  const lines = items.map((it) => priceLine(it, eventDate, catalog));
  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  const fee = (FULFILLMENT.find((f) => f.id === fulfillment) || FULFILLMENT[0]).fee;
  const total = subtotal + fee;
  const amountDueNow = paymentOption === 'full' ? total : Math.round(total * DEPOSIT_RATE);
  return { lines, subtotal, delivery_fee: fee, total, amount_due_now: amountDueNow };
}

/** Recompute quote totals from its line items. */
export function totalsForQuote(q) {
  const lineItems = (q.line_items || []).map((li) => {
    const quantity = Number(li.quantity) || 1;
    const unit_price = Number(li.unit_price) || 0;
    const hours = li.hours ? Number(li.hours) : null;
    return { ...li, quantity, unit_price, hours, line_total: unit_price * quantity * (hours || 1) };
  });
  const subtotal = lineItems.reduce((s, l) => s + l.line_total, 0);
  const delivery_fee = Number(q.delivery_fee) || 0;
  const discount_total = Number(q.discount_total) || 0;
  const tax_rate = Number(q.tax_rate) || 0;
  const taxable = Math.max(0, subtotal - discount_total);
  const tax_amount = Math.round(taxable * tax_rate) / 100;
  const total = taxable + delivery_fee + tax_amount;
  const deposit_percentage = Number(q.deposit_percentage ?? 25);
  const deposit_amount = Math.round(total * deposit_percentage) / 100;
  const paid = Number(q.amount_paid) || 0;
  return {
    line_items: lineItems, subtotal, delivery_fee, discount_total, tax_rate, tax_amount, total,
    deposit_percentage, deposit_amount, balance_due: Math.max(0, total - paid),
  };
}
