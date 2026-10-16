import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, CreditCard } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { dateLabel, money } from '../lib/format.js';
import { PAYMENT_MESSAGES, startPayment, usePaymentReturn } from '../lib/payments.js';
import { ErrorNote, Section, Spinner, Empty } from '../components/ui.jsx';

const STATUS_LABEL = { unpaid: 'Awaiting payment', deposit_paid: 'Deposit paid', paid: 'Paid in full' };

export default function BookingConfirmed() {
  useMeta('Booking Confirmed');
  const { id } = useParams();
  const booking = useAsync(() => api.get(`/bookings/${id}`), [id]);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const paymentState = usePaymentReturn('bookings', id, booking.reload);
  const b = booking.data;

  if (booking.loading && !b) return <Section><Spinner /></Section>;
  if (!b) return <Section><Empty>Booking not found.</Empty></Section>;

  const pay = async () => {
    setPaying(true); setError('');
    try { await startPayment('bookings', id); } catch (e) { setError(e.message); setPaying(false); }
  };
  const due = b.amount_paid > 0 ? b.balance_due : b.amount_due_now;

  return (
    <Section>
      <div className="mx-auto max-w-2xl">
        <div className="text-center">
          <CheckCircle2 className="mx-auto text-amber-400" size={48} />
          <h1 className="mt-4 text-4xl font-semibold">{b.payment_status === 'unpaid' ? 'Your date is reserved.' : 'You’re booked!'}</h1>
          <p className="mt-3 text-neutral-400">{b.event_type} · {dateLabel(b.event_date)}{b.venue_name ? ` · ${b.venue_name}` : ''}</p>
          <p className="mt-1 text-xs text-neutral-500">Booking reference: {b.id.slice(0, 8).toUpperCase()} — save this page’s link to come back to it.</p>
        </div>

        {paymentState && <p className={`mt-6 text-center text-sm ${PAYMENT_MESSAGES[paymentState][0]}`}>{PAYMENT_MESSAGES[paymentState][1]}</p>}

        <div className="card mt-10 space-y-3 p-6">
          {b.items.map((l) => (
            <div key={l.ref_id} className="flex justify-between text-sm"><span className="text-neutral-300">{l.name} × {l.quantity}{l.hours ? ` · ${l.hours}h` : ''}</span><span>{money(l.line_total)}</span></div>
          ))}
          <div className="space-y-1.5 border-t border-white/10 pt-3 text-sm">
            <div className="flex justify-between text-neutral-400"><span>Fulfillment</span><span>{money(b.delivery_fee)}</span></div>
            <div className="flex justify-between font-semibold"><span>Total</span><span>{money(b.total)}</span></div>
            <div className="flex justify-between text-neutral-400"><span>Paid</span><span>{money(b.amount_paid)}</span></div>
            <div className="flex justify-between text-lg font-semibold text-amber-400"><span>Balance</span><span>{money(b.balance_due)}</span></div>
          </div>
          <p className="pt-2 text-sm"><span className="rounded-full bg-white/10 px-3 py-1 text-xs">{STATUS_LABEL[b.payment_status]}</span></p>
        </div>

        {b.payment_status !== 'paid' && (
          <div className="card mt-6 space-y-4 p-6">
            <h3 className="flex items-center gap-2 font-semibold"><CreditCard size={18} /> {b.amount_paid > 0 ? 'Pay remaining balance' : 'Pay to confirm'}</h3>
            <p className="text-sm text-neutral-400">You’ll be taken to Stripe’s secure checkout. Your date is held once the payment goes through.</p>
            <ErrorNote>{error}</ErrorNote>
            <button className="btn-primary w-full" onClick={pay} disabled={paying || paymentState === 'verifying'}>{paying ? 'Redirecting to Stripe…' : `Pay ${money(due)}`}</button>
          </div>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/dj-portal" className="btn-ghost">Send details to your DJ</Link>
          <Link to="/" className="btn-ghost">Back to home</Link>
        </div>
      </div>
    </Section>
  );
}
