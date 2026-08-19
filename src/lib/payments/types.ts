import type { Currency } from '@/types';

/* ==========================================================================
   The payment rail contract.

   VAYRO charges in INR and sells from India, where Stripe is not always the
   right — or even an available — rail. Rather than thread a second SDK
   through the checkout, every provider implements the same three things:

     capabilities()   what this rail can do here, or null if it cannot
     createIntent()   turn a server-computed total into something payable
     verifyWebhook()  prove a callback came from the provider, then normalise it

   ── Two rules the interface exists to enforce ────────────────────────────
   1. **Amounts are inputs, never outputs of the client.** `createIntent` takes
      a figure that has already been through `priceBasket()`. No provider
      module reads a request body.
   2. **Absence is a state, not an error.** An unconfigured provider returns
      `null` capabilities and a typed failure from the other two methods. It
      never throws, because a missing key must not take down the route table.

   This module is types only, so it stays importable from either side of the
   server boundary. The implementations are `server-only`.
   ========================================================================== */

export const PAYMENT_PROVIDER_IDS = ['stripe', 'razorpay'] as const;
export type PaymentProviderId = (typeof PAYMENT_PROVIDER_IDS)[number];

export function isPaymentProviderId(value: unknown): value is PaymentProviderId {
  return typeof value === 'string' && (PAYMENT_PROVIDER_IDS as readonly string[]).includes(value);
}

/* --------------------------------------------------------- capabilities -- */

/** How the browser is expected to finish the payment. */
export type ClientIntegration = 'stripe-elements' | 'razorpay-checkout';

export interface PaymentCapabilities {
  id: PaymentProviderId;
  /** Shown to the customer at checkout. */
  label: string;
  /** Currencies this rail will accept from us. */
  currencies: readonly Currency[];
  clientIntegration: ClientIntegration;
  /**
   * The publishable identifier the browser needs. Public by design — a
   * publishable key or a Razorpay key id, never a secret.
   */
  publicKey: string | null;
  /** True when the configured credentials are test credentials. */
  testMode: boolean;
  /** True when webhook signatures can be verified. False means: do not accept them. */
  webhooks: boolean;
  /**
   * True when `createIntent` genuinely de-duplicates on `idempotencyKey`.
   * False means retries may create a second intent — harmless, since only one
   * is ever paid, but the caller should not assume otherwise.
   */
  idempotent: boolean;
}

/* ------------------------------------------------------------- creating -- */

export interface PaymentAddress {
  fullName: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  /** ISO 3166-1 alpha-2. */
  country: string;
  phone?: string;
}

export interface CreateIntentInput {
  /**
   * Minor units, already recomputed from the catalogue by `priceBasket()`.
   * Nothing downstream re-derives it and nothing upstream may supply it
   * straight from a request body.
   */
  amount: number;
  currency: Currency;
  email: string;
  description?: string;
  /**
   * Collapses retries inside one checkout onto a single intent. Honoured only
   * where `capabilities().idempotent` is true; carried as a provider reference
   * otherwise.
   */
  idempotencyKey?: string;
  /** Short scalars only — providers cap key and value length hard. */
  metadata?: Record<string, string>;
  shipping?: PaymentAddress | null;
}

export interface PaymentIntentSummary {
  provider: PaymentProviderId;
  /**
   * The provider reference stored on `orders.payment_reference`: a Stripe
   * PaymentIntent id, or a Razorpay order id.
   */
  id: string;
  /** Stripe only. Razorpay's browser flow uses `id` together with `publicKey`. */
  clientSecret: string | null;
  /** Repeated from capabilities so the client needs exactly one response. */
  publicKey: string | null;
  /** The figure that will actually be charged. */
  amount: number;
  currency: Currency;
  testMode: boolean;
}

/** A failure that is safe to render to a customer verbatim. */
export interface PaymentFailure {
  /** Stable machine-readable slug. The only field a client should branch on. */
  code: string;
  message: string;
  /** Suggested HTTP status. 503 means "valid request, unconfigured here". */
  status: number;
}

export type CreateIntentResult =
  | { ok: true; intent: PaymentIntentSummary }
  | ({ ok: false } & PaymentFailure);

/* -------------------------------------------------------------- webhooks -- */

/**
 * Provider vocabularies collapsed to the only distinctions the order state
 * machine makes. `unhandled` is normal: we subscribe to more than we act on.
 */
export type PaymentEventKind =
  | 'payment_succeeded'
  | 'payment_failed'
  | 'payment_cancelled'
  | 'refunded'
  | 'partially_refunded'
  | 'unhandled';

export interface PaymentEvent {
  provider: PaymentProviderId;
  /** Provider event id, for de-duplication and logs. */
  id: string;
  /** The provider's own event name, unmapped, for logging. */
  type: string;
  kind: PaymentEventKind;
  /**
   * The value orders are keyed on — matches `PaymentIntentSummary.id` and
   * therefore `orders.payment_reference`.
   */
  reference: string | null;
  /** The provider's id for the payment attempt itself, where it differs. */
  paymentId: string | null;
  /** Minor units. Null when the event does not carry one. */
  amount: number | null;
  amountRefunded: number | null;
  currency: string | null;
  /** The parsed body, for handlers that need a field this shape drops. */
  raw: unknown;
}

export interface VerifyWebhookInput {
  /** The exact bytes received. Never a re-serialised object. */
  payload: string;
  headers: Headers;
}

export type VerifyWebhookResult =
  | { ok: true; event: PaymentEvent }
  | ({ ok: false } & PaymentFailure);

/* -------------------------------------------------------------- provider -- */

export interface PaymentProvider {
  readonly id: PaymentProviderId;
  /** Null when this environment cannot take a payment on this rail. */
  capabilities(): PaymentCapabilities | null;
  createIntent(input: CreateIntentInput): Promise<CreateIntentResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;
}

/* ---------------------------------------------------------------- shared -- */

/** The one sentence a customer sees when a rail is simply not wired up. */
export function notConfigured(provider: PaymentProviderId, hint: string): PaymentFailure {
  return {
    code: `${provider}_not_configured`,
    message: `Card payments are not configured in this environment. ${hint}`,
    status: 503,
  };
}
