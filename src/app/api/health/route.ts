import { hasAnalytics, hasResend, hasServiceRole, hasStripe, hasSupabase } from '@/lib/env';
import { isEmailConfigured } from '@/lib/email';
import { isStripeConfigured, isStripeTestMode, isStripeWebhookConfigured } from '@/lib/stripe';
import { isDemoData } from '@/lib/repo/products';
import { jsonResponse, logRouteError } from '../_lib/http';

/* ==========================================================================
   GET /api/health

   Which integrations are wired up — as booleans, and nothing else.

   No key, no URL, no host, no prefix, no length, no masked fragment. A
   configuration probe that leaks the shape of a secret is a reconnaissance
   endpoint, and "it is only the first four characters" is how that starts.
   `stripe.testMode` is the single exception and is derived from the key's
   *mode*, not its value; it exists so a deployment cannot quietly sit in test
   mode while taking what look like real orders.

   Uncached on purpose: the answer changes when the environment does, and a
   stale "everything is fine" is worse than no probe at all.
   ========================================================================== */

export async function GET() {
  // The only call here that touches the network. A failure is itself the
  // answer — it means the catalogue is being served from seed data.
  let demoCatalogue = true;
  try {
    demoCatalogue = await isDemoData();
  } catch (error) {
    logRouteError('health', error, { check: 'catalogue' });
  }

  const integrations = {
    supabase: { configured: hasSupabase, serviceRole: hasServiceRole() },
    stripe: {
      configured: isStripeConfigured(),
      publishableKey: hasStripe,
      webhookSecret: isStripeWebhookConfigured(),
      testMode: isStripeTestMode(),
    },
    email: { configured: isEmailConfigured() || hasResend() },
    analytics: { configured: hasAnalytics },
  } as const;

  const ready =
    integrations.supabase.configured &&
    integrations.supabase.serviceRole &&
    integrations.stripe.configured &&
    integrations.stripe.webhookSecret &&
    integrations.email.configured;

  return jsonResponse({
    status: 'ok',
    /** True only when every integration needed to take a real order is present. */
    ready,
    /** True when the storefront is rendering the seed catalogue. */
    demoCatalogue,
    integrations,
    timestamp: new Date().toISOString(),
  });
}
