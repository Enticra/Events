import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { api, entity } from '../../lib/api.js';
import { useAsync } from '../../lib/hooks.js';
import { EVENT_TYPES, money } from '../../lib/format.js';
import { ErrorNote, Field } from '../../components/ui.jsx';

const DEFAULT_TERMS = `1. A signed contract and deposit reserve the date. Deposits are non-refundable but may be moved to a new date within 12 months.
2. The remaining balance is due 7 days before the event.
3. The client is responsible for rented equipment from delivery until pickup.
4. Overtime is billed at the quoted hourly rate in 30-minute increments.
5. Special effects require venue approval; refusal by the venue on the day is not refundable.`;

const STAGES = ['lead', 'building', 'sent', 'signed', 'booked', 'lost'];

/** Create/edit a quote with free-form and catalog line items. */
export default function QuoteBuilder({ quote, onDone }) {
  const [q, setQ] = useState({
    customer_name: '', customer_email: '', customer_phone: '', event_type: 'Wedding', event_date: '', venue: '', city: '', guest_count: '',
    stage: 'building', deposit_percentage: 25, delivery_fee: 0, discount_total: 0, tax_rate: 0, internal_notes: '', contract_terms: DEFAULT_TERMS,
    line_items: [], ...quote,
  });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const catalog = useAsync(() => Promise.all([entity('Product').list({}, 'name'), entity('ServiceOffering').list({}, 'name')]), []);
  const set = (k, v) => setQ((s) => ({ ...s, [k]: v }));
  const setLine = (i, patch) => set('line_items', q.line_items.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const lineTotal = (l) => (Number(l.unit_price) || 0) * (Number(l.quantity) || 1) * (Number(l.hours) || 1);
  const subtotal = q.line_items.reduce((s, l) => s + lineTotal(l), 0);
  const total = subtotal - (Number(q.discount_total) || 0) + (Number(q.delivery_fee) || 0) + Math.max(0, subtotal - (Number(q.discount_total) || 0)) * (Number(q.tax_rate) || 0) / 100;

  const addFromCatalog = (value) => {
    if (!value) return;
    const [kind, id] = value.split(':');
    const [products, services] = catalog.data;
    const doc = (kind === 'product' ? products : services).find((d) => d.id === id);
    set('line_items', [...q.line_items, {
      name: doc.name, description: '', quantity: 1,
      hours: doc.pricing_model === 'hourly' ? doc.min_hours || 1 : null,
      unit_price: kind === 'product' ? doc.daily_price : doc.price || 0,
    }]);
  };

  const save = async () => {
    setError(''); setMsg('');
    try { const saved = await api.post('/admin/quotes', q); setQ(saved); setMsg('Quote saved.'); return saved; }
    catch (e) { setError(e.message); return null; }
  };
  const send = async () => {
    const saved = await save();
    if (!saved) return;
    try {
      const sent = await api.post(`/admin/quotes/${saved.id}/send`);
      setQ(sent);
      setMsg(`Ready to share: ${window.location.origin}/quote/${sent.id}`);
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="space-y-6">
      <button className="text-sm text-neutral-400 hover:text-amber-400" onClick={onDone}>← All quotes</button>
      <div className="card grid gap-4 p-6 sm:grid-cols-3">
        <h3 className="font-semibold sm:col-span-3">Customer & event {q.quote_number && <span className="text-neutral-500">· {q.quote_number}</span>}</h3>
        {[['customer_name', 'Name'], ['customer_email', 'Email'], ['customer_phone', 'Phone'], ['venue', 'Venue'], ['city', 'City'], ['guest_count', 'Guests']].map(([k, l]) => (
          <Field key={k} label={l}><input className="input" value={q[k] ?? ''} onChange={(e) => set(k, e.target.value)} /></Field>
        ))}
        <Field label="Event type"><select className="input" value={q.event_type} onChange={(e) => set('event_type', e.target.value)}>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
        <Field label="Event date"><input type="date" className="input" value={q.event_date || ''} onChange={(e) => set('event_date', e.target.value)} /></Field>
        <Field label="Stage"><select className="input" value={q.stage} onChange={(e) => set('stage', e.target.value)}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        {(q.services_requested?.length || q.notes || q.budget) && (
          <div className="rounded-xl bg-neutral-950 p-4 text-sm text-neutral-400 sm:col-span-3">
            <p><strong className="text-white">Requested:</strong> {(q.services_requested || []).join(', ') || '—'} · <strong className="text-white">Budget:</strong> {q.budget || '—'} · <strong className="text-white">Source:</strong> {q.source || '—'}</p>
            {q.notes && <p className="mt-1">{q.notes}</p>}
          </div>
        )}
      </div>

      <div className="card space-y-3 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold">Line items</h3>
          <div className="flex gap-2">
            <select className="input w-64" value="" onChange={(e) => addFromCatalog(e.target.value)}>
              <option value="">+ Add from catalog…</option>
              {catalog.data && <>
                <optgroup label="Services">{catalog.data[1].map((s) => <option key={s.id} value={`service:${s.id}`}>{s.name}</option>)}</optgroup>
                <optgroup label="Rentals">{catalog.data[0].map((p) => <option key={p.id} value={`product:${p.id}`}>{p.name}</option>)}</optgroup>
              </>}
            </select>
            <button className="btn-ghost py-2" onClick={() => set('line_items', [...q.line_items, { name: '', description: '', quantity: 1, hours: null, unit_price: 0 }])}>+ Add custom line item</button>
          </div>
        </div>
        {q.line_items.map((l, i) => (
          <div key={i} className="grid items-end gap-2 rounded-xl bg-neutral-950 p-3 sm:grid-cols-12">
            <input className="input sm:col-span-4" placeholder="Item" value={l.name} onChange={(e) => setLine(i, { name: e.target.value })} />
            <input className="input sm:col-span-3" placeholder="Description" value={l.description || ''} onChange={(e) => setLine(i, { description: e.target.value })} />
            <input type="number" className="input sm:col-span-1" title="Quantity" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
            <input type="number" className="input sm:col-span-1" title="Hours" placeholder="hrs" value={l.hours ?? ''} onChange={(e) => setLine(i, { hours: e.target.value || null })} />
            <input type="number" className="input sm:col-span-1" title="Unit price" value={l.unit_price} onChange={(e) => setLine(i, { unit_price: e.target.value })} />
            <span className="text-right text-sm font-semibold sm:col-span-1">{money(lineTotal(l))}</span>
            <button className="justify-self-end text-neutral-500 hover:text-red-400" onClick={() => set('line_items', q.line_items.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
          </div>
        ))}
        <div className="grid gap-3 border-t border-white/10 pt-4 sm:grid-cols-4">
          {[['delivery_fee', 'Delivery fee ($)'], ['discount_total', 'Discount ($)'], ['tax_rate', 'Tax rate (%)'], ['deposit_percentage', 'Deposit (%)']].map(([k, l]) => (
            <Field key={k} label={l}><input type="number" className="input" value={q[k] ?? 0} onChange={(e) => set(k, e.target.value)} /></Field>
          ))}
        </div>
        <div className="flex justify-end gap-8 text-sm"><span>Item subtotal <strong>{money(subtotal)}</strong></span><span className="text-amber-400">Total <strong>{money(total)}</strong></span></div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Contract terms"><textarea rows={7} className="input" value={q.contract_terms || ''} onChange={(e) => set('contract_terms', e.target.value)} /></Field>
        <Field label="Internal notes (never shown to customer)"><textarea rows={7} className="input" value={q.internal_notes || ''} onChange={(e) => set('internal_notes', e.target.value)} /></Field>
      </div>

      <ErrorNote>{error}</ErrorNote>
      {msg && <p className="break-all text-sm text-emerald-400">{msg}</p>}
      <div className="flex flex-wrap gap-3">
        <button className="btn-primary" onClick={save}>Save quote</button>
        <button className="btn-ghost" onClick={send}>Save & mark as sent</button>
        {q.id && ['sent', 'signed', 'paid'].includes(q.contract_status) && <a className="btn-ghost" href={`/quote/${q.id}`} target="_blank" rel="noreferrer">Open customer view</a>}
      </div>
    </div>
  );
}
