'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';

/* ==========================================================================
   TechnologyExplorer — features located on the garment.

   Pointer and keyboard are the same interaction: hovering or focusing a
   feature moves the crosshair to the region it acts on. Nothing is hidden
   behind the interaction — every body of copy is rendered at all times, so the
   highlight is emphasis rather than disclosure.
   ========================================================================== */

export type TechFeature = {
  id: string;
  title: string;
  body: string;
  /** Normalised position on the plate, 0–1. */
  x: number;
  y: number;
  /** The name of the construction detail at that point. */
  marker: string;
  specLabel?: string;
  specValue?: string;
};

type Props = {
  features: TechFeature[];
  plate: { src: string; alt: string };
  caption: string;
};

/** Hairline colours are keyed to the plate, which is a night studio sweep. */
const LINE = 'color-mix(in srgb, var(--ivory) 38%, transparent)';
const LINE_STRONG = 'color-mix(in srgb, var(--ivory) 88%, transparent)';

export function TechnologyExplorer({ features, plate, caption }: Props) {
  const [active, setActive] = useState(0);
  const { reducedMotion } = useDeviceTier();
  const current = features[active] ?? features[0];

  if (!current) return null;

  const flip = current.x > 0.58;

  return (
    <div className="grid-12 mt-14 gap-y-12 md:mt-20">
      {/* ------------------------------------------------------------ list */}
      <ul className="order-2 col-span-4 self-start border-b border-[var(--border)] md:col-span-8 lg:order-1 lg:col-span-5 lg:col-start-1">
        {features.map((feature, index) => {
          const on = index === active;
          return (
            <li key={feature.id}>
              <button
                type="button"
                onMouseEnter={() => setActive(index)}
                onFocus={() => setActive(index)}
                onClick={() => setActive(index)}
                aria-current={on ? true : undefined}
                data-cursor="link"
                className="relative flex w-full items-start gap-5 border-t border-[var(--border)] py-6 text-left"
              >
                {on ? (
                  <motion.span
                    aria-hidden
                    layoutId={reducedMotion ? undefined : 'tech-rule'}
                    transition={t.standard}
                    className="absolute inset-x-0 top-0 h-px bg-[var(--fg)]"
                  />
                ) : null}

                <span
                  className={cn(
                    't-spec pt-1 transition-colors duration-[var(--d-standard)] ease-[var(--e-out)]',
                    on ? 'text-[var(--fg)]' : 'text-[var(--fg-subtle)]',
                  )}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>

                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      't-h3 block transition-colors duration-[var(--d-standard)] ease-[var(--e-out)]',
                      on ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]',
                    )}
                  >
                    {feature.title}
                  </span>

                  <span
                    className={cn(
                      't-body-sm t-pretty mt-2 block max-w-[48ch] transition-colors duration-[var(--d-standard)] ease-[var(--e-out)]',
                      on ? 'text-[var(--fg-muted)]' : 'text-[var(--fg-subtle)]',
                    )}
                  >
                    {feature.body}
                  </span>

                  {feature.specValue ? (
                    <span className="t-spec mt-4 flex items-baseline gap-3 text-[var(--fg-subtle)]">
                      <span
                        aria-hidden
                        className="relative top-[-0.3em] block h-px w-5 shrink-0 bg-[var(--border-strong)]"
                      />
                      <span>
                        {feature.specLabel ? (
                          <span className="uppercase">{feature.specLabel}</span>
                        ) : null}
                        {feature.specLabel ? <span aria-hidden>{' — '}</span> : null}
                        <span className="text-[var(--fg-muted)]">{feature.specValue}</span>
                      </span>
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* ----------------------------------------------------------- plate */}
      {/* The column stretches to the row so the figure inside it has travel. */}
      <div className="order-1 col-span-4 md:col-span-8 lg:order-2 lg:col-span-6 lg:col-start-7">
        <figure className="lg:sticky lg:top-[calc(var(--header-h)+2.5rem)]">
          <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--bg-sunken)]">
            <Image
              src={plate.src}
              alt={plate.alt}
              fill
              sizes="(min-width: 1024px) 46vw, (min-width: 768px) 66vw, 100vw"
              className="object-cover"
            />

            {/* crosshair */}
            <motion.span
              aria-hidden
              className="absolute inset-x-0 h-px"
              style={{ background: LINE }}
              animate={{ top: `${current.y * 100}%` }}
              transition={reducedMotion ? { duration: 0 } : t.slow}
            />
            <motion.span
              aria-hidden
              className="absolute inset-y-0 w-px"
              style={{ background: LINE }}
              animate={{ left: `${current.x * 100}%` }}
              transition={reducedMotion ? { duration: 0 } : t.slow}
            />

            {/* every region, quietly marked */}
            {features.map((feature, index) => (
              <span
                key={feature.id}
                aria-hidden
                className="absolute block h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 border transition-opacity duration-[var(--d-standard)] ease-[var(--e-out)]"
                style={{
                  left: `${feature.x * 100}%`,
                  top: `${feature.y * 100}%`,
                  borderColor: LINE_STRONG,
                  opacity: index === active ? 0 : 0.55,
                }}
              />
            ))}

            {/* the active region */}
            <motion.span
              aria-hidden
              className="absolute block -translate-x-1/2 -translate-y-1/2 border"
              style={{ borderColor: LINE_STRONG }}
              animate={{
                left: `${current.x * 100}%`,
                top: `${current.y * 100}%`,
                width: 44,
                height: 44,
              }}
              initial={false}
              transition={reducedMotion ? { duration: 0 } : t.slow}
            />

            {/* read-out */}
            <div aria-hidden className="pointer-events-none absolute inset-0">
              <motion.div
                className="absolute"
                animate={{ left: `${current.x * 100}%`, top: `${current.y * 100}%` }}
                initial={false}
                transition={reducedMotion ? { duration: 0 } : t.slow}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={current.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={t.fast}
                    className={cn(
                      'absolute top-1/2 w-[13rem] max-w-[46vw] -translate-y-1/2 border px-3 py-2.5 backdrop-blur-sm',
                      flip ? 'right-8' : 'left-8',
                    )}
                    style={{
                      borderColor: LINE,
                      background: 'color-mix(in srgb, var(--ink) 74%, transparent)',
                      color: 'var(--ivory)',
                    }}
                  >
                    <p className="t-label-sm">{current.marker}</p>
                    {current.specValue ? (
                      <p
                        className="t-spec mt-2"
                        style={{ color: 'color-mix(in srgb, var(--ivory) 70%, transparent)' }}
                      >
                        {current.specValue}
                      </p>
                    ) : null}
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            </div>
          </div>

          <figcaption className="t-spec mt-4 flex items-center justify-between gap-4 text-[var(--fg-subtle)]">
            <span>{caption}</span>
            <span>{`${String(active + 1).padStart(2, '0')} / ${String(features.length).padStart(2, '0')}`}</span>
          </figcaption>
        </figure>
      </div>
    </div>
  );
}
