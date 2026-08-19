import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  notConfigured,
  type CreateIntentInput,
  type CreateIntentResult,
  type PaymentCapabilities,
  type PaymentEvent,
  type PaymentEventKind,
  type PaymentProvider,
  type VerifyWebhookInput,
  type VerifyWebhookResult,
} from './types';

/* ==========================================================================
   Razorpay — orders and webhooks, over `fetch` and `node:crypto`.

   ── Why no SDK ───────────────────────────────────────────────────────────
   The whole integration is one authenticated POST and two HMACs. The official
   package pulls a request stack VAYRO does not otherwise carry and is not
   edge-friendly; `fetch` and `node:crypto` are already there and are the two
   things that must be exactly right anyway.

   ── Two different signatures, do not confuse them ────────────────────────
   Razorpay signs two unrelated things with two different keys:

     webhook        HMAC-SHA256(raw request body, RAZORPAY_WEBHOOK_SECRET)
                    delivered in `x-razorpay-signature`

     client return  HMAC-SHA256("<order_id>|<payment_id>", RAZORPAY_KEY_SECRET)
                    delivered in the browser's `razorpay_signature`

   `verifyWebhook()` does the first. `verifyPaymentSignature()` does the
   second, and exists because Razorpay's browser handler is the only signal a
   redirect-less checkout gets that the payment succeeded. Both compare in
   constant time; neither ever parses before it verifies.

   ── Amounts ──────────────────────────────────────────────────────────────
   Razorpay counts in the smallest currency unit, which is exactly what
   `priceBasket()` produces. No conversion happens anywhere in this file — a
   multiplication here would be a silent hundredfold overcharge.
   ========================================================================== */

const API = 'https://api.razorpay.com/v1';

/** Mirrors the Stripe client's timeout. Card networks stall more than they fail. */
const TIMEOUT_MS = 20_000;

/**
 * Razorpay accepts INR out of the box. The other three require International
 * Payments to be enabled on the account; the API answers plainly when it is
 * not, so they are listed rather than silently withheld.
 */
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;

/** `receipt` is capped by Razorpay at 40 characters. */
const RECEIPT_MAX = 40;
/** `notes` allows 15 keys; values are capped at 256 characters. */
const NOTES_MAX_KEYS = 15;
const NOTES_VALUE_MAX = 250;

/**
 * Read at call time, not at module scope: a route that boots before the
 * environment is injected must still see the keys on the next request.
 */
function credentials() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID?.trim() || null,
    keySecret: process.env.RAZORPAY_KEY_SECRET?.trim() || null,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || null,
  } as const;
}

export function isRazorpayConfigured(): boolean {
  const { keyId, keySecret } = credentials();
  return Boolean(keyId && keySecret);
}

export function isRazorpayWebhookConfigured(): boolean {
  return Boolean(credentials().webhookSecret);
}

/** Test-mode detection, for labelling the checkout honestly. */
export function isRazorpayTestMode(): boolean {
  return credentials().keyId?.startsWith('rzp_test_') ?? false;
}

/** The key id is publishable — it is what Checkout.js is initialised with. */
export function razorpayKeyId(): string | null {
  return credentials().keyId;
}

/** One log shape, matching the route helpers. Messages only, never payloads. */
function log(stage: string, detail: unknown, context: Record<string, unknown> = {}) {
  const text = detail instanceof Error ? `${detail.name}: ${detail.message}` : String(detail);
  console.error(`[vayro:payments:razorpay] ${stage}`, text, context);
}

/* ---------------------------------------------------------- json readers -- */

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/* ------------------------------------------------------------ signatures -- */

/**
 * Constant-time hex comparison. Length is checked first because
 * `timingSafeEqual` throws on a mismatch, and a thrown comparison is a
 * verification that did not happen.
 */
function signatureMatches(expected: string, given: string | null): boolean {
  if (!given || given.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'utf8'), Buffer.from(given, 'utf8'));
  } catch {
    return false;
  }
}

function hmacHex(secret: string, message: string): string {
  return createHmac('sha256', secret).update(message, 'utf8').digest('hex');
}

/**
 * Verifies the signature Razorpay's browser handler returns after a
 * successful payment: HMAC-SHA256 of `order_id|payment_id`, keyed with the
 * API secret.
 *
 * This is the *only* proof a client-side confirmation carries. Treat an
 * unverified `razorpay_payment_id` as an unauthenticated claim, because that
 * is precisely what it is.
 */
export function verifyPaymentSignature(input: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = credentials();
  if (!keySecret) return false;
  if (!input.orderId || !input.paymentId || !input.signature) return false;
  return signatureMatches(hmacHex(keySecret, `${input.orderId}|${input.paymentId}`), input.signature);
}

