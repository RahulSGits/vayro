'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { imageReveal, t } from '@/lib/motion';
import { VayroWordmark } from '@/components/brand';

/* ==========================================================================
   AuthAside — the left half of the split.

   A single art-directed plate, a masked reveal, and one line of copy at the
   foot. It is decoration with a job: it tells you which door you are standing
   at before you have read the heading.
   ========================================================================== */

type Plate = {
  src: string;
  alt: string;
  eyebrow: string;
  line: string;
  /** Mono stamp in the corner — the technical register of the brand. */
  stamp: string;
};

const PLATES: Record<string, Plate> = {
  '/login': {
    src: '/media/field-treeline.webp',
    alt: 'Treeline at first light, low cloud below the ridge',
    eyebrow: 'Account',
    line: 'Every order, every saved piece, one record.',
    stamp: 'FIELD ARCHIVE / TREELINE',
  },
  '/signup': {
    src: '/media/field-ascent.webp',
    alt: 'A figure on an ascent, shell layer against grey rock',
    eyebrow: 'Create account',
    line: 'One layer. Every destination.',
    stamp: 'FIELD ARCHIVE / ASCENT',
  },
  '/forgot-password': {
    src: '/media/field-coastal.webp',
    alt: 'Coastal path under moving weather',
    eyebrow: 'Recovery',
    line: 'It happens. We will send you a way back in.',
    stamp: 'FIELD ARCHIVE / COASTAL',
  },
  '/reset-password': {
    src: '/media/field-dusk.webp',
    alt: 'Last light across a wide valley',
    eyebrow: 'New password',
    line: 'Set it once. The old one stops working immediately.',
    stamp: 'FIELD ARCHIVE / DUSK',
  },
};

const FALLBACK = PLATES['/login'];

/**
 * The plate always carries ivory type over a darkened photograph, in either
 * theme. `data-surface="inverse"` would flip *relative* to the page, so in the
 * dark theme it would hand this panel near-black text on a black scrim.
 */
const PLATE_TOKENS = {
  '--fg': 'var(--ivory)',
  '--fg-muted': 'color-mix(in srgb, var(--ivory) 76%, transparent)',
  '--fg-subtle': 'color-mix(in srgb, var(--ivory) 58%, transparent)',
  '--border': 'color-mix(in srgb, var(--ivory) 16%, transparent)',
  '--border-strong': 'color-mix(in srgb, var(--ivory) 34%, transparent)',
  '--scrim': 'linear-gradient(180deg, rgba(6,7,6,0.18) 0%, rgba(6,7,6,0.34) 42%, rgba(6,7,6,0.82) 100%)',
} as React.CSSProperties;

export function AuthAside() {
  const pathname = usePathname();
  const plate = PLATES[pathname] ?? FALLBACK;

  return (
    <aside
      style={PLATE_TOKENS}
      // Pinned to the viewport so the plate holds its composition while a long
      // form scrolls past it. Stretched to the row height it would become a
      // 1,100px crop of a landscape, which is not art direction.
      className="relative hidden overflow-hidden bg-[var(--ink)] text-[var(--fg)] lg:sticky lg:top-[var(--header-h)] lg:block lg:h-[calc(100svh-var(--header-h))] lg:self-start"
    >
      <motion.div
        key={plate.src}
        variants={imageReveal}
        initial="hidden"
        animate="show"
        className="absolute inset-0"
      >
        <Image
          src={plate.src}
          alt={plate.alt}
          fill
          priority
          sizes="(min-width: 1024px) 46vw, 0px"
          className="object-cover"
        />
      </motion.div>

      {/* Scrim so the foot copy holds at any exposure. */}
      <span
        aria-hidden
        className="absolute inset-0"
        style={{ background: 'var(--scrim)' }}
      />
      <span aria-hidden className="contour absolute inset-0 opacity-30" />

      <div className="relative flex h-full flex-col justify-between p-[var(--gutter)]">
        {/* Decorative lockup only — the header already owns the home link. */}
        <span aria-hidden className="inline-flex w-fit text-[var(--fg)] opacity-90">
          <VayroWordmark height={14} />
        </span>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...t.slow, delay: 0.24 }}
          className="max-w-[26rem]"
        >
          <p className="t-label-sm text-[var(--fg-subtle)]">{plate.eyebrow}</p>
          <p className="t-h2 t-balance mt-4 text-[var(--fg)]">{plate.line}</p>
          <span aria-hidden className="mt-8 block h-px w-16 bg-[var(--border-strong)]" />
          <p className="t-spec mt-4 text-[var(--fg-subtle)]">{plate.stamp}</p>
        </motion.div>
      </div>
    </aside>
  );
}
