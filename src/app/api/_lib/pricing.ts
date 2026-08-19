import 'server-only';
import { getProducts } from '@/lib/repo/products';
import type { Currency, Product, ProductVariant } from '@/types';
import type { CartLineInput, ShippingMethodId } from '@/lib/validation';

/* ==========================================================================
   Server-side pricing — the only arithmetic that is allowed to bill anyone.

   The client sends what it believes the basket costs. This module ignores it
   and rebuilds the whole total from the catalogue: every line is matched to a
   real product and a real variant, priced from `variant.priceOverride ??
   product.price`, checked against stock, and only then discounted, shipped
   and summed. A tampered `amount` changes nothing; a stale one is reported.

   ── Mirrors, and why ─────────────────────────────────────────────────────
   `SHIPPING_FLAT`, `SHIPPING_FREE_THRESHOLD` and the discount table live in
   `src/store/cart.ts`; the method table and delivery estimate live in
   `src/components/checkout/schema.ts`. Both are `'use client'` (directly or
   transitively), so importing them here would yield client references, not
   values. They are mirrored below. Change one, change both — the checkout and
   the receipt must never quote different figures.
   ========================================================================== */

/** Mirrors `SHIPPING_FREE_THRESHOLD` in `src/store/cart.ts`. */
export const SHIPPING_FREE_THRESHOLD = 500_000;
/** Mirrors `SHIPPING_FLAT` in `src/store/cart.ts`. */
export const SHIPPING_FLAT = 19_900;
/** Mirrors `DESPATCH_DAYS` in `src/components/checkout/schema.ts`. */
export const DESPATCH_DAYS = 2;

export interface ShippingMethod {
  id: ShippingMethodId;
  name: string;
  /** Rate in minor units, before the free-shipping threshold. */
  rate: number;
  waivedAboveThreshold: boolean;
  /** Working days from despatch. */
  leadTime: [number, number];
  /** Undefined means every destination we ship to. */
  countries?: string[];
}

/** Mirrors `SHIPPING_METHODS` in `src/components/checkout/schema.ts`. */
export const SHIPPING_METHODS: ShippingMethod[] = [
  { id: 'standard', name: 'Standard', rate: SHIPPING_FLAT, waivedAboveThreshold: true, leadTime: [4, 7] },
  { id: 'express', name: 'Express', rate: 49_900, waivedAboveThreshold: false, leadTime: [2, 3] },
  { id: 'priority', name: 'Priority', rate: 99_900, waivedAboveThreshold: false, leadTime: [1, 1], countries: ['IN'] },
];

export function shippingMethod(id: ShippingMethodId): ShippingMethod {
  return SHIPPING_METHODS.find((method) => method.id === id) ?? SHIPPING_METHODS[0];
}

/**
 * Mirrors `DEMO_CODES` in `src/store/cart.ts`. Percentages off the merchandise
 * subtotal. A code the client claims but this table does not know is dropped
 * silently — the basket is simply priced without it.
 */
export const DISCOUNT_CODES: Record<string, number> = { FIRSTLAYER: 10, FIELDTEST: 15 };

/**
 * Catalogue prices are set in India, inclusive of applicable tax. Everywhere
 * else, import charges are levied on arrival and are not ours to quote.
 * Mirrors `taxIsIncluded()` in `src/components/checkout/schema.ts`.
 */
export function taxIsIncluded(countryCode: string): boolean {
  return countryCode === 'IN';
}

/* ----------------------------------------------------------------- lines -- */

export interface PricedLine {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  colorway: string;
  size: string;
  /** The warehouse SKU, resolved from the catalogue — never from the client. */
  sku: string;
  quantity: number;
  /** Catalogue price for this variant, in minor units. */
  unitPrice: number;
  lineTotal: number;
  image: string;
}

export interface PricedBasket {
  currency: Currency;
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  discountCode: string | null;
  discountPercent: number;
  /** Subtotal after discount — what the shipping threshold measures. */
  merchandise: number;
  shipping: number;
  shippingMethod: ShippingMethodId;
  tax: number;
  taxIncluded: boolean;
  total: number;
  /** True when the client's declared total did not match this one. */
  repriced: boolean;
  /** The figure the client sent, kept for logging. */
  clientTotal: number | null;
}

export type PricingFailureCode =
  | 'empty_basket'
  | 'unknown_item'
  | 'out_of_stock'
  | 'currency_mismatch'
  | 'method_unavailable';

export type PricingOutcome =
  | { ok: true; basket: PricedBasket }
  | { ok: false; code: PricingFailureCode; message: string; items?: string[] };

interface PriceInput {
  items: CartLineInput[];
  shippingMethod: ShippingMethodId;
  countryCode: string;
  discountCode: string | null;
  /** Declared by the client. Used only to detect drift. */
  declaredTotal?: number | null;
}

/** Matches a client line to a catalogue product. Slug first — ids can churn. */
function findProduct(products: Product[], line: CartLineInput): Product | undefined {
  return products.find((product) => product.slug === line.slug) ?? products.find((product) => product.id === line.productId);
}

