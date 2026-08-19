'use client';

import { orderNumber as deriveOrderNumber } from '@/lib/utils';
import type { CartLine, Currency, Order, OrderItem } from '@/types';
import {
  type AddressValues,
  type CheckoutTotals,
  type InformationValues,
  type ShippingMethodId,
  estimateDelivery,
  methodFor,
} from './schema';

/* ==========================================================================
   Order placement — the client half of the checkout contract.

   Two endpoints are owned elsewhere in the build:

     POST /api/checkout/intent  -> { clientSecret }        (Stripe)
     POST /api/orders           -> { order } | Order       (persistence)

   Both are treated as fallible. A non-200 from the intent endpoint stops the
   flow with a real message; a non-200 from the orders endpoint is handled
   differently depending on whether money has already moved.
   ========================================================================== */

export type CheckoutDraft = {
  information: InformationValues;
  address: AddressValues;
  /** Billing details are held by the payment provider when this is false. */
  billingSame: boolean;
  method: ShippingMethodId;
  notes: string;
  step: number;
};

export type OrderPayload = {
  email: string;
  phone: string;
  marketingOptIn: boolean;
  currency: Currency;
  items: {
    productId: string;
    variantId: string;
    slug: string;
    name: string;
    colorway: string;
    size: string;
    quantity: number;
    unitPrice: number;
    image: string;
  }[];
  shippingAddress: AddressValues;
  /** Null when the payment provider collected the billing address instead. */
  billingAddress: AddressValues | null;
  shippingMethod: ShippingMethodId;
  discountCode: string | null;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  paymentIntentId: string | null;
  /** True when no payment processor is configured in this environment. */
  demo: boolean;
  notes: string;
};

export type StoredOrder = {
  order: Order;
  /** No payment was taken — the environment has no processor configured. */
  demo: boolean;
  /** False when the order could not be written to the server. */
  recorded: boolean;
  /** Delivery window quoted at the time of placement. */
  delivery: { earliest: string; latest: string; despatch: string };
};

const DRAFT_KEY = 'vayro.checkout.draft';
const ORDER_PREFIX = 'vayro.order.';

/* ------------------------------------------------------------- transport -- */

async function readErrorMessage(response: Response, fallback: string) {
  try {
    const data: unknown = await response.json();
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      const message = record.error ?? record.message;
      if (typeof message === 'string' && message.trim().length > 0) return message;
    }
  } catch {
    /* Body was empty or not JSON — the status alone has to carry the meaning. */
  }
  if (response.status === 404) {
    return `${fallback} The endpoint is not available in this environment.`;
  }
  return fallback;
}

export type IntentResult =
  | { ok: true; clientSecret: string }
  | { ok: false; message: string };

/** Creates a PaymentIntent for the current basket. */
export async function createPaymentIntent(
  payload: {
    amount: number;
    currency: Currency;
    email: string;
    items: OrderPayload['items'];
    shippingAddress: AddressValues;
    shippingMethod: ShippingMethodId;
    discountCode: string | null;
  },
  signal?: AbortSignal,
): Promise<IntentResult> {
  try {
    const response = await fetch('/api/checkout/intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        message: await readErrorMessage(response, 'Payment could not be prepared.'),
      };
    }

    const data: unknown = await response.json();
    const record = (data ?? {}) as Record<string, unknown>;
    const secret = record.clientSecret ?? record.client_secret;

    if (typeof secret !== 'string' || secret.length === 0) {
      return { ok: false, message: 'Payment could not be prepared — no client secret was returned.' };
    }
    return { ok: true, clientSecret: secret };
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return { ok: false, message: 'Cancelled.' };
    }
    return { ok: false, message: 'We could not reach the payment service. Check your connection and try again.' };
  }
}

export type SubmitResult =
  | { ok: true; order: Order }
  | { ok: false; message: string };

/** Writes the order. The server response is authoritative when it arrives. */
export async function submitOrder(payload: OrderPayload): Promise<SubmitResult> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return { ok: false, message: await readErrorMessage(response, 'The order could not be recorded.') };
  }

  const data: unknown = await response.json();
  const record = (data ?? {}) as Record<string, unknown>;
  const candidate = (record.order ?? record) as Partial<Order>;

  if (!candidate || typeof candidate.orderNumber !== 'string') {
    return { ok: false, message: 'The order service returned a response we could not read.' };
  }
  return { ok: true, order: candidate as Order };
}

