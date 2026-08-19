import 'server-only';
import { cache } from 'react';
import { connection } from 'next/server';
import {
  categories as seedCategories,
  collections as seedCollections,
  journalPosts as seedJournal,
  products as seedProducts,
} from '@/data/catalog';
import type {
  Address, Category, Collection, Currency, JournalPost, Order, OrderItem, OrderStatus,
  Product, ProductHotspot, ProductImage, ProductModel3D, ProductSpec, ProductStatus,
  ProductVariant, Profile,
} from '@/types';
import { adminDb } from './db';
import { REVENUE_STATUSES, demoDataset } from './demo';
import { defaultSettings, mergeSettingsGroup, SETTINGS_GROUPS, type StoreSettings } from './settings';
import {
  asOne, asRow, asRows, bool, iso, nullableNum, nullableStr, num, oneOf, str, strArray, type Row,
} from './coerce';

/* ==========================================================================
   Admin read model.
   Every function prefers Supabase and falls back to the demo dataset, so the
   admin is fully explorable before the database exists. `adminContext()` is the
   single source of truth for which mode a screen is in — the banner, the empty
   states and the mutation guards all read from it.
   ========================================================================== */

export type AdminMode = 'live' | 'no-supabase' | 'no-catalogue';

export type AdminContext = {
  demo: boolean;
  mode: AdminMode;
  /** One line, shown in the demo banner. Never mentions credentials by name. */
  message: string;
};

const DEMO_MESSAGE: Record<Exclude<AdminMode, 'live'>, string> = {
  'no-supabase': 'Demo data — connect Supabase to manage live records.',
  'no-catalogue': 'Demo data — the connected database has no catalogue yet. Seed it to manage live records.',
};

export const adminContext = cache(async (): Promise<AdminContext> => {
  // Admin screens are per-request by definition: no prerendered snapshots.
  await connection();
  const db = await adminDb();
  if (!db) return { demo: true, mode: 'no-supabase', message: DEMO_MESSAGE['no-supabase'] };

  const { count, error } = await db.from('products').select('id', { count: 'exact', head: true });
  if (error || (count ?? 0) === 0) {
    return { demo: true, mode: 'no-catalogue', message: DEMO_MESSAGE['no-catalogue'] };
  }
  return { demo: false, mode: 'live', message: '' };
});

/** True when writes cannot be persisted. Used by every server action. */
export async function isDemoMode() {
  return (await adminContext()).demo;
}

/* ----------------------------------------------------------------- mappers */

const PRODUCT_STATUSES: readonly ProductStatus[] = ['draft', 'published', 'archived'];
const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending', 'paid', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded',
];
const CURRENCIES: readonly Currency[] = ['INR', 'USD', 'EUR', 'GBP'];
const IMAGE_KINDS: readonly ProductImage['kind'][] = ['editorial', 'technical', 'detail', 'flat'];
const MODEL_MODES: readonly ProductModel3D['mode'][] = ['default', 'transformation', 'exploded'];
const SPEC_GROUPS: readonly ProductSpec['group'][] = [
  'materials', 'construction', 'dimensions', 'care', 'performance',
];

function mapSpecs(value: unknown): ProductSpec[] {
  return asRows(value).map((row) => ({
    label: str(row.label),
    value: str(row.value),
    group: oneOf(row.group, SPEC_GROUPS, 'materials'),
  }));
}

function mapHotspots(value: unknown): ProductHotspot[] {
  return asRows(value).map((row, index) => ({
    id: str(row.id, `h${index + 1}`),
    title: str(row.title),
    body: str(row.body),
    x: num(row.x),
    y: num(row.y),
  }));
}

function mapFeatures(value: unknown): Product['features'] {
  return asRows(value).map((row) => ({
    title: str(row.title),
    body: str(row.body),
    icon: str(row.icon, 'layers'),
  }));
}

