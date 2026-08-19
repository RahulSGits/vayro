import { z } from 'zod';

/**
 * Store configuration. Persisted one row per group in `public.settings`
 * (key text primary key, value jsonb), so a group can be written without
 * touching the others.
 *
 * Money is always stored in minor units (paise). The forms accept major units
 * and convert on the way in, which is the only place that conversion happens.
 *
 * The shipping defaults below deliberately restate the figures the cart store
 * ships with rather than importing them. `@/store/cart` is a `'use client'`
 * module: importing a constant from it into server code yields a client
 * reference, not a number, and the value silently becomes NaN. Any change to
 * `SHIPPING_FREE_THRESHOLD` / `SHIPPING_FLAT` belongs here too.
 */

/** Mirrors `SHIPPING_FREE_THRESHOLD` in `@/store/cart` — ₹5,000. */
const DEFAULT_FREE_SHIPPING_THRESHOLD = 500_000;
/** Mirrors `SHIPPING_FLAT` in `@/store/cart` — ₹199. */
const DEFAULT_STANDARD_SHIPPING = 19_900;

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;

export const brandSettingsSchema = z.object({
  storeName: z.string().min(1, 'Required').max(60),
  tagline: z.string().max(140).default(''),
  supportEmail: z.email('Enter a valid address'),
  supportPhone: z.string().max(32).default(''),
  currency: z.enum(CURRENCIES),
  originCity: z.string().max(80).default(''),
});

export const shippingSettingsSchema = z.object({
  freeThreshold: z.number().int().min(0).max(100_000_000),
  standardRate: z.number().int().min(0).max(100_000_000),
  expressRate: z.number().int().min(0).max(100_000_000),
  standardLabel: z.string().min(1).max(60),
  expressLabel: z.string().min(1).max(60),
  processingDays: z.number().int().min(0).max(30),
  internationalEnabled: z.boolean(),
  internationalRate: z.number().int().min(0).max(100_000_000),
});

export const taxSettingsSchema = z.object({
  label: z.string().min(1).max(40),
  /** Basis points — 1800 = 18.00%. Integer maths only, never a float rate. */
  rateBasisPoints: z.number().int().min(0).max(10_000),
  pricesIncludeTax: z.boolean(),
  registrationId: z.string().max(40).default(''),
});

export const emailSettingsSchema = z.object({
  fromName: z.string().min(1).max(60),
  fromAddress: z.email('Enter a valid address'),
  replyTo: z.string().max(120).default(''),
  orderConfirmation: z.boolean(),
  shippingNotification: z.boolean(),
  abandonedCart: z.boolean(),
});

export const analyticsSettingsSchema = z.object({
  serverSideEvents: z.boolean(),
  retentionDays: z.number().int().min(1).max(3650),
  excludeAdminTraffic: z.boolean(),
});

export const homepageSettingsSchema = z.object({
  eyebrow: z.string().max(60).default(''),
  headline: z.string().min(1, 'Required').max(120),
  subhead: z.string().max(240).default(''),
  ctaLabel: z.string().min(1).max(40),
  ctaHref: z.string().min(1).max(200),
  announcementEnabled: z.boolean(),
  announcementText: z.string().max(160).default(''),
});

export type BrandSettings = z.infer<typeof brandSettingsSchema>;
export type ShippingSettings = z.infer<typeof shippingSettingsSchema>;
export type TaxSettings = z.infer<typeof taxSettingsSchema>;
export type EmailSettings = z.infer<typeof emailSettingsSchema>;
export type AnalyticsSettings = z.infer<typeof analyticsSettingsSchema>;
export type HomepageSettings = z.infer<typeof homepageSettingsSchema>;

export type StoreSettings = {
  brand: BrandSettings;
  shipping: ShippingSettings;
  tax: TaxSettings;
  email: EmailSettings;
  analytics: AnalyticsSettings;
  homepage: HomepageSettings;
};

export const SETTINGS_GROUPS = ['brand', 'shipping', 'tax', 'email', 'analytics', 'homepage'] as const;
export type SettingsGroup = (typeof SETTINGS_GROUPS)[number];

export const defaultSettings: StoreSettings = {
  brand: {
    storeName: 'VAYRO',
    tagline: 'Engineered for the way forward.',
    supportEmail: 'hello@vayro.example',
    supportPhone: '',
    currency: 'INR',
    originCity: 'Bengaluru',
  },
  shipping: {
    freeThreshold: DEFAULT_FREE_SHIPPING_THRESHOLD,
    standardRate: DEFAULT_STANDARD_SHIPPING,
    expressRate: 49900,
    standardLabel: 'Standard — 3 to 5 working days',
    expressLabel: 'Express — 1 to 2 working days',
    processingDays: 1,
    internationalEnabled: false,
    internationalRate: 249900,
  },
  tax: {
    label: 'GST',
    rateBasisPoints: 1200,
    pricesIncludeTax: true,
    registrationId: '',
  },
  email: {
    fromName: 'VAYRO',
    fromAddress: 'hello@vayro.example',
    replyTo: '',
    orderConfirmation: true,
    shippingNotification: true,
    abandonedCart: false,
  },
  analytics: {
    serverSideEvents: true,
    retentionDays: 365,
    excludeAdminTraffic: true,
  },
  homepage: {
    eyebrow: 'The Meridian Carry Shell',
    headline: 'One layer. Every destination.',
    subhead: 'A packable technical shell that folds into its own hood and becomes a 2.1 L carry unit.',
    ctaLabel: 'View the shell',
    ctaHref: '/products/meridian-carry-shell',
    announcementEnabled: false,
    announcementText: 'Free standard shipping over ₹5,000.',
  },
};

const groupSchemas = {
  brand: brandSettingsSchema,
  shipping: shippingSettingsSchema,
  tax: taxSettingsSchema,
  email: emailSettingsSchema,
  analytics: analyticsSettingsSchema,
  homepage: homepageSettingsSchema,
} as const;

/** Merges a persisted jsonb blob over the defaults, discarding anything invalid. */
export function mergeSettingsGroup<G extends SettingsGroup>(
  group: G,
  stored: unknown,
): StoreSettings[G] {
  const fallback = defaultSettings[group];
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) return fallback;
  const parsed = groupSchemas[group].safeParse({ ...fallback, ...(stored as object) });
  return (parsed.success ? parsed.data : fallback) as StoreSettings[G];
}

/** Formats basis points for display — 1800 -> "18%", 1250 -> "12.5%". */
export function formatBasisPoints(bp: number) {
  const percent = bp / 100;
  return `${percent % 1 === 0 ? percent.toFixed(0) : percent.toFixed(2).replace(/0$/, '')}%`;
}
