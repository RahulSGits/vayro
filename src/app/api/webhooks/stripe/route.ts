import type { NextRequest } from 'next/server';
import type { Stripe } from '@/lib/stripe';
import { getStripe, stripeWebhookSecret } from '@/lib/stripe';
import { failure, jsonResponse, logRouteError, unavailable } from '../../_lib/http';
import { serviceDb, type Db } from '../../_lib/db';

/* ==========================================================================
   POST /api/webhooks/stripe

   ── Three things this route must get exactly right ───────────────────────
   1. **Raw body.** The signature is computed over the bytes Stripe sent.
      `request.text()` is read first and parsed only by
      `constructEventAsync()`; nothing calls `request.json()` here, ever.
   2. **Signature before trust.** No secret, no verification, no processing —
      an unverified webhook is an unauthenticated write endpoint for anyone who
      knows the URL.
   3. **Acknowledge once, retry never for our own bugs.** A verified event we
      cannot apply is logged and answered 200, because Stripe's retry would
      replay the same failure. Only an unverifiable request gets a 4xx.

   ── Ordering ─────────────────────────────────────────────────────────────
   `payment_intent.succeeded` frequently arrives before `POST /api/orders` has
   written the row. Updating zero rows is the expected outcome in that race and
   is not an error: the orders route retrieves the intent from Stripe and
   records the paid status itself. This handler is the backstop for the reverse
   case — a customer who closes the tab after paying.
   ========================================================================== */

/** Rate limiting is deliberately absent: the signature is the gate. */
export const dynamic = 'force-dynamic';

const PAID_FROM = ['pending', 'processing'] as const;

function intentIdOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

/** Moves an order to a new status, keyed on the PaymentIntent that paid for it. */
async function setStatus(
  db: Db,
  paymentIntentId: string,
  status: string,
  from: readonly string[],
): Promise<number> {
  const { data, error } = await db
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('stripe_payment_intent', paymentIntentId)
    .in('status', from)
    .select('id');

  if (error) {
    logRouteError('webhooks/stripe', error.message, { paymentIntentId, status });
    return 0;
  }
  return Array.isArray(data) ? data.length : 0;
}

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = stripeWebhookSecret();

  if (!stripe || !secret) {
    return unavailable(
      'Stripe webhooks are not configured. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.',
      'stripe_not_configured',
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return failure(400, 'missing_signature', 'Missing Stripe signature header.');
  }

  // Raw bytes, exactly as sent. Parsing before verification would break the
  // signature and open the door this route exists to keep shut.
  const payload = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch (error) {
    // The reason is logged, never returned — it distinguishes a wrong secret
    // from a replayed timestamp, which is not something a caller should learn.
    logRouteError('webhooks/stripe', error, { stage: 'verify' });
    return failure(400, 'invalid_signature', 'The webhook signature could not be verified.');
  }

  const db = serviceDb();
  if (!db) {
    // Verified, but there is no database to apply it to. Acknowledged so
    // Stripe does not retry against an environment that cannot ever succeed.
    console.info('[vayro:api:webhooks/stripe] verified but not persisted (no service-role key)', {
      type: event.type,
      id: event.id,
    });
    return jsonResponse({ received: true, applied: false, reason: 'not-persisted' });
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const intent = event.data.object;
        const updated = await setStatus(db, intent.id, 'paid', PAID_FROM);
        return jsonResponse({ received: true, applied: updated > 0, updated });
      }

      case 'payment_intent.payment_failed': {
        const intent = event.data.object;
        // The order stays pending: a failed attempt is not a cancelled order,
        // and the customer may retry with another card on the same basket.
        console.info('[vayro:api:webhooks/stripe] payment failed', {
          intentId: intent.id,
          code: intent.last_payment_error?.code ?? null,
        });
        return jsonResponse({ received: true, applied: false });
      }

      case 'payment_intent.canceled': {
        const intent = event.data.object;
        const updated = await setStatus(db, intent.id, 'cancelled', PAID_FROM);
        return jsonResponse({ received: true, applied: updated > 0, updated });
      }

      case 'charge.refunded': {
        const charge = event.data.object;
        const intentId = intentIdOf(charge.payment_intent);
        if (!intentId) return jsonResponse({ received: true, applied: false });
        // A partial refund leaves the order fulfilled; only a full one reverses it.
        const status = charge.amount_refunded >= charge.amount ? 'refunded' : null;
        if (!status) return jsonResponse({ received: true, applied: false, partial: true });
        const updated = await setStatus(db, intentId, status, [
          'paid',
          'processing',
          'shipped',
          'delivered',
        ]);
        return jsonResponse({ received: true, applied: updated > 0, updated });
      }

      default:
        // Subscribed to more than we handle is normal; acknowledge and move on.
        return jsonResponse({ received: true, applied: false, ignored: event.type });
    }
  } catch (error) {
    logRouteError('webhooks/stripe', error, { type: event.type, id: event.id });
    // Verified but unapplied. A 500 would have Stripe replay an event that
    // will fail identically; the failure is in our logs where it belongs.
    return jsonResponse({ received: true, applied: false, reason: 'handler-error' });
  }
}
