import { Skeleton } from '@/components/ui/States';
import { VayroMark } from '@/components/brand';

/* ==========================================================================
   Route-level loading state.

   Mirrors the homepage rhythm — full-bleed plate, statement band, then a
   sectioned grid — so the shift from skeleton to content is a settle rather
   than a jump. Announced politely; the skeleton itself is decorative.
   ========================================================================== */

const HERO_TOKENS = {
  '--bg': 'var(--ink)',
  '--fg': 'var(--ivory)',
  '--border': 'color-mix(in srgb, var(--ivory) 16%, transparent)',
  colorScheme: 'dark',
} as React.CSSProperties;

export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>

      {/* ------------------------------------------------------------ hero */}
      <div
        style={HERO_TOKENS}
        className="relative flex min-h-[100svh] flex-col justify-end bg-[var(--bg)] text-[var(--fg)]"
      >
        <div aria-hidden className="contour pointer-events-none absolute inset-0 opacity-30" />

        {/* The mark inherits currentColor and is already hidden from AT. */}
        <VayroMark
          size={40}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[color-mix(in_oklab,var(--ivory)_22%,transparent)]"
        />

        <div className="shell relative w-full pb-12">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-8 h-[clamp(3.4rem,11vw,9.5rem)] w-[min(92%,44rem)]" />
          <Skeleton className="mt-3 h-[clamp(3.4rem,11vw,9.5rem)] w-[min(72%,32rem)]" />
          <Skeleton className="mt-8 h-4 w-[min(96%,30rem)]" />
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Skeleton className="h-14 w-full sm:w-60" />
            <Skeleton className="h-14 w-full sm:w-60" />
          </div>
        </div>

        <div className="shell relative w-full">
          <div className="flex items-center justify-between border-t border-[var(--border)] py-6">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------- band */}
      <div
        data-surface="inverse"
        className="flex items-center gap-10 overflow-hidden border-y border-[var(--border)] py-8"
      >
        <Skeleton className="ml-[var(--gutter)] h-7 w-[22rem] shrink-0" />
        <Skeleton className="h-3 w-24 shrink-0" />
        <Skeleton className="h-3 w-32 shrink-0" />
        <Skeleton className="h-3 w-28 shrink-0" />
      </div>

      {/* ------------------------------------------------------- sections */}
      <div className="shell section">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-6 h-[clamp(2rem,4.6vw,3.5rem)] w-[min(90%,34rem)]" />
        <Skeleton className="mt-3 h-[clamp(2rem,4.6vw,3.5rem)] w-[min(64%,24rem)]" />
        <Skeleton className="mt-7 h-4 w-[min(96%,36rem)]" />

        <div className="grid-12 mt-16 gap-y-12">
          <div className="col-span-4 md:col-span-8 lg:col-span-5">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="border-t border-[var(--border)] py-6">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="mt-3 h-3 w-full max-w-[26rem]" />
                <Skeleton className="mt-2 h-3 w-3/4 max-w-[20rem]" />
              </div>
            ))}
          </div>
          <Skeleton className="col-span-4 aspect-[3/4] md:col-span-8 lg:col-span-6 lg:col-start-7" />
        </div>
      </div>

      <div className="shell section-tight">
        <div className="grid grid-cols-1 gap-x-[var(--gutter)] gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((card) => (
            <div key={card}>
              <Skeleton className="aspect-[4/5] w-full" />
              <Skeleton className="mt-5 h-4 w-1/2" />
              <Skeleton className="mt-3 h-3 w-1/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
