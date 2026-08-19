import { createHash } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { checkoutIntentSchema, parseInput } from '@/lib/validation';
import { guard } from '@/lib/rate-limit';
import { razorpayProvider } from '@/lib/payments/razorpay';
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
   POST /api/checkout/razorpay  ->  { orderId, keyId, amount, currency }

   The Razorpay counterpart to `POST /api/checkout/intent`. Same body, same
   rules, same order of operations — deliberately, so the two rails cannot
   drift on the one thing that matters.

   ── The only number that matters ─────────────────────────────────────────
   The body carries an `amount`. It is parsed, compared, logged when it drifts
   — and never charged. `priceBasket()` rebuilds the basket from the catalogue
   and the Razorpay order is created for *that* figure. A tampered client
   changes the display, not the charge. The provider then re-checks the amount
   Razorpay echoed back before the order id is handed to the browser.

   ── What the browser does with this ──────────────────────────────────────
   Razorpay has no client secret. Checkout.js is opened with `keyId` and
   `orderId`, and returns `razorpay_payment_id`, `razorpay_order_id` and
   `razorpay_signature`. That signature is an *unverified claim* until it has
   been through `verifyPaymentSignature()` on the server — the webhook at
   `/api/webhooks/razorpay` is the authoritative confirmation.

   ── Idempotency ──────────────────────────────────────────────────────────
   The Orders API has no idempotency header, so the key is carried as the
   receipt: a digest of the basket, the destination and a coarse 15-minute
   bucket. Retries inside one checkout land on one receipt, which makes a
   duplicate obvious in the dashboard even though Razorpay will not refuse it.
   Only the order the customer actually pays is ever captured.
   ========================================================================== */

const IDEMPOTENCY_WINDOW_MS = 15 * 60_000;

/** `vayro-` plus 28 hex characters — inside Razorpay's 40-character receipt. */
function receiptKey(parts: string[]): string {
  const bucket = Math.floor(Date.now() / IDEMPOTENCY_WINDOW_MS);
  const digest = createHash('sha256').update([...parts, String(bucket)].join('|')).digest('hex');
  return `vayro-${digest.slice(0, 28)}`;
}

export async function POST(request: NextRequest) {
  const { result, headers } = await guard('checkout', request);
  if (!result.ok) return rateLimited(result);

  const body = await readJsonBody(request, headers);
  if (!body.ok) return body.response;

  const parsed = parseInput(checkoutIntentSchema, body.value);
  if (!parsed.ok) return badRequest(parsed.message, parsed.fields, headers);

  const input = parsed.data;

  const capabilities = razorpayProvider.capabilities();
  if (!capabilities) {
    // A valid request the environment cannot serve. The checkout reads this
    // message verbatim and falls back to its clearly-labelled demo order.
    return unavailable(
      'Razorpay payments are not configured in this environment. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to take payments.',
      'razorpay_not_configured',
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

  if (!capabilities.currencies.includes(basket.currency)) {
    return conflict(
      'currency_unsupported',
      'That currency cannot be charged on this payment method. Choose another.',
      headers,
    );
  }

  if (basket.repriced) {
    // Not an error — prices and stock move. Recorded so a persistent gap
    // between the storefront and the catalogue is visible in the logs.
    logRouteError('checkout/razorpay', 'client total did not match server total', {
      clientTotal: basket.clientTotal,
      serverTotal: basket.total,
      lines: basket.lines.length,
    });
  }

  const address = input.shippingAddress;

  const created = await razorpayProvider.createIntent({
    amount: basket.total,
    currency: basket.currency,
    email: input.email,
    description: `VAYRO — ${basket.lines.length} item${basket.lines.length === 1 ? '' : 's'}`,
    idempotencyKey: receiptKey([
      input.email,
      basket.currency,
      String(basket.total),
      basket.shippingMethod,
      basket.discountCode ?? '',
      address.postalCode,
      basket.lines.map((line) => `${line.sku}:${line.quantity}`).join(','),
    ]),
    shipping: {
      fullName: address.fullName,
      line1: address.line1,
      line2: address.line2 || undefined,
      city: address.city,
      region: address.region,
      postalCode: address.postalCode,
      country: address.country,
    },
    // Read by the webhook and by support. Values are capped by the provider
    // module before they are sent.
    metadata: {
      shipping_method: basket.shippingMethod,
      discount_code: basket.discountCode ?? '',
      item_count: String(basket.lines.reduce((sum, line) => sum + line.quantity, 0)),
      subtotal: String(basket.subtotal),
      discount: String(basket.discount),
      shipping: String(basket.shipping),
      skus: basket.lines.map((line) => `${line.sku}×${line.quantity}`).join(','),
    },
  });

  if (!created.ok) {
    logRouteError('checkout/razorpay', created.message, { code: created.code });
    return failure(created.status, created.code, created.message, { headers });
  }

  const intent = created.intent;

  return jsonResponse(
    {
      provider: 'razorpay' as const,
      /** Pass this to `POST /api/orders` as `paymentIntentId`. */
      orderId: intent.id,
      /** Publishable key id for Checkout.js. Never the secret. */
      keyId: intent.publicKey,
      /** The figure that will actually be charged. */
      amount: intent.amount,
      currency: intent.currency,
      /** True when the client's declared total disagreed with the catalogue. */
      repriced: basket.repriced,
      testMode: intent.testMode,
    },
    201,
    headers,
  );
}
