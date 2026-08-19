import 'server-only';
import { razorpayProvider } from './razorpay';
import { stripeProvider } from './stripe';
import {
  isPaymentProviderId,
  type PaymentCapabilities,
  type PaymentProvider,
  type PaymentProviderId,
} from './types';

/* ==========================================================================
   Provider selection.

   `PAYMENT_PROVIDER` names the rail the checkout should offer. Stripe is the
   default, because that is what the storefront was built against and what
   every existing route and order row assumes.

   ── Selection is not the same as availability ────────────────────────────
   Naming a provider does not configure it. `activeProvider()` returns the
   *chosen* rail whether or not it has keys — asking for Razorpay and getting
   Stripe because a secret was missing would be a silent downgrade, and the
   customer would be shown a payment form the environment cannot honour.
   Callers ask `capabilities()`, get null, and say so. `configuredProviders()`
   is there for a settings screen that wants to show what actually works.

   Every route that is provider-specific — `/api/checkout/razorpay`,
   `/api/webhooks/razorpay` — reaches for its provider by name instead, so it
   keeps working regardless of which rail is currently the default.

   Server only: `./stripe` and `./razorpay` both hold secrets. Import the
   types from `./types` if a client module needs the shapes.
   ========================================================================== */

export const PROVIDERS: Record<PaymentProviderId, PaymentProvider> = {
  stripe: stripeProvider,
  razorpay: razorpayProvider,
};

export const DEFAULT_PROVIDER_ID: PaymentProviderId = 'stripe';

/**
 * The configured rail. Falls back to Stripe when `PAYMENT_PROVIDER` is unset
 * or names something that does not exist — a typo must not leave the
 * storefront with no payment path at all.
 */
export function activeProviderId(): PaymentProviderId {
  const requested = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  return isPaymentProviderId(requested) ? requested : DEFAULT_PROVIDER_ID;
}

export function activeProvider(): PaymentProvider {
  return PROVIDERS[activeProviderId()];
}

/** A named rail, whatever the default is. Used by provider-specific routes. */
export function getProvider(id: PaymentProviderId): PaymentProvider {
  return PROVIDERS[id];
}

/**
 * Capabilities of the active rail, or null when it is not configured here.
 * Never throws — an absent integration is a supported state.
 */
export function activeCapabilities(): PaymentCapabilities | null {
  try {
    return activeProvider().capabilities();
  } catch {
    return null;
  }
}

/** Every rail that could actually take a payment in this environment. */
export function configuredProviders(): PaymentCapabilities[] {
  const out: PaymentCapabilities[] = [];
  for (const provider of Object.values(PROVIDERS)) {
    try {
      const capabilities = provider.capabilities();
      if (capabilities) out.push(capabilities);
    } catch {
      // A provider that cannot describe itself is simply not offered.
    }
  }
  return out;
}

/** True when at least one rail can take money. False is the demo path. */
export function hasPaymentProvider(): boolean {
  return configuredProviders().length > 0;
}

export { razorpayProvider } from './razorpay';
export { stripeProvider } from './stripe';
export * from './types';
