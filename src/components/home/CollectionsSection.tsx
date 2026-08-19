import type { Collection } from '@/types';
import { SectionHead } from '@/components/home/SectionHead';
import { CollectionsStrip } from '@/components/home/CollectionsStrip';
import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';

/* ==========================================================================
   CollectionsSection — the catalogue, grouped by intent.
   ========================================================================== */

export function CollectionsSection({ collections }: { collections: Collection[] }) {
  return (
    <section aria-label="Collections" className="shell section-tight">
      <SectionHead
        index="04"
        label="Collections"
        title={['GROUPED BY', 'INTENT.']}
        lead="The same catalogue, arranged by what you need it for."
        action={
          <ButtonLink href="/collections" variant="secondary" size="lg" data-cursor="link">
            All collections
          </ButtonLink>
        }
      />

      {collections.length === 0 ? (
        <EmptyState
          className="mt-12 border-t border-[var(--border)]"
          title="No collections published"
          body="The grouping is being rebuilt. The full catalogue is still available."
          action={
            <ButtonLink href="/shop" variant="secondary" size="md">
              Browse the shop
            </ButtonLink>
          }
        />
      ) : (
        <CollectionsStrip collections={collections} />
      )}
    </section>
  );
}
