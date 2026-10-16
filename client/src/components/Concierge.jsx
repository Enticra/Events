import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api, entity } from '../lib/api.js';
import { useCart, toCartItem } from '../lib/cart.jsx';
import { EVENT_TYPES, money } from '../lib/format.js';
import { ErrorNote, Field } from './ui.jsx';

export const SERVICE_OPTIONS = ['DJ', 'Audio', 'Lighting', 'Rentals', 'Dance Floor', 'Special Effects', 'Entertainment', 'Production'];

/** Turn concierge result lines into cart items (needs the catalog docs for display fields). */
export async function conciergeToCart(lines) {
  const [products, services] = await Promise.all([entity('Product').list(), entity('ServiceOffering').list()]);
  return lines.map((l) => {
    const doc = (l.kind === 'product' ? products : services).find((d) => d.id === l.ref_id);
    return toCartItem(l.kind, doc, { quantity: l.quantity, hours: l.hours });
  });
}

export function RecommendationList({ result }) {
  return (
    <div className="space-y-3">
      {result.items.map((i) => (
        <div key={i.ref_id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-neutral-950 p-4">
          <div>
            <p className="font-semibold">{i.name} <span className="text-neutral-500">× {i.quantity}{i.hours ? ` · ${i.hours} hrs` : ''}</span></p>
            <p className="text-xs text-neutral-400">{i.why}</p>
          </div>
          <span className="font-semibold text-amber-400">{money(i.line_total)}</span>
        </div>
      ))}
      {result.notes.map((n) => <p key={n} className="rounded-xl bg-amber-400/10 px-4 py-3 text-sm text-amber-100">{n}</p>)}
      <div className="flex justify-between border-t border-white/10 pt-4 text-lg font-semibold">
        <span>Estimated subtotal</span><span className="text-amber-400">{money(result.subtotal)}</span>
      </div>
    </div>
  );
}

/** Compact planner widget used on the home page. */
export default function Concierge() {
  const cart = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState({ event_type: 'Wedding', guest_count: 150, hours: 5, services: ['DJ', 'Rentals', 'Dance Floor'] });
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (s) => set('services', form.services.includes(s) ? form.services.filter((x) => x !== s) : [...form.services, s]);

  const plan = async () => {
    setBusy(true); setError('');
    try { setResult(await api.post('/concierge', form)); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const addAll = async () => {
    cart.addMany(await conciergeToCart(result.items));
    cart.setEventDetails({ event_type: form.event_type, guest_count: form.guest_count });
    navigate('/cart');
  };

  return (
    <div className="card grid gap-8 p-6 sm:p-10 lg:grid-cols-2">
      <div>
        <p className="eyebrow mb-3 flex items-center gap-2"><Sparkles size={14} /> POP Event Concierge</p>
        <h2 className="text-3xl font-semibold">Describe your event. Get a priced setup.</h2>
        <p className="mt-3 text-neutral-400">Pick an event type, guest count and what you need — POP sizes the sound, seating and dance floor for you.</p>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Field label="Event type">
            <select className="input" value={form.event_type} onChange={(e) => set('event_type', e.target.value)}>
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Guests"><input type="number" min="1" className="input" value={form.guest_count} onChange={(e) => set('guest_count', e.target.value)} /></Field>
          <Field label="Hours"><input type="number" min="1" className="input" value={form.hours} onChange={(e) => set('hours', e.target.value)} /></Field>
        </div>
        <p className="label mt-5">What do you need?</p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_OPTIONS.map((s) => <button key={s} onClick={() => toggle(s)} className={form.services.includes(s) ? 'chip-on' : 'chip-off'}>{s}</button>)}
        </div>
        <button className="btn-primary mt-6" onClick={plan} disabled={busy}>{busy ? 'Planning…' : 'Plan my event'}</button>
        <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
      </div>
      <div className="rounded-2xl border border-dashed border-white/10 p-5">
        {result ? (
          <>
            <RecommendationList result={result} />
            <button className="btn-primary mt-5 w-full" onClick={addAll} disabled={!result.items.length}>Add This Event to Cart</button>
            <p className="mt-3 text-xs text-neutral-500">Prices come from the live catalog. Availability is confirmed at checkout for your date.</p>
          </>
        ) : (
          <div className="grid h-full min-h-48 place-items-center text-center text-sm text-neutral-500">Your recommended setup will appear here.</div>
        )}
      </div>
    </div>
  );
}
