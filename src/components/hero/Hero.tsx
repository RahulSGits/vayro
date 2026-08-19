import type { Product } from '@/types';
import { ContourField } from '@/components/brand';
import { ProductStage } from '@/components/product-3d/ProductStage';
import { HeroOverlay } from '@/components/hero/HeroOverlay';

/* ==========================================================================
   Hero — the first ten seconds.

   A full-viewport night plate. `ProductStage` owns the WebGL/2D decision and
   fills the frame; everything here is the editorial layer that sits over it.

   The surface is pinned dark rather than flipped with data-surface="inverse":
   the Header renders ivory chrome over the homepage hero in BOTH themes, so
   the plate must not follow the theme.
   ========================================================================== */

const HERO_TOKENS = {
  '--bg': 'var(--ink)',
  '--bg-elevated': 'var(--ink-80)',
  '--fg': 'var(--ivory)',
  '--fg-muted': 'color-mix(in srgb, var(--ivory) 72%, transparent)',
  '--fg-subtle': 'color-mix(in srgb, var(--ivory) 50%, transparent)',
  '--border': 'color-mix(in srgb, var(--ivory) 16%, transparent)',
  '--border-strong': 'color-mix(in srgb, var(--ivory) 34%, transparent)',
  '--accent': 'var(--bone)',
  '--accent-fg': 'var(--ink)',
  colorScheme: 'dark',
} as React.CSSProperties;

/**
 * Bottom-up and left-in scrims, tuned so the plate stays readable under type.
 * Deliberately asymmetric: the headline owns the left column, so the horizontal
 * gradient carries the load and the vertical one only touches the extremes.
 *
 * These use `in srgb`, NOT `in oklab`. `transparent` resolves to
 * `rgb(0 0 0 / 0)`, so an oklab mix interpolates the *colour* channels toward
 * black as well as the alpha — intermediate stops come out far darker than the
 * percentage implies and the gradient reads as near-opaque. That erased the
 * hero product completely. In sRGB the mix yields the plain `rgba(ink, X)` the
 * numbers imply.
 */
const scrimInk = (pct: number) => `color-mix(in srgb, var(--ink) ${pct}%, transparent)`;

const SCRIM = {
  background: [
    // Vertical: a light touch at the extremes only. The hood sits high in frame
    // and the hem sits low, so both ends of this gradient land on product.
    `linear-gradient(180deg, ${scrimInk(45)} 0%, transparent 16%,`
    + ` transparent 70%, ${scrimInk(55)} 100%)`,
    // Horizontal: carries the headline column. Clear by 56%, where the shell
    // begins — if the hero ever looks empty again, check this stop first.
    `linear-gradient(90deg, ${scrimInk(88)} 0%, ${scrimInk(52)} 28%, transparent 56%)`,
  ].join(', '),
} as React.CSSProperties;

export type HeroProps = {
  /** Passed straight through to the 3D stage. */
  productSlug?: string;
  /** Hands the stage the resolved record so it skips its own catalogue lookup. */
  product?: Product | null;
  /** Pre-formatted on the server so the hero ships no currency runtime. */
  priceLabel?: string;
  colorways?: { name: string; hex: string }[];
  /** Colourway the hero renders in. See the note at the ProductStage call. */
  heroColorway?: string;
};

export function Hero({
  productSlug = 'meridian-carry-shell',
  product = null,
  priceLabel,
  colorways = [],
  heroColorway = 'Titanium',
}: HeroProps) {
  return (
    <section
      aria-labelledby="hero-title"
      style={HERO_TOKENS}
      className="relative isolate flex min-h-[100svh] w-full flex-col overflow-hidden bg-[var(--bg)] text-[var(--fg)]"
    >
      {/* The stage handles its own WebGL capability check and 2D fallback. */}
      <div className="absolute inset-0">
        <ProductStage
          productSlug={productSlug}
          product={product}
          mode="hero"
          // Art direction, not a default. The hero plate is night, and Basalt
          // (#1A1C1A) against it is a ~4% luminance difference — the shell
          // simply disappears, and no lighting rig recovers it. Titanium is the
          // one colourway that holds its silhouette on ink while staying inside
          // the palette. The swatch row below still offers the full range.
          colorway={heroColorway}
          priority
          className="h-full w-full"
        />
      </div>

      <div aria-hidden style={SCRIM} className="pointer-events-none absolute inset-0" />

      <ContourField
        opacity={0.055}
        scale={220}
        className="pointer-events-none absolute inset-0 text-[var(--ivory)]"
      />

      <HeroOverlay
        productSlug={productSlug}
        priceLabel={priceLabel}
        colorways={colorways}
      />
    </section>
  );
}
