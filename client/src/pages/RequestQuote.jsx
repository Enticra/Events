import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useMeta } from '../lib/hooks.js';
import { EVENT_TYPES, today } from '../lib/format.js';
import { ErrorNote, Field, PageHero, Section } from '../components/ui.jsx';
import { SERVICE_OPTIONS } from '../components/Concierge.jsx';

export default function RequestQuote() {
  useMeta('Request a Quote', 'Tell us about your event and get a custom production quote.');
  const [f, setF] = useState({ customer_name: '', customer_email: '', customer_phone: '', event_type: 'Wedding', event_date: '', venue: '', city: '', guest_count: '', services: [], budget: '', notes: '' });
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggle = (s) => set('services', f.services.includes(s) ? f.services.filter((x) => x !== s) : [...f.services, s]);

  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await api.post('/leads', { ...f, source: 'request-quote' }); setDone(true); } catch (err) { setError(err.message); }
    setBusy(false);
  };

  return (
    <>
      <PageHero eyebrow="Request a quote" title="Tell us the shape of your event." intro="Skip the generic contact form — give us the basics and we’ll come back with the right setup and pricing." />
      <Section>
        {done ? (
          <div className="card mx-auto max-w-xl p-10 text-center">
            <CheckCircle2 className="mx-auto text-amber-400" size={44} />
            <h2 className="mt-4 text-3xl font-semibold">Request received.</h2>
            <p className="mt-2 text-neutral-400">We’ll be in touch within one business day.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="card mx-auto grid max-w-3xl gap-4 p-6 sm:grid-cols-2 sm:p-10">
            <Field label="Name"><input required className="input" value={f.customer_name} onChange={(e) => set('customer_name', e.target.value)} /></Field>
            <Field label="Email"><input required type="email" className="input" value={f.customer_email} onChange={(e) => set('customer_email', e.target.value)} /></Field>
            <Field label="Phone"><input className="input" value={f.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} /></Field>
            <Field label="Event type"><select className="input" value={f.event_type} onChange={(e) => set('event_type', e.target.value)}>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Event date"><input type="date" min={today()} className="input" value={f.event_date} onChange={(e) => set('event_date', e.target.value)} /></Field>
            <Field label="Guest count"><input type="number" className="input" value={f.guest_count} onChange={(e) => set('guest_count', e.target.value)} /></Field>
            <Field label="Venue"><input className="input" value={f.venue} onChange={(e) => set('venue', e.target.value)} /></Field>
            <Field label="City"><input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <div className="sm:col-span-2">
              <span className="label">Services needed</span>
              <div className="flex flex-wrap gap-2">{SERVICE_OPTIONS.map((s) => <button type="button" key={s} onClick={() => toggle(s)} className={f.services.includes(s) ? 'chip-on' : 'chip-off'}>{s}</button>)}</div>
            </div>
            <Field label="Budget range" className="sm:col-span-2"><input className="input" placeholder="e.g. $5,000 – $8,000" value={f.budget} onChange={(e) => set('budget', e.target.value)} /></Field>
            <Field label="Anything else?" className="sm:col-span-2"><textarea rows={4} className="input" value={f.notes} onChange={(e) => set('notes', e.target.value)} /></Field>
            <div className="sm:col-span-2"><ErrorNote>{error}</ErrorNote></div>
            <button className="btn-primary sm:col-span-2" disabled={busy}>{busy ? 'Sending…' : 'Request my quote'}</button>
          </form>
        )}
      </Section>
    </>
  );
}
