import { Skeleton } from '@/components/ui/States';

/** Form-column skeleton. The plate is CSS-only and paints immediately. */
export default function AuthLoading() {
  return (
    <div className="flex flex-col gap-12" aria-busy>
      <span className="sr-only" role="status">Loading</span>
      <div>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-5 h-12 w-56" />
        <Skeleton className="mt-5 h-4 w-full max-w-[20rem]" />
      </div>
      <div className="flex flex-col gap-7">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    </div>
  );
}
