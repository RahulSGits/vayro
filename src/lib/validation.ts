import { z } from 'zod';

/* ==========================================================================
   VAYRO — shared validation contract.

   Every request body the server accepts is described exactly once, here, and
   parsed at the boundary. Route handlers never read a raw field.

   Two rules this file exists to keep:

   1. **The client is a source of intent, not of truth.** Amounts, totals and
      unit prices are accepted so a mismatch can be detected and logged, but
      they are re-derived from the catalogue before a single paisa moves.
      See `src/app/api/_lib/pricing.ts`.
   2. **No server module may import a client module.** `@/store/cart` and
      `@/components/checkout/schema` are `'use client'` (or transitively so),
      which makes their exports client references on the server. The country,
      shipping and discount tables they hold are therefore *mirrored* here and
      in the pricing module, with the source of truth named at each mirror.

   Importable from both server and client: it pulls in nothing but zod.
   ========================================================================== */

/* ------------------------------------------------------------- primitives -- */

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export const currencySchema = z.enum(CURRENCIES);

export const emailSchema = z
  .email('Enter a valid email address.')
  .max(180, 'That address is longer than we can store.')
  .transform((value) => value.trim().toLowerCase());

/** Loose on formatting, strict on shape — couriers dial what people type. */
const PHONE = /^\+?[\d][\d\s().-]{6,17}$/;

export const phoneSchema = z
  .string()
  .trim()
  .regex(PHONE, 'Enter a phone number the courier can reach you on.');

const NAME = /^[\p{L}\p{M}'’.\- ]+$/u;

/** Minor units. Nothing negative, nothing beyond a plausible basket. */
const minorUnits = z.number().int().min(0).max(1_000_000_000);

/* ---------------------------------------------------------- destinations -- */

/**
 * Mirrors `COUNTRIES` in `src/components/checkout/schema.ts`. That module is
 * the client's source of truth for labels and examples; this table exists so
 * the server can validate a destination without importing it. Codes and
 * patterns must stay in step — a country added there and missed here is
 * rejected at the API with "We do not ship there yet."
 */
export const SHIPPING_COUNTRIES: { code: string; name: string; postalLabel: string; postalPattern?: RegExp; postalExample: string }[] = [
  { code: 'IN', name: 'India', postalLabel: 'PIN code', postalPattern: /^[1-9]\d{5}$/, postalExample: '560001' },
  { code: 'AE', name: 'United Arab Emirates', postalLabel: 'postal code', postalExample: '00000' },
  { code: 'AU', name: 'Australia', postalLabel: 'postcode', postalPattern: /^\d{4}$/, postalExample: '3000' },
  { code: 'CA', name: 'Canada', postalLabel: 'postal code', postalPattern: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, postalExample: 'M5V 2T6' },
  { code: 'DE', name: 'Germany', postalLabel: 'Postleitzahl', postalPattern: /^\d{5}$/, postalExample: '10115' },
  { code: 'FR', name: 'France', postalLabel: 'code postal', postalPattern: /^\d{5}$/, postalExample: '75001' },
  { code: 'GB', name: 'United Kingdom', postalLabel: 'postcode', postalPattern: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/, postalExample: 'EC1A 1BB' },
  { code: 'JP', name: 'Japan', postalLabel: 'postal code', postalPattern: /^\d{3}-?\d{4}$/, postalExample: '100-0001' },
  { code: 'SG', name: 'Singapore', postalLabel: 'postal code', postalPattern: /^\d{6}$/, postalExample: '018956' },
  { code: 'US', name: 'United States', postalLabel: 'ZIP code', postalPattern: /^\d{5}(-\d{4})?$/, postalExample: '10001' },
];

export function shippingCountry(code: string) {
  return SHIPPING_COUNTRIES.find((country) => country.code === code) ?? null;
}

/** Mirrors `ShippingMethodId` in `src/components/checkout/schema.ts`. */
export const SHIPPING_METHOD_IDS = ['standard', 'express', 'priority'] as const;
export const shippingMethodSchema = z.enum(SHIPPING_METHOD_IDS, 'Choose a delivery method.');
export type ShippingMethodId = z.infer<typeof shippingMethodSchema>;

/* ---------------------------------------------------------------- address -- */

export const addressSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter the full name on the delivery.')
      .max(80, 'That name is longer than the label allows.')
      .regex(NAME, 'Use letters, spaces, hyphens and apostrophes only.'),
    line1: z.string().trim().min(4, 'Enter the street address.').max(120, 'Keep this under 120 characters.'),
    line2: z.string().trim().max(120, 'Keep this under 120 characters.').default(''),
    city: z.string().trim().min(2, 'Enter the city or town.').max(60, 'Keep this under 60 characters.'),
    region: z.string().trim().min(2, 'Enter the state or region.').max(60, 'Keep this under 60 characters.'),
    postalCode: z.string().trim().min(3, 'Enter the postal code.').max(12, 'That code is too long.'),
    country: z.string().trim().toUpperCase().length(2, 'Choose a destination.'),
  })
  .superRefine((value, ctx) => {
    const country = shippingCountry(value.country);
    if (!country) {
      ctx.addIssue({ code: 'custom', path: ['country'], message: 'We do not ship there yet.' });
      return;
    }
    if (country.postalPattern && !country.postalPattern.test(value.postalCode)) {
      ctx.addIssue({
        code: 'custom',
        path: ['postalCode'],
        message: `Enter a valid ${country.postalLabel} — for example ${country.postalExample}.`,
      });
    }
  });

