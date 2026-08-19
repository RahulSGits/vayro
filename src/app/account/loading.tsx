import { Skeleton } from '@/components/ui/States';

/**
 * Account skeleton. Mirrors the real layout's proportions — heading, index,
 * content — so the page does not visibly reflow when the data lands.
 */
export default function AccountLoading() {
  return (
    <div className="shell section-tight" aria-busy>
      <span className="sr-only" role="status">Loading your account</span>

      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-5 h-12 w-64" />
          <Skeleton className="mt-5 h-3 w-40" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>

      <div className="mt-14 grid gap-x-[var(--gutter)] gap-y-10 lg:mt-20 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
        <div className="hidden flex-col gap-px lg:flex">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>

        <div className="flex flex-col gap-12">
          <div>
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-4 h-9 w-72" />
          </div>
          <div className="grid gap-x-[var(--gutter)] gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((index) => (
              <div key={index}>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="mt-5 h-10 w-24" />
                <Skeleton className="mt-4 h-3 w-full" />
              </div>
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}
