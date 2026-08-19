'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';
import { useTheme } from '@/components/providers/ThemeProvider';

/* ==========================================================================
   ThemeControl — a three-position switch, not a dropdown.

   VAYRO ships two palettes and dark is the default, but the choice is three
   things: light, dark, or follow the device. The *choice* is stored locally
   and resolved before first paint, so it survives a reload without a flash —
   and 'System' keeps tracking the device for the rest of the session. Held in
   a disabled state until the stored preference is known.
   ========================================================================== */

const OPTIONS = [
  { value: 'dark' as const, label: 'Dark', note: 'The default. Built for the product plates.' },
  { value: 'light' as const, label: 'Light', note: 'Warm ivory. Easier in bright rooms.' },
  { value: 'system' as const, label: 'System', note: 'Follows your device, including when it switches at dusk.' },
];

export function ThemeControl() {
  const { theme, resolvedTheme, setTheme, ready } = useTheme();

  return (
    <div className="max-w-[28rem]">
      <div
        role="radiogroup"
        aria-label="Colour theme"
        aria-busy={!ready}
        className="relative grid grid-cols-3 border border-[var(--border-strong)]"
      >
        {OPTIONS.map((option) => {
          const selected = ready && theme === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={!ready}
              onClick={() => setTheme(option.value)}
              className={cn(
                't-label relative h-12 transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                selected ? 'text-[var(--bg)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]',
                'disabled:opacity-40',
              )}
            >
              {selected ? (
                <motion.span
                  layoutId="theme-control-fill"
                  transition={t.standard}
                  aria-hidden
                  className="absolute inset-0 bg-[var(--fg)]"
                />
              ) : null}
              <span className="relative">{option.label}</span>
            </button>
          );
        })}
      </div>

      <p className="t-caption mt-4 text-[var(--fg-subtle)]">
        {!ready
          ? 'Reading your saved preference…'
          : theme === 'system'
            ? `Follows your device, currently ${resolvedTheme}.`
            : (OPTIONS.find((option) => option.value === theme)?.note ?? '')}
      </p>
    </div>
  );
}
