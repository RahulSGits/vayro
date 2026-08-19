import 'server-only';
import { orderNumber as deriveOrderNumber } from '@/lib/utils';
import { SHIPPING_COUNTRIES, type AddressInput } from '@/lib/validation';
import { getSession } from '@/lib/auth';
import type { Address, Currency, Order, OrderItem, OrderStatus } from '@/types';
import { asRow, asRows, bool, iso, nullableStr, num, oneOf, str, type Row } from '@/app/admin/_data/coerce';
import { serviceDb, type Db } from './db';
import { estimateDelivery, shippingMethodLabel, type PricedBasket } from './pricing';
import { logRouteError } from './http';

/* ==========================================================================
   Order composition and persistence.

   Shared by `POST /api/orders`, `GET /api/orders/[orderNumber]` and the Stripe
   webhook, so an order has exactly one shape however it is written or read.

   ── Two write paths, one return type ─────────────────────────────────────
   With a service-role Supabase key the order is inserted into `orders` +
   `order_items` and the database issues the number from `order_number_seq`.
   Without one, a deterministic number is derived locally and the order is
   returned unpersisted with `recorded: false`. The customer is never shown a
   receipt for something that was silently dropped — the confirmation screen
   reads that flag and labels itself.

   ── Identifier discipline ────────────────────────────────────────────────
   The seed catalogue uses readable ids (`prd-meridian-shell`); a provisioned
   database uses UUIDs. `order_items.product_id` and `variant_id` are UUID
   foreign keys, so a seed id would abort the insert. Anything that is not a
   UUID is written as null and the human-readable name, SKU and colourway carry
   the meaning instead — see `asUuid()`.
   ========================================================================== */

const ORDER_STATUSES = [
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
] as const satisfies readonly OrderStatus[];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const satisfies readonly Currency[];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A foreign key, or null when the catalogue is running on seed identifiers. */
function asUuid(value: string): string | null {
  return UUID.test(value) ? value : null;
}

export const ORDER_SELECT = `
  id, order_number, user_id, email, status, currency, subtotal, shipping, tax, discount, total,
  shipping_address, billing_address, tracking_number, carrier, notes, placed_at, updated_at,
  order_items(id, product_id, variant_id, name, colorway, size, sku, unit_price, quantity, image)
`;

/* ------------------------------------------------------------ addresses -- */

type StoredAddress = Omit<Address, 'id' | 'userId'>;

export function countryName(code: string): string {
  return SHIPPING_COUNTRIES.find((country) => country.code === code)?.name ?? code;
}

