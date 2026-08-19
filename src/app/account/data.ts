import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { getSession, isDemoAuth } from '@/lib/auth';
import type { Address, Order, OrderItem, OrderStatus } from '@/types';

/* ==========================================================================
   Account read model.

   Every function returns the same shape whether it was served by Supabase or
   by the demo set, so no screen needs a branch. `demoAccountData()` tells the
   UI when to label what it is showing — demo content is never passed off as a
   real order.

   The `Database` type in `@/lib/supabase/types` is a deliberately loose stub
   until the project is linked, so rows arrive as `Record<string, Json>`. The
   coercion below turns that into the strict domain model without `any` and
   without throwing on a partial row.
   ========================================================================== */

type Row = Record<string, unknown>;

const asRow = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};

const asRows = (value: unknown): Row[] => (Array.isArray(value) ? value.map(asRow) : []);

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const nullableStr = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const num = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const bool = (value: unknown): boolean => value === true;

const ORDER_STATUSES: OrderStatus[] = [
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
];

const asStatus = (value: unknown): OrderStatus =>
  ORDER_STATUSES.find((status) => status === value) ?? 'pending';

function asAddressBlock(value: unknown): Omit<Address, 'id' | 'userId'> | null {
  const row = asRow(value);
  if (!row.line1 && !row.full_name && !row.fullName) return null;
  return {
    label: nullableStr(row.label),
    fullName: str(row.full_name ?? row.fullName),
    line1: str(row.line1),
    line2: nullableStr(row.line2),
    city: str(row.city),
    region: str(row.region),
    postalCode: str(row.postal_code ?? row.postalCode),
    country: str(row.country, 'IN'),
    phone: nullableStr(row.phone),
    isDefaultShipping: bool(row.is_default_shipping ?? row.isDefaultShipping),
    isDefaultBilling: bool(row.is_default_billing ?? row.isDefaultBilling),
  };
}

