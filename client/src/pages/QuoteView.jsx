import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { useAsync, useMeta } from '../lib/hooks.js';
import { dateLabel, money } from '../lib/format.js';
import { PAYMENT_MESSAGES, startPayment, usePaymentReturn } from '../lib/payments.js';
import { ErrorNote, Section, Spinner, Empty } from '../components/ui.jsx';

export default function QuoteView() {
  useMeta('Your Quote');
  const { id } = useParams();
  const quote = useAsync(() => api.get(`/quotes/${id}`), [id]);
  const [signature, setSignature] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const paymentState = usePaymentReturn('quotes', id, quote.reload);
  const q = quote.data;

  if (quote.loading && !q) return <Section><Spinner label="Loading your quote…" /></Section>;
  if (!q) return <Section><Empty>Quote not found.</Empty></Section>;

  const act = async (path, body) => {
    setBusy(true); setError('');
    try { await api.post(`/quotes/${id}/${path}`, body); await quote.reload(); } catch (e) { setError(e.message); }
    setBusy(false);
  };
  const pay = async () => {
    setBusy(true); setError('');
    try { await startPayment('quotes', id); } catch (e) { setError(e.message); setBusy(false); }
  };

  return (
    <Section>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <p className="eyebrow">Quote {q.quote_number}</p>
          <h1 className="mt-2 text-4xl font-semibold">{q.event_type} · {dateLabel(q.event_date)}</h1>
          <p className="mt-2 text-neutral-400">Prepared for {q.customer_name}{q.venue ? ` · ${q.venue}` : ''}. Review the details, sign the contract and pay your deposit to lock in the date.</p>
        </div>

        <div className="card p-6">
          <h3 className="mb-4 font-semibold">Included in your event</h3>
          <div className="space-y-2">
            {q.line_items.map((l, i) => (
              <div key={i} className="flex justify-between gap-4 text-sm">
                <span className="text-neutral-300">{l.name} × {l.quantity}{l.hours ? ` · ${l.hours}h` : ''}{l.description ? <span className="block text-xs text-neutral-500">{l.description}</span> : null}</span>
                <span>{money(l.line_total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4 text-sm">
            {[['Subtotal', q.subtotal], ['Discount', -q.discount_total], ['Delivery', q.delivery_fee], [`Tax (${q.tax_rate}%)`, q.tax_amount]].filter(([, v]) => v).map(([l, v]) => (
              <div key={l} className="flex justify-between text-neutral-400"><span>{l}</span><span>{money(v)}</span></div>
            ))}
            <div className="flex justify-between text-lg font-semibold"><span>Total</span><span>{money(q.total)}</span></div>
            <div className="flex justify-between text-amber-400"><span>Deposit ({q.deposit_percentage}%)</span><span>{money(q.deposit_amount)}</span></div>
          </div>
        </div>

        {q.contract_terms && (
          <div className="card p-6">
            <h3 className="mb-3 font-semibold">Contract terms</h3>
            <p className="max-h-64 overflow-y-auto whitespace-pre-line text-sm text-neutral-400">{q.contract_terms}</p>
          </div>
        )}

        <ErrorNote>{error}</ErrorNote>
        {paymentState && <p className={`text-sm ${PAYMENT_MESSAGES[paymentState][0]}`}>{PAYMENT_MESSAGES[paymentState][1]}</p>}
        {q.contract_status === 'sent' && (
          <div className="card space-y-4 p-6">
            <p className="text-sm text-neutral-300">Type your full legal name below to electronically sign this contract.</p>
            <input className="input font-display text-xl" placeholder="Full legal name" value={signature} onChange={(e) => setSignature(e.target.value)} />
            <button className="btn-primary" disabled={busy} onClick={() => act('sign', { signature })}>Sign contract</button>
          </div>
        )}
        {q.contract_status === 'signed' && (
          <div className="card space-y-4 p-6">
            <p className="text-sm text-emerald-400">Signed by {q.signature}.</p>
            <p className="text-xs text-neutral-500">You’ll pay on Stripe’s secure checkout page.</p>
            <button className="btn-primary" disabled={busy || paymentState === 'verifying'} onClick={pay}>{busy ? 'Redirecting to Stripe…' : `Pay deposit ${money(q.deposit_amount)}`}</button>
          </div>
        )}
        {q.contract_status === 'paid' && (
          <div className="card flex items-center gap-3 p-6 text-emerald-400"><CheckCircle2 /> Signed and deposit paid — your date is locked in. Balance due: {money(q.balance_due)}</div>
        )}
      </div>
    </Section>
  );
}
