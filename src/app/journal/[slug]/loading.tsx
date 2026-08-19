import { Skeleton } from '@/components/ui/States';

/**
 * The entry's own skeleton. Without it the index skeleton — a grid of cards —
 * would be shown while an article loads, which is the wrong shape entirely.
 */
export default function JournalEntryLoading() {
  return (
    <div className="pb-[var(--section-tight)]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading entry</span>

      <div className="shell pt-6 pb-8">
        <Skeleton className="h-3 w-56" />
      </div>

      <header className="shell">
        <div className="grid-12">
          <div className="col-span-4 lg:col-span-9">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="mt-6 h-12 w-full max-w-[34rem] sm:h-16" />
            <Skeleton className="mt-8 h-4 w-full max-w-[30rem]" />
            <Skeleton className="mt-2 h-4 w-3/5 max-w-[20rem]" />
          </div>
        </div>

        <div className="mt-12 grid grid-cols-2 gap-x-[var(--gutter)] gap-y-6 border-y border-[var(--border)] py-6 sm:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index}>
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="mt-3 h-3.5 w-28" />
            </div>
          ))}
        </div>
      </header>

      <div className="shell mt-12">
        <Skeleton className="aspect-[16/9] w-full" />
      </div>

      <div className="shell mt-16 md:mt-20">
        <div className="grid-12">
          <div className="col-span-4 lg:col-span-8 lg:col-start-3">
            <div className="mx-auto w-full max-w-[var(--max-text)] space-y-4">
              {Array.from({ length: 9 }, (_, index) => (
                <Skeleton
                  key={index}
                  className={index % 4 === 3 ? 'h-4 w-2/3' : 'h-4 w-full'}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
