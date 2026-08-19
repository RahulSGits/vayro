import type { Variants, Transition } from 'motion/react';
import { motion as tokens } from '@/lib/design-tokens';

const { duration: D, ease: E, stagger: S } = tokens;

export const t = {
  fast:      { duration: D.fast,      ease: E.out } satisfies Transition,
  standard:  { duration: D.standard,  ease: E.out } satisfies Transition,
  slow:      { duration: D.slow,      ease: E.out } satisfies Transition,
  cinematic: { duration: D.cinematic, ease: E.out } satisfies Transition,
  fold:      { duration: D.slow,      ease: E.fold } satisfies Transition,
};

/* -------------------------------------------------- reusable presets ----- */

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: t.slow },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: t.standard },
};

export const scaleReveal: Variants = {
  hidden: { opacity: 0, scale: 0.965 },
  show:   { opacity: 1, scale: 1, transition: t.cinematic },
};

/** Masked wipe — the brand's signature reveal. Pair with an overflow-hidden parent. */
export const imageReveal: Variants = {
  hidden: { clipPath: 'inset(0 0 100% 0)', scale: 1.06 },
  show:   { clipPath: 'inset(0 0 0% 0)', scale: 1, transition: { duration: D.cinematic, ease: E.fold } },
};

export const clipText: Variants = {
  hidden: { y: '110%' },
  show:   { y: '0%', transition: { duration: D.slow, ease: E.fold } },
};

export const staggerText: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: S.default, delayChildren: 0.05 } },
};

export const staggerTight: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: S.tight } },
};

export const cardLift = {
  rest:  { y: 0, transition: t.standard },
  hover: { y: -6, transition: t.standard },
};

export const pageTransition: Variants = {
  hidden: { opacity: 0 },
  show:   { opacity: 1, transition: { duration: D.standard, ease: E.out } },
  exit:   { opacity: 0, transition: { duration: D.fast, ease: E.in } },
};

export const drawer = {
  hidden: (side: 'right' | 'left' = 'right') => ({ x: side === 'right' ? '100%' : '-100%' }),
  show:   { x: 0, transition: { duration: D.slow, ease: E.fold } },
  exit:   (side: 'right' | 'left' = 'right') => ({
    x: side === 'right' ? '100%' : '-100%',
    transition: { duration: D.standard, ease: E.in },
  }),
};

/** Standard viewport trigger — animate once, slightly before fully in view. */
export const inView = { once: true, amount: 0.25, margin: '0px 0px -12% 0px' } as const;

export { D as durations, E as eases, S as staggers };
