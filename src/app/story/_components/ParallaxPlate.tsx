'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, useScroll, useTransform } from 'motion/react';
import { Reveal } from '@/components/ui/Reveal';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { cn } from '@/lib/utils';

/* ==========================================================================
   ParallaxPlate — a full-bleed plate for the story.

   The image is oversized inside its frame and drifts against the scroll, so
   the plate holds its edges while the picture moves. The house masked wipe
   handles the entrance; the drift is on top of it. Both stop dead under
   `prefers-reduced-motion`.
   ========================================================================== */

type Props = {
  src: string;
  alt: string;
  sizes: string;
  /** Tailwind aspect utility — the frame the plate holds. */
  aspect?: string;
  caption?: string;
  /** Two-digit plate number, set beside the caption. */
  index?: string;
  /** Drift in px across a full pass. Keep at or below 50 — the overhang is 12%. */
  depth?: number;
  priority?: boolean;
  className?: string;
};

export function ParallaxPlate({
  src,
  alt,
  sizes,
  aspect = 'aspect-[16/9]',
  caption,
  index,
  depth = 44,
  priority = false,
  className,
}: Props) {
  const frame = useRef<HTMLElement>(null);
  const { reducedMotion } = useDeviceTier();

  const { scrollYProgress } = useScroll({
    target: frame,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [depth, -depth]);

  return (
    <figure ref={frame} className={cn('relative w-full', className)}>
      <Reveal
        variant="imageReveal"
        className={cn('relative w-full overflow-hidden bg-[var(--bg-sunken)]', aspect)}
      >
        <motion.div
          style={reducedMotion ? undefined : { y }}
          className="absolute inset-x-0 -top-[12%] h-[124%] will-change-transform"
        >
          <Image src={src} alt={alt} fill priority={priority} sizes={sizes} className="object-cover" />
        </motion.div>
      </Reveal>

      {caption ? (
        <figcaption className="t-spec mt-4 flex items-center gap-3 text-[var(--fg-subtle)]">
          {index ? (
            <>
              <span aria-hidden>{index}</span>
              <span aria-hidden className="block h-px w-5 bg-[var(--border-strong)]" />
            </>
          ) : null}
          <span>{caption}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}
