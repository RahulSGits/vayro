import { z } from 'zod';
import { SHIPPING_FLAT, SHIPPING_FREE_THRESHOLD, cartTotals } from '@/store/cart';
import type { CartLine } from '@/types';

/* ==========================================================================
   Checkout contract — destinations, delivery, validation, arithmetic.

   Every number the checkout shows is produced here, and the standard rate is
   read from the cart store, so the drawer, the cart page and the checkout can
   never quote different figures.
   ========================================================================== */

/* ---------------------------------------------------------- destinations -- */

export type Country = {
  code: string;
  name: string;
  /** What the administrative division is called locally. */
  regionLabel: string;
  postalLabel: string;
  /** Only declared where the format is unambiguous. */
  postalPattern?: RegExp;
  postalExample: string;
  dialPrefix: string;
};

export const COUNTRIES: Country[] = [
  { code: 'IN', name: 'India', regionLabel: 'State', postalLabel: 'PIN code', postalPattern: /^[1-9]\d{5}$/, postalExample: '560001', dialPrefix: '+91' },
  { code: 'AE', name: 'United Arab Emirates', regionLabel: 'Emirate', postalLabel: 'Postal code', postalExample: '00000', dialPrefix: '+971' },
  { code: 'AU', name: 'Australia', regionLabel: 'State', postalLabel: 'Postcode', postalPattern: /^\d{4}$/, postalExample: '3000', dialPrefix: '+61' },
  { code: 'CA', name: 'Canada', regionLabel: 'Province', postalLabel: 'Postal code', postalPattern: /^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/, postalExample: 'M5V 2T6', dialPrefix: '+1' },
  { code: 'DE', name: 'Germany', regionLabel: 'State', postalLabel: 'Postleitzahl', postalPattern: /^\d{5}$/, postalExample: '10115', dialPrefix: '+49' },
  { code: 'FR', name: 'France', regionLabel: 'Region', postalLabel: 'Code postal', postalPattern: /^\d{5}$/, postalExample: '75001', dialPrefix: '+33' },
  { code: 'GB', name: 'United Kingdom', regionLabel: 'County', postalLabel: 'Postcode', postalPattern: /^[A-Za-z]{1,2}\d[A-Za-z\d]?\s?\d[A-Za-z]{2}$/, postalExample: 'EC1A 1BB', dialPrefix: '+44' },
  { code: 'JP', name: 'Japan', regionLabel: 'Prefecture', postalLabel: 'Postal code', postalPattern: /^\d{3}-?\d{4}$/, postalExample: '100-0001', dialPrefix: '+81' },
  { code: 'SG', name: 'Singapore', regionLabel: 'District', postalLabel: 'Postal code', postalPattern: /^\d{6}$/, postalExample: '018956', dialPrefix: '+65' },
  { code: 'US', name: 'United States', regionLabel: 'State', postalLabel: 'ZIP code', postalPattern: /^\d{5}(-\d{4})?$/, postalExample: '10001', dialPrefix: '+1' },
];

export const DEFAULT_COUNTRY = 'IN';

export function countryFor(code: string): Country {
  return COUNTRIES.find((c) => c.code === code) ?? COUNTRIES[0];
}

/**
 * Catalogue prices are set in India, inclusive of applicable tax. Anywhere
 * else, import charges are levied on arrival and are not ours to quote.
 */
export function taxIsIncluded(countryCode: string) {
  return countryCode === 'IN';
}

/* ------------------------------------------------------------- despatch -- */

export type ShippingMethodId = 'standard' | 'express' | 'priority';

export type ShippingMethod = {
  id: ShippingMethodId;
  name: string;
  detail: string;
  /** Rate in minor units before the free-shipping threshold is applied. */
  rate: number;
  /** Only the standard rate is waived above the threshold. */
  waivedAboveThreshold: boolean;
  /** Working days from despatch. */
  leadTime: [number, number];
  /** Availability is honest about where a next-day promise can be kept. */
  countries?: string[];
};

/** Despatch happens within two working days — the figure quoted in the footer. */
export const DESPATCH_DAYS = 2;

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: 'standard',
    name: 'Standard',
    detail: 'Tracked, signature on delivery',
    rate: SHIPPING_FLAT,
    waivedAboveThreshold: true,
    leadTime: [4, 7],
  },
  {
    id: 'express',
    name: 'Express',
    detail: 'Priority handling, tracked',
    rate: 49900,
    waivedAboveThreshold: false,
    leadTime: [2, 3],
  },
  {
    id: 'priority',
    name: 'Priority',
    detail: 'Next working day. Metro addresses in India only.',
    rate: 99900,
    waivedAboveThreshold: false,
    leadTime: [1, 1],
    countries: ['IN'],
  },
];

export function methodsFor(countryCode: string) {
  return SHIPPING_METHODS.filter((m) => !m.countries || m.countries.includes(countryCode));
}

export function methodFor(id: ShippingMethodId): ShippingMethod {
  return SHIPPING_METHODS.find((m) => m.id === id) ?? SHIPPING_METHODS[0];
}

