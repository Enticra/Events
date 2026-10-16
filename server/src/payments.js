// Stripe payments via hosted Checkout. Card data never touches this server.
// A payment is recorded when either the webhook fires or the customer returns
// and we verify the session with Stripe — whichever comes first. Recording is
// idempotent per Checkout Session, so both paths can safely run.
import Stripe from 'stripe';
import * as store from './db.js';

const SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const CURRENCY = 'usd';

export const stripe = SECRET_KEY ? new Stripe(SECRET_KEY) : null;

if (!stripe) console.warn('[payments] STRIPE_SECRET_KEY not set — online payments are disabled.');
else if (!WEBHOOK_SECRET) console.warn('[payments] STRIPE_WEBHOOK_SECRET not set — payments are only recorded when customers return from Stripe.');

const fail = (status, message) => Object.assign(new Error(message), { status });
const toCents = (dollars) => Math.round(Number(dollars) * 100);

function requireStripe() {
  if (!stripe) throw fail(503, 'Online payments are not configured yet. Please contact us to complete your booking.');
}

/** What the customer owes right now for a booking: deposit/full first, then the balance. */
function bookingAmountDue(b) {
  return b.amount_paid > 0 ? b.balance_due : b.amount_due_now;
}

async function createSession({ type, doc, amount, description, successPath, cancelPath, origin }) {
  requireStripe();
  if (!(amount > 0)) throw fail(400, 'Nothing is due on this booking.');
  const ref = doc.id.slice(0, 8).toUpperCase();
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: doc.customer_email || undefined,
    line_items: [{
      quantity: 1,
      price_data: {
        currency: CURRENCY,
        unit_amount: toCents(amount),
        product_data: { name: description, description: `${doc.event_type || 'Event'} on ${doc.event_date || 'TBD'} · Ref ${ref}` },
      },
    }],
    metadata: { type, id: doc.id },
    payment_intent_data: { metadata: { type, id: doc.id }, description: `${description} · Ref ${ref}` },
    success_url: `${origin}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}${cancelPath}`,
  });
  return { url: session.url };
}

export function bookingCheckout(booking, origin) {
  if (booking.status === 'cancelled') throw fail(400, 'This booking was cancelled.');
  if (booking.payment_status === 'paid') throw fail(400, 'This booking is already paid in full.');
  const amount = bookingAmountDue(booking);
  const label = booking.amount_paid > 0 ? 'Remaining balance'
    : booking.payment_option === 'full' ? 'Payment in full' : 'Booking deposit';
  return createSession({
    type: 'booking', doc: booking, amount, description: `Popcorn Events — ${label}`,
    successPath: `/booking-confirmed/${booking.id}`, cancelPath: `/booking-confirmed/${booking.id}`, origin,
  });
}

export function quoteCheckout(quote, origin) {
  if (quote.contract_status !== 'signed') throw fail(400, 'Sign the contract before paying.');
  return createSession({
    type: 'quote', doc: quote, amount: quote.deposit_amount, description: `Popcorn Events — Quote ${quote.quote_number} deposit`,
    successPath: `/quote/${quote.id}`, cancelPath: `/quote/${quote.id}`, origin,
  });
}

/**
 * Record a completed Checkout Session against its booking/quote. Runs in a
 * transaction with the row locked, so the webhook and the customer's return
 * can't both record the same session.
 */
async function recordPayment(session) {
  if (session.payment_status !== 'paid') return { recorded: false, reason: 'not_paid' };
  const { type, id } = session.metadata || {};
  const entity = type === 'booking' ? 'Booking' : type === 'quote' ? 'Quote' : null;
  if (!entity) return { recorded: false, reason: 'unknown_reference' };
  return store.transaction(async (tx) => applyPayment(tx, entity, id, session));
}

async function applyPayment(tx, entity, id, session) {
  const doc = await tx.get(entity, id, { forUpdate: true });
  if (!doc) return { recorded: false, reason: 'unknown_reference' };
  if ((doc.payments || []).some((p) => p.session_id === session.id)) return { recorded: false, reason: 'duplicate' };

  const amount = session.amount_total / 100;
  const payment = {
    session_id: session.id,
    payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
    amount, currency: session.currency, paid_at: new Date().toISOString(),
  };
  const amount_paid = Math.round(((doc.amount_paid || 0) + amount) * 100) / 100;
  const balance_due = Math.max(0, Math.round((doc.total - amount_paid) * 100) / 100);
  const payments = [...(doc.payments || []), payment];

  if (entity === 'Booking') {
    await tx.update('Booking', id, {
      payments, amount_paid, balance_due,
      payment_status: balance_due === 0 ? 'paid' : 'deposit_paid',
      status: doc.status === 'pending' ? 'confirmed' : doc.status,
      paid_at: payment.paid_at,
    });
  } else {
    await tx.update('Quote', id, { payments, amount_paid, balance_due, contract_status: 'paid', stage: 'booked', paid_at: payment.paid_at });
  }
  return { recorded: true };
}

/** Called when the customer lands back on our site with ?session_id=… */
export async function verifySession(sessionId, expected) {
  requireStripe();
  if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId || '')) throw fail(400, 'Invalid payment session.');
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  // The session must belong to the booking/quote the customer is viewing.
  if (session.metadata?.type !== expected.type || session.metadata?.id !== expected.id) throw fail(400, 'Payment session does not match.');
  return { ...(await recordPayment(session)), payment_status: session.payment_status };
}

/** Express handler for POST /api/stripe/webhook — must receive the raw body. */
export async function webhookHandler(req, res) {
  if (!stripe || !WEBHOOK_SECRET) return res.status(503).send('Webhooks not configured');
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
  }
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    try {
      const result = await recordPayment(event.data.object);
      console.log(`[payments] ${event.type} ${event.data.object.id}:`, result.recorded ? 'recorded' : result.reason);
    } catch (err) {
      // A 5xx makes Stripe retry the event later.
      console.error(`[payments] failed to record ${event.data.object.id}:`, err.message);
      return res.status(500).send('Could not record payment');
    }
  }
  res.json({ received: true });
}

export const paymentsEnabled = () => !!stripe;