function mapVariant(row: Row, productId: string): AdminVariant {
  const inventory = asOne(row.inventory);
  const stock = num(inventory.stock, 0);
  return {
    id: str(row.id),
    sku: str(row.sku),
    productId,
    colorway: str(row.colorway),
    colorHex: str(row.color_hex, '#0B0C0B'),
    size: str(row.size),
    priceOverride: nullableNum(row.price_override),
    stock,
    available: stock > 0,
    weightGrams: nullableNum(row.weight_grams),
    lowStockThreshold: num(inventory.low_stock_threshold, 4),
  };
}

function mapProduct(row: Row): AdminProduct {
  const id = str(row.id);
  const variants = asRows(row.product_variants).map((variant) => mapVariant(variant, id));
  const images: ProductImage[] = asRows(row.product_images)
    .map((image, index) => ({
      id: str(image.id, `img-${index}`),
      url: str(image.url),
      alt: str(image.alt),
      position: num(image.position, index + 1),
      kind: oneOf(image.kind, IMAGE_KINDS, 'technical'),
      colorway: nullableStr(image.colorway),
    }))
    .sort((a, b) => a.position - b.position);

  const models: ProductModel3D[] = asRows(row.product_3d_models).map((model, index) => ({
    id: str(model.id, `mdl-${index}`),
    url: str(model.url),
    format: model.format === 'gltf' ? 'gltf' : 'glb',
    mode: oneOf(model.mode, MODEL_MODES, 'default'),
    placeholder: bool(model.placeholder, true),
    sizeBytes: nullableNum(model.size_bytes),
  }));

  const createdAt = iso(row.created_at, new Date(0).toISOString());

  return {
    id,
    slug: str(row.slug),
    name: str(row.name),
    subtitle: nullableStr(row.subtitle),
    story: str(row.story),
    description: str(row.description),
    status: oneOf(row.status, PRODUCT_STATUSES, 'draft'),
    price: num(row.price),
    compareAtPrice: nullableNum(row.compare_at_price),
    currency: oneOf(row.currency, CURRENCIES, 'INR'),
    categorySlug: str(asOne(row.categories).slug),
    collectionSlugs: asRows(row.product_collections)
      .map((join) => str(asOne(join.collections).slug))
      .filter(Boolean),
    badges: strArray(row.badges),
    images,
    models,
    variants,
    specs: mapSpecs(row.specs),
    hotspots: mapHotspots(row.hotspots),
    features: mapFeatures(row.features),
    care: strArray(row.care),
    featured: bool(row.featured),
    createdAt,
    updatedAt: iso(row.updated_at, createdAt),
  };
}

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

