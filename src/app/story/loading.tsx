import { Skeleton } from '@/components/ui/States';

/**
 * Mirrors the story's opening screen and first chapter. The rest of the page
 * is scroll-driven and several viewports down, so there is nothing useful to
 * pre-draw below the fold — a skeleton nobody will see is just weight.
 */
export default function StoryLoading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading the story</span>

      <header className="bg-[var(--bg-sunken)]">
        <div className="shell flex min-h-[86svh] flex-col justify-end pt-[calc(var(--header-h)+6rem)] pb-20">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-6 h-16 w-full max-w-[38rem] sm:h-24" />
          <Skeleton className="mt-4 h-16 w-full max-w-[32rem] sm:h-24" />

          <div className="grid-12 mt-12">
            <div className="col-span-4 lg:col-span-6">
              <Skeleton className="h-4 w-full max-w-[30rem]" />
              <Skeleton className="mt-2 h-4 w-4/5 max-w-[26rem]" />
              <Skeleton className="mt-2 h-4 w-2/3 max-w-[20rem]" />
            </div>
          </div>
        </div>
      </header>

      <div className="shell section">
        <div className="grid-12 items-start gap-y-14">
          <div className="col-span-4 lg:col-span-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-7 h-11 w-full max-w-[22rem] sm:h-14" />
            <Skeleton className="mt-3 h-11 w-4/5 max-w-[20rem] sm:h-14" />
            <div className="mt-8 space-y-3">
              {Array.from({ length: 7 }, (_, index) => (
                <Skeleton key={index} className={index % 4 === 3 ? 'h-4 w-2/3' : 'h-4 w-full'} />
              ))}
            </div>
          </div>
          <div className="col-span-4 lg:col-span-6 lg:col-start-7">
            <Skeleton className="aspect-[4/5] w-full" />
            <Skeleton className="mt-4 h-3 w-56" />
          </div>
        </div>
      </div>
    </div>
  );
}
