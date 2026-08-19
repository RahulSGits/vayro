import 'server-only';
import { env } from '@/lib/env';
import {
  describeStripeError,
  getStripe,
  isStripeConfigured,
  isStripeTestMode,
  isStripeWebhookConfigured,
  stripeWebhookSecret,
  type Stripe,
} from '@/lib/stripe';
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
   Stripe, behind the provider interface.

   This is an adapter, not a second Stripe integration. Client construction,
   API version pinning, retry policy, test-mode detection and — most
   importantly — error sanitisation all still live in `src/lib/stripe.ts` and
   are called through from here. Nothing about how VAYRO talks to Stripe is
   restated in this file; only how Stripe answers the three questions the
   `PaymentProvider` contract asks.

   `src/app/api/checkout/intent/route.ts` continues to use `@/lib/stripe`
   directly. That route predates this seam and works; duplicating its
   behaviour here would give two code paths that can drift on the one thing
   that must not, which is the amount.
   ========================================================================== */

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;

/** Stripe caps metadata values at 500 characters and keys at 40. */
const METADATA_VALUE_MAX = 480;

function trimMetadata(metadata: Record<string, string> | undefined): Record<string, string> {
  if (!metadata) return {};
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!key || value === undefined || value === null) continue;
    out[key.slice(0, 40)] = String(value).slice(0, METADATA_VALUE_MAX);
  }
  return out;
}

/** Maps Stripe's event vocabulary onto the order state machine's. */
function kindOf(event: Stripe.Event): PaymentEventKind {
  switch (event.type) {
    case 'payment_intent.succeeded':
      return 'payment_succeeded';
    case 'payment_intent.payment_failed':
      return 'payment_failed';
    case 'payment_intent.canceled':
      return 'payment_cancelled';
    case 'charge.refunded': {
      const charge = event.data.object;
      // A partial refund leaves the order fulfilled; only a full one reverses it.
      return charge.amount_refunded >= charge.amount ? 'refunded' : 'partially_refunded';
    }
    default:
      return 'unhandled';
  }
}

function referenceOf(value: string | { id: string } | null | undefined): string | null {
  if (!value) return null;
  return typeof value === 'string' ? value : value.id;
}

function normalise(event: Stripe.Event): PaymentEvent {
  const base = {
    provider: 'stripe' as const,
    id: event.id,
    type: event.type,
    kind: kindOf(event),
    raw: event,
  };

  if (
    event.type === 'payment_intent.succeeded' ||
    event.type === 'payment_intent.payment_failed' ||
    event.type === 'payment_intent.canceled'
  ) {
    const intent = event.data.object;
    return {
      ...base,
      reference: intent.id,
      paymentId: intent.id,
      amount: intent.amount ?? null,
      amountRefunded: null,
      currency: intent.currency?.toUpperCase() ?? null,
    };
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    return {
      ...base,
      // Orders are keyed on the PaymentIntent, not on the charge.
      reference: referenceOf(charge.payment_intent),
      paymentId: charge.id,
      amount: charge.amount ?? null,
      amountRefunded: charge.amount_refunded ?? null,
      currency: charge.currency?.toUpperCase() ?? null,
    };
  }

  return { ...base, reference: null, paymentId: null, amount: null, amountRefunded: null, currency: null };
}

/* -------------------------------------------------------------- provider -- */

export const stripeProvider: PaymentProvider = {
  id: 'stripe',

  capabilities(): PaymentCapabilities | null {
    if (!isStripeConfigured()) return null;
    return {
      id: 'stripe',
      label: 'Card — Stripe',
      currencies: CURRENCIES,
      clientIntegration: 'stripe-elements',
      publicKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
      testMode: isStripeTestMode(),
      webhooks: isStripeWebhookConfigured(),
      // Stripe's `idempotencyKey` is a first-class guarantee, not a receipt
      // field we hope nobody reuses.
      idempotent: true,
    };
  },

  async createIntent(input: CreateIntentInput): Promise<CreateIntentResult> {
    const stripe = getStripe();
    if (!stripe) {
      return { ok: false, ...notConfigured('stripe', 'Set STRIPE_SECRET_KEY to take payments.') };
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

    try {
      const intent = await stripe.paymentIntents.create(
        {
          amount: input.amount,
          currency: input.currency.toLowerCase(),
          automatic_payment_methods: { enabled: true },
          receipt_email: input.email,
          description: input.description,
          ...(shipping
            ? {
                shipping: {
                  name: shipping.fullName,
                  phone: shipping.phone || undefined,
                  address: {
                    line1: shipping.line1,
                    line2: shipping.line2 || undefined,
                    city: shipping.city,
                    state: shipping.region,
                    postal_code: shipping.postalCode,
                    country: shipping.country,
                  },
                },
              }
            : {}),
          metadata: trimMetadata(input.metadata),
        },
        input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
      );

      if (!intent.client_secret) {
        return {
          ok: false,
          code: 'stripe_unavailable',
          message: 'Payment could not be prepared. Try again in a moment.',
          status: 502,
        };
      }

      return {
        ok: true,
        intent: {
          provider: 'stripe',
          id: intent.id,
          clientSecret: intent.client_secret,
          publicKey: env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null,
          amount: intent.amount,
          currency: input.currency,
          testMode: isStripeTestMode(),
        },
      };
    } catch (error) {
      // Sanitisation is `@/lib/stripe`'s job and is not repeated here: it is
      // the single place that decides which provider messages a customer may
      // ever see.
      const described = describeStripeError(error);
      return { ok: false, code: described.code, message: described.message, status: described.status };
    }
  },

  async verifyWebhook({ payload, headers }: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const stripe = getStripe();
    const secret = stripeWebhookSecret();

    if (!stripe || !secret) {
      return {
        ok: false,
        ...notConfigured('stripe', 'Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET.'),
      };
    }

    const signature = headers.get('stripe-signature');
    if (!signature) {
      return {
        ok: false,
        code: 'missing_signature',
        message: 'Missing Stripe signature header.',
        status: 400,
      };
    }

    try {
      const event = await stripe.webhooks.constructEventAsync(payload, signature, secret);
      return { ok: true, event: normalise(event) };
    } catch {
      // The reason distinguishes a wrong secret from a replayed timestamp,
      // which is not something a caller should be able to learn.
      return {
        ok: false,
        code: 'invalid_signature',
        message: 'The webhook signature could not be verified.',
        status: 400,
      };
    }
  },
};