function mapAddress(value: unknown): Omit<Address, 'id' | 'userId'> | null {
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

function mapOrder(row: Row): Order {
  const placedAt = iso(row.placed_at, new Date(0).toISOString());
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

function mapProfile(row: Row): Profile {
  return {
    id: str(row.id),
    email: str(row.email),
    fullName: nullableStr(row.full_name),
    phone: nullableStr(row.phone),
    role: row.role === 'admin' ? 'admin' : 'customer',
    marketingOptIn: bool(row.marketing_opt_in),
    createdAt: iso(row.created_at, new Date(0).toISOString()),
  };
}

function mapJournalPost(row: Row): AdminJournalPost {
  return {
    id: str(row.id),
    slug: str(row.slug),
    title: str(row.title),
    excerpt: str(row.excerpt),
    body: str(row.body),
    category: str(row.category, 'Field Notes'),
    heroImage: nullableStr(row.hero_image),
    readingMinutes: num(row.reading_minutes, 3),
    author: str(row.author, 'VAYRO Studio'),
    publishedAt: nullableStr(row.published_at),
  };
}

/* ------------------------------------------------------------------- types */

/** A variant plus the inventory row that travels with it. */
export type AdminVariant = ProductVariant & { lowStockThreshold: number };

export type AdminProduct = Omit<Product, 'variants'> & {
  updatedAt: string;
  variants: AdminVariant[];
};

export type AdminJournalPost = Omit<JournalPost, 'publishedAt'> & { publishedAt: string | null };

export type SeriesPoint = { date: string; value: number };

export type TopProduct = {
  id: string;
  name: string;
  slug: string;
  units: number;
  revenue: number;
};

export type Dashboard = {
  currency: Currency;
  revenue: number;
  revenuePrevious: number;
  orderCount: number;
  orderCountPrevious: number;
  customerCount: number;
  customerCountPrevious: number;
  averageOrderValue: number;
  unitsSold: number;
  conversionRate: number;
  sessions: number;
  lowStockCount: number;
  revenueSeries: SeriesPoint[];
  orderSeries: SeriesPoint[];
  topProducts: TopProduct[];
  recentOrders: Order[];
  statusBreakdown: { status: OrderStatus; count: number }[];
};

export type OrderListResult = {
  rows: Order[];
  total: number;
  counts: Record<OrderStatus | 'all', number>;
};

export type CustomerSummary = {
  profile: Profile;
  orderCount: number;
  lifetimeValue: number;
  lastOrderAt: string | null;
};

export type InventoryRow = {
  variantId: string;
  productId: string;
  productName: string;
  productSlug: string;
  sku: string;
  colorway: string;
  colorHex: string;
  size: string;
  stock: number;
  lowStockThreshold: number;
  status: ProductStatus;
  price: number;
  currency: Currency;
};

export type FunnelStep = { name: string; label: string; count: number };

export type AnalyticsReport = {
  days: number;
  totals: Record<string, number>;
  funnel: FunnelStep[];
  sessionsSeries: SeriesPoint[];
  productViewSeries: SeriesPoint[];
  revenueSeries: SeriesPoint[];
  topPaths: { path: string; count: number }[];
  topViewedProducts: { slug: string; name: string; count: number }[];
  topSearches: { query: string; count: number }[];
  conversionRate: number;
  addToCartRate: number;
  checkoutCompletionRate: number;
  totalEvents: number;
};

/* --------------------------------------------------------------- helpers -- */

const DAY_MS = 86_400_000;

function dayKey(iso8601: string) {
  return iso8601.slice(0, 10);
}

/** Builds a zero-filled daily series so charts never show gaps. */
function buildSeries(days: number, entries: Iterable<[string, number]>): SeriesPoint[] {
  const totals = new Map<string, number>(entries);
  const today = new Date();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const out: SeriesPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(end - offset * DAY_MS).toISOString().slice(0, 10);
    out.push({ date, value: totals.get(date) ?? 0 });
  }
  return out;
}

function windowStart(days: number) {
  const today = new Date();
  const end = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return new Date(end - (days - 1) * DAY_MS);
}

const PRODUCT_SELECT = `
  id, slug, name, subtitle, story, description, status, price, compare_at_price, currency,
  badges, specs, hotspots, features, care, featured, created_at, updated_at,
  categories(slug),
  product_collections(collections(slug)),
  product_images(id, url, alt, kind, colorway, position),
  product_3d_models(id, url, format, mode, placeholder, size_bytes),
  product_variants(id, sku, colorway, color_hex, size, price_override, weight_grams, inventory(stock, low_stock_threshold))
`;

const ORDER_SELECT = `
  id, order_number, user_id, email, status, currency, subtotal, shipping, tax, discount, total,
  shipping_address, billing_address, tracking_number, carrier, notes, placed_at, updated_at,
  order_items(id, product_id, variant_id, name, colorway, size, sku, unit_price, quantity, image)
`;

/** Seed products carry no `updatedAt` or stock thresholds — add them here. */
function seedAsAdminProducts(): AdminProduct[] {
  return seedProducts.map((product) => ({
    ...product,
    updatedAt: product.createdAt,
    variants: product.variants.map((variant) => ({ ...variant, lowStockThreshold: 4 })),
  }));
}

/* ------------------------------------------------------------- catalogue -- */

export const listProducts = cache(async (): Promise<AdminProduct[]> => {
  const { demo } = await adminContext();
  if (demo) return seedAsAdminProducts();

  const db = await adminDb();
  if (!db) return seedAsAdminProducts();
  const { data, error } = await db.from('products').select(PRODUCT_SELECT).order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load products: ${error.message}`);
  return asRows(data).map(mapProduct);
});

export const getProductById = cache(async (id: string): Promise<AdminProduct | null> => {
  const { demo } = await adminContext();
  if (demo) return seedAsAdminProducts().find((product) => product.id === id) ?? null;

  const db = await adminDb();
  if (!db) return null;
  const { data, error } = await db.from('products').select(PRODUCT_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load product: ${error.message}`);
  if (!data) return null;
  return mapProduct(asRow(data));
});

