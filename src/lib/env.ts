import { z } from 'zod';

/**
 * Environment contract. Nothing throws at import time — VAYRO runs fully in
 * "demo mode" (seed catalogue, no persistence) when integrations are absent,
 * so the storefront is never broken by missing credentials.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_SITE_URL: z.string().url().optional(),
  NEXT_PUBLIC_POSTHOG_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_POSTHOG_HOST: z.string().url().optional(),
  NEXT_PUBLIC_GA_ID: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_DEFAULT_CURRENCY: z.enum(['INR', 'USD', 'EUR', 'GBP']).optional(),
});

// Next.js inlines NEXT_PUBLIC_* only for statically-analysable member access.
const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY,
  NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST,
  NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  NEXT_PUBLIC_DEFAULT_CURRENCY: process.env.NEXT_PUBLIC_DEFAULT_CURRENCY,
});

export const env = {
  ...publicEnv,
  siteUrl: publicEnv.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  currency: publicEnv.NEXT_PUBLIC_DEFAULT_CURRENCY ?? 'INR',
} as const;

/** True when Supabase is wired up. Everything degrades gracefully when false. */
export const hasSupabase = Boolean(
  publicEnv.NEXT_PUBLIC_SUPABASE_URL && publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const hasStripe = Boolean(publicEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
export const hasAnalytics = Boolean(publicEnv.NEXT_PUBLIC_POSTHOG_KEY || publicEnv.NEXT_PUBLIC_GA_ID);

/** Server-only secrets. Never import this module from a client component. */
export function serverEnv() {
  return {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM: process.env.RESEND_FROM ?? 'VAYRO <hello@vayro.example>',
    SENTRY_DSN: process.env.SENTRY_DSN,
    ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  } as const;
}

export const hasServiceRole = () => Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
export const hasStripeSecret = () => Boolean(process.env.STRIPE_SECRET_KEY);
export const hasResend = () => Boolean(process.env.RESEND_API_KEY);