export type AddressInput = z.infer<typeof addressSchema>;

/* --------------------------------------------------------------- checkout -- */

/**
 * A basket line as the client sees it. `unitPrice` is advisory: it is parsed
 * so the server can report a drift, and then discarded in favour of the
 * catalogue price. Never bill from this number.
 */
export const cartLineSchema = z.object({
  productId: z.string().trim().min(1, 'Missing product reference.').max(80),
  variantId: z.string().trim().min(1, 'Missing variant reference.').max(140),
  slug: z.string().trim().min(1, 'Missing product slug.').max(140),
  name: z.string().trim().max(160).default(''),
  colorway: z.string().trim().max(60).default(''),
  size: z.string().trim().max(24).default(''),
  quantity: z.number().int().min(1, 'Quantity must be at least one.').max(20, 'Twenty per line is the maximum.'),
  unitPrice: minorUnits,
  image: z.string().trim().max(400).default(''),
});

export type CartLineInput = z.infer<typeof cartLineSchema>;

const discountCodeSchema = z
  .string()
  .trim()
  .max(40)
  .transform((value) => value.toUpperCase())
  .nullable();

/** Body of `POST /api/checkout/intent`. Shape set by `createPaymentIntent()`. */
export const checkoutIntentSchema = z.object({
  /** Advisory — compared against the server total, never charged. */
  amount: minorUnits,
  currency: currencySchema,
  email: emailSchema,
  items: z.array(cartLineSchema).min(1, 'The basket is empty.').max(50, 'That is more lines than we can process at once.'),
  shippingAddress: addressSchema,
  shippingMethod: shippingMethodSchema,
  discountCode: discountCodeSchema.default(null),
});

export type CheckoutIntentInput = z.infer<typeof checkoutIntentSchema>;

/** Body of `POST /api/orders`. Shape set by `buildOrderPayload()`. */
export const orderSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  marketingOptIn: z.boolean().default(false),
  currency: currencySchema,
  items: z.array(cartLineSchema).min(1, 'The basket is empty.').max(50),
  shippingAddress: addressSchema,
  /** Null when the payment provider collected billing details instead. */
  billingAddress: addressSchema.nullable().default(null),
  shippingMethod: shippingMethodSchema,
  discountCode: discountCodeSchema.default(null),
  /** Advisory totals — recomputed before the order is written. */
  subtotal: minorUnits,
  discount: minorUnits,
  shipping: minorUnits,
  tax: minorUnits,
  total: minorUnits,
  paymentIntentId: z.string().trim().max(120).nullable().default(null),
  demo: z.boolean().default(false),
  notes: z.string().trim().max(1000).default(''),
});

export type OrderInput = z.infer<typeof orderSchema>;

/* -------------------------------------------------------------- marketing -- */

/**
 * `consent` must be a literal `true`. An unchecked box is not a subscription,
 * and the `newsletter signup` RLS policy refuses the row without it.
 * `company` is the honeypot the form renders off-screen — a filled value means
 * an automated submission and is accepted-then-discarded by the route.
 */
export const newsletterSchema = z.object({
  email: emailSchema,
  source: z.string().trim().min(1).max(60).default('site'),
  consent: z.literal(true, 'Consent is required before we can send anything.'),
  company: z.string().max(200).optional(),
});

