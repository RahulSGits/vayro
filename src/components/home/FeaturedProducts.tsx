import type { Product } from '@/types';
import { ProductCard } from '@/components/product/ProductCard';
import { SectionHead } from '@/components/home/SectionHead';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal, RevealChild } from '@/components/ui/Reveal';
import { EmptyState } from '@/components/ui/States';

/* ==========================================================================
   FeaturedProducts — three pieces from the current range.

   The card itself is owned by the shop; this section only supplies the rhythm
   around it. An empty catalogue is a designed state, not a blank grid.
   ========================================================================== */

export function FeaturedProducts({ products }: { products: Product[] }) {
  return (
    <section aria-label="Featured equipment" className="shell section">
      <SectionHead
        index="05"
        label="Equipment"
        title={['THE CURRENT', 'RANGE.']}
        lead="A short catalogue, built to work together. Every piece packs."
        action={
          <ButtonLink href="/shop" variant="secondary" size="lg" data-cursor="link">
            All equipment
          </ButtonLink>
        }
      />

      {products.length === 0 ? (
        <EmptyState
          className="mt-12 border-t border-[var(--border)]"
          title="The range is being restocked"
          body="Nothing is available to show right now. The full catalogue returns shortly."
          action={
            <ButtonLink href="/shop" variant="secondary" size="md">
              Browse the shop
            </ButtonLink>
          }
        />
      ) : (
        <Reveal
          variant="stagger"
          as="ul"
          className="mt-14 grid grid-cols-1 gap-x-[var(--gutter)] gap-y-14 sm:grid-cols-2 lg:grid-cols-3 md:mt-20"
        >
          {products.map((product) => (
            <RevealChild as="li" key={product.id}>
              <ProductCard product={product} />
            </RevealChild>
          ))}
        </Reveal>
      )}
    </section>
  );
}
