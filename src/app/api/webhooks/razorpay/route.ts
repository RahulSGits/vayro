import type { NextRequest } from 'next/server';
import { razorpayProvider } from '@/lib/payments/razorpay';
import type { PaymentEvent } from '@/lib/payments/types';
import { failure, jsonResponse, logRouteError, unavailable } from '../../_lib/http';
import { serviceDb, type Db } from '../../_lib/db';

/* ==========================================================================
   POST /api/webhooks/razorpay

   ── Three things this route must get exactly right ───────────────────────
   1. **Raw body.** The signature is an HMAC over the bytes Razorpay sent.
      `request.text()` is read first and handed to `verifyWebhook()`, which
      verifies before it parses; nothing calls `request.json()` here, ever.
   2. **Signature before trust.** No secret, no verification, no processing —
      an unverified webhook is an unauthenticated write endpoint for anyone
      who knows the URL.
   3. **Acknowledge once, retry never for our own bugs.** A verified event we
      cannot apply is logged and answered 200, because Razorpay's retry would
      replay the same failure. Only an unverifiable request gets a 4xx.

   ── Which column an order is found by ────────────────────────────────────
   `orders.payment_reference` (added in 0002_extend) is the provider-neutral
   key and is tried first. Rows written before that migration — and by the
   current `POST /api/orders`, which still writes whatever the client sent as
   `paymentIntentId` into `stripe_payment_intent` — are matched on the legacy
   column as a fallback. Both lookups use the Razorpay **order** id, which is
   what `/api/checkout/razorpay` returned and what the browser hands on.

   ── Ordering ─────────────────────────────────────────────────────────────
   `payment.captured` frequently arrives before `POST /api/orders` has written
   the row. Updating zero rows is the expected outcome in that race and is not
   an error. This handler is the backstop for the reverse case — a customer
   who closes the tab after paying.
   ========================================================================== */

/** Rate limiting is deliberately absent: the signature is the gate. */
export const dynamic = 'force-dynamic';

/** Statuses a successful payment or a cancellation may move an order out of. */
const PAID_FROM = ['pending', 'processing'] as const;
/** Statuses a refund may reverse. */
const REFUNDABLE_FROM = ['paid', 'processing', 'shipped', 'delivered'] as const;

async function updateBy(
  db: Db,
  column: string,
  reference: string,
  status: string,
  from: readonly string[],
): Promise<number> {
  const { data, error } = await db
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq(column, reference)
    .in('status', from)
    .select('id');

  if (error) {
    // A missing `payment_reference` column simply means 0002 has not been
    // applied yet; the legacy lookup below still finds the row.
    logRouteError('webhooks/razorpay', error.message, { column, reference, status });
    return 0;
  }
  return Array.isArray(data) ? data.length : 0;
}

/** Moves an order to a new status, keyed on the Razorpay order id. */
async function setStatus(
  db: Db,
  reference: string,
  status: string,
  from: readonly string[],
): Promise<number> {
  const updated = await updateBy(db, 'payment_reference', reference, status, from);
  if (updated > 0) return updated;
  return updateBy(db, 'stripe_payment_intent', reference, status, from);
}

function summarise(event: PaymentEvent) {
  return { type: event.type, id: event.id, reference: event.reference };
}

export async function POST(request: NextRequest) {
  const capabilities = razorpayProvider.capabilities();

  if (!capabilities || !capabilities.webhooks) {
    return unavailable(
      'Razorpay webhooks are not configured. Set RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET.',
      'razorpay_not_configured',
    );
  }

  // Raw bytes, exactly as sent. Parsing before verification would break the
  // HMAC and open the door this route exists to keep shut.
  const payload = await request.text();

  const verified = await razorpayProvider.verifyWebhook({ payload, headers: request.headers });

  if (!verified.ok) {
    // The reason is logged, never returned — it distinguishes a wrong secret
    // from a malformed body, which is not something a caller should learn.
    logRouteError('webhooks/razorpay', verified.message, { stage: 'verify', code: verified.code });
    return failure(verified.status, verified.code, verified.message);
  }

  const event = verified.event;

  const db = serviceDb();
  if (!db) {
    // Verified, but there is no database to apply it to. Acknowledged so
    // Razorpay does not retry against an environment that cannot ever succeed.
    console.info('[vayro:api:webhooks/razorpay] verified but not persisted (no service-role key)', {
      type: event.type,
      id: event.id,
    });
    return jsonResponse({ received: true, applied: false, reason: 'not-persisted' });
  }

  if (!event.reference) {
    // Nothing to key on — a subscription or account event we do not act on.
    return jsonResponse({ received: true, applied: false, ignored: event.type });
  }

  try {
    switch (event.kind) {
      case 'payment_succeeded': {
        const updated = await setStatus(db, event.reference, 'paid', PAID_FROM);
        return jsonResponse({ received: true, applied: updated > 0, updated });
      }

      case 'payment_failed': {
        // The order stays pending: a failed attempt is not a cancelled order,
        // and the customer may retry with another method on the same basket.
        console.info('[vayro:api:webhooks/razorpay] payment failed', summarise(event));
        return jsonResponse({ received: true, applied: false });
      }

      case 'payment_cancelled': {
        const updated = await setStatus(db, event.reference, 'cancelled', PAID_FROM);
        return jsonResponse({ received: true, applied: updated > 0, updated });
      }

      case 'refunded': {
        const updated = await setStatus(db, event.reference, 'refunded', REFUNDABLE_FROM);
        return jsonResponse({ received: true, applied: updated > 0, updated });
      }

      case 'partially_refunded': {
        // A partial refund leaves the order fulfilled; only a full one
        // reverses it. Recorded so support can see it happened.
        console.info('[vayro:api:webhooks/razorpay] partial refund', {
          ...summarise(event),
          amount: event.amount,
          amountRefunded: event.amountRefunded,
        });
        return jsonResponse({ received: true, applied: false, partial: true });
      }

      default:
        // Subscribed to more than we handle is normal; acknowledge and move on.
        return jsonResponse({ received: true, applied: false, ignored: event.type });
    }
  } catch (error) {
    logRouteError('webhooks/razorpay', error, summarise(event));
    // Verified but unapplied. A 500 would have Razorpay replay an event that
    // will fail identically; the failure is in our logs where it belongs.
    return jsonResponse({ received: true, applied: false, reason: 'handler-error' });
  }
}
