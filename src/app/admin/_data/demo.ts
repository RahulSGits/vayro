import 'server-only';
import { products } from '@/data/catalog';
import type { Address, Order, OrderItem, OrderStatus, Product, Profile } from '@/types';

/**
 * Demo dataset for the admin.
 *
 * The storefront ships with a real seed catalogue but no commerce history, so
 * every admin screen would otherwise be empty before Supabase is connected.
 * This module synthesises orders, customers and analytics events from that
 * catalogue so the dashboard, charts and tables can be evaluated honestly.
 *
 * Two rules:
 *  - Everything is DETERMINISTIC (seeded PRNG, day-anchored dates). The same
 *    request renders the same numbers, so nothing flickers between navigations.
 *  - Everything is LABELLED. `AdminContext.demo` is true whenever this data is
 *    in play and every screen carries the demo banner. These are not real sales.
 */

/* ------------------------------------------------------------------ prng -- */

/** mulberry32 — small, fast, and stable across Node versions. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = <T>(rand: () => number, list: readonly T[]): T => list[Math.floor(rand() * list.length)]!;
const between = (rand: () => number, min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

/* --------------------------------------------------------------- people --- */

const PEOPLE: { name: string; email: string; city: string; region: string; postal: string }[] = [
  { name: 'Aarav Mehta',      email: 'aarav.mehta@example.com',      city: 'Bengaluru', region: 'Karnataka',   postal: '560095' },
  { name: 'Ishani Rao',       email: 'ishani.rao@example.com',       city: 'Pune',      region: 'Maharashtra', postal: '411004' },
  { name: 'Kabir Sethi',      email: 'kabir.sethi@example.com',      city: 'New Delhi', region: 'Delhi',       postal: '110024' },
  { name: 'Meera Krishnan',   email: 'meera.krishnan@example.com',   city: 'Chennai',   region: 'Tamil Nadu',  postal: '600020' },
  { name: 'Rohan Bakshi',     email: 'rohan.bakshi@example.com',     city: 'Mumbai',    region: 'Maharashtra', postal: '400050' },
  { name: 'Tara Nair',        email: 'tara.nair@example.com',        city: 'Kochi',     region: 'Kerala',      postal: '682016' },
  { name: 'Devika Sharma',    email: 'devika.sharma@example.com',    city: 'Jaipur',    region: 'Rajasthan',   postal: '302001' },
  { name: 'Arjun Fernandes',  email: 'arjun.fernandes@example.com',  city: 'Panaji',    region: 'Goa',         postal: '403001' },
  { name: 'Sana Qureshi',     email: 'sana.qureshi@example.com',     city: 'Hyderabad', region: 'Telangana',   postal: '500034' },
  { name: 'Vikram Anand',     email: 'vikram.anand@example.com',     city: 'Kolkata',   region: 'West Bengal', postal: '700019' },
  { name: 'Nikhil Verma',     email: 'nikhil.verma@example.com',     city: 'Chandigarh',region: 'Punjab',      postal: '160017' },
  { name: 'Leela Iyer',       email: 'leela.iyer@example.com',       city: 'Mysuru',    region: 'Karnataka',   postal: '570011' },
  { name: 'Farhan Ali',       email: 'farhan.ali@example.com',       city: 'Lucknow',   region: 'Uttar Pradesh', postal: '226001' },
  { name: 'Ananya Bose',      email: 'ananya.bose@example.com',      city: 'Shillong',  region: 'Meghalaya',   postal: '793001' },
  { name: 'Gaurav Thapa',     email: 'gaurav.thapa@example.com',     city: 'Dehradun',  region: 'Uttarakhand', postal: '248001' },
  { name: 'Priya Raghavan',   email: 'priya.raghavan@example.com',   city: 'Coimbatore',region: 'Tamil Nadu',  postal: '641018' },
];

const STREETS = [
  '12 Ridgeway Lane', '4B Alder Court', '88 Kingsway', '31 Fort Road', '7 Cantonment Close',
  '19 Hillcrest Avenue', '204 Meridian Block', '56 Old Mill Street', '9 Harbour View', '73 Vasant Marg',
];

const CARRIERS = ['Bluedart', 'Delhivery', 'DTDC', 'India Post'] as const;

const STATUS_WEIGHTS: { status: OrderStatus; weight: number }[] = [
  { status: 'delivered',  weight: 34 },
  { status: 'shipped',    weight: 18 },
  { status: 'processing', weight: 12 },
  { status: 'paid',       weight: 14 },
  { status: 'pending',    weight: 8 },
  { status: 'cancelled',  weight: 8 },
  { status: 'refunded',   weight: 6 },
];

