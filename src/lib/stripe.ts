import 'server-only';
import Stripe from 'stripe';
import { serverEnv } from '@/lib/env';

/* ==========================================================================
   Server-side Stripe.

   Constructed lazily and cached for the life of the process. Absent keys are
   a supported state, not an error: VAYRO runs end to end without a payment
   processor, and the checkout says so plainly rather than failing at import
   time and taking the whole route table with it.

   Nothing here ever returns a key, a secret or a raw Stripe error to a
   caller — see `describeStripeError()` for the sanitised surface.
   ========================================================================== */

/**
 * Pinned to the version `stripe@22` was generated against, so the TypeScript
 * definitions and the wire format always agree. Bump this and the SDK
 * together, never one alone.
 */
export const STRIPE_API_VERSION = '2026-07-29.dahlia';

const globalScope = globalThis as typeof globalThis & { __vayroStripe?: Stripe | null };

/** True when a secret key is present. Publishable-key checks live in `env`. */
export function isStripeConfigured(): boolean {
  return Boolean(serverEnv().STRIPE_SECRET_KEY);
}

/** True when webhooks can be verified. Signature checks are never optional. */
export function isStripeWebhookConfigured(): boolean {
  return Boolean(serverEnv().STRIPE_WEBHOOK_SECRET);
}

export function stripeWebhookSecret(): string | null {
  return serverEnv().STRIPE_WEBHOOK_SECRET ?? null;
}

/**
 * The shared Stripe client, or null when no secret key is configured.
 * Callers must handle null — that is the demo path, not an exception.
 */
export function getStripe(): Stripe | null {
  if (globalScope.__vayroStripe !== undefined) return globalScope.__vayroStripe;

  const { STRIPE_SECRET_KEY } = serverEnv();
  if (!STRIPE_SECRET_KEY) {
    globalScope.__vayroStripe = null;
    return null;
  }

  globalScope.__vayroStripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: STRIPE_API_VERSION,
    typescript: true,
    // Two retries with backoff: card networks time out more often than they
    // fail, and an idempotency key makes the retry safe.
    maxNetworkRetries: 2,
    timeout: 20_000,
    appInfo: { name: 'VAYRO', url: 'https://vayro.example' },
  });

  return globalScope.__vayroStripe;
}

/** Test-mode detection, for labelling the checkout honestly. */
export function isStripeTestMode(): boolean {
  const key = serverEnv().STRIPE_SECRET_KEY;
  return Boolean(key?.startsWith('sk_test_') || key?.startsWith('rk_test_'));
}

export function isStripeError(error: unknown): error is Stripe.errors.StripeError {
  return error instanceof Stripe.errors.StripeError;
}

/**
 * Turns any thrown value into something safe to send to a browser.
 *
 * Stripe's `card_error` and `invalid_request_error` messages are written for
 * end users and are passed through. Everything else — API keys, connection
 * failures, rate limits — is replaced with a neutral sentence, because those
 * messages can name internal configuration.
 */
export function describeStripeError(error: unknown): { message: string; code: string; status: number } {
  if (isStripeError(error)) {
    const passthrough = error.type === 'StripeCardError' || error.type === 'StripeInvalidRequestError';
    return {
      message: passthrough
        ? error.message
        : 'The payment service could not complete that request. Try again in a moment.',
      code: error.code ?? error.type,
      status: error.type === 'StripeCardError' ? 402 : 502,
    };
  }
  return {
    message: 'The payment service could not complete that request. Try again in a moment.',
    code: 'stripe_unavailable',
    status: 502,
  };
}

export type { Stripe };
