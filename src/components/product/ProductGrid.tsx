import { cn } from '@/lib/utils';
import type { Product } from '@/types';
import { Reveal } from '@/components/ui/Reveal';
import { ProductCard } from './ProductCard';

/* ==========================================================================
   ProductGrid — editorial rhythm, not a uniform tile wall.

   The desktop grid runs on a repeating five-beat: three portrait cards, then
   two wider cards on a 4:5 crop, with the second of the pair dropped to break
   the baseline. Mobile is a clean two-up — designed, not shrunk.
   ========================================================================== */

const RHYTHM = 5;

type Props = {
  products: Product[];
  /** Cards rendered above the fold get eager images. */
  priorityCount?: number;
  className?: string;
};

export function ProductGrid({ products, priorityCount = 3, className }: Props) {
  return (
    <ul
      className={cn(
        'grid grid-cols-2 gap-x-[var(--gutter)] gap-y-14',
        'md:grid-cols-6 lg:grid-cols-12 lg:gap-y-24',
        className,
      )}
    >
      {products.map((product, index) => {
        const beat = index % RHYTHM;
        const wide = beat >= 3;
        return (
          <li
            key={product.id}
            className={cn(
              'md:col-span-2',
              wide ? 'lg:col-span-6' : 'lg:col-span-4',
              // The second wide card drops, so the row reads as a composition.
              beat === 4 && 'lg:mt-24',
            )}
          >
            <Reveal variant="fadeUp" delay={(index % 3) * 0.06}>
              <ProductCard
                product={product}
                priority={index < priorityCount}
                className={wide ? 'lg:[--card-aspect:4/5]' : undefined}
              />
            </Reveal>
          </li>
        );
      })}
    </ul>
  );
}

/** Matches the grid's rhythm so the skeleton does not reflow on hydration. */
export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul
      aria-hidden
      className="grid grid-cols-2 gap-x-[var(--gutter)] gap-y-14 md:grid-cols-6 lg:grid-cols-12 lg:gap-y-24"
    >
      {Array.from({ length: count }, (_, index) => {
        const beat = index % RHYTHM;
        const wide = beat >= 3;
        return (
          <li
            key={index}
            className={cn(
              'md:col-span-2',
              wide ? 'lg:col-span-6' : 'lg:col-span-4',
              beat === 4 && 'lg:mt-24',
            )}
          >
            <div
              className={cn(
                'w-full animate-pulse bg-[color-mix(in_oklab,var(--fg)_7%,transparent)]',
                wide ? 'aspect-[3/4] lg:aspect-[4/5]' : 'aspect-[3/4]',
              )}
            />
            <div className="mt-5 flex items-start justify-between gap-5">
              <div className="w-full max-w-[12rem] space-y-2">
                <div className="h-4 w-3/4 bg-[color-mix(in_oklab,var(--fg)_7%,transparent)]" />
                <div className="h-3 w-1/2 bg-[color-mix(in_oklab,var(--fg)_5%,transparent)]" />
              </div>
              <div className="h-4 w-16 bg-[color-mix(in_oklab,var(--fg)_7%,transparent)]" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