function weightedStatus(rand: () => number, ageDays: number): OrderStatus {
  // Recent orders cannot already be delivered; old orders rarely sit unpaid.
  const pool = STATUS_WEIGHTS.filter((entry) => {
    if (ageDays <= 2) return entry.status === 'pending' || entry.status === 'paid' || entry.status === 'processing';
    if (ageDays <= 6) return entry.status !== 'delivered';
    return entry.status !== 'pending';
  });
  const total = pool.reduce((sum, entry) => sum + entry.weight, 0);
  let ticket = rand() * total;
  for (const entry of pool) {
    ticket -= entry.weight;
    if (ticket <= 0) return entry.status;
  }
  return pool[pool.length - 1]!.status;
}

/** Orders that represent captured money. Mirrors `admin_metrics` in the schema. */
export const REVENUE_STATUSES: OrderStatus[] = ['paid', 'processing', 'shipped', 'delivered'];

/* ------------------------------------------------------------- dataset ---- */

export type DemoAnalyticsEvent = {
  id: number;
  name: string;
  props: Record<string, string | number>;
  createdAt: string;
};

export type DemoDataset = {
  anchor: Date;
  profiles: Profile[];
  orders: Order[];
  addresses: Record<string, Address>;
  events: DemoAnalyticsEvent[];
};

const DAY = 86_400_000;
const HISTORY_DAYS = 120;

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function buildProfiles(anchor: Date): Profile[] {
  const rand = prng(9137);
  return PEOPLE.map((person, index) => ({
    id: `demo-profile-${String(index + 1).padStart(2, '0')}`,
    email: person.email,
    fullName: person.name,
    phone: `+91 ${between(rand, 70, 99)}${between(rand, 10000, 99999)}${between(rand, 100, 999)}`,
    role: 'customer' as const,
    marketingOptIn: rand() > 0.45,
    // Spread across the whole reporting window and well beyond it, so the
    // "new customers" comparison has something on both sides of the line.
    createdAt: new Date(anchor.getTime() - between(rand, 2, HISTORY_DAYS + 240) * DAY).toISOString(),
  }));
}

function buildAddress(person: (typeof PEOPLE)[number], street: string): Omit<Address, 'id' | 'userId'> {
  return {
    label: 'Home',
    fullName: person.name,
    line1: street,
    line2: null,
    city: person.city,
    region: person.region,
    postalCode: person.postal,
    country: 'IN',
    phone: null,
    isDefaultShipping: true,
    isDefaultBilling: true,
  };
}

function buildOrders(anchor: Date, profiles: Profile[]): Order[] {
  const rand = prng(20260214);
  const sellable = products.filter((product) => product.status === 'published');
  const orders: Order[] = [];
  let sequence = 1041;

  for (let dayOffset = HISTORY_DAYS; dayOffset >= 0; dayOffset -= 1) {
    const day = new Date(anchor.getTime() - dayOffset * DAY);
    const weekday = day.getUTCDay();
    // A gentle weekly rhythm plus a slow upward trend — reads like a real store.
    const trend = 1 + (HISTORY_DAYS - dayOffset) / (HISTORY_DAYS * 1.6);
    const weekendLift = weekday === 0 || weekday === 6 ? 1.35 : 1;
    const expected = 1.15 * trend * weekendLift;
    const count = Math.max(0, Math.round(expected + (rand() - 0.42) * 2.1));

    for (let n = 0; n < count; n += 1) {
      const personIndex = between(rand, 0, PEOPLE.length - 1);
      const person = PEOPLE[personIndex]!;
      const profile = profiles[personIndex]!;
      const lineCount = rand() > 0.72 ? 2 : 1;
      const items: OrderItem[] = [];

      for (let line = 0; line < lineCount; line += 1) {
        const product: Product = rand() > 0.42 ? sellable[0]! : pick(rand, sellable);
        const inStock = product.variants.filter((variant) => variant.stock > 0);
        const variant = pick(rand, inStock.length ? inStock : product.variants);
        const quantity = rand() > 0.86 ? 2 : 1;
        items.push({
          id: `demo-item-${sequence}-${line}`,
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          colorway: variant.colorway,
          size: variant.size,
          sku: variant.sku,
          unitPrice: variant.priceOverride ?? product.price,
          quantity,
          image: product.images.find((image) => image.colorway === variant.colorway)?.url
            ?? product.images[0]?.url
            ?? null,
        });
      }

      const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
      const shipping = subtotal >= 500_000 ? 0 : 19_900;
      // Rounded to whole rupees — a demo ledger with stray paise reads as noise.
      const toRupees = (paise: number) => Math.round(paise / 100) * 100;
      const discount = rand() > 0.84 ? toRupees(subtotal * 0.1) : 0;
      const tax = toRupees((subtotal - discount) * 0.12);
      const total = subtotal + shipping + tax - discount;
      const status = weightedStatus(rand, dayOffset);
      const placedAt = new Date(day.getTime() + between(rand, 7, 22) * 3_600_000 + between(rand, 0, 59) * 60_000);
      const shipped = status === 'shipped' || status === 'delivered';

      orders.push({
        id: `demo-order-${sequence}`,
        orderNumber: `VY-${String(sequence).padStart(5, '0')}`,
        userId: rand() > 0.12 ? profile.id : null,
        email: person.email,
        status,
        currency: 'INR',
        subtotal,
        shipping,
        tax,
        discount,
        total,
        items,
        shippingAddress: buildAddress(person, pick(rand, STREETS)),
        billingAddress: buildAddress(person, pick(rand, STREETS)),
        trackingNumber: shipped ? `${pick(rand, ['BD', 'DL', 'DT', 'IP'])}${between(rand, 100000000, 999999999)}` : null,
        carrier: shipped ? pick(rand, CARRIERS) : null,
        placedAt: placedAt.toISOString(),
        updatedAt: new Date(placedAt.getTime() + between(rand, 1, 96) * 3_600_000).toISOString(),
        notes: null,
      });
      sequence += 1;
    }
  }

  return orders.sort((a, b) => b.placedAt.localeCompare(a.placedAt));
}