/* ------------------------------------------------------------ event maps -- */

function kindOf(event: string, payload: Record<string, unknown> | null): PaymentEventKind {
  switch (event) {
    case 'order.paid':
    case 'payment.captured':
      return 'payment_succeeded';
    case 'payment.failed':
      return 'payment_failed';
    // Razorpay has no "cancelled" payment event. An authorised payment that is
    // never captured is voided by the account's auto-refund policy, which
    // arrives as a refund, so there is nothing to map here.
    case 'refund.created':
    case 'refund.processed': {
      const payment = asRecord(asRecord(payload?.payment)?.entity);
      const amount = asNumber(payment?.amount);
      const refunded = asNumber(payment?.amount_refunded);
      if (amount === null || refunded === null) return 'partially_refunded';
      return refunded >= amount ? 'refunded' : 'partially_refunded';
    }
    default:
      return 'unhandled';
  }
}

/**
 * Flattens Razorpay's `payload.<entity>.entity` envelope into the shape the
 * order state machine reads.
 *
 * `reference` is always the Razorpay **order** id, because that is what
 * `createIntent()` returned and what the order row was written with. The
 * payment id changes between attempts on the same order and is carried
 * separately.
 */
function normalise(id: string, event: string, body: Record<string, unknown>): PaymentEvent {
  const payload = asRecord(body.payload);
  const payment = asRecord(asRecord(payload?.payment)?.entity);
  const order = asRecord(asRecord(payload?.order)?.entity);
  const refund = asRecord(asRecord(payload?.refund)?.entity);

  const reference = asString(payment?.order_id) ?? asString(order?.id) ?? asString(refund?.order_id);

  return {
    provider: 'razorpay',
    id,
    type: event,
    kind: kindOf(event, payload),
    reference,
    paymentId: asString(payment?.id) ?? asString(refund?.payment_id),
    amount: asNumber(payment?.amount) ?? asNumber(order?.amount),
    amountRefunded: asNumber(payment?.amount_refunded) ?? asNumber(refund?.amount),
    currency:
      asString(payment?.currency)?.toUpperCase() ??
      asString(order?.currency)?.toUpperCase() ??
      null,
    raw: body,
  };
}

/* ------------------------------------------------------------- requests -- */

function authHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`, 'utf8').toString('base64')}`;
}

function trimNotes(metadata: Record<string, string> | undefined): Record<string, string> {
  if (!metadata) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (Object.keys(out).length >= NOTES_MAX_KEYS) break;
    if (!key || value === undefined || value === null) continue;
    out[key.slice(0, 40)] = String(value).slice(0, NOTES_VALUE_MAX);
  }
  return out;
}

/**
 * Every provider error becomes the same neutral sentence.
 *
 * Razorpay's `description` field is written for developers, not customers, and
 * happily names credentials ("The api key provided is invalid") and internal
 * fields. Unlike Stripe there is no reliable class of user-safe messages to
 * pass through, so none are: the detail is logged, the customer gets a
 * sentence they can act on, and `code` carries the machine-readable slug.
 */
function describeError(status: number, body: unknown): { code: string; message: string; status: number } {
  const error = asRecord(asRecord(body)?.error);
  const code = asString(error?.code) ?? 'razorpay_unavailable';

  if (status === 401 || status === 403) {
    return {
      code: 'razorpay_unauthorised',
      message: 'Payments are temporarily unavailable. Try again shortly.',
      status: 502,
    };
  }

  // Always 502: a Razorpay refusal is an upstream failure whatever its own
  // status was, and the customer's next move is the same either way.
  return {
    code: code.toLowerCase(),
    message: 'The payment service could not complete that request. Try again in a moment.',
    status: 502,
  };
}

/* -------------------------------------------------------------- provider -- */

