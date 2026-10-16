import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Truck } from 'lucide-react';
import { api, entity } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { useCart, toCartItem } from '../lib/cart.jsx';
import { money, today } from '../lib/format.js';
import { Checklist, ProductCard, Section, Spinner, Empty, Toast } from '../components/ui.jsx';
import { useToast } from '../components/useToast.js';

export default function RentalDetail() {
  const { id } = useParams();
  const cart = useCart();
  const [qty, setQty] = useState(1);
  const [toast, showToast] = useToast();
  const date = cart.eventDetails.event_date || '';
  const product = useAsync(() => entity('Product').get(id), [id]);
  const related = useAsync(() => entity('Product').list({}, 'name'), []);
  const availability = useAsync(() => (date ? api.get(`/availability?date=${date}`) : Promise.resolve(null)), [date]);
  const p = product.data;
  useMeta(p?.name, p?.description);

  if (product.loading) return <Section><Spinner /></Section>;
  if (!p) return <Section><Empty>That item could not be found. <Link to="/rentals" className="text-amber-400">Back to rentals</Link></Empty></Section>;

  const available = availability.data ? availability.data[p.id] ?? 0 : null;
  const tooMany = available != null && qty > available;
  const pairs = (related.data || []).filter((r) => r.id !== p.id && r.category !== p.category && r.featured).slice(0, 4);

  const add = () => {
    cart.add(toCartItem('product', p, { quantity: qty }));
    showToast(`${qty} × ${p.name} added`);
  };

  return (
    <>
      <Section>
        <Link to="/rentals" className="mb-8 inline-flex items-center gap-1 text-sm text-neutral-400 hover:text-amber-400"><ArrowLeft size={14} /> All rentals</Link>
        <div className="grid gap-10 lg:grid-cols-2">
          <img src={p.image_url} alt={p.name} className="aspect-[4/3] w-full rounded-3xl object-cover" />
          <div>
            <p className="eyebrow">{p.category}{p.subcategory ? ` · ${p.subcategory}` : ''}</p>
            <h1 className="mt-3 text-4xl font-semibold">{p.name}</h1>
            <p className="mt-4 text-neutral-300">{p.description}</p>
            <p className="mt-6 text-3xl font-semibold text-amber-400">{money(p.daily_price)} <span className="text-base font-normal text-neutral-500">/ day</span></p>
            {p.weekend_price && <p className="text-sm text-neutral-400">{money(p.weekend_price)} / day for Fri–Sun events</p>}

            <div className="card mt-8 space-y-5 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <label><span className="label">Event date</span>
                  <input type="date" min={today()} className="input" value={date} onChange={(e) => cart.setEventDetails({ event_date: e.target.value })} />
                </label>
                <div><span className="label">Quantity</span>
                  <div className="flex items-center gap-2">
                    <button className="btn-ghost h-10 w-10 p-0" onClick={() => setQty(Math.max(1, qty - 1))}><Minus size={14} /></button>
                    <input type="number" min="1" className="input text-center" value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))} />
                    <button className="btn-ghost h-10 w-10 p-0" onClick={() => setQty(qty + 1)}><Plus size={14} /></button>
                  </div>
                </div>
              </div>
              {available == null
                ? <p className="text-sm text-neutral-400">Select your event date to check availability.</p>
                : <p className={`text-sm ${tooMany ? 'text-red-400' : 'text-emerald-400'}`}>{available} available on your date{tooMany ? ' — reduce quantity to continue' : ''}</p>}
              <div className="flex items-center justify-between border-t border-white/10 pt-5">
                <div><p className="text-xs text-neutral-500">Estimated total</p><p className="text-xl font-semibold">{money(p.daily_price * qty)}</p></div>
                <button className="btn-primary" onClick={add} disabled={tooMany}>Add to Event</button>
              </div>
              {p.delivery_eligible && <p className="flex items-center gap-2 text-xs text-neutral-400"><Truck size={14} /> Delivery and setup available — chosen at checkout.</p>}
            </div>

            <div className="mt-8 grid gap-8 sm:grid-cols-2">
              {!!p.specifications?.length && <div><h3 className="mb-3 font-semibold">Specifications</h3><Checklist items={p.specifications} /></div>}
              {!!p.included?.length && <div><h3 className="mb-3 font-semibold">What’s included</h3><Checklist items={p.included} /></div>}
            </div>
          </div>
        </div>
      </Section>
      {!!pairs.length && (
        <Section eyebrow="Pairs well with" title="Complete the setup.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{pairs.map((r) => <ProductCard key={r.id} product={r} />)}</div>
        </Section>
      )}
      <Toast message={toast} />
    </>
  );
}
