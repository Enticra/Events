import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { api, entity } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { useCart } from '../lib/cart.jsx';
import { today } from '../lib/format.js';
import { PageHero, ProductCard, Section, Spinner, Empty } from '../components/ui.jsx';

export const RENTAL_CATEGORIES = ['Tables', 'Chairs', 'Audio', 'DJ Equipment', 'Lighting', 'Staging', 'Video', 'Dance Floors', 'Power & Cables'];

export default function Rentals() {
  useMeta('Event Rentals', 'Tables, chairs, staging, dance floors, audio, lighting and video rentals.');
  const cart = useCart();
  const [category, setCategory] = useState('All');
  const [q, setQ] = useState('');
  const date = cart.eventDetails.event_date || '';
  const products = useAsync(() => entity('Product').list({}, 'name'), []);
  const availability = useAsync(() => (date ? api.get(`/availability?date=${date}`) : Promise.resolve(null)), [date]);

  const filtered = useMemo(() => (products.data || []).filter((p) =>
    (category === 'All' || p.category === category) &&
    (!q || `${p.name} ${p.description} ${p.category}`.toLowerCase().includes(q.toLowerCase()))), [products.data, category, q]);

  return (
    <>
      <PageHero eyebrow="Rental storefront" title="Gear for every size of event." intro="Reserve by the day. Pick your event date to see live availability." />
      <Section>
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {['All', ...RENTAL_CATEGORIES].map((c) => <button key={c} onClick={() => setCategory(c)} className={category === c ? 'chip-on' : 'chip-off'}>{c}</button>)}
          </div>
          <div className="flex gap-3">
            <label className="relative">
              <Search size={16} className="absolute left-3 top-3 text-neutral-500" />
              <input className="input pl-9" placeholder="Search inventory" value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
            <input type="date" min={today()} className="input w-44" value={date} onChange={(e) => cart.setEventDetails({ event_date: e.target.value })} aria-label="Event date" />
          </div>
        </div>
        {products.loading ? <Spinner /> : filtered.length === 0 ? <Empty>No inventory matches that search yet.</Empty> : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((p) => <ProductCard key={p.id} product={p} available={availability.data ? availability.data[p.id] : null} />)}
          </div>
        )}
      </Section>
    </>
  );
}
