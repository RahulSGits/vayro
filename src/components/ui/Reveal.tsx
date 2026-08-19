'use client';

import { useMemo } from 'react';
import { motion, type Variants } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  clipText,
  fadeIn,
  fadeUp,
  imageReveal,
  inView,
  scaleReveal,
  staggerText,
  staggerTight,
} from '@/lib/motion';

/* ==========================================================================
   Reveal — the single scroll-entrance wrapper.
   Every preset comes from src/lib/motion.ts; nothing here invents a duration.
   ========================================================================== */

const PRESETS = {
  fadeUp,
  fadeIn,
  scaleReveal,
  imageReveal,
  stagger: staggerText,
  staggerTight,
} as const;

export type RevealVariant = keyof typeof PRESETS;

const TAGS = {
  div: motion.div,
  section: motion.section,
  article: motion.article,
  header: motion.header,
  footer: motion.footer,
  aside: motion.aside,
  figure: motion.figure,
  ul: motion.ul,
  li: motion.li,
  p: motion.p,
  span: motion.span,
} as const;

export type RevealTag = keyof typeof TAGS;

/** Clones a preset with a delay applied to its `show` transition. */
function withDelay(variants: Variants, delay: number): Variants {
  if (!delay) return variants;
  const show = variants.show;
  if (typeof show !== 'object' || show === null || Array.isArray(show)) return variants;

  const target = show as { transition?: Record<string, unknown> };
  const transition = { ...target.transition };
  if ('staggerChildren' in transition) {
    transition.delayChildren = Number(transition.delayChildren ?? 0) + delay;
  } else {
    transition.delay = delay;
  }
  return { ...variants, show: { ...target, transition } };
}

export type RevealProps = {
  variant?: RevealVariant;
  /** Seconds. Added to the preset's own transition, never replacing it. */
  delay?: number;
  as?: RevealTag;
  /** Re-run the reveal each time the element re-enters the viewport. */
  repeat?: boolean;
  /** Fraction of the element that must be visible. Defaults to the house value. */
  amount?: number;
  className?: string;
  style?: React.CSSProperties;
  id?: string;
  children: React.ReactNode;
};

/**
 * Wraps content in the house scroll-entrance. Children of a `stagger` variant
 * should themselves be `<Reveal>` elements — they inherit the parent's state.
 */
export function Reveal({
  variant = 'fadeUp',
  delay = 0,
  as = 'div',
  repeat = false,
  amount,
  className,
  style,
  id,
  children,
}: RevealProps) {
  const Component = TAGS[as] as typeof motion.div;
  const variants = useMemo(() => withDelay(PRESETS[variant], delay), [variant, delay]);
  const viewport = useMemo(
    () => ({ ...inView, once: !repeat, ...(amount === undefined ? null : { amount }) }),
    [repeat, amount],
  );

  return (
    <Component
      id={id}
      className={className}
      style={style}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
    >
      {children}
    </Component>
  );
}

/**
 * A child of a `stagger` Reveal. Uses the same preset vocabulary but takes its
 * animation state from the parent rather than its own viewport trigger.
 */
export function RevealChild({
  variant = 'fadeUp',
  as = 'div',
  className,
  style,
  children,
}: Omit<RevealProps, 'delay' | 'repeat' | 'amount' | 'id'>) {
  const Component = TAGS[as] as typeof motion.div;
  return (
    <Component className={className} style={style} variants={PRESETS[variant]}>
      {children}
    </Component>
  );
}

export type RevealTextTag = 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'div' | 'span';

export type RevealTextProps = {
  /** One entry per masked line. A string is split on newlines. */
  text: string | string[];
  as?: RevealTextTag;
  delay?: number;
  repeat?: boolean;
  className?: string;
  lineClassName?: string;
};

/**
 * Masked line-by-line headline reveal — the brand's signature type entrance.
 * Break the copy yourself: the mask is per line, so the author controls rag.
 */
export function RevealText({
  text,
  as = 'h2',
  delay = 0,
  repeat = false,
  className,
  lineClassName,
}: RevealTextProps) {
  const Tag = as;
  const lines = useMemo(
    () => (Array.isArray(text) ? text : text.split('\n')).filter((line) => line.length > 0),
    [text],
  );
  const container = useMemo(() => withDelay(staggerText, delay), [delay]);
  const viewport = useMemo(() => ({ ...inView, once: !repeat }), [repeat]);

  return (
    <Tag className={className}>
      <motion.span
        className="block"
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={viewport}
      >
        {lines.map((line, index) => (
          <span key={`${line}-${index}`} className={cn('block overflow-hidden', lineClassName)}>
            {/* The negative margin gives descenders room inside the mask. */}
            <motion.span className="-mb-[0.14em] block pb-[0.14em]" variants={clipText}>
              {line}
            </motion.span>
          </span>
        ))}
      </motion.span>
    </Tag>
  );
}
