import { Skeleton } from '@/components/ui/States';

/**
 * Instant loading state for the admin segment. It mirrors the real layout —
 * header block, metric row, two panels — so the page does not jump when the
 * data arrives.
 */
export default function AdminLoading() {
  return (
    <div className="pt-10" role="status" aria-label="Loading">
      <span className="sr-only">Loading</span>

      <div className="border-b border-[var(--border)] pb-8">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-4 h-9 w-72 max-w-full" />
        <Skeleton className="mt-4 h-4 w-96 max-w-full" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-[9.5rem]" />
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Skeleton className="h-[22rem]" />
        <Skeleton className="h-[22rem]" />
      </div>

      <Skeleton className="mt-4 h-[18rem]" />
    </div>
  );
}
