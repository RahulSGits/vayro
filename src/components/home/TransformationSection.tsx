import type { Product } from '@/types';
import { TransformationScene } from '@/components/product-transformation/TransformationScene';
import { TransformationStages, type Stage } from '@/components/home/TransformationStages';
import { SectionHead } from '@/components/home/SectionHead';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';

/* ==========================================================================
   TransformationSection — one jacket, two modes.

   The scene is owned by the 3D agent and passed into the scroll wrapper as a
   node, so the composition here stays a server component and the pinning logic
   stays in one client file.
   ========================================================================== */

const STAGES: Stage[] = [
  {
    id: 'wear',
    label: 'Wear',
    body:
      'An articulated outer layer. Pre-shaped elbow, gusseted underarm, and a hem '
      + 'cut to clear a hip belt.',
  },
  {
    id: 'pack',
    label: 'Pack',
    body:
      'The collar inverts and the shell compresses into the hood cavity. '
      + '24 × 16 × 9 cm, with no stuff sack to lose.',
  },
  {
    id: 'carry',
    label: 'Carry',
    body:
      'Internal webbing takes the packed load and becomes the shoulder strap. '
      + '2.1 litres, 318 grams, off your hands.',
  },
];

export function TransformationSection({ product = null }: { product?: Product | null }) {
  return (
    <section id="carry-system" aria-label="One jacket, two modes" className="relative">
      <div className="shell section-tight">
        <SectionHead
          index="01"
          label="The carry system"
          title={['ONE JACKET.', 'TWO MODES.']}
          lead="Worn, it is a technical shell. Packed, it is a 2.1-litre carry unit. Nothing is added, and nothing is left behind."
        />
      </div>

      {/* `captions` stays off: the stage column beside the scene owns the copy. */}
      <TransformationStages
        stages={STAGES}
        scene={
          <TransformationScene
            productSlug={product?.slug}
            product={product}
            className="h-full w-full"
          />
        }
      />

      <div className="shell pb-[var(--section-tight)]">
        <Reveal variant="fadeUp" className="flex flex-col gap-6 border-t border-[var(--border)] pt-10 md:flex-row md:items-center md:justify-between">
          <p className="t-body-lg t-pretty max-w-[44ch] text-[var(--fg-muted)]">
            The fold sequence, the webbing path and the materials behind it are documented
            in full.
          </p>
          <ButtonLink href="/technology" variant="secondary" size="lg" data-cursor="link">
            See how it works
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}
