import type { NextRequest } from 'next/server';
import { orderSchema, parseInput } from '@/lib/validation';
import { guard } from '@/lib/rate-limit';
import { describeStripeError, getStripe, isStripeConfigured } from '@/lib/stripe';
import { sendOrderConfirmation } from '@/lib/email';
import {
  badRequest,
  conflict,
  failure,
  jsonResponse,
  logRouteError,
  rateLimited,
  readJsonBody,
} from '../_lib/http';
import { priceBasket } from '../_lib/pricing';
import { confirmationEmailInput, placeOrder } from '../_lib/orders';

/* ==========================================================================
   POST /api/orders  ->  { order, recorded, demo, delivery }

   Called by `submitOrder()` in `src/components/checkout/order.ts`, which reads
   `order.orderNumber` and treats anything else as a failure.

   ── What the client is not allowed to decide ─────────────────────────────
   * The totals — every line is re-priced from the catalogue.
   * Whether the order is a demo — that is `isStripeConfigured()`, full stop.
     The body carries `demo`, and it is ignored.
   * Whether it was paid — the PaymentIntent is retrieved from Stripe and its
     amount, currency and status are checked against the recomputed basket.
     A `paymentIntentId` on its own proves nothing.
   ========================================================================== */

export async function POST(request: NextRequest) {
  const { result, headers } = await guard('orders', request);
  if (!result.ok) return rateLimited(result);

  const body = await readJsonBody(request, headers);
  if (!body.ok) return body.response;

  const parsed = parseInput(orderSchema, body.value);
  if (!parsed.ok) return badRequest(parsed.message, parsed.fields, headers);

  const input = parsed.data;

  const priced = await priceBasket({
    items: input.items,
    shippingMethod: input.shippingMethod,
    countryCode: input.shippingAddress.country,
    discountCode: input.discountCode,
    declaredTotal: input.total,
  });

  if (!priced.ok) {
    const recoverable = priced.code === 'out_of_stock' || priced.code === 'unknown_item';
    return recoverable
      ? conflict(priced.code, priced.message, headers)
      : failure(400, priced.code, priced.message, { headers });
  }

  const basket = priced.basket;

  if (basket.currency !== input.currency) {
    return conflict(
      'currency_mismatch',
      'The basket is priced in a different currency to the one requested. Refresh and try again.',
      headers,
    );
  }

  /* ------------------------------------------------------------- payment -- */

  const stripe = getStripe();
  const live = isStripeConfigured() && stripe !== null;
  let paymentIntentId: string | null = null;

  if (live) {
    if (!input.paymentIntentId) {
      return failure(
        402,
        'payment_required',
        'This order has no payment attached. Complete the payment step and try again.',
        { headers },
      );
    }

    try {
      const intent = await stripe.paymentIntents.retrieve(input.paymentIntentId);

      if (intent.amount !== basket.total || intent.currency !== basket.currency.toLowerCase()) {
        logRouteError('orders', 'payment intent does not match the recomputed basket', {
          intentId: intent.id,
          intentAmount: intent.amount,
          basketTotal: basket.total,
        });
        return conflict(
          'amount_mismatch',
          'The payment does not match the basket. Refresh the bag and start the payment again.',
          headers,
        );
      }

      // `processing` is a legitimate terminal state for delayed methods; the
      // webhook flips it to paid. Anything else has not been settled.
      if (intent.status !== 'succeeded' && intent.status !== 'processing') {
        return failure(
          402,
          'payment_incomplete',
          'The payment has not completed. Complete the payment step and try again.',
          { headers },
        );
      }

      paymentIntentId = intent.id;
    } catch (error) {
      const described = describeStripeError(error);
      logRouteError('orders', error, { code: described.code });
      return failure(described.status, described.code, described.message, { headers });
    }
  }

  /* ------------------------------------------------------------- persist -- */

  const placed = await placeOrder({
    email: input.email,
    phone: input.phone,
    basket,
    shippingAddress: input.shippingAddress,
    billingAddress: input.billingAddress,
    paymentIntentId,
    demo: !live,
    notes: input.notes,
  });

  // The receipt must never be able to undo the order. `sendOrderConfirmation`
  // is contractually non-throwing; the result is reported, not enforced.
  const receipt = await sendOrderConfirmation(
    confirmationEmailInput(placed, input.email, basket),
  );

  return jsonResponse(
    {
      order: placed.order,
      orderNumber: placed.order.orderNumber,
      /** False when there was no database to write to — the UI labels it. */
      recorded: placed.recorded,
      /** True when no payment processor is configured in this environment. */
      demo: placed.demo,
      delivery: placed.delivery,
      receiptSent: receipt.sent,
      /** True when the client's declared total disagreed with the catalogue. */
      repriced: basket.repriced,
    },
    201,
    headers,
  );
}