/** Reads a previously placed order back from the server, if it exposes one. */
export async function fetchOrder(orderNumber: string): Promise<Order | null> {
  try {
    const response = await fetch(`/api/orders/${encodeURIComponent(orderNumber)}`, {
      headers: { accept: 'application/json' },
    });
    if (!response.ok) return null;
    const data: unknown = await response.json();
    const record = (data ?? {}) as Record<string, unknown>;
    const candidate = (record.order ?? record) as Partial<Order>;
    return typeof candidate?.orderNumber === 'string' ? (candidate as Order) : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------ composition -- */

export function toOrderItems(lines: CartLine[]): OrderItem[] {
  return lines.map((line) => ({
    id: line.id,
    productId: line.productId,
    variantId: line.variantId,
    name: line.name,
    colorway: line.colorway,
    size: line.size,
    // The bag carries the variant reference, not the warehouse SKU; the server
    // resolves the real one when it writes the order.
    sku: line.variantId,
    unitPrice: line.unitPrice,
    quantity: line.quantity,
    image: line.image || null,
  }));
}

export function toPayloadItems(lines: CartLine[]): OrderPayload['items'] {
  return lines.map((line) => ({
    productId: line.productId,
    variantId: line.variantId,
    slug: line.slug,
    name: line.name,
    colorway: line.colorway,
    size: line.size,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    image: line.image,
  }));
}

function toOrderAddress(address: AddressValues, phone: string): Order['shippingAddress'] {
  return {
    label: null,
    fullName: address.fullName,
    line1: address.line1,
    line2: address.line2 || null,
    city: address.city,
    region: address.region,
    postalCode: address.postalCode,
    country: address.country,
    phone: phone || null,
    isDefaultShipping: false,
    isDefaultBilling: false,
  };
}

export function buildOrderPayload(input: {
  lines: CartLine[];
  information: InformationValues;
  address: AddressValues;
  billing: AddressValues | null;
  method: ShippingMethodId;
  totals: CheckoutTotals;
  discountCode: string | null;
  currency: Currency;
  paymentIntentId: string | null;
  demo: boolean;
  notes: string;
}): OrderPayload {
  return {
    email: input.information.email,
    phone: input.information.phone,
    marketingOptIn: input.information.marketingOptIn,
    currency: input.currency,
    items: toPayloadItems(input.lines),
    shippingAddress: input.address,
    billingAddress: input.billing,
    shippingMethod: input.method,
    discountCode: input.discountCode,
    subtotal: input.totals.subtotal,
    discount: input.totals.discount,
    shipping: input.totals.shipping,
    tax: input.totals.tax,
    total: input.totals.total,
    paymentIntentId: input.paymentIntentId,
    demo: input.demo,
    notes: input.notes,
  };
}

/**
 * A client-side record of an order that could not be written to the server.
 * It exists so the confirmation screen can still show what was configured —
 * it is labelled as unrecorded everywhere it is displayed.
 */
export function buildLocalOrder(payload: OrderPayload, lines: CartLine[]): Order {
  const seed = `${payload.email}:${payload.total}:${Date.now()}`;
  const number = deriveOrderNumber(seed);
  const now = new Date().toISOString();

  return {
    id: `local-${number}`,
    orderNumber: number,
    userId: null,
    email: payload.email,
    status: payload.demo ? 'pending' : 'paid',
    currency: payload.currency,
    subtotal: payload.subtotal,
    shipping: payload.shipping,
    tax: payload.tax,
    discount: payload.discount,
    total: payload.total,
    items: toOrderItems(lines),
    shippingAddress: toOrderAddress(payload.shippingAddress, payload.phone),
    billingAddress: payload.billingAddress
      ? toOrderAddress(payload.billingAddress, payload.phone)
      : null,
    trackingNumber: null,
    carrier: null,
    placedAt: now,
    updatedAt: now,
    notes: payload.notes || null,
  };
}

/* ----------------------------------------------------------- persistence -- */

function session(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function stashOrder(record: StoredOrder) {
  const store = session();
  if (!store) return;
  try {
    store.setItem(`${ORDER_PREFIX}${record.order.orderNumber}`, JSON.stringify(record));
  } catch {
    /* Storage is full or blocked — the confirmation falls back to the API. */
  }
}

export function readStashedOrder(orderNumber: string): StoredOrder | null {
  const store = session();
  if (!store) return null;
  try {
    const raw = store.getItem(`${ORDER_PREFIX}${orderNumber}`);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    const record = parsed as StoredOrder;
    return record?.order?.orderNumber === orderNumber ? record : null;
  } catch {
    return null;
  }
}

export function saveDraft(draft: CheckoutDraft) {
  const store = session();
  if (!store) return;
  try {
    store.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* Nothing to do — the draft is a convenience, not a requirement. */
  }
}

export function readDraft(): CheckoutDraft | null {
  const store = session();
  if (!store) return null;
  try {
    const raw = store.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutDraft;
    if (!parsed?.information || !parsed?.address) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraft() {
  const store = session();
  if (!store) return;
  try {
    store.removeItem(DRAFT_KEY);
  } catch {
    /* Ignored. */
  }
}

/** Delivery window recorded alongside the order, so it is quoted only once. */
export function deliveryFor(method: ShippingMethodId) {
  return estimateDelivery(method);
}

export function methodLabel(method: ShippingMethodId) {
  const record = methodFor(method);
  const [min, max] = record.leadTime;
  return `${record.name} · ${min === max ? `${min} working day` : `${min}–${max} working days`}`;
}
