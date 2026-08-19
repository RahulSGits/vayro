import { Skeleton } from '@/components/ui/States';

/** Holds the PDP's two-column geometry so the gallery does not jump in. */
export default function ProductLoading() {
  return (
    <div className="pb-24" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading product</span>

      <div className="shell pt-6 pb-8">
        <Skeleton className="h-3 w-56" />
      </div>

      <div className="shell grid-12 items-start gap-y-12">
        <div className="col-span-4 lg:col-span-7">
          <div className="lg:flex lg:items-start lg:gap-4">
            <div className="order-2 mt-3 flex gap-3 lg:order-1 lg:mt-0 lg:w-[4.75rem] lg:shrink-0 lg:flex-col">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-[4.75rem] w-[3.6rem] shrink-0 lg:h-[6rem] lg:w-full" />
              ))}
            </div>
            <div className="order-1 flex-1 lg:order-2">
              <Skeleton className="aspect-[3/4] w-full" />
              <Skeleton className="mt-3 h-3 w-2/3 max-w-[18rem]" />
            </div>
          </div>
        </div>

        <div className="col-span-4 lg:col-span-4 lg:col-start-9">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="mt-5 h-10 w-full max-w-[18rem]" />
          <Skeleton className="mt-3 h-4 w-48" />
          <Skeleton className="mt-8 h-7 w-28" />

          <Skeleton className="mt-10 h-3 w-20" />
          <div className="mt-4 flex gap-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-10" />
            ))}
          </div>

          <Skeleton className="mt-9 h-3 w-16" />
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full" />
            ))}
          </div>

          <Skeleton className="mt-9 h-11 w-full" />
          <Skeleton className="mt-8 h-14 w-full" />
          <Skeleton className="mt-3 h-14 w-full" />
        </div>
      </div>
    </div>
  );
}
