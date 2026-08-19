'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { VayroMark } from '@/components/brand';
import { useDeviceTier } from '@/hooks/useDeviceTier';

/* ==========================================================================
   StatementStrip — the band under the hero.

   Not an autoplaying marquee. The track is bound to scroll position, so the
   movement is something the reader causes rather than something that loops at
   them. It stops when they stop.
   ========================================================================== */

type Props = {
  tagline: string;
  /** Pulled from the hero product's spec sheet, never hard-coded upstream. */
  specs: string[];
};

export function StatementStrip({ tagline, specs }: Props) {
  const band = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useDeviceTier();

  const { scrollYProgress } = useScroll({
    target: band,
    offset: ['start end', 'end start'],
  });
  const x = useTransform(scrollYProgress, [0, 1], ['3%', '-23%']);

  const run = (
    <span className="flex shrink-0 items-center">
      <span className="t-h2 whitespace-nowrap uppercase">{tagline}</span>
      {specs.map((spec) => (
        <span key={spec} className="flex shrink-0 items-center">
          <VayroMark size={13} className="mx-8 shrink-0 text-[var(--fg-subtle)] md:mx-12" />
          <span className="t-spec whitespace-nowrap text-[var(--fg-muted)]">{spec}</span>
        </span>
      ))}
      <VayroMark size={13} className="mx-8 shrink-0 text-[var(--fg-subtle)] md:mx-12" />
    </span>
  );

  return (
    <div
      ref={band}
      data-surface="inverse"
      className="relative w-full overflow-hidden border-y border-[var(--border)] py-6 md:py-8"
    >
      <motion.div
        style={reducedMotion ? undefined : { x }}
        className="flex w-max items-center will-change-transform"
      >
        {run}
        <span aria-hidden className="flex shrink-0 items-center">
          {run}
        </span>
        <span aria-hidden className="flex shrink-0 items-center">
          {run}
        </span>
      </motion.div>
    </div>
  );
}
