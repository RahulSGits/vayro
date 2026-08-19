'use client';

import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useScroll, useSpring, useTransform } from 'motion/react';
import { ButtonLink } from '@/components/ui/Button';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { clipText, fadeUp, staggerText, durations, eases } from '@/lib/motion';

/* ==========================================================================
   HeroOverlay — the editorial layer over the 3D stage.

   Three jobs: the masked headline entrance, a pointer parallax that only runs
   on a precise pointer, and the scroll hand-off that clears the type as the
   page moves on. Every duration and easing comes from the token set.
   ========================================================================== */

const HEADLINE = ['ENGINEERED FOR', 'THE WAY FORWARD.'];

/** Springs are a physical description, not a duration — no token applies. */
const SPRING = { stiffness: 84, damping: 24, mass: 0.7 } as const;

type Props = {
  productSlug: string;
  priceLabel?: string;
  colorways?: { name: string; hex: string }[];
};

/** One masked line. The parent supplies the stagger. */
function Line({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className="block overflow-hidden">
      <motion.span variants={clipText} className={`-mb-[0.14em] block pb-[0.14em] ${className ?? ''}`}>
        {children}
      </motion.span>
    </span>
  );
}

/**
 * The unmasked entrance. Anything focusable uses this — a clipping mask would
 * cut the focus ring off at the edge of the line box.
 */
function Rise({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={fadeUp} className={className}>
      {children}
    </motion.div>
  );
}

export function HeroOverlay({ productSlug, priceLabel, colorways = [] }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const { coarsePointer, reducedMotion, pending } = useDeviceTier();
  const parallax = !pending && !coarsePointer && !reducedMotion;

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, SPRING);
  const smoothY = useSpring(pointerY, SPRING);

  // Two depths. The headline sits furthest back and travels furthest.
  const nearX = useTransform(smoothX, [-0.5, 0.5], [9, -9]);
  const nearY = useTransform(smoothY, [-0.5, 0.5], [6, -6]);
  const farX = useTransform(smoothX, [-0.5, 0.5], [22, -22]);
  const farY = useTransform(smoothY, [-0.5, 0.5], [14, -14]);

  const { scrollYProgress } = useScroll({ target: root, offset: ['start start', 'end start'] });
  const veil = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const drift = useTransform(scrollYProgress, [0, 1], [0, -80]);

  useEffect(() => {
    if (!parallax) {
      pointerX.set(0);
      pointerY.set(0);
      return;
    }
    const onMove = (event: PointerEvent) => {
      pointerX.set(event.clientX / window.innerWidth - 0.5);
      pointerY.set(event.clientY / window.innerHeight - 0.5);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [parallax, pointerX, pointerY]);

  const handoff = reducedMotion ? undefined : { opacity: veil, y: drift };

  return (
    <div ref={root} className="pointer-events-none relative z-10 flex min-h-[100svh] flex-1 flex-col justify-end">
      <motion.div
        style={handoff}
        className="shell w-full pt-[calc(var(--header-h)+5rem)] pb-12 md:pb-16"
      >
        <motion.div variants={staggerText} initial="hidden" animate="show">
          {/* ------------------------------------------------------ eyebrow */}
          <motion.div style={parallax ? { x: nearX, y: nearY } : undefined}>
            <Line>
              <span className="flex items-center gap-4">
                <span aria-hidden className="block h-px w-9 bg-[var(--fg-subtle)] md:w-14" />
                <span className="t-label text-[var(--fg-muted)]">Meridian Carry Shell</span>
              </span>
            </Line>
          </motion.div>

          {/* ----------------------------------------------------- headline */}
          <motion.h1
            id="hero-title"
            style={parallax ? { x: farX, y: farY } : undefined}
            className="t-display-xl mt-6 md:mt-8"
          >
            {HEADLINE.map((line) => (
              <Line key={line}>{line}</Line>
            ))}
          </motion.h1>

          {/* -------------------------------------------------- sub + calls */}
          <motion.div
            style={parallax ? { x: nearX, y: nearY } : undefined}
            className="mt-8 flex flex-col gap-9 md:mt-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16"
          >
            <Line className="max-w-[34rem]">
              <span className="t-body-lg t-pretty block text-[var(--fg-muted)]">
                Premium outerwear designed for movement, travel and everywhere between.
              </span>
            </Line>

            <Rise className="pointer-events-auto flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:gap-4">
              <ButtonLink
                href={`/product/${productSlug}`}
                variant="primary"
                size="lg"
                data-cursor="link"
                className="sm:min-w-[15rem]"
              >
                Shop the jacket
              </ButtonLink>
              <ButtonLink
                href="/technology"
                variant="secondary"
                size="lg"
                data-cursor="link"
                className="sm:min-w-[15rem]"
              >
                Explore the technology
              </ButtonLink>
            </Rise>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* ------------------------------------------------------- bottom rail */}
      <div className="shell w-full">
        <motion.div
          variants={staggerText}
          initial="hidden"
          animate="show"
          className="flex items-center justify-between gap-6 border-t border-[var(--border)] py-5 md:py-6"
        >
          <Rise>
            <a
              href="#carry-system"
              data-cursor="link"
              className="group pointer-events-auto inline-flex items-center gap-4"
            >
              <ScrollCue still={reducedMotion} />
              <span className="t-label-sm text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] group-hover:text-[var(--fg)]">
                Scroll
              </span>
            </a>
          </Rise>

          <Line>
            <span className="flex items-center gap-5">
              {colorways.length > 0 ? (
                <span className="hidden items-center gap-2 sm:flex" aria-hidden>
                  {colorways.map((colorway) => (
                    <span
                      key={colorway.name}
                      title={colorway.name}
                      className="block h-2.5 w-2.5 border border-[var(--border-strong)]"
                      style={{ background: colorway.hex }}
                    />
                  ))}
                </span>
              ) : null}
              {colorways.length > 0 ? (
                <span className="sr-only">
                  {`Available in ${colorways.length} colourways: ${colorways.map((c) => c.name).join(', ')}.`}
                </span>
              ) : null}
              {priceLabel ? (
                <span className="t-spec text-[var(--fg-muted)]">{`From ${priceLabel}`}</span>
              ) : null}
            </span>
          </Line>
        </motion.div>
      </div>
    </div>
  );
}

/** A hairline with a travelling segment. Static when motion is reduced. */
function ScrollCue({ still }: { still: boolean }) {
  return (
    <span
      aria-hidden
      className="relative block h-8 w-px overflow-hidden bg-[color-mix(in_oklab,var(--fg)_28%,transparent)]"
    >
      {still ? (
        <span className="absolute inset-x-0 top-0 h-3 bg-[var(--fg)]" />
      ) : (
        <motion.span
          className="absolute inset-x-0 top-0 h-3 bg-[var(--fg)]"
          initial={{ y: '-110%' }}
          animate={{ y: '380%' }}
          transition={{
            duration: durations.epic,
            ease: eases.inOut,
            repeat: Infinity,
            repeatDelay: durations.standard,
          }}
        />
      )}
    </span>
  );
}
