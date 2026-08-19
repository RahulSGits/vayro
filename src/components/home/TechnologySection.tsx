import type { Product } from '@/types';
import { SectionHead } from '@/components/home/SectionHead';
import { TechnologyExplorer, type TechFeature } from '@/components/home/TechnologyExplorer';

/* ==========================================================================
   TechnologySection — the hero product's features, located on the garment.

   The copy and the numbers are read from the catalogue: nothing here restates
   a claim. Each feature is paired with the construction detail it acts on
   (a real catalogue hotspot wherever one exists) and with the spec line that
   substantiates it.
   ========================================================================== */

const PLATE = '/media/studio-dark.webp';

type Region = {
  /** Preferred anchor: a real hotspot from the catalogue. */
  hotspotId?: string;
  /** Fallback coordinates, used when the hotspot is absent from the data. */
  x: number;
  y: number;
  /** Fallback name for the region, used with the fallback coordinates. */
  marker: string;
  /** The spec whose value substantiates this feature. */
  spec?: string;
};

/**
 * Feature icon -> the point on the shell it acts on. Keyed by icon because
 * that is the stable field on `Product['features']`.
 */
const REGIONS: Record<string, Region> = {
  pack:    { hotspotId: 'h1', x: 0.5,  y: 0.13, marker: 'Carry cavity',     spec: 'Packed size' },
  carry:   { hotspotId: 'h2', x: 0.32, y: 0.4,  marker: 'Load webbing',     spec: 'Packed volume' },
  vent:    { hotspotId: 'h3', x: 0.72, y: 0.36, marker: 'Gusseted underarm', spec: 'Membrane' },
  travel:  { hotspotId: 'h4', x: 0.36, y: 0.62, marker: 'Hand pockets',     spec: 'Pockets' },
  fit:     { hotspotId: 'h5', x: 0.5,  y: 0.86, marker: 'Hem drawcord',     spec: 'Articulation' },
  weight:  { x: 0.6,  y: 0.52, marker: 'Shell body',   spec: 'Weight (size M)' },
  weather: { x: 0.44, y: 0.24, marker: 'Taped seams',  spec: 'Wind resistance' },
};

export function TechnologySection({ product }: { product: Product }) {
  const specValue = (label?: string) =>
    label ? product.specs.find((spec) => spec.label === label)?.value : undefined;

  const features: TechFeature[] = product.features.map((feature, index) => {
    const region = REGIONS[feature.icon];
    const hotspot = region?.hotspotId
      ? product.hotspots.find((point) => point.id === region.hotspotId)
      : undefined;
    const value = specValue(region?.spec);

    return {
      id: `${feature.icon}-${index}`,
      title: feature.title,
      body: feature.body,
      // Catalogue hotspot first, declared fallback second, an even column last.
      x: hotspot?.x ?? region?.x ?? 0.5,
      y: hotspot?.y ?? region?.y ?? 0.16 + index * 0.13,
      marker: hotspot?.title ?? region?.marker ?? feature.title,
      specLabel: value ? region?.spec : undefined,
      specValue: value,
    };
  });

  const plateImage = product.images.find((image) => image.url === PLATE);
  const colorway = plateImage?.colorway;

  return (
    <section aria-label="Construction" className="shell section">
      <SectionHead
        index="02"
        label="Construction"
        title={['EVERY DECISION,', 'ACCOUNTED FOR.']}
        lead="Six choices that define the Meridian. Select one to locate it on the shell."
      />

      <TechnologyExplorer
        features={features}
        plate={{ src: PLATE, alt: plateImage?.alt ?? `${product.name}, studio` }}
        caption={colorway ? `${product.name} — ${colorway}` : product.name}
      />
    </section>
  );
}
