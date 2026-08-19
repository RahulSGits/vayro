import type { Product, ProductImage, ProductSpec, ProductVariant } from '@/types';

/* ==========================================================================
   Product derivation helpers.

   The catalogue stores variants flat (colourway × size) and images tagged with
   an optional colourway. Everything the shop and PDP need to render — swatches,
   size availability, per-colourway galleries — is derived here so no component
   re-implements the rules.
   ========================================================================== */

export type Colorway = {
  name: string;
  hex: string;
  /** At least one size in this colourway is purchasable. */
  inStock: boolean;
};

/** Unique colourways in catalogue order, each carrying its availability. */
export function colorwaysOf(product: Product): Colorway[] {
  const seen = new Map<string, Colorway>();
  for (const variant of product.variants) {
    const existing = seen.get(variant.colorway);
    if (existing) {
      existing.inStock ||= variant.available && variant.stock > 0;
      continue;
    }
    seen.set(variant.colorway, {
      name: variant.colorway,
      hex: variant.colorHex,
      inStock: variant.available && variant.stock > 0,
    });
  }
  return [...seen.values()];
}

/** The colourway a page should open on: the first that can actually be bought. */
export function defaultColorway(product: Product): string {
  const all = colorwaysOf(product);
  return (all.find((c) => c.inStock) ?? all[0])?.name ?? '';
}

/** Variants for one colourway, in catalogue (size) order. */
export function variantsFor(product: Product, colorway: string): ProductVariant[] {
  return product.variants.filter((v) => v.colorway === colorway);
}

export function findVariant(
  product: Product,
  colorway: string,
  size: string,
): ProductVariant | null {
  return product.variants.find((v) => v.colorway === colorway && v.size === size) ?? null;
}

/** First purchasable size in a colourway — used to preselect single-size items. */
export function defaultSize(product: Product, colorway: string): string | null {
  const variants = variantsFor(product, colorway);
  if (variants.length === 1) return variants[0].size;
  return null;
}

/**
 * Gallery for a colourway. Images tagged with another colourway are dropped;
 * untagged editorial and macro plates are kept and follow the tagged shots.
 */
export function galleryImages(product: Product, colorway?: string | null): ProductImage[] {
  const ordered = [...product.images].sort((a, b) => a.position - b.position);
  if (!colorway) return ordered;

  const tagged = ordered.filter((image) => image.colorway === colorway);
  const untagged = ordered.filter((image) => !image.colorway);
  const gallery = [...tagged, ...untagged];
  // A colourway with no dedicated plate still needs something to show.
  return gallery.length > 0 ? gallery : ordered;
}

/** Card imagery: the lead plate and the shot that crossfades in on hover. */
export function cardImages(product: Product): { primary?: ProductImage; alternate?: ProductImage } {
  const ordered = [...product.images].sort((a, b) => a.position - b.position);
  const primary = ordered.find((image) => image.kind === 'technical') ?? ordered[0];
  const alternate =
    ordered.find((image) => image.kind === 'editorial' && image.id !== primary?.id) ??
    ordered.find((image) => image.id !== primary?.id);
  return { primary, alternate };
}

export function inStock(product: Product): boolean {
  return product.variants.some((v) => v.available && v.stock > 0);
}

export function unitsAvailable(product: Product): number {
  return product.variants.reduce((n, v) => n + Math.max(v.stock, 0), 0);
}

/* ------------------------------------------------------------------ specs -- */

export const SPEC_GROUP_ORDER: ProductSpec['group'][] = [
  'materials',
  'construction',
  'dimensions',
  'performance',
  'care',
];

export const SPEC_GROUP_LABEL: Record<ProductSpec['group'], string> = {
  materials: 'Materials',
  construction: 'Construction',
  dimensions: 'Dimensions',
  performance: 'Performance',
  care: 'Care',
};

export function groupedSpecs(product: Product): { group: ProductSpec['group']; specs: ProductSpec[] }[] {
  return SPEC_GROUP_ORDER.map((group) => ({
    group,
    specs: product.specs.filter((spec) => spec.group === group),
  })).filter((entry) => entry.specs.length > 0);
}

/** Pulls a named spec out of the table — used for at-a-glance figures. */
export function specValue(product: Product, label: string): string | null {
  const match = product.specs.find((spec) => spec.label.toLowerCase() === label.toLowerCase());
  return match?.value ?? null;
}

/* ------------------------------------------------------------- size guide -- */

export type SizeRow = { size: string; chest: string; waist: string; length: string; sleeve: string };

/**
 * Body measurements in centimetres. These describe the body the garment is cut
 * for, not the garment itself — garment weight and packed dimensions live in
 * the specification table.
 */
export const SIZE_CHART: Record<string, SizeRow> = {
  XS:  { size: 'XS',  chest: '86–91',   waist: '71–76',   length: '68', sleeve: '61' },
  S:   { size: 'S',   chest: '91–97',   waist: '76–81',   length: '70', sleeve: '63' },
  M:   { size: 'M',   chest: '97–102',  waist: '81–86',   length: '72', sleeve: '65' },
  L:   { size: 'L',   chest: '102–107', waist: '86–91',   length: '74', sleeve: '66' },
  XL:  { size: 'XL',  chest: '107–112', waist: '91–97',   length: '76', sleeve: '68' },
  XXL: { size: 'XXL', chest: '112–119', waist: '97–104',  length: '78', sleeve: '69' },
};

export function sizeRowsFor(product: Product): SizeRow[] {
  const sizes = [...new Set(product.variants.map((v) => v.size))];
  return sizes.map((size) => SIZE_CHART[size]).filter((row): row is SizeRow => Boolean(row));
}

/** 'One Size' products get a fit note instead of a chart. */
export function hasSizeChart(product: Product): boolean {
  return sizeRowsFor(product).length > 1;
}
