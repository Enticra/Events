// "POP" event concierge: a rule-based planner that turns a few answers about an
// event into a priced cart. Deterministic, so it needs no external AI service.
import { loadCatalog, priceLine } from './pricing.js';

export async function recommend({ event_type = 'Wedding', guest_count, hours, services = [], indoor_outdoor, event_date } = {}) {
  const catalog = await loadCatalog();
  const bySlug = (entity, slug) => [...catalog[entity].values()].find((d) => d.slug === slug && d.active);
  const product = (slug) => bySlug('Product', slug);
  const service = (slug) => bySlug('ServiceOffering', slug);
  const guests = Math.max(1, Number(guest_count) || 100);
  const eventHours = Math.max(1, Number(hours) || 5);
  const want = (s) => services.length === 0 || services.includes(s);
  const isIndian = /indian|sangeet|baraat/i.test(event_type);
  const items = [];
  const notes = [];
  const add = (doc, kind, quantity, itemHours, why) => {
    if (!doc || quantity <= 0) return;
    try {
      items.push({ ...priceLine({ kind, ref_id: doc.id, quantity, hours: itemHours }, event_date, catalog), why, image_url: doc.image_url });
    } catch { /* skip unbookable items */ }
  };

  if (want('DJ')) {
    add(service('standard-dj-service'), 'service', 1, eventHours, `DJ with sound & lighting for ${eventHours} hours`);
    // The DJ package covers ~150 guests; add speakers and subs beyond that.
    const extraTops = Math.max(0, Math.ceil(guests / 75) - 2);
    const extraSubs = Math.max(0, Math.ceil(guests / 100) - 2);
    add(product('12in-powered-speaker'), 'product', extraTops, null, `Extra coverage for ${guests} guests`);
    add(product('18in-subwoofer'), 'product', extraSubs, null, 'Extra low end for a larger room');
  } else if (want('Audio')) {
    add(product('12in-powered-speaker'), 'product', Math.max(2, Math.ceil(guests / 75)), null, '1 speaker per ~75 guests');
    add(product('wireless-mic'), 'product', 2, null, 'Toasts and announcements');
  }

  if (want('Rentals')) {
    add(product('white-folding-chair'), 'product', guests, null, 'One seat per guest');
    add(product('60-round-table'), 'product', Math.ceil(guests / 8), null, '8 guests per 60" round');
    add(product('cocktail-table'), 'product', Math.max(2, Math.ceil(guests / 40)), null, 'Cocktail hour highboys');
  }

  if (want('Dance Floor')) {
    const sqft = (guests / 3) * 4.5;
    const side = Math.max(12, Math.ceil(Math.sqrt(sqft) / 3) * 3);
    add(product('dance-floor-panel'), 'product', (side / 3) ** 2, null, `${side}x${side} floor for ~${Math.round(guests / 3)} dancers`);
  }

  if (want('Lighting')) {
    add(service('additional-uplight'), 'service', Math.min(24, Math.ceil(guests / 25)), null, 'Room-wide uplighting');
    if (guests >= 150) add(product('moving-head'), 'product', 2, null, 'Dance floor movement');
  }

  if (services.includes('Special Effects')) {
    add(service('cold-sparks'), 'service', 1, null, 'Grand entrance / first dance');
    if (/wedding/i.test(event_type)) add(service('dancing-on-the-cloud'), 'service', 1, null, 'First-dance low fog');
  }

  if (isIndian || services.includes('Entertainment')) {
    add(service('dhol-player'), 'service', 1, 1, 'Live dhol for entrances');
    if (isIndian) add(service('mobile-baraat'), 'service', 1, 1, 'Leads the Baraat procession');
  }

  if (/wedding/i.test(event_type) && want('Audio')) {
    add(service('ceremony-audio'), 'service', 1, null, 'Separate ceremony sound');
  }

  if (guests >= 500 || services.includes('Production') || /concert|festival|conference/i.test(event_type)) {
    notes.push('At this scale we recommend Full Event Production — request a quote and our team will design a custom setup.');
  }
  if (indoor_outdoor === 'outdoor') {
    add(product('power-distro'), 'product', 1, null, 'Outdoor power distribution');
    notes.push('Outdoor venue: confirm power access or add a generator in your quote request.');
  }

  const subtotal = items.reduce((s, i) => s + i.line_total, 0);
  return { items, subtotal, notes };
}
