'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react';
import { ContourField } from '@/components/brand';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { cn } from '@/lib/utils';

/* ==========================================================================
   PinnedStatement — the story's held breath.

   A tall track with a viewport-height panel pinned inside it. Each line of the
   statement resolves as the reader scrolls through the track, so the sentence
   is assembled by the reader rather than played at them.

   The reduced-motion collapse is done in CSS, not JavaScript: the track has to
   be the right height on the very first paint, or the page reflows under
   everyone who asked for less movement. Only the scrub itself waits for
   capability detection, and by then this section is several screens away.
   ========================================================================== */

type Props = {
  eyebrow?: string;
  /** One entry per line. Author the rag — each line resolves on its own. */
  lines: string[];
  footnote?: string;
  /** Track height in viewport units. The pin lasts `track - 100`. */
  track?: number;
  className?: string;
};

export function PinnedStatement({
  eyebrow,
  lines,
  footnote,
  track = 260,
  className,
}: Props) {
  const rail = useRef<HTMLElement>(null);
  const { reducedMotion, pending } = useDeviceTier();
  const scrub = !reducedMotion && !pending;

  const { scrollYProgress } = useScroll({
    target: rail,
    offset: ['start start', 'end end'],
  });

  // The statement resolves across the first three quarters of the track; the
  // last quarter is a hold, so the finished sentence can be read at rest.
  const span = 0.75 / Math.max(lines.length, 1);

  return (
    <section
      ref={rail}
      data-surface="inverse"
      aria-label={eyebrow ?? 'Statement'}
      style={{ '--story-track': `${track}svh` } as React.CSSProperties}
      className={cn('relative isolate h-[var(--story-track)] motion-reduce:h-auto', className)}
    >
      <div
        className={cn(
          'sticky top-0 flex h-[100svh] w-full items-center overflow-hidden',
          'motion-reduce:static motion-reduce:h-auto motion-reduce:py-[var(--section-loose)]',
        )}
      >
        <ContourField opacity={0.07} scale={180} className="-z-10 text-[var(--fg)]" />

        <div className="shell w-full">
          {eyebrow ? (
            <p className="t-label flex items-center gap-4 text-[var(--fg-subtle)]">
              <span aria-hidden className="block h-px w-8 bg-[var(--border-strong)]" />
              {eyebrow}
            </p>
          ) : null}

          <h2 className="t-display-lg t-balance mt-10 max-w-[20ch]">
            {lines.map((line, index) =>
              scrub ? (
                <StatementLine
                  key={line}
                  progress={scrollYProgress}
                  start={index * span}
                  end={index * span + span}
                >
                  {line}
                </StatementLine>
              ) : (
                <span key={line} className="block">
                  {line}
                </span>
              ),
            )}
          </h2>

          {footnote ? (
            <p className="t-body-lg t-pretty mt-12 max-w-[var(--max-text)] text-[var(--fg-muted)]">
              {footnote}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/**
 * One line, scrubbed by the track's own progress. It owns its transforms so
 * the statement can be any number of lines without breaking hook order.
 */
function StatementLine({
  progress,
  start,
  end,
  children,
}: {
  progress: MotionValue<number>;
  start: number;
  end: number;
  children: React.ReactNode;
}) {
  const opacity = useTransform(progress, [start, end], [0.16, 1]);
  const y = useTransform(progress, [start, end], ['0.28em', '0em']);

  return (
    <motion.span style={{ opacity, y }} className="block will-change-transform">
      {children}
    </motion.span>
  );
}
