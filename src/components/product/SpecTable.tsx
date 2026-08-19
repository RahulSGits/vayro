import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { SPEC_GROUP_LABEL, groupedSpecs } from './product-utils';

/* ==========================================================================
   SpecTable — the technical record.

   Mono face, tabular figures, hairline rules. Grouped exactly as the
   catalogue groups them, so nothing is editorialised into a claim it does not
   make.
   ========================================================================== */

export function SpecTable({ product, className }: { product: Product; className?: string }) {
  const groups = groupedSpecs(product);
  if (groups.length === 0) return null;

  return (
    <div className={cn('grid gap-x-[var(--gutter)] gap-y-12 md:grid-cols-2', className)}>
      {groups.map(({ group, specs }) => (
        <section key={group}>
          <h3 className="t-label border-b border-[var(--fg)] pb-3 text-[var(--fg)]">
            {SPEC_GROUP_LABEL[group]}
          </h3>
          <dl className="mt-1">
            {specs.map((spec) => (
              <div
                key={`${group}-${spec.label}`}
                className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-3.5"
              >
                <dt className="t-spec shrink-0 text-[var(--fg-subtle)]">{spec.label}</dt>
                <dd className="t-spec text-right text-[var(--fg)]">{spec.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}