export const getTaxonomy = cache(async (): Promise<{ categories: Category[]; collections: Collection[] }> => {
  const { demo } = await adminContext();
  if (demo) return { categories: seedCategories, collections: seedCollections };

  const db = await adminDb();
  if (!db) return { categories: seedCategories, collections: seedCollections };

  const [categoryResult, collectionResult] = await Promise.all([
    db.from('categories').select('id, slug, name, description, position').order('position'),
    db.from('collections').select('id, slug, name, tagline, description, hero_image, position').order('position'),
  ]);

  const categories = asRows(categoryResult.data).map<Category>((row) => ({
    id: str(row.id),
    slug: str(row.slug),
    name: str(row.name),
    description: nullableStr(row.description),
    position: num(row.position),
  }));
  const collections = asRows(collectionResult.data).map<Collection>((row) => ({
    id: str(row.id),
    slug: str(row.slug),
    name: str(row.name),
    tagline: nullableStr(row.tagline),
    description: nullableStr(row.description),
    heroImage: nullableStr(row.hero_image),
    position: num(row.position),
  }));

  return {
    categories: categories.length ? categories : seedCategories,
    collections: collections.length ? collections : seedCollections,
  };
});

/* ----------------------------------------------------------------- orders -- */

const emptyCounts = (): Record<OrderStatus | 'all', number> => ({
  all: 0, pending: 0, paid: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0, refunded: 0,
});

export const listAllOrders = cache(async (): Promise<Order[]> => {
  const { demo } = await adminContext();
  if (demo) return demoDataset().orders;

  const db = await adminDb();
  if (!db) return [];
  const { data, error } = await db.from('orders').select(ORDER_SELECT).order('placed_at', { ascending: false });
  if (error) throw new Error(`Could not load orders: ${error.message}`);
  return asRows(data).map(mapOrder);
});

export type OrderFilters = { status?: OrderStatus | 'all'; q?: string; page?: number; perPage?: number };

export async function listOrders(filters: OrderFilters = {}): Promise<OrderListResult> {
  const all = await listAllOrders();
  const counts = emptyCounts();
  counts.all = all.length;
  for (const order of all) counts[order.status] += 1;

  const query = filters.q?.trim().toLowerCase() ?? '';
  let rows = all;
  if (filters.status && filters.status !== 'all') rows = rows.filter((order) => order.status === filters.status);
  if (query) {
    rows = rows.filter((order) =>
      [order.orderNumber, order.email, order.shippingAddress?.fullName ?? '', order.trackingNumber ?? '',
        ...order.items.map((item) => item.name)]
        .join(' ').toLowerCase().includes(query));
  }

  const total = rows.length;
  const perPage = filters.perPage ?? 25;
  const page = Math.max(1, filters.page ?? 1);
  return { rows: rows.slice((page - 1) * perPage, page * perPage), total, counts };
}

