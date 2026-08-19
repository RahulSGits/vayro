'use client';

import { motion } from 'motion/react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';

/* ==========================================================================
   StepRail — where you are in the checkout, and how much is left.

   Five stops, numbered like a plate index. Completed stops stay reachable so
   nothing entered earlier is ever out of reach; later stops are inert until
   the fields before them validate.
   ========================================================================== */

export const CHECKOUT_STEPS = [
  { id: 1, name: 'Information' },
  { id: 2, name: 'Shipping' },
  { id: 3, name: 'Payment' },
  { id: 4, name: 'Review' },
  { id: 5, name: 'Confirmation' },
] as const;

export type CheckoutStepId = (typeof CHECKOUT_STEPS)[number]['id'];

export type StepRailProps = {
  current: number;
  /** Highest step reached. Anything at or below it can be revisited. */
  furthest?: number;
  onNavigate?: (step: number) => void;
  className?: string;
};

export function StepRail({ current, furthest = current, onNavigate, className }: StepRailProps) {
  const active = CHECKOUT_STEPS.find((step) => step.id === current) ?? CHECKOUT_STEPS[0];

  return (
    <nav aria-label="Checkout progress" className={className}>
      {/* ------------------------------------------------------- mobile -- */}
      <div className="md:hidden">
        <p className="flex items-baseline justify-between gap-4">
          <span className="t-label text-[var(--fg)]">{active.name}</span>
          <span className="t-spec text-[var(--fg-subtle)]">
            {String(current).padStart(2, '0')} / {String(CHECKOUT_STEPS.length).padStart(2, '0')}
          </span>
        </p>
        <ol className="mt-3 flex gap-1.5" aria-hidden>
          {CHECKOUT_STEPS.map((step) => (
            <li key={step.id} className="h-px flex-1 bg-[var(--border)]">
              <motion.span
                className="block h-px origin-left bg-[var(--fg)]"
                initial={false}
                animate={{ scaleX: step.id <= current ? 1 : 0, transition: t.standard }}
              />
            </li>
          ))}
        </ol>
      </div>

      {/* ------------------------------------------------------ desktop -- */}
      <ol className="hidden md:flex md:items-stretch md:gap-0">
        {CHECKOUT_STEPS.map((step) => {
          const complete = step.id < current;
          const isActive = step.id === current;
          const reachable = Boolean(onNavigate) && step.id < current && step.id <= furthest;

          const content = (
            <>
              <span className="flex items-center gap-2">
                {complete ? (
                  <Check
                    size={12}
                    strokeWidth={1.5}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                    aria-hidden
                    className="text-[var(--fg)]"
                  />
                ) : (
                  <span className="t-spec text-[0.6875rem] leading-none">
                    {String(step.id).padStart(2, '0')}
                  </span>
                )}
                <span className="t-label-sm">{step.name}</span>
              </span>
              <span aria-hidden className="relative mt-3 block h-px w-full bg-[var(--border)]">
                {isActive ? (
                  <motion.span
                    layoutId="vayro-checkout-rail"
                    transition={t.standard}
                    className="absolute inset-0 block bg-[var(--fg)]"
                  />
                ) : complete ? (
                  <span className="absolute inset-0 block bg-[var(--border-strong)]" />
                ) : null}
              </span>
            </>
          );

          const tone = isActive
            ? 'text-[var(--fg)]'
            : complete
              ? 'text-[var(--fg-muted)]'
              : 'text-[var(--fg-subtle)]';

          return (
            <li key={step.id} className="min-w-0 flex-1">
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onNavigate?.(step.id)}
                  data-cursor="link"
                  className={cn(
                    'block w-full pr-6 text-left transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]',
                    tone,
                  )}
                >
                  {content}
                </button>
              ) : (
                <span
                  aria-current={isActive ? 'step' : undefined}
                  aria-disabled={!isActive && !complete ? true : undefined}
                  className={cn('block w-full pr-6', tone)}
                >
                  {content}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