/** Validated form address -> the shape stored in `orders.shipping_address`. */
export function toStoredAddress(address: AddressInput, phone: string | null): StoredAddress {
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

/**
 * Postal-service ordering, one line per element. Mirrors `addressLines()` in
 * `src/components/checkout/schema.ts`, which is client-only.
 */
export function addressLines(address: StoredAddress | null): string[] {
  if (!address) return [];
  return [
    address.fullName,
    address.line1,
    address.line2 ?? '',
    [address.city, address.region].filter(Boolean).join(', '),
    address.postalCode,
    countryName(address.country),
  ].filter((line) => line.trim().length > 0);
}

function mapAddress(value: unknown): StoredAddress | null {
  const row = asRow(value);
  if (!row.full_name && !row.fullName && !row.line1) return null;
  return {
    label: nullableStr(row.label),
    fullName: str(row.fullName ?? row.full_name),
    line1: str(row.line1),
    line2: nullableStr(row.line2),
    city: str(row.city),
    region: str(row.region),
    postalCode: str(row.postalCode ?? row.postal_code),
    country: str(row.country, 'IN'),
    phone: nullableStr(row.phone),
    isDefaultShipping: bool(row.isDefaultShipping ?? row.is_default_shipping),
    isDefaultBilling: bool(row.isDefaultBilling ?? row.is_default_billing),
  };
}

/* ---------------------------------------------------------------- rows --- */

function mapOrderItem(row: Row): OrderItem {
  return {
    id: str(row.id),
    productId: str(row.product_id),
    variantId: str(row.variant_id),
    name: str(row.name),
    colorway: str(row.colorway),
    size: str(row.size),
    sku: str(row.sku),
    unitPrice: num(row.unit_price),
    quantity: num(row.quantity, 1),
    image: nullableStr(row.image),
  };
}

/** A `orders` row (with `order_items` embedded) coerced into the domain model. */
export function mapOrder(value: unknown): Order {
  const row = asRow(value);
  const placedAt = iso(row.placed_at, new Date().toISOString());
  return {
    id: str(row.id),
    orderNumber: str(row.order_number),
    userId: nullableStr(row.user_id),
    email: str(row.email),
    status: oneOf(row.status, ORDER_STATUSES, 'pending'),
    currency: oneOf(row.currency, CURRENCIES, 'INR'),
    subtotal: num(row.subtotal),
    shipping: num(row.shipping),
    tax: num(row.tax),
    discount: num(row.discount),
    total: num(row.total),
    items: asRows(row.order_items).map(mapOrderItem),
    shippingAddress: mapAddress(row.shipping_address),
    billingAddress: mapAddress(row.billing_address),
    trackingNumber: nullableStr(row.tracking_number),
    carrier: nullableStr(row.carrier),
    placedAt,
    updatedAt: iso(row.updated_at, placedAt),
    notes: nullableStr(row.notes),
  };
}

/* --------------------------------------------------------------- write --- */

export interface PlaceOrderInput {
  email: string;
  phone: string;
  basket: PricedBasket;
  shippingAddress: AddressInput;
  billingAddress: AddressInput | null;
  /** Null on the demo path. Never trusted for the amount. */
  paymentIntentId: string | null;
  /** True when no payment processor is configured in this environment. */
  demo: boolean;
  notes: string;
}

export interface PlacedOrder {
  order: Order;
  /** False when there was no database to write to. */
  recorded: boolean;
  demo: boolean;
  delivery: { despatch: string; earliest: string; latest: string };
}

function orderItemsFor(basket: PricedBasket) {
  return basket.lines.map((line) => ({
    product_id: asUuid(line.productId),
    variant_id: asUuid(line.variantId),
    name: line.name,
    colorway: line.colorway,
    size: line.size,
    sku: line.sku,
    unit_price: line.unitPrice,
    quantity: line.quantity,
    image: line.image || null,
  }));
}

/** The in-memory order returned when nothing could be persisted. */
function localOrder(input: PlaceOrderInput, status: OrderStatus): Order {
  const number = deriveOrderNumber(`${input.email}:${input.basket.total}:${Date.now()}`);
  const now = new Date().toISOString();
  const shipping = toStoredAddress(input.shippingAddress, input.phone);

  return {
    id: `local-${number}`,
    orderNumber: number,
    userId: null,
    email: input.email,
    status,
    currency: input.basket.currency,
    subtotal: input.basket.subtotal,
    shipping: input.basket.shipping,
    tax: input.basket.tax,
    discount: input.basket.discount,
    total: input.basket.total,
    items: input.basket.lines.map((line, index) => ({
      id: `${number}-${index + 1}`,
      productId: line.productId,
      variantId: line.variantId,
      name: line.name,
      colorway: line.colorway,
      size: line.size,
      sku: line.sku,
      unitPrice: line.unitPrice,
      quantity: line.quantity,
      image: line.image || null,
    })),
    shippingAddress: shipping,
    billingAddress: input.billingAddress
      ? toStoredAddress(input.billingAddress, input.phone)
      : null,
    trackingNumber: null,
    carrier: null,
    placedAt: now,
    updatedAt: now,
    notes: input.notes || null,
  };
}

/**
 * Writes the order. Persistence is attempted whenever a service-role key is
 * present; a database failure degrades to the local record rather than losing
 * a paid basket, and is logged loudly.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlacedOrder> {
  const status: OrderStatus = input.demo ? 'pending' : input.paymentIntentId ? 'paid' : 'pending';
  const delivery = estimateDelivery(input.basket.shippingMethod);
  const db = serviceDb();

  if (!db) return { order: localOrder(input, status), recorded: false, demo: input.demo, delivery };

  // Attributed to the signed-in customer when there is one; guest checkout
  // leaves `user_id` null, which the schema allows.
  const session = await getSession();

  try {
    const { data, error } = await db
      .from('orders')
      .insert({
        user_id: session?.id ?? null,
        email: input.email,
        status,
        currency: input.basket.currency,
        subtotal: input.basket.subtotal,
        shipping: input.basket.shipping,
        tax: input.basket.tax,
        discount: input.basket.discount,
        total: input.basket.total,
        shipping_address: toStoredAddress(input.shippingAddress, input.phone),
        billing_address: input.billingAddress
          ? toStoredAddress(input.billingAddress, input.phone)
          : null,
        notes: input.notes || null,
        stripe_payment_intent: input.paymentIntentId,
      })
      .select('id, order_number, placed_at, updated_at')
      .single();

    if (error || !data) {
      logRouteError('orders', error?.message ?? 'insert returned no row', { stage: 'orders' });
      return { order: localOrder(input, status), recorded: false, demo: input.demo, delivery };
    }

    const row = asRow(data);
    const orderId = str(row.id);

    const items = orderItemsFor(input.basket).map((item) => ({ ...item, order_id: orderId }));
    const { error: itemsError } = await db.from('order_items').insert(items);

    if (itemsError) {
      // The header exists but is empty. Roll it back rather than leaving an
      // order that would show a customer a receipt with no lines on it.
      logRouteError('orders', itemsError.message, { stage: 'order_items', orderId });
      await db.from('orders').delete().eq('id', orderId);
      return { order: localOrder(input, status), recorded: false, demo: input.demo, delivery };
    }

    await reserveStock(db, input.basket);

    const order: Order = {
      ...localOrder(input, status),
      id: orderId,
      orderNumber: str(row.order_number),
      userId: session?.id ?? null,
      placedAt: iso(row.placed_at, new Date().toISOString()),
      updatedAt: iso(row.updated_at, new Date().toISOString()),
    };

    return { order, recorded: true, demo: input.demo, delivery };
  } catch (error) {
    logRouteError('orders', error, { stage: 'place' });
    return { order: localOrder(input, status), recorded: false, demo: input.demo, delivery };
  }
}

/**
 * Draws the ordered quantities out of `inventory`.
 *
 * Best-effort and deliberately non-fatal: a read-modify-write per variant can
 * lose a race under genuine concurrency, and an order that is already paid for
 * must not be rejected because a counter was contended. Failures are logged
 * and the stock figure is reconciled by the admin inventory screen.
 *
 * **Swap point** — replace the body with a single call to a Postgres function
 * that does `update inventory set stock = greatest(0, stock - $2) where
 * variant_id = $1` for the whole basket in one transaction.
 */
async function reserveStock(db: Db, basket: PricedBasket): Promise<void> {
  for (const line of basket.lines) {
    const variantId = asUuid(line.variantId);
    if (!variantId) continue;

    try {
      const { data, error } = await db
        .from('inventory')
        .select('stock')
        .eq('variant_id', variantId)
        .maybeSingle();

      if (error || !data) continue;

      const current = num(asRow(data).stock);
      const next = Math.max(0, current - line.quantity);
      if (next === current) continue;

      const { error: updateError } = await db
        .from('inventory')
        .update({ stock: next, updated_at: new Date().toISOString() })
        .eq('variant_id', variantId);

      if (updateError) {
        logRouteError('orders', updateError.message, { stage: 'inventory', sku: line.sku });
      }
    } catch (error) {
      logRouteError('orders', error, { stage: 'inventory', sku: line.sku });
    }
  }
}

/* ---------------------------------------------------------------- read --- */

/** One order by number, via the service role. Callers must authorise first. */
export async function findOrderByNumber(number: string): Promise<Order | null> {
  const db = serviceDb();
  if (!db) return null;

  const { data, error } = await db
    .from('orders')
    .select(ORDER_SELECT)
    .eq('order_number', number)
    .maybeSingle();

  if (error || !data) return null;
  return mapOrder(data);
}

/* --------------------------------------------------------------- email --- */

/** The receipt payload, assembled from the priced basket rather than the client. */
export function confirmationEmailInput(placed: PlacedOrder, email: string, basket: PricedBasket) {
  return {
    to: email,
    orderNumber: placed.order.orderNumber,
    placedAt: placed.order.placedAt,
    currency: basket.currency,
    items: basket.lines.map((line) => ({
      name: line.name,
      colorway: line.colorway,
      size: line.size,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    })),
    subtotal: basket.subtotal,
    discount: basket.discount,
    shipping: basket.shipping,
    tax: basket.tax,
    total: basket.total,
    taxIncluded: basket.taxIncluded,
    shippingAddressLines: addressLines(placed.order.shippingAddress),
    shippingMethodLabel: shippingMethodLabel(basket.shippingMethod),
    delivery: { earliest: placed.delivery.earliest, latest: placed.delivery.latest },
    demo: placed.demo,
  };
}
