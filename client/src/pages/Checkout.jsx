import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { api, entity } from '../lib/api.js';
import { useCart } from '../lib/cart.jsx';
import { useAsync, useMeta } from '../lib/hooks.js';
import { EVENT_TYPES, money, today } from '../lib/format.js';
import { ErrorNote, Field, Section, Empty } from '../components/ui.jsx';

const TERMS = [
  ['Rental Agreement', 'Rented equipment remains our property. You are responsible for loss or damage beyond normal wear from delivery until pickup.'],
  ['Entertainment Agreement', 'Performers arrive for setup before the start time. Overtime is billed at the hourly rate in 30-minute increments.'],
  ['Cancellation', 'Deposits are non-refundable but transferable to a new date within 12 months. The balance is due 7 days before the event.'],
  ['Special Effects Acknowledgement', 'Cold sparks and low fog require venue approval. If a venue refuses on the day, the effect is not refundable.'],
];

export default function Checkout() {
  useMeta('Checkout', 'Complete your event booking.');
  const cart = useCart();
  const navigate = useNavigate();
  const config = useAsync(() => api.get('/config'), []);
  const services = useAsync(() => entity('ServiceOffering').list(), []);
  const ev = cart.eventDetails;
  const [f, setF] = useState({
    customer_name: '', customer_email: '', customer_phone: '', event_type: ev.event_type || 'Wedding',
    event_date: ev.event_date || '', start_time: '', end_time: '', venue_name: '', venue_address: '', city: '',
    guest_count: ev.guest_count || '', fulfillment: 'pickup', special_instructions: '', venue_contact: '', setup_time: '',
    agreement_signature: '', agreed_terms: false, fx_venue_approved: '', payment_option: 'deposit',
  });
  const [pricing, setPricing] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  // Ask the server for authoritative totals whenever the inputs that affect price change.
  const itemsKey = JSON.stringify(cart.items.map((i) => [i.ref_id, i.quantity, i.hours]));
  useEffect(() => {
    if (!cart.items.length) return;
    let cancelled = false;
    api.post('/cart/quote', { items: cart.items, event_date: f.event_date, fulfillment: f.fulfillment, payment_option: f.payment_option })
      .then((p) => { if (!cancelled) { setPricing(p); setError(''); } })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, [itemsKey, f.event_date, f.fulfillment, f.payment_option]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cart.items.length) return <Section><Empty>Your cart is empty. <Link to="/rentals" className="text-amber-400">Shop rentals</Link></Empty></Section>;

  const needsFx = cart.items.some((i) => services.data?.find((s) => s.id === i.ref_id)?.requires_venue_approval);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const booking = await api.post('/checkout', { ...f, items: cart.items });
      cart.clear();
      // Go straight to Stripe. If that fails, the confirmation page offers a retry.
      try {
        const { url } = await api.post(`/bookings/${booking.id}/checkout-session`);
        window.location.assign(url);
      } catch {
        navigate(`/booking-confirmed/${booking.id}`);
      }
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <Section eyebrow="Checkout" title="Lock in your date.">
      <form onSubmit={submit} className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
            <legend className="sr-only">Contact</legend>
            <h3 className="font-semibold sm:col-span-2">Your details</h3>
            <Field label="Full name"><input required className="input" value={f.customer_name} onChange={(e) => set('customer_name', e.target.value)} /></Field>
            <Field label="Email"><input required type="email" className="input" value={f.customer_email} onChange={(e) => set('customer_email', e.target.value)} /></Field>
            <Field label="Phone"><input required type="tel" className="input" value={f.customer_phone} onChange={(e) => set('customer_phone', e.target.value)} /></Field>
            <Field label="Guest count"><input type="number" min="1" className="input" value={f.guest_count} onChange={(e) => set('guest_count', e.target.value)} /></Field>
          </fieldset>

          <fieldset className="card grid gap-4 p-6 sm:grid-cols-2">
            <h3 className="font-semibold sm:col-span-2">Event</h3>
            <Field label="Event type"><select className="input" value={f.event_type} onChange={(e) => set('event_type', e.target.value)}>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></Field>
            <Field label="Event date"><input required type="date" min={today()} className="input" value={f.event_date} onChange={(e) => set('event_date', e.target.value)} /></Field>
            <Field label="Start time"><input type="time" className="input" value={f.start_time} onChange={(e) => set('start_time', e.target.value)} /></Field>
            <Field label="End time"><input type="time" className="input" value={f.end_time} onChange={(e) => set('end_time', e.target.value)} /></Field>
            <Field label="Venue name"><input className="input" value={f.venue_name} onChange={(e) => set('venue_name', e.target.value)} /></Field>
            <Field label="City"><input className="input" value={f.city} onChange={(e) => set('city', e.target.value)} /></Field>
            <Field label="Venue address" className="sm:col-span-2"><input className="input" value={f.venue_address} onChange={(e) => set('venue_address', e.target.value)} /></Field>
          </fieldset>

          <fieldset className="card space-y-4 p-6">
            <h3 className="font-semibold">Fulfillment</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {(config.data?.fulfillment || []).map((o) => (
                <label key={o.id} className={`cursor-pointer rounded-2xl border p-4 ${f.fulfillment === o.id ? 'border-amber-400 bg-amber-400/10' : 'border-white/10'}`}>
                  <input type="radio" className="sr-only" name="fulfillment" checked={f.fulfillment === o.id} onChange={() => set('fulfillment', o.id)} />
                  <p className="font-semibold">{o.label}</p>
                  <p className="text-sm text-neutral-400">{o.fee ? money(o.fee) : 'Free'}</p>
                </label>
              ))}
            </div>
            {f.fulfillment !== 'pickup' && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Venue contact (name & phone)"><input className="input" value={f.venue_contact} onChange={(e) => set('venue_contact', e.target.value)} /></Field>
                <Field label="Earliest setup time"><input type="time" className="input" value={f.setup_time} onChange={(e) => set('setup_time', e.target.value)} /></Field>
              </div>
            )}
            <Field label="Special instructions & loading notes"><textarea rows={3} className="input" value={f.special_instructions} onChange={(e) => set('special_instructions', e.target.value)} /></Field>
          </fieldset>

          <fieldset className="card space-y-4 p-6">
            <h3 className="font-semibold">Agreements</h3>
            <div className="max-h-56 space-y-3 overflow-y-auto rounded-2xl bg-neutral-950 p-4 text-sm text-neutral-400">
              {TERMS.map(([t, d]) => <p key={t}><strong className="text-white">{t}.</strong> {d}</p>)}
            </div>
            {needsFx && (
              <Field label="Venue approved special effects?">
                <select required className="input" value={f.fx_venue_approved} onChange={(e) => set('fx_venue_approved', e.target.value)}>
                  <option value="">Select…</option><option value="yes">Yes, approved</option><option value="pending">Waiting on venue</option><option value="help">Please help me get approval</option>
                </select>
              </Field>
            )}
            <label className="flex items-start gap-3 text-sm text-neutral-300">
              <input type="checkbox" required className="mt-1 accent-amber-400" checked={f.agreed_terms} onChange={(e) => set('agreed_terms', e.target.checked)} />
              I have read and agree to the agreements above.
            </label>
            <Field label="Type your full name to sign"><input required className="input" value={f.agreement_signature} onChange={(e) => set('agreement_signature', e.target.value)} /></Field>
          </fieldset>
        </div>

        <aside className="card h-fit space-y-4 p-6 lg:sticky lg:top-24">
          <h3 className="text-lg font-semibold">Order summary</h3>
          {(pricing?.lines || []).map((l) => (
            <div key={l.ref_id} className="flex justify-between gap-3 text-sm">
              <span className="text-neutral-300">{l.name} × {l.quantity}{l.hours ? ` · ${l.hours}h` : ''}</span><span>{money(l.line_total)}</span>
            </div>
          ))}
          <div className="space-y-2 border-t border-white/10 pt-4 text-sm">
            <Row label="Subtotal" value={pricing?.subtotal} />
            <Row label="Fulfillment" value={pricing?.delivery_fee} />
            <Row label="Total" value={pricing?.total} bold />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[['deposit', '25% deposit'], ['full', 'Pay in full']].map(([id, label]) => (
              <button type="button" key={id} onClick={() => set('payment_option', id)} className={f.payment_option === id ? 'chip-on py-2.5' : 'chip-off py-2.5'}>{label}</button>
            ))}
          </div>
          <Row label="Due today" value={pricing?.amount_due_now} bold accent />
          <ErrorNote>{error}</ErrorNote>
          <button className="btn-primary w-full" disabled={busy || !pricing}><Lock size={14} /> {busy ? 'Redirecting to payment…' : 'Reserve & pay securely'}</button>
          <p className="text-xs text-neutral-500">You’ll pay on Stripe’s secure checkout page. Card details are never stored by Popcorn Events.</p>
        </aside>
      </form>
    </Section>
  );
}

const Row = ({ label, value, bold, accent }) => (
  <div className={`flex justify-between ${bold ? 'font-semibold' : 'text-neutral-300'} ${accent ? 'text-lg text-amber-400' : ''}`}><span>{label}</span><span>{money(value)}</span></div>
);