/** Variant id is authoritative; colourway + size is the human fallback. */
function findVariant(product: Product, line: CartLineInput): ProductVariant | undefined {
  return (
    product.variants.find((variant) => variant.id === line.variantId) ??
    product.variants.find(
      (variant) =>
        variant.colorway.toLowerCase() === line.colorway.toLowerCase() &&
        variant.size.toLowerCase() === line.size.toLowerCase(),
    )
  );
}

function describeLine(product: Product, variant: ProductVariant): string {
  const spec = [variant.colorway, variant.size].filter(Boolean).join(' · ');
  return spec ? `${product.name} (${spec})` : product.name;
}

/**
 * Rebuilds the basket from the catalogue and returns the authoritative total.
 * Every failure names the offending lines so the customer can fix the bag
 * rather than being told "something went wrong".
 */
export async function priceBasket(input: PriceInput): Promise<PricingOutcome> {
  if (input.items.length === 0) {
    return { ok: false, code: 'empty_basket', message: 'There is nothing in the bag to pay for.' };
  }

  const products = await getProducts();

  const lines: PricedLine[] = [];
  const unknown: string[] = [];
  const unavailable: string[] = [];
  const currencies = new Set<Currency>();

  for (const item of input.items) {
    const product = findProduct(products, item);
    if (!product) {
      unknown.push(item.name || item.slug);
      continue;
    }

    const variant = findVariant(product, item);
    if (!variant) {
      unknown.push(`${product.name} (${[item.colorway, item.size].filter(Boolean).join(' · ')})`);
      continue;
    }

    if (!variant.available || variant.stock < item.quantity) {
      unavailable.push(describeLine(product, variant));
      continue;
    }

    const unitPrice = variant.priceOverride ?? product.price;
    currencies.add(product.currency);

    lines.push({
      productId: product.id,
      variantId: variant.id,
      slug: product.slug,
      name: product.name,
      colorway: variant.colorway,
      size: variant.size,
      sku: variant.sku,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      image:
        product.images.find((image) => image.colorway === variant.colorway)?.url ??
        product.images[0]?.url ??
        '',
    });
  }

  if (unknown.length > 0) {
    return {
      ok: false,
      code: 'unknown_item',
      message:
        unknown.length === 1
          ? `${unknown[0]} is no longer in the catalogue. Remove it from the bag and try again.`
          : 'Some items are no longer in the catalogue. Refresh the bag and try again.',
      items: unknown,
    };
  }

  if (unavailable.length > 0) {
    return {
      ok: false,
      code: 'out_of_stock',
      message:
        unavailable.length === 1
          ? `${unavailable[0]} is not available in that quantity. Adjust the bag and try again.`
          : 'Some items are not available in the quantities requested. Adjust the bag and try again.',
      items: unavailable,
    };
  }

  if (currencies.size > 1) {
    return {
      ok: false,
      code: 'currency_mismatch',
      message: 'A single order cannot mix currencies. Split it into separate orders.',
    };
  }

  const method = shippingMethod(input.shippingMethod);
  if (method.countries && !method.countries.includes(input.countryCode)) {
    return {
      ok: false,
      code: 'method_unavailable',
      message: `${method.name} delivery is not available to that destination. Choose another method.`,
    };
  }

  const currency = [...currencies][0] ?? 'INR';
  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);

  const code = input.discountCode ? input.discountCode.trim().toUpperCase() : null;
  const percent = code ? (DISCOUNT_CODES[code] ?? 0) : 0;
  const discount = Math.round((subtotal * percent) / 100);
  const merchandise = subtotal - discount;

  const shipping =
    method.waivedAboveThreshold && merchandise >= SHIPPING_FREE_THRESHOLD ? 0 : method.rate;

  const total = merchandise + shipping;
  const declared = input.declaredTotal ?? null;

  return {
    ok: true,
    basket: {
      currency,
      lines,
      subtotal,
      discount,
      discountCode: percent > 0 ? code : null,
      discountPercent: percent,
      merchandise,
      shipping,
      shippingMethod: method.id,
      tax: 0,
      taxIncluded: taxIsIncluded(input.countryCode),
      total,
      repriced: declared !== null && declared !== total,
      clientTotal: declared,
    },
  };
}

/* -------------------------------------------------------------- delivery -- */

/** Adds working days, stepping over Saturdays and Sundays. */
function addWorkingDays(from: Date, days: number): Date {
  const date = new Date(from.getTime());
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const day = date.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return date;
}

/** Mirrors `estimateDelivery()` in `src/components/checkout/schema.ts`. */
export function estimateDelivery(id: ShippingMethodId, from: Date = new Date()) {
  const method = shippingMethod(id);
  const despatch = addWorkingDays(from, DESPATCH_DAYS);
  return {
    despatch: despatch.toISOString(),
    earliest: addWorkingDays(despatch, method.leadTime[0]).toISOString(),
    latest: addWorkingDays(despatch, method.leadTime[1]).toISOString(),
  };
}

/** Mirrors `methodLabel()` in `src/components/checkout/order.ts`. */
export function shippingMethodLabel(id: ShippingMethodId): string {
  const method = shippingMethod(id);
  const [min, max] = method.leadTime;
  return `${method.name} · ${min === max ? `${min} working day` : `${min}–${max} working days`}`;
}
