'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'motion/react';
import { Reveal } from '@/components/ui/Reveal';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { cn } from '@/lib/utils';

/* ==========================================================================
   ParallaxFigure — one plate in an editorial composition.

   The drift is bound to the figure's own pass through the viewport, so a group
   of them at different depths reads as a composition rather than a grid. The
   masked wipe is the house reveal; the drift is on top of it.
   ========================================================================== */

type Props = {
  src: string;
  alt: string;
  caption: string;
  index: string;
  /** Vertical drift in px across a full pass. Negative moves against the scroll. */
  depth?: number;
  aspect: string;
  sizes: string;
  className?: string;
};

export function ParallaxFigure({
  src,
  alt,
  caption,
  index,
  depth = 40,
  aspect,
  sizes,
  className,
}: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useDeviceTier();

  const { scrollYProgress } = useScroll({
    target: frame,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [depth, -depth]);

  return (
    <motion.figure ref={frame} style={reducedMotion ? undefined : { y }} className={className}>
      <Reveal
        variant="imageReveal"
        className={cn('relative w-full overflow-hidden bg-[var(--bg-sunken)]', aspect)}
      >
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      </Reveal>
      <figcaption className="t-spec mt-4 flex items-center gap-3 text-[var(--fg-subtle)]">
        <span aria-hidden>{index}</span>
        <span aria-hidden className="block h-px w-5 bg-[var(--border-strong)]" />
        <span>{caption}</span>
      </figcaption>
    </motion.figure>
  );
}