export const razorpayProvider: PaymentProvider = {
  id: 'razorpay',

  capabilities(): PaymentCapabilities | null {
    const { keyId } = credentials();
    if (!isRazorpayConfigured() || !keyId) return null;
    return {
      id: 'razorpay',
      label: 'Cards, UPI & Netbanking — Razorpay',
      currencies: CURRENCIES,
      clientIntegration: 'razorpay-checkout',
      publicKey: keyId,
      testMode: isRazorpayTestMode(),
      webhooks: isRazorpayWebhookConfigured(),
      // The Orders API has no idempotency header. The key is carried as the
      // receipt instead, which makes a duplicate visible in the dashboard but
      // does not prevent one. Harmless: only the order the customer actually
      // pays is ever captured.
      idempotent: false,
    };
  },

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const { keyId, keySecret } = credentials();
    if (!keyId || !keySecret) {
      return {
        ok: false,
        ...notConfigured('razorpay', 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to take payments.'),
      };
    }

    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      return {
        ok: false,
        code: 'invalid_amount',
        message: 'There is nothing to pay for on this basket.',
        status: 400,
      };
    }

    const shipping = input.shipping;

    // Notes are read by the webhook and by support. Razorpay truncates
    // nothing — it rejects the whole call — so the caps are applied here.
    const notes = trimNotes({
      email: input.email,
      ...(input.description ? { description: input.description } : {}),
      ...(shipping
        ? {
            ship_name: shipping.fullName,
            ship_city: shipping.city,
            ship_postal: shipping.postalCode,
            ship_country: shipping.country,
          }
        : {}),
      ...input.metadata,
    });

    let response: Response;
    try {
      response = await fetch(`${API}/orders`, {
        method: 'POST',
        headers: {
          Authorization: authHeader(keyId, keySecret),
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          amount: input.amount,
          currency: input.currency,
          receipt: (input.idempotencyKey ?? `vayro-${Date.now()}`).slice(0, RECEIPT_MAX),
          // Auto-capture. A two-step authorise/capture flow would leave money
          // held against orders nothing in this codebase ever captures.
          payment_capture: true,
          notes,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: 'no-store',
      });
    } catch (error) {
      log('create-order', error, { amount: input.amount, currency: input.currency });
      return {
        ok: false,
        code: 'razorpay_unreachable',
        message: 'The payment service could not be reached. Try again in a moment.',
        status: 502,
      };
    }

    const body: unknown = await response.json().catch(() => null);

    if (!response.ok) {
      const described = describeError(response.status, body);
      log('create-order', asString(asRecord(asRecord(body)?.error)?.description) ?? 'unknown error', {
        httpStatus: response.status,
        code: described.code,
      });
      return { ok: false, ...described };
    }

    const order = asRecord(body);
    const id = asString(order?.id);
    const amount = asNumber(order?.amount);

    if (!id || amount === null) {
      log('create-order', 'order created without an id or amount', { httpStatus: response.status });
      return {
        ok: false,
        code: 'razorpay_unavailable',
        message: 'Payment could not be prepared. Try again in a moment.',
        status: 502,
      };
    }

    if (amount !== input.amount) {
      // The rail echoed a figure that is not the one priced. Refusing is the
      // only safe answer: the alternative is charging an amount nothing in
      // this codebase computed.
      log('create-order', 'provider echoed a different amount', {
        requested: input.amount,
        returned: amount,
      });
      return {
        ok: false,
        code: 'amount_mismatch',
        message: 'Payment could not be prepared. Try again in a moment.',
        status: 502,
      };
    }

    return {
      ok: true,
      intent: {
        provider: 'razorpay',
        id,
        // Razorpay has no client secret: the browser is handed the order id
        // and the publishable key id and opens Checkout with them.
        clientSecret: null,
        publicKey: keyId,
        amount,
        currency: input.currency,
        testMode: isRazorpayTestMode(),
      },
    };
  },

  async verifyWebhook({ payload, headers }: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const { webhookSecret } = credentials();
    if (!webhookSecret) {
      return {
        ok: false,
        ...notConfigured('razorpay', 'Set RAZORPAY_WEBHOOK_SECRET before enabling the endpoint.'),
      };
    }

    const signature = headers.get('x-razorpay-signature');
    if (!signature) {
      return {
        ok: false,
        code: 'missing_signature',
        message: 'Missing Razorpay signature header.',
        status: 400,
      };
    }

    // Signature first, over the exact bytes received. Nothing below this line
    // may run against an unverified body.
    if (!signatureMatches(hmacHex(webhookSecret, payload), signature)) {
      return {
        ok: false,
        code: 'invalid_signature',
        message: 'The webhook signature could not be verified.',
        status: 400,
      };
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return {
        ok: false,
        code: 'invalid_payload',
        message: 'The webhook body was not valid JSON.',
        status: 400,
      };
    }

    const body = asRecord(parsed);
    const name = asString(body?.event);
    if (!body || !name) {
      return {
        ok: false,
        code: 'invalid_payload',
        message: 'The webhook body did not name an event.',
        status: 400,
      };
    }

    // Razorpay puts the event id in a header, not the body. Falling back to a
    // digest of the payload keeps de-duplication working if that ever changes.
    const id =
      headers.get('x-razorpay-event-id') ?? `evt_${hmacHex(webhookSecret, payload).slice(0, 24)}`;

    return { ok: true, event: normalise(id, name, body) };
  },
};
