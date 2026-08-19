import { Skeleton } from '@/components/ui/States';

/** Mirrors the journal index so the masthead and grid do not jump when data lands. */
export default function JournalLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the journal</span>

      <header className="shell section-tight border-b border-[var(--fg)]">
        <div className="grid-12 items-end">
          <div className="col-span-4 lg:col-span-8">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-6 h-14 w-full max-w-[26rem] sm:h-20" />
          </div>
          <div className="col-span-4 lg:col-span-4">
            <Skeleton className="mt-8 h-4 w-full max-w-[22rem] lg:mt-0" />
            <Skeleton className="mt-2 h-4 w-3/4 max-w-[18rem]" />
          </div>
        </div>
      </header>

      {/* lead */}
      <div className="shell section-tight">
        <div className="grid-12 items-center gap-y-8">
          <div className="col-span-4 lg:col-span-7">
            <Skeleton className="aspect-[16/10] w-full" />
          </div>
          <div className="col-span-4 lg:col-span-5 lg:pl-[var(--gutter)]">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-5 h-10 w-full max-w-[20rem] sm:h-12" />
            <Skeleton className="mt-6 h-4 w-full max-w-[24rem]" />
            <Skeleton className="mt-2 h-4 w-4/5 max-w-[20rem]" />
            <Skeleton className="mt-8 h-3 w-40" />
          </div>
        </div>
      </div>

      {/* filter + grid */}
      <div className="shell section-tight">
        <div className="flex flex-col gap-8 border-t border-[var(--border)] pt-8 lg:flex-row lg:items-center lg:justify-between">
          <Skeleton className="h-3 w-24" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton key={index} className="h-10 w-28" />
            ))}
          </div>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-x-[var(--gutter)] gap-y-14 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index}>
              <Skeleton className="aspect-[4/3] w-full" />
              <Skeleton className="mt-5 h-2.5 w-24" />
              <Skeleton className="mt-4 h-5 w-4/5" />
              <Skeleton className="mt-4 h-3.5 w-full" />
              <Skeleton className="mt-2 h-3.5 w-2/3" />
              <Skeleton className="mt-5 h-3 w-36" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