function toOrderItem(row: Row): OrderItem {
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

function toOrder(row: Row): Order {
  return {
    id: str(row.id),
    orderNumber: str(row.order_number),
    userId: nullableStr(row.user_id),
    email: str(row.email),
    status: asStatus(row.status),
    currency: (str(row.currency, 'INR') as Order['currency']) ?? 'INR',
    subtotal: num(row.subtotal),
    shipping: num(row.shipping),
    tax: num(row.tax),
    discount: num(row.discount),
    total: num(row.total),
    items: asRows(row.order_items).map(toOrderItem),
    shippingAddress: asAddressBlock(row.shipping_address),
    billingAddress: asAddressBlock(row.billing_address),
    trackingNumber: nullableStr(row.tracking_number),
    carrier: nullableStr(row.carrier),
    placedAt: str(row.placed_at, new Date(0).toISOString()),
    updatedAt: str(row.updated_at, str(row.placed_at, new Date(0).toISOString())),
    notes: nullableStr(row.notes),
  };
}

function toAddress(row: Row): Address {
  return {
    id: str(row.id),
    userId: str(row.user_id),
    label: nullableStr(row.label),
    fullName: str(row.full_name),
    line1: str(row.line1),
    line2: nullableStr(row.line2),
    city: str(row.city),
    region: str(row.region),
    postalCode: str(row.postal_code),
    country: str(row.country, 'IN'),
    phone: nullableStr(row.phone),
    isDefaultShipping: bool(row.is_default_shipping),
    isDefaultBilling: bool(row.is_default_billing),
  };
}

/* ------------------------------------------------------------- demo data -- */

const DEMO_SHIPPING: Omit<Address, 'id' | 'userId'> = {
  label: 'Home',
  fullName: 'Demo Account',
  line1: '14 Anand Niketan',
  line2: 'Block C',
  city: 'New Delhi',
  region: 'Delhi',
  postalCode: '110021',
  country: 'IN',
  phone: '+91 98110 00000',
  isDefaultShipping: true,
  isDefaultBilling: true,
};

/**
 * Three orders across three states so the timeline, tracking block and empty
 * paths can all be seen. Every screen that renders these also renders the
 * demo label — see `demoAccountData()`.
 */
export const DEMO_ORDERS: Order[] = [
  {
    id: 'demo-order-3',
    orderNumber: 'VY-01058',
    userId: 'demo-user',
    email: 'demo@vayro.example',
    status: 'processing',
    currency: 'INR',
    subtotal: 349900,
    shipping: 19900,
    tax: 0,
    discount: 0,
    total: 369800,
    items: [
      {
        id: 'demo-item-3a',
        productId: 'prd-ridgeline-mid',
        variantId: 'prd-ridgeline-mid-deep-forest-l',
        name: 'Ridgeline Grid Mid',
        colorway: 'Deep Forest',
        size: 'L',
        sku: 'RDG-DEE-L',
        unitPrice: 349900,
        quantity: 1,
        image: '/media/studio-forest.webp',
      },
    ],
    shippingAddress: DEMO_SHIPPING,
    billingAddress: DEMO_SHIPPING,
    trackingNumber: null,
    carrier: null,
    placedAt: '2026-08-15T11:22:00.000Z',
    updatedAt: '2026-08-16T09:05:00.000Z',
    notes: null,
  },
  {
    id: 'demo-order-2',
    orderNumber: 'VY-01052',
    userId: 'demo-user',
    email: 'demo@vayro.example',
    status: 'shipped',
    currency: 'INR',
    subtotal: 429900,
    shipping: 19900,
    tax: 0,
    discount: 0,
    total: 449800,
    items: [
      {
        id: 'demo-item-2a',
        productId: 'prd-transit-pack',
        variantId: 'prd-transit-pack-basalt-os',
        name: 'Transit Fold Pack',
        colorway: 'Basalt',
        size: 'One Size',
        sku: 'TRN-BAS-OS',
        unitPrice: 429900,
        quantity: 1,
        image: '/media/studio-dark.webp',
      },
    ],
    shippingAddress: DEMO_SHIPPING,
    billingAddress: DEMO_SHIPPING,
    trackingNumber: 'DEMO-TRACK-4471',
    carrier: 'Bluedart',
    placedAt: '2026-08-04T06:40:00.000Z',
    updatedAt: '2026-08-12T14:10:00.000Z',
    notes: null,
  },
  {
    id: 'demo-order-1',
    orderNumber: 'VY-01047',
    userId: 'demo-user',
    email: 'demo@vayro.example',
    status: 'delivered',
    currency: 'INR',
    subtotal: 749800,
    shipping: 0,
    tax: 0,
    discount: 75000,
    total: 674800,
    items: [
      {
        id: 'demo-item-1a',
        productId: 'prd-meridian-shell',
        variantId: 'prd-meridian-shell-basalt-m',
        name: 'Meridian Carry Shell',
        colorway: 'Basalt',
        size: 'M',
        sku: 'MER-BAS-M',
        unitPrice: 599900,
        quantity: 1,
        image: '/media/studio-dark.webp',
      },
      {
        id: 'demo-item-1b',
        productId: 'prd-bearing-cap',
        variantId: 'prd-bearing-cap-sandstone-os',
        name: 'Bearing Cap',
        colorway: 'Sandstone',
        size: 'One Size',
        sku: 'BRG-SAN-OS',
        unitPrice: 149900,
        quantity: 1,
        image: '/media/studio-stone.webp',
      },
    ],
    shippingAddress: DEMO_SHIPPING,
    billingAddress: DEMO_SHIPPING,
    trackingNumber: 'DEMO-TRACK-3902',
    carrier: 'Bluedart',
    placedAt: '2026-06-02T05:15:00.000Z',
    updatedAt: '2026-06-07T12:30:00.000Z',
    notes: 'Leave with the building desk if nobody answers.',
  },
];

export const DEMO_ADDRESSES: Address[] = [
  { id: 'demo-address-1', userId: 'demo-user', ...DEMO_SHIPPING },
  {
    id: 'demo-address-2',
    userId: 'demo-user',
    label: 'Studio',
    fullName: 'Demo Account',
    line1: '2nd Floor, Kalaghoda House',
    line2: null,
    city: 'Mumbai',
    region: 'Maharashtra',
    postalCode: '400001',
    country: 'IN',
    phone: null,
    isDefaultShipping: false,
    isDefaultBilling: false,
  },
];

/* --------------------------------------------------------------- queries -- */

/**
 * True when the account screens are rendering synthetic content: either no
 * Supabase project at all, or a signed-in account whose data has not been
 * created yet in a fresh project.
 */
export async function demoAccountData(): Promise<boolean> {
  return isDemoAuth();
}

export const getMyOrders = cache(async (): Promise<Order[]> => {
  if (isDemoAuth()) return DEMO_ORDERS;

  const user = await getSession();
  if (!user) return [];

  const sb = await createClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from('orders')
    .select('*, order_items(*)')
    .eq('user_id', user.id)
    .order('placed_at', { ascending: false });

  if (error || !data) return [];
  return asRows(data).map(toOrder);
});

/** Accepts either the UUID or the human order number (VY-01047). */
export const getMyOrder = cache(async (reference: string): Promise<Order | null> => {
  const orders = await getMyOrders();
  const needle = reference.trim().toLowerCase();
  return (
    orders.find(
      (order) => order.id.toLowerCase() === needle || order.orderNumber.toLowerCase() === needle,
    ) ?? null
  );
});

export const getMyAddresses = cache(async (): Promise<Address[]> => {
  if (isDemoAuth()) return DEMO_ADDRESSES;

  const user = await getSession();
  if (!user) return [];

  const sb = await createClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from('addresses')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return asRows(data).map(toAddress);
});

/** Product ids saved server-side. The client store is the offline mirror. */
export const getMyWishlistIds = cache(async (): Promise<string[]> => {
  if (isDemoAuth()) return [];

  const user = await getSession();
  if (!user) return [];

  const sb = await createClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from('wishlist_items')
    .select('product_id, wishlists!inner(user_id)')
    .eq('wishlists.user_id', user.id);

  if (error || !data) return [];
  return asRows(data)
    .map((row) => str(row.product_id))
    .filter(Boolean);
});

/* ------------------------------------------------------------ derivation -- */

export type ProfileCompleteness = {
  percent: number;
  done: number;
  total: number;
  missing: { label: string; href: string }[];
};

/**
 * Four things make an account useful at checkout: a name, a phone number for
 * the courier, a delivery address, and a confirmed email so the order
 * confirmation actually arrives. Marketing consent is deliberately not counted
 * — opting out is a valid answer, and a bar that punishes it is dishonest.
 */
export function profileCompleteness(
  profile: { fullName: string | null; phone: string | null },
  addresses: Address[],
  emailConfirmed: boolean,
): ProfileCompleteness {
  const checks = [
    { done: Boolean(profile.fullName?.trim()), label: 'Add your name', href: '/account/profile' },
    { done: Boolean(profile.phone?.trim()), label: 'Add a phone number for deliveries', href: '/account/profile' },
    { done: addresses.length > 0, label: 'Save a delivery address', href: '/account/addresses' },
    { done: emailConfirmed, label: 'Confirm your email address', href: '/account/profile' },
  ];

  const done = checks.filter((check) => check.done).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    done,
    total: checks.length,
    missing: checks.filter((check) => !check.done).map(({ label, href }) => ({ label, href })),
  };
}