export type NewsletterInput = z.infer<typeof newsletterSchema>;

export const CONTACT_TOPICS = ['general', 'order', 'product', 'press', 'wholesale'] as const;

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Tell us who you are.')
    .max(80, 'That name is longer than we can store.')
    .regex(NAME, 'Use letters, spaces, hyphens and apostrophes only.'),
  email: emailSchema,
  topic: z.enum(CONTACT_TOPICS).default('general'),
  orderNumber: z
    .string()
    .trim()
    .regex(/^VY-\d{4,6}$/i, 'Order numbers look like VY-01042.')
    .nullable()
    .optional(),
  subject: z.string().trim().min(3, 'Give the message a subject.').max(140, 'Keep the subject under 140 characters.'),
  message: z
    .string()
    .trim()
    .min(20, 'A little more detail will get you a better answer.')
    .max(4000, 'Keep the message under 4,000 characters.'),
  company: z.string().max(200).optional(),
});

export type ContactInput = z.infer<typeof contactSchema>;

/* ---------------------------------------------------------------- reviews -- */

export const reviewSchema = z.object({
  productId: z.string().trim().min(1).max(80),
  rating: z.number().int().min(1, 'Rate it from one to five.').max(5, 'Rate it from one to five.'),
  title: z.string().trim().max(80, 'Keep the headline under 80 characters.').nullable().default(null),
  body: z
    .string()
    .trim()
    .min(20, 'Twenty characters or more, so it is useful to someone else.')
    .max(2000, 'Keep the review under 2,000 characters.'),
  authorName: z.string().trim().min(2, 'Enter the name to publish this under.').max(60),
});

export type ReviewInput = z.infer<typeof reviewSchema>;

/* ----------------------------------------------------------------- search -- */

export const searchQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, 'Search needs at least two characters.')
    .max(80, 'That query is longer than the index accepts.'),
});

const boolish = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

/** Query string of `GET /api/products`. Mirrors `ShopFilters` in the repo. */
export const productQuerySchema = z.object({
  category: z.string().trim().max(60).optional(),
  collection: z.string().trim().max(60).optional(),
  colorway: z.string().trim().max(60).optional(),
  size: z.string().trim().max(16).optional(),
  minPrice: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(1_000_000_000).optional(),
  inStock: boolish.optional(),
  sort: z.enum(['featured', 'newest', 'price-asc', 'price-desc', 'name']).optional(),
  q: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(24),
  offset: z.coerce.number().int().min(0).max(10_000).default(0),
});

export type ProductQueryInput = z.infer<typeof productQuerySchema>;

/* -------------------------------------------------------------- analytics -- */

/**
 * Mirrors the `AnalyticsEvent` union in `src/lib/analytics.ts`. That module is
 * `'use client'`, so the union cannot be imported here; adding an event means
 * adding it in both places. The route rejects anything outside this list —
 * an open `name` field is an open write channel.
 */
export const ANALYTICS_EVENT_NAMES = [
  'page_view',
  'product_view',
  '3d_view_started',
  '3d_interaction',
  'product_transformation_view',
  'add_to_cart',
  'remove_from_cart',
  'wishlist_add',
  'wishlist_remove',
  'checkout_started',
  'checkout_step',
  'purchase',
  'newsletter_signup',
  'search',
  'login',
  'signup',
] as const;

/** Props are free-form but bounded: scalars only, at most 24 keys. */
const analyticsPropValue = z.union([z.string().max(300), z.number(), z.boolean(), z.null()]);

export const analyticsEventSchema = z.object({
  name: z.enum(ANALYTICS_EVENT_NAMES, 'Unknown event name.'),
  props: z.record(z.string().max(60), analyticsPropValue).default({}),
  sessionId: z.string().trim().max(120).nullable().default(null),
});

export const analyticsBatchSchema = z.object({
  events: z.array(analyticsEventSchema).min(1, 'Send at least one event.').max(20, 'Twenty events per batch is the maximum.'),
});

/**
 * Either shape. Parse against this only when the payload's shape is unknown —
 * a failed union reports "Invalid input" rather than naming the offending
 * field, so the route branches on the presence of `events` and parses the
 * specific schema, which keeps the per-field messages intact.
 */
