import { Skeleton } from '@/components/ui/States';

export default function CollectionsLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading collections</span>

      <header className="shell section-tight border-b border-[var(--border)]">
        <div className="grid-12 items-end">
          <div className="col-span-4 lg:col-span-7">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-6 h-12 w-full max-w-[20rem] sm:h-16" />
          </div>
          <div className="col-span-4 lg:col-span-5">
            <Skeleton className="mt-6 h-4 w-full max-w-[24rem] lg:mt-0" />
            <Skeleton className="mt-2 h-4 w-2/3 max-w-[16rem]" />
          </div>
        </div>
      </header>

      <div className="shell">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="section-tight border-b border-[var(--border)]">
            <div className="grid-12 items-center gap-y-8">
              <div className={index % 2 === 1 ? 'col-span-4 lg:order-2 lg:col-span-7 lg:col-start-6' : 'col-span-4 lg:col-span-7'}>
                <Skeleton className="aspect-[16/10] w-full" />
              </div>
              <div className={index % 2 === 1 ? 'col-span-4 lg:order-1 lg:col-span-4' : 'col-span-4 lg:col-span-4 lg:col-start-9'}>
                <Skeleton className="h-3 w-24" />
                <Skeleton className="mt-4 h-9 w-3/4 max-w-[16rem]" />
                <Skeleton className="mt-4 h-4 w-full max-w-[20rem]" />
                <Skeleton className="mt-2 h-4 w-5/6 max-w-[18rem]" />
                <Skeleton className="mt-8 h-4 w-36" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
