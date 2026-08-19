'use client';

import { useId, useRef } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';
import { useTheme, type ThemeChoice } from '@/components/providers/ThemeProvider';

/* ==========================================================================
   ThemeToggle — a three-position switch, not a flip.

   Light and dark are the brand chevron, raised and settled: the ascending arm
   of the mark, isolated. System is the same square split down the middle —
   half the plate light, half dark, which is what "follow the device" actually
   looks like. No sun, no moon.

   ── Why a segmented control ──────────────────────────────────────────────
   A cycling button cannot show the third state without a label, and cannot
   answer "what am I on?" without being pressed. Three cells state the choice
   and the alternatives at once, which is the whole reason the option exists.

   ── Accessibility ────────────────────────────────────────────────────────
   A `role="group"` of three toggle buttons. Each carries `aria-pressed` for
   its own state and an `aria-label` naming the palette in full, so a screen
   reader hears "Light theme, toggle button, not pressed" rather than a glyph.
   All three are in the tab order; ←/→/Home/End move between them as a
   convenience, matching the arrow behaviour people expect from a segment.
   ========================================================================== */

interface Option {
  value: ThemeChoice;
  label: string;
  /** Spoken by assistive technology and shown on hover. */
  description: string;
}

const OPTIONS: Option[] = [
  { value: 'light', label: 'Light', description: 'Light theme' },
  { value: 'dark', label: 'Dark', description: 'Dark theme' },
  { value: 'system', label: 'System', description: 'Match the system theme' },
];

/* ------------------------------------------------------------- glyphs -- */

function ChevronGlyph({ up }: { up: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      focusable="false"
    >
      {up ? <path d="M4 15 12 8.5l8 6.5" /> : <path d="M4 9 12 15.5l8-6.5" />}
    </svg>
  );
}

/** A plate lit from one side only — the device deciding, not us. */
function SystemGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width={15}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden
      focusable="false"
    >
      <rect x="4.5" y="4.5" width="15" height="15" />
      <path d="M12 4.5v15" />
      <path d="M12 4.5h7.5v15H12z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function Glyph({ value }: { value: ThemeChoice }) {
  if (value === 'system') return <SystemGlyph />;
  return <ChevronGlyph up={value === 'light'} />;
}

/* -------------------------------------------------------------- control -- */

export function ThemeToggle({
  className,
  withLabel = false,
}: {
  className?: string;
  /** Renders the state name beside each glyph — used in the mobile drawer. */
  withLabel?: boolean;
}) {
  const { theme, resolvedTheme, setTheme, ready } = useTheme();
  const groupRef = useRef<HTMLDivElement>(null);
  // The header and the mobile drawer both mount a toggle. A shared layoutId
  // would have Motion animate the fill between two unrelated controls, so
  // each instance gets its own.
  const fillId = useId();

  /** ←/→/Home/End walk the segment and take the focused cell with them. */
  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;

    let next = -1;
    if (step !== 0) next = (index + step + OPTIONS.length) % OPTIONS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = OPTIONS.length - 1;
    if (next < 0) return;

    event.preventDefault();
    const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('button[data-theme-cell]');
    buttons?.[next]?.focus();
  };

  return (
    <div
      ref={groupRef}
      role="group"
      aria-label="Colour theme"
      aria-busy={!ready}
      data-cursor="link"
      // Held invisible until the stored choice is known, so no cell is shown
      // active before the right one can be.
      style={{ visibility: ready ? 'visible' : 'hidden' }}
      className={cn(
        'relative inline-flex items-center border border-[var(--border)]',
        'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:border-[var(--border-strong)]',
        className,
      )}
    >
      {OPTIONS.map((option, index) => {
        const active = ready && theme === option.value;
        // 'System' is active *and* following something — name what it landed
        // on so the title is never ambiguous.
        const title =
          option.value === 'system' && active
            ? `Matching the system theme — currently ${resolvedTheme}`
            : option.description;

        return (
          <button
            key={option.value}
            type="button"
            data-theme-cell=""
            onClick={() => setTheme(option.value)}
            onKeyDown={(event) => onKeyDown(event, index)}
            aria-pressed={active}
            aria-label={option.description}
            title={title}
            tabIndex={ready ? undefined : -1}
            className={cn(
              'relative inline-flex h-9 items-center justify-center gap-2',
              withLabel ? 'px-3' : 'w-9',
              'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
              // The site-wide focus ring sits outside the cell; lift the
              // focused segment so its ring is not clipped by its neighbour.
              'focus-visible:z-10',
              active ? 'text-[var(--bg)]' : 'text-[var(--fg-subtle)] hover:text-[var(--fg)]',
            )}
          >
            {active ? (
              <motion.span
                layoutId={`theme-toggle-fill-${fillId}`}
                transition={t.standard}
                aria-hidden
                className="absolute inset-0 bg-[var(--fg)]"
              />
            ) : null}
            <span className="relative inline-flex items-center gap-2">
              <Glyph value={option.value} />
              {withLabel ? <span className="t-label-sm">{option.label}</span> : null}
            </span>
          </button>
        );
      })}
    </div>
  );
}
