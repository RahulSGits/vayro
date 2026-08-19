import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { products as seedProducts, collections as seedCollections, categories as seedCategories, journalPosts as seedJournal, demoReviews } from '@/data/catalog';
import type { Product, Collection, Category, JournalPost, Review } from '@/types';

/**
 * Read model for the storefront. Every function prefers Supabase and falls back
 * to the seed catalogue, so the site renders identically before the database is
 * provisioned. `isDemoData()` tells the UI when to surface a demo-data notice.
 */

export const isDemoData = cache(async () => {
  const sb = await createClient();
  if (!sb) return true;
  const { error, count } = await sb.from('products').select('id', { count: 'exact', head: true });
  return Boolean(error) || (count ?? 0) === 0;
});

export const getProducts = cache(async (): Promise<Product[]> => {
  const sb = await createClient();
  if (!sb) return seedProducts.filter((p) => p.status === 'published');
  const { data, error } = await sb.rpc('products_full');
  const rows = data as unknown as Product[] | null;
  if (error || !rows || rows.length === 0) {
    return seedProducts.filter((p) => p.status === 'published');
  }
  return rows;
});

export const getProduct = cache(async (slug: string): Promise<Product | null> => {
  const all = await getProducts();
  return all.find((p) => p.slug === slug) ?? null;
});

export const getFeaturedProducts = cache(async (): Promise<Product[]> => {
  const all = await getProducts();
  const featured = all.filter((p) => p.featured);
  return featured.length ? featured : all.slice(0, 3);
});

export const getHeroProduct = cache(async (): Promise<Product> => {
  const all = await getProducts();
  return all.find((p) => p.slug === 'meridian-carry-shell') ?? all[0];
});

export const getCollections = cache(async (): Promise<Collection[]> => {
  const sb = await createClient();
  if (!sb) return seedCollections;
  const { data, error } = await sb.from('collections').select('*').order('position');
  if (error || !data?.length) return seedCollections;
  return data as unknown as Collection[];
});

export const getCategories = cache(async (): Promise<Category[]> => {
  const sb = await createClient();
  if (!sb) return seedCategories;
  const { data, error } = await sb.from('categories').select('*').order('position');
  if (error || !data?.length) return seedCategories;
  return data as unknown as Category[];
});

export const getJournalPosts = cache(async (): Promise<JournalPost[]> => {
  const sb = await createClient();
  if (!sb) return seedJournal;
  const { data, error } = await sb.from('journal_posts').select('*')
    .not('published_at', 'is', null).order('published_at', { ascending: false });
  const rows = data as unknown as JournalPost[] | null;
  if (error || !rows?.length) return seedJournal;
  return rows;
});

export const getJournalPost = cache(async (slug: string): Promise<JournalPost | null> => {
  const all = await getJournalPosts();
  return all.find((p) => p.slug === slug) ?? null;
});

export const getReviews = cache(async (productId: string): Promise<Review[]> => {
  const sb = await createClient();
  if (!sb) return demoReviews.filter((r) => r.productId === productId);
  const { data, error } = await sb.from('reviews').select('*').eq('product_id', productId)
    .order('created_at', { ascending: false });
  if (error) return demoReviews.filter((r) => r.productId === productId);
  return (data as unknown as Review[]) ?? [];
});

/* ------------------------------------------------------------- filtering -- */

export type ShopFilters = {
  category?: string;
  collection?: string;
  colorway?: string;
  size?: string;
  maxPrice?: number;
  minPrice?: number;
  inStock?: boolean;
  sort?: 'featured' | 'newest' | 'price-asc' | 'price-desc' | 'name';
  q?: string;
};

export async function queryProducts(filters: ShopFilters = {}): Promise<Product[]> {
  const all = await getProducts();
  let out = all;

  if (filters.category) out = out.filter((p) => p.categorySlug === filters.category);
  if (filters.collection) out = out.filter((p) => p.collectionSlugs.includes(filters.collection!));
  if (filters.colorway) out = out.filter((p) => p.variants.some((v) => v.colorway === filters.colorway));
  if (filters.size) out = out.filter((p) => p.variants.some((v) => v.size === filters.size && v.available));
  if (filters.inStock) out = out.filter((p) => p.variants.some((v) => v.available));
  if (typeof filters.minPrice === 'number') out = out.filter((p) => p.price >= filters.minPrice!);
  if (typeof filters.maxPrice === 'number') out = out.filter((p) => p.price <= filters.maxPrice!);
  if (filters.q) {
    const q = filters.q.toLowerCase();
    out = out.filter((p) =>
      [p.name, p.subtitle, p.description, p.categorySlug, ...p.badges,
       ...p.variants.map((v) => v.colorway), ...p.features.map((f) => f.title)]
        .filter(Boolean).join(' ').toLowerCase().includes(q));
  }

  switch (filters.sort) {
    case 'newest':     out = [...out].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); break;
    case 'price-asc':  out = [...out].sort((a, b) => a.price - b.price); break;
    case 'price-desc': out = [...out].sort((a, b) => b.price - a.price); break;
    case 'name':       out = [...out].sort((a, b) => a.name.localeCompare(b.name)); break;
    default:           out = [...out].sort((a, b) => Number(b.featured) - Number(a.featured));
  }
  return out;
}

/** Facet values derived from the live catalogue — never hard-coded in the UI. */
export async function getFacets() {
  const all = await getProducts();
  const colorways = new Map<string, string>();
  const sizes = new Set<string>();
  for (const p of all) {
    for (const v of p.variants) { colorways.set(v.colorway, v.colorHex); sizes.add(v.size); }
  }
  const order = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
  return {
    colorways: [...colorways].map(([name, hex]) => ({ name, hex })),
    sizes: [...sizes].sort((a, b) => order.indexOf(a) - order.indexOf(b)),
    priceRange: {
      min: Math.min(...all.map((p) => p.price)),
      max: Math.max(...all.map((p) => p.price)),
    },
  };
}
