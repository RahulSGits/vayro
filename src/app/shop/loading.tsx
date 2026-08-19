import { Skeleton } from '@/components/ui/States';
import { ProductGridSkeleton } from '@/components/product/ProductGrid';

/** Mirrors the shop layout exactly so the page does not jump when data lands. */
export default function ShopLoading() {
  return (
    <div className="shell" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the range</span>

      <header className="section-tight border-b border-[var(--border)]">
        <div className="grid-12 items-end">
          <div className="col-span-4 lg:col-span-8">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-6 h-12 w-full max-w-[24rem] sm:h-16" />
          </div>
          <div className="col-span-4 lg:col-span-4">
            <Skeleton className="mt-6 h-4 w-full max-w-[22rem] lg:mt-0" />
            <Skeleton className="mt-2 h-4 w-3/4 max-w-[18rem]" />
          </div>
        </div>
      </header>

      <div className="grid-12 section">
        <aside className="hidden lg:col-span-3 lg:block">
          <Skeleton className="h-3 w-16" />
          <div className="mt-6 space-y-8">
            {Array.from({ length: 4 }, (_, group) => (
              <div key={group} className="space-y-3 border-t border-[var(--border)] pt-5">
                <Skeleton className="h-2.5 w-20" />
                {Array.from({ length: 4 }, (_, row) => (
                  <Skeleton key={row} className="h-3.5 w-full max-w-[10rem]" />
                ))}
              </div>
            ))}
          </div>
        </aside>

        <div className="col-span-4 lg:col-span-9">
          <div className="mb-10 flex items-center justify-between gap-6">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-40" />
          </div>
          <ProductGridSkeleton count={6} />
        </div>
      </div>
    </div>
  );
}
