import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { checkoutIntentSchema, parseInput } from '@/lib/validation';
import { guard } from '@/lib/rate-limit';
import { describeStripeError, getStripe, isStripeTestMode } from '@/lib/stripe';
import {
  badRequest,
  conflict,
  failure,
  jsonResponse,
  logRouteError,
  rateLimited,
  readJsonBody,
  unavailable,
} from '../../_lib/http';
import { priceBasket } from '../../_lib/pricing';

/* ==========================================================================
   POST /api/checkout/intent  ->  { clientSecret }

   Called by `createPaymentIntent()` in `src/components/checkout/order.ts`.

   ── The only number that matters ─────────────────────────────────────────
   The body carries an `amount`. It is parsed, compared, logged when it drifts
   — and never charged. `priceBasket()` rebuilds the basket from the catalogue
   and the PaymentIntent is created for *that* figure. A tampered client
   changes the display, not the charge.

   ── Idempotency ──────────────────────────────────────────────────────────
   The key is a digest of the basket, the destination and a coarse 15-minute
   bucket. Retries inside one checkout collapse onto a single PaymentIntent,
   while the same basket bought again tomorrow correctly gets a new one.
   ========================================================================== */

const IDEMPOTENCY_WINDOW_MS = 15 * 60_000;

function idempotencyKey(parts: string[]): string {
  const bucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS);
  return createHash('sha256').update([...parts, String(bucket)].join('|')).digest('hex').slice(0, 48);
}

export async function POST(request: NextRequest) {
  const { result, headers } = await guard('checkout', request);
  if (!result.ok) return rateLimited(result);

  const body = await readJsonBody(request, headers);
  if (!body.ok) return body.response;

  const parsed = parseInput(checkoutIntentSchema, body.value);
  if (!parsed.ok) return badRequest(parsed.message, parsed.fields, headers);

  const input = parsed.data;

  const stripe = getStripe();
  if (!stripe) {
    // A valid request the environment cannot serve. The checkout reads this
    // message verbatim and falls back to its clearly-labelled demo order.
    return unavailable(
      'Card payments are not configured in this environment. Set STRIPE_SECRET_KEY to take payments.',
      'stripe_not_configured',
      headers,
    );
  }

  const priced = await priceBasket({
    items: input.items,
    shippingMethod: input.shippingMethod,
    countryCode: input.shippingAddress.country,
    discountCode: input.discountCode,
    declaredTotal: input.amount,
  });

  if (!priced.ok) {
    const status = priced.code === 'out_of_stock' || priced.code === 'unknown_item' ? 409 : 400;
    return status === 409
      ? conflict(priced.code, priced.message, headers)
      : failure(400, priced.code, priced.message, { headers });
  }

  const basket = priced.basket;

  if (basket.total <= 0) {
    return badRequest('There is nothing to pay for on this basket.', undefined, headers);
  }

  if (basket.currency !== input.currency) {
    return conflict(
      'currency_mismatch',
      'The basket is priced in a different currency to the one requested. Refresh and try again.',
      headers,
    );
  }

  if (basket.repriced) {
    // Not an error — prices and stock move. Recorded so a persistent gap
    // between the storefront and the catalogue is visible in the logs.
    logRouteError('checkout/intent', 'client total did not match server total', {
      clientTotal: basket.clientTotal,
      serverTotal: basket.total,
      lines: basket.lines.length,
    });
  }

  const address = input.shippingAddress;

  try {
    const intent = await stripe.paymentIntents.create(
      {
        amount: basket.total,
        currency: basket.currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        receipt_email: input.email,
        description: `VAYRO — ${basket.lines.length} item${basket.lines.length === 1 ? '' : 's'}`,
        shipping: {
          name: address.fullName,
          address: {
            line1: address.line1,
            line2: address.line2 || undefined,
            city: address.city,
            state: address.region,
            postal_code: address.postalCode,
            country: address.country,
          },
        },
        // Metadata is read by the webhook and by support. Values are capped by
        // Stripe at 500 characters, so the SKU list is truncated rather than
        // risking a rejected create call on a large basket.
        metadata: {
          email: input.email,
          shipping_method: basket.shippingMethod,
          discount_code: basket.discountCode ?? '',
          item_count: String(basket.lines.reduce((sum, line) => sum + line.quantity, 0)),
          subtotal: String(basket.subtotal),
          discount: String(basket.discount),
          shipping: String(basket.shipping),
          skus: basket.lines.map((line) => `${line.sku}×${line.quantity}`).join(',').slice(0, 480),
        },
      },
      {
        idempotencyKey: idempotencyKey([
          input.email,
          basket.currency,
          String(basket.total),
          basket.shippingMethod,
          basket.discountCode ?? '',
          address.postalCode,
          basket.lines.map((line) => `${line.sku}:${line.quantity}`).join(','),
        ]),
      },
    );

    if (!intent.client_secret) {
      logRouteError('checkout/intent', 'PaymentIntent created without a client secret', {
        intentId: intent.id,
      });
      return failure(
        502,
        'stripe_unavailable',
        'Payment could not be prepared. Try again in a moment.',
        { headers },
      );
    }

    return jsonResponse(
      {
        clientSecret: intent.client_secret,
        paymentIntentId: intent.id,
        /** The figure that will actually be charged. */
        amount: basket.total,
        currency: basket.currency,
        /** True when the client's declared total disagreed with the catalogue. */
        repriced: basket.repriced,
        testMode: isStripeTestMode(),
      },
      201,
      headers,
    );
  } catch (error) {
    const described = describeStripeError(error);
    logRouteError('checkout/intent', error, { code: described.code });
    return failure(described.status, described.code, described.message, { headers });
  }
}
