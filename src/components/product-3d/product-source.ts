import { products, heroProduct } from '@/data/catalog';
import type { Product, ProductVariant } from '@/types';

/* ==========================================================================
   Client-side product resolution.

   `@/lib/repo/products` is server-only, so the 3D layer cannot reach the
   database directly. Surfaces that already have a product (a product page,
   for instance) pass it in and nothing here is used; surfaces that only know
   a slug (the hero) resolve against the seed catalogue.
   ========================================================================== */

export type Colorway = { name: string; hex: string; available: boolean };

export function resolveProduct(slug?: string, override?: Product | null): Product {
  if (override) return override;
  if (!slug) return heroProduct;
  return products.find((product) => product.slug === slug) ?? heroProduct;
}

/** Unique colourways in catalogue order, with stock rolled up per colour. */
export function colorwaysOf(product: Product): Colorway[] {
  const seen = new Map<string, Colorway>();
  for (const variant of product.variants as ProductVariant[]) {
    const existing = seen.get(variant.colorway);
    if (existing) {
      existing.available = existing.available || variant.available;
      continue;
    }
    seen.set(variant.colorway, {
      name: variant.colorway,
      hex: variant.colorHex,
      available: variant.available,
    });
  }
  return [...seen.values()];
}

/** True when the product declares a 3D asset — placeholder or real. */
export function hasModel(product: Product): boolean {
  return product.models.length > 0;
}
