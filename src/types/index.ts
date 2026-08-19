/** VAYRO domain model. Mirrors the Supabase schema in supabase/migrations. */

export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';
export type Role = 'customer' | 'admin';

export type OrderStatus =
  | 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered'
  | 'cancelled' | 'refunded';

export type ProductStatus = 'draft' | 'published' | 'archived';

export interface Money {
  amount: number;       // minor units (paise / cents)
  currency: Currency;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  position: number;
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  heroImage: string | null;
  position: number;
}

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  position: number;
  /** 'editorial' drives lifestyle galleries, 'technical' the spec views. */
  kind: 'editorial' | 'technical' | 'detail' | 'flat';
  colorway?: string | null;
}

export interface ProductModel3D {
  id: string;
  url: string;
  /** Draco-compressed GLB is expected. */
  format: 'glb' | 'gltf';
  /** Which viewer mode this asset drives. */
  mode: 'default' | 'transformation' | 'exploded';
  placeholder: boolean;
  sizeBytes: number | null;
}

export interface ProductVariant {
  id: string;
  sku: string;
  productId: string;
  colorway: string;
  colorHex: string;
  size: string;
  priceOverride: number | null;
  stock: number;
  available: boolean;
  weightGrams: number | null;
}

export interface ProductSpec {
  label: string;
  value: string;
  group: 'materials' | 'construction' | 'dimensions' | 'care' | 'performance';
}

export interface ProductHotspot {
  id: string;
  title: string;
  body: string;
  /** Normalised position on the flat product image, 0–1. */
  x: number;
  y: number;
  /** Optional 3D anchor for the WebGL viewer. */
  anchor3d?: [number, number, number];
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  story: string;
  description: string;
  status: ProductStatus;
  price: number;                 // minor units, base currency
  compareAtPrice: number | null;
  currency: Currency;
  categorySlug: string;
  collectionSlugs: string[];
  badges: string[];
  images: ProductImage[];
  models: ProductModel3D[];
  variants: ProductVariant[];
  specs: ProductSpec[];
  hotspots: ProductHotspot[];
  features: { title: string; body: string; icon: string }[];
  care: string[];
  featured: boolean;
  createdAt: string;
}

export interface CartLine {
  id: string;
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  colorway: string;
  colorHex: string;
  size: string;
  unitPrice: number;
  currency: Currency;
  quantity: number;
  image: string;
  maxQuantity: number;
}

export interface Address {
  id: string;
  userId: string;
  label: string | null;
  fullName: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefaultShipping: boolean;
  isDefaultBilling: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  colorway: string;
  size: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  image: string | null;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string | null;
  email: string;
  status: OrderStatus;
  currency: Currency;
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  items: OrderItem[];
  shippingAddress: Omit<Address, 'id' | 'userId'> | null;
  billingAddress: Omit<Address, 'id' | 'userId'> | null;
  trackingNumber: string | null;
  carrier: string | null;
  placedAt: string;
  updatedAt: string;
  notes: string | null;
}

export interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  role: Role;
  marketingOptIn: boolean;
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string | null;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  verifiedPurchase: boolean;
  createdAt: string;
  /** Demo data is always flagged so it is never passed off as real. */
  isDemo: boolean;
}

export interface JournalPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  heroImage: string | null;
  readingMinutes: number;
  publishedAt: string;
  author: string;
}

export interface NewsletterLead {
  email: string;
  source: string;
  consent: boolean;
}

export type DeviceTier = 'high' | 'medium' | 'low';