/** Cost of a method against the merchandise total, after any discount. */
export function shippingCost(id: ShippingMethodId, merchandiseTotal: number) {
  const method = methodFor(id);
  if (method.waivedAboveThreshold && merchandiseTotal >= SHIPPING_FREE_THRESHOLD) return 0;
  return method.rate;
}

/** Adds working days, stepping over Saturdays and Sundays. */
function addWorkingDays(from: Date, days: number) {
  const date = new Date(from.getTime());
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return date;
}

/**
 * Delivery window as ISO dates: despatch, then the method's lead time.
 * Call from the client only — it reads the current date.
 */
export function estimateDelivery(id: ShippingMethodId, from: Date = new Date()) {
  const method = methodFor(id);
  const despatch = addWorkingDays(from, DESPATCH_DAYS);
  return {
    earliest: addWorkingDays(despatch, method.leadTime[0]).toISOString(),
    latest: addWorkingDays(despatch, method.leadTime[1]).toISOString(),
    despatch: despatch.toISOString(),
  };
}

/* ------------------------------------------------------------ arithmetic -- */

export type CheckoutTotals = {
  subtotal: number;
  discount: number;
  /** Subtotal after discount — what shipping thresholds are measured against. */
  merchandise: number;
  shipping: number;
  tax: number;
  taxIncluded: boolean;
  total: number;
  /** Amount still needed to reach free standard shipping. */
  toFreeShipping: number;
};

export function checkoutTotals(
  lines: CartLine[],
  discountPercent: number,
  method: ShippingMethodId,
  countryCode: string,
): CheckoutTotals {
  const base = cartTotals(lines, discountPercent);
  const merchandise = base.subtotal - base.discount;
  const shipping = lines.length === 0 ? 0 : shippingCost(method, merchandise);
  return {
    subtotal: base.subtotal,
    discount: base.discount,
    merchandise,
    shipping,
    tax: 0,
    taxIncluded: taxIsIncluded(countryCode),
    total: merchandise + shipping,
    toFreeShipping: Math.max(0, SHIPPING_FREE_THRESHOLD - merchandise),
  };
}

/* ------------------------------------------------------------ validation -- */

const NAME = /^[\p{L}\p{M}'’.\- ]+$/u;
const PHONE = /^\+?[\d][\d\s().-]{6,17}$/;

export const informationSchema = z.object({
  email: z.email('Enter an email address we can send the receipt to.'),
  phone: z
    .string()
    .trim()
    .regex(PHONE, 'Enter a phone number the courier can reach you on.'),
  marketingOptIn: z.boolean(),
});

export type InformationValues = z.infer<typeof informationSchema>;

export const addressSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Enter the full name on the delivery.')
      .max(80, 'That name is longer than the label allows.')
      .regex(NAME, 'Use letters, spaces, hyphens and apostrophes only.'),
    line1: z.string().trim().min(4, 'Enter the street address.').max(120, 'Keep this under 120 characters.'),
    line2: z.string().trim().max(120, 'Keep this under 120 characters.'),
    city: z.string().trim().min(2, 'Enter the city or town.').max(60, 'Keep this under 60 characters.'),
    region: z.string().trim().min(2, 'Enter the state or region.').max(60, 'Keep this under 60 characters.'),
    postalCode: z.string().trim().min(3, 'Enter the postal code.').max(12, 'That code is too long.'),
    country: z.string().length(2, 'Choose a destination.'),
  })
  .superRefine((value, ctx) => {
    const country = COUNTRIES.find((c) => c.code === value.country);
    if (!country) {
      ctx.addIssue({ code: 'custom', path: ['country'], message: 'We do not ship there yet.' });
      return;
    }
    if (country.postalPattern && !country.postalPattern.test(value.postalCode)) {
      ctx.addIssue({
        code: 'custom',
        path: ['postalCode'],
        message: `Enter a valid ${country.postalLabel.toLowerCase()} — for example ${country.postalExample}.`,
      });
    }
  });

export type AddressValues = z.infer<typeof addressSchema>;

export const emptyInformation: InformationValues = {
  email: '',
  phone: '',
  marketingOptIn: false,
};

export const emptyAddress: AddressValues = {
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: DEFAULT_COUNTRY,
};

/** Flattens a failed parse into `{ fieldName: firstMessage }`. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || 'form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/** Runs a schema and returns errors keyed by field, or null when valid. */
export function validate<T>(
  schema: z.ZodType<T>,
  value: unknown,
): { ok: true; data: T } | { ok: false; errors: Record<string, string> } {
  const result = schema.safeParse(value);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, errors: fieldErrors(result.error) };
}

/* -------------------------------------------------------------- display -- */

/** Postal-service ordering, one line per element. */
export function addressLines(address: AddressValues): string[] {
  return [
    address.fullName,
    address.line1,
    address.line2,
    [address.city, address.region].filter(Boolean).join(', '),
    address.postalCode,
    countryFor(address.country).name,
  ].filter((line) => line.trim().length > 0);
}
