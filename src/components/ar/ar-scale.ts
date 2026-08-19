import type { Product } from '@/types';

/* ==========================================================================
   Real-world scale for the AR layer.

   AR is measured in metres. The viewer's model is measured in its own units.
   The conversion between them is not a taste decision — it is pinned by the
   carry box in `src/components/three/geometry.ts`, whose half extents
   [0.30, 0.20, 0.1125] are the catalogue's published packed size, 24 × 16 × 9
   cm, expressed in model units:

       0.24 m / (2 × 0.3000 u) = 0.40 m per unit
       0.16 m / (2 × 0.2000 u) = 0.40 m per unit
       0.09 m / (2 × 0.1125 u) = 0.40 m per unit

   Three axes, one answer. At 0.40 m/unit the shell stands 0.84 m from hood
   crown to hem — a jacket on a hanger, which is what it should be. It also
   means the packed unit measures exactly what the specification table says it
   measures, which is the only claim AR is really being asked to prove.

   `CARRY_BOX` is deliberately re-stated rather than imported: it lives inside
   the procedural geometry builder, and an AR button that may never render a
   single WebGL frame must not drag that module into the bundle to read three
   numbers out of it.
   ========================================================================== */

/** Mirrors `CARRY_BOX.half` in `src/components/three/geometry.ts`. */
const CARRY_BOX_HALF_UNITS = [0.3, 0.2, 0.1125] as const;

/** Metres per model unit for the Meridian convention. */
export const METRES_PER_UNIT = 0.4;

/** Hem, shoulders and hood crown in model units. See public/models/README.md. */
export const MODEL_HEM_Y = -0.81;
export const MODEL_SHOULDER_Y = 0.73;
export const MODEL_CROWN_Y = 1.3;

/**
 * `'24 × 16 × 9 cm'` → `[0.24, 0.16, 0.09]`, in metres. Returns null when the
 * product does not publish a packed size, or publishes one this cannot read.
 */
function packedMetres(product: Product): [number, number, number] | null {
  const spec = product.specs.find((entry) => entry.label.toLowerCase() === 'packed size');
  if (!spec) return null;

  const figures = (spec.value.match(/\d+(?:\.\d+)?/g) ?? [])
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (figures.length < 3) return null;

  // Centimetres unless the value says otherwise. `\bm\b` cannot match the m in
  // "cm" or "mm" — both are preceded or followed by a word character.
  const unit = /\bmm\b/i.test(spec.value) ? 0.001 : /\bm\b/i.test(spec.value) ? 1 : 0.01;
  return [figures[0] * unit, figures[1] * unit, figures[2] * unit];
}

/**
 * Metres per model unit for a specific product, derived from its own packed
 * size where it publishes one and the Meridian constant where it does not.
 *
 * A packed size whose three axes disagree by more than 8% about the scale is
 * a mis-read, not a measurement, and is discarded — a bad parse must never
 * silently resize a product in somebody's living room.
 */
export function metresPerUnit(product?: Product | null): number {
  const packed = product ? packedMetres(product) : null;
  if (!packed) return METRES_PER_UNIT;

  const ratios = packed.map((metres, axis) => metres / (CARRY_BOX_HALF_UNITS[axis] * 2));
  const mean = ratios.reduce((total, value) => total + value, 0) / ratios.length;
  if (!Number.isFinite(mean) || mean <= 0) return METRES_PER_UNIT;

  const spread = Math.max(...ratios) - Math.min(...ratios);
  return spread / mean > 0.08 ? METRES_PER_UNIT : mean;
}

/**
 * The `scale` attribute `<model-viewer>` wants: a uniform factor that takes
 * the authored model into metres, so `ar-scale="fixed"` places it life-size.
 */
export function modelViewerScale(product?: Product | null): string {
  const factor = Number(metresPerUnit(product).toFixed(4));
  return `${factor} ${factor} ${factor}`;
}

/** Hood crown to hem, in metres — the figure the AR copy quotes. */
export function modelHeightMetres(product?: Product | null): number {
  return (MODEL_CROWN_Y - MODEL_HEM_Y) * metresPerUnit(product);
}

/**
 * How far to lift the model inside its placement group so the hem sits on the
 * surface the reader tapped, rather than the origin (which is at mid-chest).
 */
export function groundOffsetMetres(product?: Product | null): number {
  return -MODEL_HEM_Y * metresPerUnit(product);
}