/**
 * Analytics events reconstructed so the funnel is internally consistent:
 * every purchase has a checkout, every checkout has an add-to-cart, and so on.
 */
function buildEvents(anchor: Date, orders: Order[]): DemoAnalyticsEvent[] {
  const rand = prng(4471);
  const events: DemoAnalyticsEvent[] = [];
  const sellable = products.filter((product) => product.status === 'published');
  let id = 1;

  const push = (name: string, props: Record<string, string | number>, at: Date) => {
    events.push({ id: id++, name, props, createdAt: at.toISOString() });
  };

  const paths = ['/', '/shop', '/products/meridian-carry-shell', '/collections/the-carry-system', '/journal', '/about'];
  const queries = ['meridian', 'packable shell', 'ripstop', 'travel jacket', 'carry system', 'sandstone'];

  for (let dayOffset = HISTORY_DAYS; dayOffset >= 0; dayOffset -= 1) {
    const day = new Date(anchor.getTime() - dayOffset * DAY);
    const dayOrders = orders.filter((order) => order.placedAt.slice(0, 10) === day.toISOString().slice(0, 10));
    const purchases = dayOrders.filter((order) => REVENUE_STATUSES.includes(order.status)).length;

    const checkouts = purchases + between(rand, 1, 4);
    const addToCarts = checkouts + between(rand, 3, 9);
    const productViews = addToCarts * between(rand, 4, 7);
    const pageViews = productViews * between(rand, 2, 4);

    const at = (slot: number) => new Date(day.getTime() + (7 + (slot % 15)) * 3_600_000 + (slot * 137_000) % 3_600_000);

    for (let n = 0; n < pageViews; n += 1) push('page_view', { path: pick(rand, paths) }, at(n));
    for (let n = 0; n < productViews; n += 1) {
      const product = rand() > 0.45 ? sellable[0]! : pick(rand, sellable);
      push('product_view', { productId: product.id, slug: product.slug, price: product.price, currency: 'INR' }, at(n + 3));
    }
    for (let n = 0; n < addToCarts; n += 1) {
      const product = rand() > 0.5 ? sellable[0]! : pick(rand, sellable);
      push('add_to_cart', { productId: product.id, variantId: product.variants[0]?.id ?? '', quantity: 1, value: product.price, currency: 'INR' }, at(n + 5));
    }
    for (let n = 0; n < checkouts; n += 1) push('checkout_started', { value: 599900, currency: 'INR', items: 1 }, at(n + 7));
    for (const order of dayOrders) {
      if (!REVENUE_STATUSES.includes(order.status)) continue;
      push('purchase', { orderId: order.id, value: order.total, currency: 'INR', items: order.items.length }, new Date(order.placedAt));
    }
    for (let n = 0; n < between(rand, 0, 4); n += 1) {
      push('search', { query: pick(rand, queries), results: between(rand, 0, 4) }, at(n + 9));
    }
    for (let n = 0; n < between(rand, 0, 3); n += 1) push('3d_view_started', { productId: sellable[0]!.id, tier: pick(rand, ['high', 'medium', 'low']) }, at(n + 11));
    for (let n = 0; n < between(rand, 0, 2); n += 1) push('newsletter_signup', { source: pick(rand, ['footer', 'journal', 'exit']) }, at(n + 13));
  }

  return events;
}

let cached: DemoDataset | null = null;

/**
 * Built lazily and memoised for the life of the process. Anchored to the start
 * of the current UTC day, so figures are stable across a session and still read
 * as "the last N days" whenever the server is running.
 */
export function demoDataset(): DemoDataset {
  if (cached) return cached;
  const anchor = startOfUtcDay(new Date());
  const profiles = buildProfiles(anchor);
  const orders = buildOrders(anchor, profiles);
  const addresses: Record<string, Address> = {};
  for (const order of orders) {
    if (order.userId && order.shippingAddress && !addresses[order.userId]) {
      addresses[order.userId] = { ...order.shippingAddress, id: `demo-address-${order.userId}`, userId: order.userId };
    }
  }
  cached = { anchor, profiles, orders, addresses, events: buildEvents(anchor, orders) };
  return cached;
}