export const getOrderById = cache(async (id: string): Promise<Order | null> => {
  const { demo } = await adminContext();
  if (demo) return demoDataset().orders.find((order) => order.id === id) ?? null;

  const db = await adminDb();
  if (!db) return null;
  const { data, error } = await db.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
  if (error) throw new Error(`Could not load order: ${error.message}`);
  if (!data) return null;
  return mapOrder(asRow(data));
});

/* -------------------------------------------------------------- customers -- */

export const listProfiles = cache(async (): Promise<Profile[]> => {
  const { demo } = await adminContext();
  if (demo) return demoDataset().profiles;

  const db = await adminDb();
  if (!db) return [];
  const { data, error } = await db
    .from('profiles')
    .select('id, email, full_name, phone, role, marketing_opt_in, created_at')
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load customers: ${error.message}`);
  return asRows(data).map(mapProfile);
});

export async function listCustomers(filters: { q?: string; page?: number; perPage?: number } = {}) {
  const [profiles, orders] = await Promise.all([listProfiles(), listAllOrders()]);

  const byUser = new Map<string, Order[]>();
  const byEmail = new Map<string, Order[]>();
  for (const order of orders) {
    if (order.userId) byUser.set(order.userId, [...(byUser.get(order.userId) ?? []), order]);
    const key = order.email.toLowerCase();
    byEmail.set(key, [...(byEmail.get(key) ?? []), order]);
  }

  let rows: CustomerSummary[] = profiles.map((profile) => {
    const owned = byUser.get(profile.id) ?? byEmail.get(profile.email.toLowerCase()) ?? [];
    const paid = owned.filter((order) => REVENUE_STATUSES.includes(order.status));
    return {
      profile,
      orderCount: owned.length,
      lifetimeValue: paid.reduce((sum, order) => sum + order.total, 0),
      lastOrderAt: owned[0]?.placedAt ?? null,
    };
  });

  const query = filters.q?.trim().toLowerCase() ?? '';
  if (query) {
    rows = rows.filter((row) =>
      `${row.profile.fullName ?? ''} ${row.profile.email}`.toLowerCase().includes(query));
  }
  rows.sort((a, b) => b.lifetimeValue - a.lifetimeValue);

  const total = rows.length;
  const perPage = filters.perPage ?? 25;
  const page = Math.max(1, filters.page ?? 1);
  return { rows: rows.slice((page - 1) * perPage, page * perPage), total };
}

export async function getCustomer(id: string): Promise<
  { profile: Profile; orders: Order[]; addresses: Address[]; summary: CustomerSummary } | null
> {
  const [profiles, orders] = await Promise.all([listProfiles(), listAllOrders()]);
  const profile = profiles.find((entry) => entry.id === id);
  if (!profile) return null;

  const owned = orders.filter(
    (order) => order.userId === profile.id || order.email.toLowerCase() === profile.email.toLowerCase(),
  );
  const paid = owned.filter((order) => REVENUE_STATUSES.includes(order.status));

  const { demo } = await adminContext();
  let addresses: Address[] = [];
  if (demo) {
    const demoAddress = demoDataset().addresses[profile.id];
    addresses = demoAddress ? [demoAddress] : [];
  } else {
    const db = await adminDb();
    if (db) {
      const { data } = await db
        .from('addresses')
        .select('id, user_id, label, full_name, line1, line2, city, region, postal_code, country, phone, is_default_shipping, is_default_billing')
        .eq('user_id', profile.id);
      addresses = asRows(data).map((row) => {
        const mapped = mapAddress(row);
        return {
          id: str(row.id),
          userId: str(row.user_id),
          label: mapped?.label ?? null,
          fullName: mapped?.fullName ?? '',
          line1: mapped?.line1 ?? '',
          line2: mapped?.line2 ?? null,
          city: mapped?.city ?? '',
          region: mapped?.region ?? '',
          postalCode: mapped?.postalCode ?? '',
          country: mapped?.country ?? 'IN',
          phone: mapped?.phone ?? null,
          isDefaultShipping: mapped?.isDefaultShipping ?? false,
          isDefaultBilling: mapped?.isDefaultBilling ?? false,
        };
      });
    }
  }

  return {
    profile,
    orders: owned,
    addresses,
    summary: {
      profile,
      orderCount: owned.length,
      lifetimeValue: paid.reduce((sum, order) => sum + order.total, 0),
      lastOrderAt: owned[0]?.placedAt ?? null,
    },
  };
}

/* -------------------------------------------------------------- inventory -- */

export async function listInventory(filters: { q?: string; only?: 'all' | 'low' | 'out' } = {}) {
  const products = await listProducts();
  let rows: InventoryRow[] = products.flatMap((product) =>
    product.variants.map((variant) => ({
      variantId: variant.id,
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      sku: variant.sku,
      colorway: variant.colorway,
      colorHex: variant.colorHex,
      size: variant.size,
      stock: variant.stock,
      lowStockThreshold: variant.lowStockThreshold,
      status: product.status,
      price: variant.priceOverride ?? product.price,
      currency: product.currency,
    })),
  );

  const query = filters.q?.trim().toLowerCase() ?? '';
  if (query) {
    rows = rows.filter((row) =>
      `${row.sku} ${row.productName} ${row.colorway} ${row.size}`.toLowerCase().includes(query));
  }
  if (filters.only === 'low') rows = rows.filter((row) => row.stock > 0 && row.stock <= row.lowStockThreshold);
  if (filters.only === 'out') rows = rows.filter((row) => row.stock === 0);

  const totals = {
    units: rows.reduce((sum, row) => sum + row.stock, 0),
    skus: rows.length,
    low: rows.filter((row) => row.stock > 0 && row.stock <= row.lowStockThreshold).length,
    out: rows.filter((row) => row.stock === 0).length,
    retailValue: rows.reduce((sum, row) => sum + row.stock * row.price, 0),
  };

  rows.sort((a, b) => a.stock - b.stock || a.sku.localeCompare(b.sku));
  return { rows, totals };
}

/* ---------------------------------------------------------------- content -- */

export const listJournalPosts = cache(async (): Promise<AdminJournalPost[]> => {
  const { demo } = await adminContext();
  if (demo) return seedJournal.map((post) => ({ ...post }));

  const db = await adminDb();
  if (!db) return [];
  const { data, error } = await db
    .from('journal_posts')
    .select('id, slug, title, excerpt, body, category, hero_image, reading_minutes, author, published_at')
    .order('published_at', { ascending: false, nullsFirst: true });
  if (error) throw new Error(`Could not load journal posts: ${error.message}`);
  return asRows(data).map(mapJournalPost);
});

export const getJournalPostById = cache(async (id: string): Promise<AdminJournalPost | null> => {
  const posts = await listJournalPosts();
  return posts.find((post) => post.id === id) ?? null;
});

/* --------------------------------------------------------------- settings -- */

export const getSettings = cache(async (): Promise<StoreSettings> => {
  const { demo } = await adminContext();
  if (demo) return defaultSettings;

  const db = await adminDb();
  if (!db) return defaultSettings;
  const { data } = await db.from('settings').select('key, value');
  const stored = new Map(asRows(data).map((row) => [str(row.key), row.value]));

  const next = { ...defaultSettings };
  for (const group of SETTINGS_GROUPS) {
    // Assigning group-by-group keeps the union narrow enough for the compiler.
    switch (group) {
      case 'brand': next.brand = mergeSettingsGroup('brand', stored.get('brand')); break;
      case 'shipping': next.shipping = mergeSettingsGroup('shipping', stored.get('shipping')); break;
      case 'tax': next.tax = mergeSettingsGroup('tax', stored.get('tax')); break;
      case 'email': next.email = mergeSettingsGroup('email', stored.get('email')); break;
      case 'analytics': next.analytics = mergeSettingsGroup('analytics', stored.get('analytics')); break;
      case 'homepage': next.homepage = mergeSettingsGroup('homepage', stored.get('homepage')); break;
    }
  }
  return next;
});

/* -------------------------------------------------------------- dashboard -- */

export async function getDashboard(days = 30): Promise<Dashboard> {
  const [orders, profiles, products, analytics] = await Promise.all([
    listAllOrders(),
    listProfiles(),
    listProducts(),
    getAnalytics(days),
  ]);

  const start = windowStart(days);
  const previousStart = new Date(start.getTime() - days * DAY_MS);

  const inWindow = orders.filter((order) => new Date(order.placedAt) >= start);
  const inPrevious = orders.filter((order) => {
    const at = new Date(order.placedAt);
    return at >= previousStart && at < start;
  });

  const earning = inWindow.filter((order) => REVENUE_STATUSES.includes(order.status));
  const earningPrevious = inPrevious.filter((order) => REVENUE_STATUSES.includes(order.status));

  const revenue = earning.reduce((sum, order) => sum + order.total, 0);
  const revenuePrevious = earningPrevious.reduce((sum, order) => sum + order.total, 0);
  const unitsSold = earning.reduce(
    (sum, order) => sum + order.items.reduce((count, item) => count + item.quantity, 0), 0,
  );

  const revenueByDay = new Map<string, number>();
  const ordersByDay = new Map<string, number>();
  for (const order of inWindow) {
    const key = dayKey(order.placedAt);
    ordersByDay.set(key, (ordersByDay.get(key) ?? 0) + 1);
    if (REVENUE_STATUSES.includes(order.status)) {
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + order.total);
    }
  }

  const unitsByProduct = new Map<string, { units: number; revenue: number }>();
  for (const order of earning) {
    for (const item of order.items) {
      const entry = unitsByProduct.get(item.productId) ?? { units: 0, revenue: 0 };
      entry.units += item.quantity;
      entry.revenue += item.unitPrice * item.quantity;
      unitsByProduct.set(item.productId, entry);
    }
  }

  const topProducts: TopProduct[] = [...unitsByProduct.entries()]
    .map(([productId, entry]) => {
      const product = products.find((candidate) => candidate.id === productId);
      const fallbackName = earning
        .flatMap((order) => order.items)
        .find((item) => item.productId === productId)?.name ?? 'Unknown product';
      return {
        id: productId,
        name: product?.name ?? fallbackName,
        slug: product?.slug ?? '',
        units: entry.units,
        revenue: entry.revenue,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const statusBreakdown = ORDER_STATUSES
    .map((status) => ({ status, count: inWindow.filter((order) => order.status === status).length }))
    .filter((entry) => entry.count > 0);

  const newCustomers = profiles.filter((profile) => new Date(profile.createdAt) >= start).length;
  const newCustomersPrevious = profiles.filter((profile) => {
    const at = new Date(profile.createdAt);
    return at >= previousStart && at < start;
  }).length;

  const lowStockCount = products.reduce(
    (count, product) => count + product.variants.filter((variant) => variant.stock <= variant.lowStockThreshold).length,
    0,
  );

  return {
    currency: products[0]?.currency ?? 'INR',
    revenue,
    revenuePrevious,
    orderCount: inWindow.length,
    orderCountPrevious: inPrevious.length,
    customerCount: newCustomers,
    customerCountPrevious: newCustomersPrevious,
    averageOrderValue: earning.length ? Math.round(revenue / earning.length) : 0,
    unitsSold,
    conversionRate: analytics.conversionRate,
    sessions: analytics.totals.page_view ?? 0,
    lowStockCount,
    revenueSeries: buildSeries(days, revenueByDay),
    orderSeries: buildSeries(days, ordersByDay),
    topProducts,
    recentOrders: orders.slice(0, 8),
    statusBreakdown,
  };
}

/* -------------------------------------------------------------- analytics -- */

type EventRecord = { name: string; props: Record<string, unknown>; createdAt: string };

const listEvents = cache(async (days: number): Promise<EventRecord[]> => {
  const { demo } = await adminContext();
  const start = windowStart(days);

  if (demo) {
    return demoDataset().events
      .filter((event) => new Date(event.createdAt) >= start)
      .map((event) => ({ name: event.name, props: event.props, createdAt: event.createdAt }));
  }

  const db = await adminDb();
  if (!db) return [];
  const { data, error } = await db
    .from('analytics_events')
    .select('name, props, created_at')
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: false })
    .limit(50_000);
  if (error) throw new Error(`Could not load analytics: ${error.message}`);
  return asRows(data).map((row) => ({
    name: str(row.name),
    props: asRow(row.props),
    createdAt: iso(row.created_at, start.toISOString()),
  }));
});

const FUNNEL: { name: string; label: string }[] = [
  { name: 'page_view', label: 'Sessions' },
  { name: 'product_view', label: 'Product views' },
  { name: 'add_to_cart', label: 'Add to cart' },
  { name: 'checkout_started', label: 'Checkout started' },
  { name: 'purchase', label: 'Purchase' },
];

export async function getAnalytics(days = 30): Promise<AnalyticsReport> {
  const events = await listEvents(days);

  const totals: Record<string, number> = {};
  const sessionsByDay = new Map<string, number>();
  const productViewsByDay = new Map<string, number>();
  const revenueByDay = new Map<string, number>();
  const paths = new Map<string, number>();
  const viewedProducts = new Map<string, number>();
  const searches = new Map<string, number>();

  for (const event of events) {
    totals[event.name] = (totals[event.name] ?? 0) + 1;
    const key = dayKey(event.createdAt);

    if (event.name === 'page_view') {
      sessionsByDay.set(key, (sessionsByDay.get(key) ?? 0) + 1);
      const path = str(event.props.path, '/');
      paths.set(path, (paths.get(path) ?? 0) + 1);
    }
    if (event.name === 'product_view') {
      productViewsByDay.set(key, (productViewsByDay.get(key) ?? 0) + 1);
      const slug = str(event.props.slug, 'unknown');
      viewedProducts.set(slug, (viewedProducts.get(slug) ?? 0) + 1);
    }
    if (event.name === 'purchase') {
      revenueByDay.set(key, (revenueByDay.get(key) ?? 0) + num(event.props.value));
    }
    if (event.name === 'search') {
      const query = str(event.props.query).trim().toLowerCase();
      if (query) searches.set(query, (searches.get(query) ?? 0) + 1);
    }
  }

  const products = await listProducts();
  const funnel: FunnelStep[] = FUNNEL.map((step) => ({ ...step, count: totals[step.name] ?? 0 }));
  const sessions = totals.page_view ?? 0;
  const purchases = totals.purchase ?? 0;
  const addToCart = totals.add_to_cart ?? 0;
  const checkouts = totals.checkout_started ?? 0;

  const rate = (numerator: number, denominator: number) =>
    denominator === 0 ? 0 : Math.round((numerator / denominator) * 10_000) / 100;

  return {
    days,
    totals,
    funnel,
    sessionsSeries: buildSeries(days, sessionsByDay),
    productViewSeries: buildSeries(days, productViewsByDay),
    revenueSeries: buildSeries(days, revenueByDay),
    topPaths: [...paths.entries()]
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    topViewedProducts: [...viewedProducts.entries()]
      .map(([slug, count]) => ({
        slug,
        name: products.find((product) => product.slug === slug)?.name ?? slug,
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    topSearches: [...searches.entries()]
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    conversionRate: rate(purchases, sessions),
    addToCartRate: rate(addToCart, totals.product_view ?? 0),
    checkoutCompletionRate: rate(purchases, checkouts),
    totalEvents: events.length,
  };
}
