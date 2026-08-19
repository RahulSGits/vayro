'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';
import { useTheme } from '@/components/providers/ThemeProvider';

/* ==========================================================================
   ThemeToggle — the brand chevron, flipped.
   Dark points down (settled), light points up (raised). No sun, no moon.
   ========================================================================== */

export function ThemeToggle({
  className,
  withLabel = false,
}: {
  className?: string;
  /** Renders the state name beside the glyph — used in the mobile drawer. */
  withLabel?: boolean;
}) {
  const { theme, toggle, ready } = useTheme();
  const dark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label="Dark theme"
      title={dark ? 'Switch to light' : 'Switch to dark'}
      data-cursor="link"
      tabIndex={ready ? undefined : -1}
      // Held invisible until the stored preference is known, so the glyph
      // never flips in front of the user on first paint.
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      className={cn(
        'group relative inline-flex items-center gap-3 text-[var(--fg-muted)]',
        'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:text-[var(--fg)]',
        withLabel ? 'h-10' : 'h-10 w-10 justify-center',
        className,
      )}
    >
      <span className="relative inline-flex h-10 w-10 items-center justify-center">
        {/* Hairline track that closes in on hover — the mechanical tell. */}
        <span
          aria-hidden
          className="absolute inset-1.5 rounded-[var(--r-pill)] border border-[var(--border)] opacity-0 transition-opacity duration-[var(--d-fast)] ease-[var(--e-out)] group-hover:opacity-100"
        />
        <motion.svg
          viewBox="0 0 24 24"
          width={17}
          height={17}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="square"
          strokeLinejoin="miter"
          aria-hidden
          focusable="false"
          animate={{ rotate: dark ? 0 : 180, transition: t.fold }}
          initial={false}
          className="relative"
        >
          {/* Chevron: the ascending arm of the mark, isolated. */}
          <path d="M4 9.5 12 16l8-6.5" />
          <motion.path
            d="M4 4.5 12 11l8-6.5"
            animate={{ opacity: dark ? 0.28 : 0.85, y: dark ? 0 : -1, transition: t.standard }}
            initial={false}
          />
        </motion.svg>
      </span>

      {withLabel ? <span className="t-label-sm">{dark ? 'Dark' : 'Light'}</span> : null}
    </button>
  );
}
