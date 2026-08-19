import { Skeleton } from '@/components/ui/States';
import { ProductGridSkeleton } from '@/components/product/ProductGrid';

export default function CollectionLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading collection</span>

      <div className="relative min-h-[62vh] bg-[var(--bg-sunken)]">
        <div className="shell flex min-h-[62vh] flex-col justify-end pt-[calc(var(--header-h)+4rem)] pb-16">
          <Skeleton className="h-3 w-32" />
          <div className="grid-12 mt-10 items-end">
            <div className="col-span-4 lg:col-span-7">
              <Skeleton className="h-14 w-full max-w-[26rem] sm:h-20" />
              <Skeleton className="mt-5 h-4 w-48" />
            </div>
            <div className="col-span-4 lg:col-span-4 lg:col-start-9">
              <Skeleton className="mt-6 h-4 w-full max-w-[20rem] lg:mt-0" />
              <Skeleton className="mt-2 h-4 w-3/4 max-w-[15rem]" />
            </div>
          </div>
        </div>
      </div>

      <div className="shell grid-12 section">
        <aside className="hidden lg:col-span-3 lg:block">
          <Skeleton className="h-3 w-16" />
          <div className="mt-6 space-y-8">
            {Array.from({ length: 4 }, (_, group) => (
              <div key={group} className="space-y-3 border-t border-[var(--border)] pt-5">
                <Skeleton className="h-2.5 w-20" />
                {Array.from({ length: 3 }, (_, row) => (
                  <Skeleton key={row} className="h-3.5 w-full max-w-[10rem]" />
                ))}
              </div>
            ))}
          </div>
        </aside>
        <div className="col-span-4 lg:col-span-9">
          <Skeleton className="mb-10 h-3 w-24" />
          <ProductGridSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}
