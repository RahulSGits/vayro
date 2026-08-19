'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';

/* ==========================================================================
   Step chrome — heading, action row, and the panel each step lives in.

   Panels stay mounted and are hidden with `display`, not unmounted: the
   Stripe Payment Element must survive a trip to the review step and back, and
   re-mounting it would discard the card the customer has already entered.
   ========================================================================== */

export function StepHeading({
  index,
  title,
  lede,
  className,
}: {
  index: number;
  title: string;
  lede?: string;
  className?: string;
}) {
  return (
    <header className={cn('mb-8', className)}>
      <p className="t-spec text-[var(--fg-subtle)]">{String(index).padStart(2, '0')}</p>
      <h2 className="t-h2 mt-2">{title}</h2>
      {lede ? <p className="t-body-sm t-pretty mt-3 max-w-md text-[var(--fg-muted)]">{lede}</p> : null}
    </header>
  );
}

export function StepActions({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'mt-10 flex flex-col-reverse items-stretch gap-3 border-t border-[var(--border)] pt-8',
        'sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StepPanel({
  active,
  id,
  labelledBy,
  children,
}: {
  active: boolean;
  id?: string;
  labelledBy?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} aria-labelledby={labelledBy} className={active ? 'block' : 'hidden'}>
      <motion.div
        initial={false}
        animate={active ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
        transition={t.standard}
      >
        {children}
      </motion.div>
    </div>
  );
}

/** Two-column field grid that collapses to one on narrow screens. */
export function FieldRow({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('grid gap-6 sm:grid-cols-2', className)}>{children}</div>;
}