export const analyticsPayloadSchema = z.union([analyticsEventSchema, analyticsBatchSchema]);

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

/* ------------------------------------------------------- admin: products -- */

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a 6-digit hex colour');

export const adminVariantSchema = z.object({
  id: z.string().max(140).optional(),
  sku: z.string().trim().min(2, 'SKU required').max(40),
  colorway: z.string().trim().min(1, 'Colourway required').max(40),
  colorHex: hexColor,
  size: z.string().trim().min(1, 'Size required').max(16),
  priceOverride: z.number().int().min(0).max(1_000_000_000).nullable().default(null),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  lowStockThreshold: z.number().int().min(0).max(10_000).default(4),
  weightGrams: z.number().int().min(0).max(100_000).nullable().default(null),
});

export const adminImageSchema = z.object({
  id: z.string().max(140).optional(),
  url: z.string().trim().min(1, 'Image path required').max(300),
  alt: z.string().trim().max(200).default(''),
  kind: z.enum(['editorial', 'technical', 'detail', 'flat']),
  colorway: z.string().trim().max(40).nullable().default(null),
  position: z.number().int().min(0).max(999).default(0),
});

export const adminModelSchema = z.object({
  id: z.string().max(140).optional(),
  url: z.string().trim().min(1, 'Model path required').max(300),
  format: z.enum(['glb', 'gltf']),
  mode: z.enum(['default', 'transformation', 'exploded']),
  placeholder: z.boolean().default(true),
  sizeBytes: z.number().int().min(0).nullable().default(null),
});

export const adminSpecSchema = z.object({
  label: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(200),
  group: z.enum(['materials', 'construction', 'dimensions', 'care', 'performance']),
});

export const adminFeatureSchema = z.object({
  title: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(400),
  icon: z.string().trim().min(1).max(40),
});

export const adminHotspotSchema = z.object({
  id: z.string().max(60).optional(),
  title: z.string().trim().min(1).max(60),
  body: z.string().trim().min(1).max(300),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

/**
 * The admin product payload. `src/app/admin/actions.ts` validates the same
 * shape from `FormData` inside its Server Action; this schema is the JSON
 * equivalent for any route or script that writes a product.
 */
export const adminProductSchema = z.object({
  id: z.string().max(80).optional(),
  name: z.string().trim().min(2, 'Name required').max(90),
  slug: z
    .string()
    .trim()
    .min(2, 'Slug required')
    .max(90)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  subtitle: z.string().trim().max(120).nullable().default(null),
  story: z.string().trim().max(4000).default(''),
  description: z.string().trim().min(1, 'Description required').max(2000),
  status: z.enum(['draft', 'published', 'archived']),
  price: z.number().int().min(0, 'Price cannot be negative').max(1_000_000_000),
  compareAtPrice: z.number().int().min(0).max(1_000_000_000).nullable().default(null),
  currency: currencySchema,
  categorySlug: z.string().trim().min(1, 'Choose a category').max(60),
  collectionSlugs: z.array(z.string().trim().max(60)).max(12).default([]),
  badges: z.array(z.string().trim().max(40)).max(6).default([]),
  care: z.array(z.string().trim().max(160)).max(12).default([]),
  featured: z.boolean().default(false),
  variants: z.array(adminVariantSchema).min(1, 'At least one variant is required').max(120),
  images: z.array(adminImageSchema).min(1, 'At least one image is required').max(24),
  models: z.array(adminModelSchema).max(6).default([]),
  specs: z.array(adminSpecSchema).max(40).default([]),
  features: z.array(adminFeatureSchema).max(12).default([]),
  hotspots: z.array(adminHotspotSchema).max(12).default([]),
});

export type AdminProductInput = z.infer<typeof adminProductSchema>;

/* ----------------------------------------------------------- issue shapes -- */

/** Flattens a failed parse into `{ 'path.to.field': firstMessage }`. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** The one sentence to show a person when a body fails validation. */
export function firstMessage(error: z.ZodError, fallback = 'That request was not valid.'): string {
  return error.issues[0]?.message ?? fallback;
}

export type ParseOutcome<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; fields: Record<string, string> };

/** Runs a schema and returns a flat, renderable result. Never throws. */
export function parseInput<T>(schema: z.ZodType<T>, value: unknown): ParseOutcome<T> {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, message: firstMessage(result.error), fields: fieldErrors(result.error) };
}
