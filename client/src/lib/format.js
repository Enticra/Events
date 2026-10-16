export const money = (n) =>
  n == null || Number.isNaN(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: Number(n) % 1 ? 2 : 0 });

export const dateLabel = (d) =>
  d ? new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';

export const today = () => new Date().toISOString().slice(0, 10);

/** Human price label for a service or package. */
export function priceLabel(item) {
  const price = item.price ?? item.starting_price;
  const model = item.pricing_model;
  if (model === 'quote' || item.quote_only || price == null) return 'Custom quote';
  if (model === 'hourly') return `${money(price)} / ${item.unit_label || 'hour'}`;
  if (model === 'per_unit') return `${money(price)} ${item.price_note || `/ ${item.unit_label || 'unit'}`}`;
  return item.price_note && item.price_note !== 'total' ? `${money(price)} ${item.price_note}` : money(price);
}

export const EVENT_TYPES = ['Wedding', 'Indian Wedding', 'Reception', 'Birthday', 'Corporate', 'Private Party', 'Concert', 'Festival', 'Conference', 'Other'];
