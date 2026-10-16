import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from './api.js';

/** Send the customer to Stripe Checkout for a booking or quote. */
export async function startPayment(kind, id) {
  const { url } = await api.post(`/${kind}/${id}/checkout-session`);
  window.location.assign(url);
}

/**
 * When the customer returns from Stripe (?session_id=…), confirm the session with
 * the server, then reload the record. Returns 'verifying' | 'paid' | 'pending' | 'error' | null.
 */
export function usePaymentReturn(kind, id, reload) {
  const [params, setParams] = useSearchParams();
  const sessionId = params.get('session_id');
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    setState('verifying');
    api.post(`/${kind}/${id}/verify-payment`, { session_id: sessionId })
      .then((r) => { if (!cancelled) setState(r.payment_status === 'paid' ? 'paid' : 'pending'); })
      .catch(() => { if (!cancelled) setState('error'); })
      .finally(() => {
        if (cancelled) return;
        reload();
        setParams({}, { replace: true }); // drop session_id so a refresh doesn't re-verify
      });
    return () => { cancelled = true; };
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return state;
}

export const PAYMENT_MESSAGES = {
  verifying: ['text-neutral-300', 'Confirming your payment with Stripe…'],
  paid: ['text-emerald-400', 'Payment received — thank you!'],
  pending: ['text-amber-300', 'Your payment is processing. This page will update once Stripe confirms it.'],
  error: ['text-red-300', 'We couldn’t confirm the payment yet. If you were charged, it will appear here shortly.'],
};
