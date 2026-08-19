'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { clamp, cn } from '@/lib/utils';
import { t } from '@/lib/motion';

/* ==========================================================================
   TransformationStages — the scroll-linked caption column.

   Owns the pin, the progress rail and the WEAR / PACK / CARRY read-out. The 3D
   scene is handed in as a node so this file never needs to know whether it is
   a server or client component.

   Every caption is in the DOM at every scroll position — the highlight is
   emphasis, not disclosure — so the copy survives no-JS and screen readers.
   ========================================================================== */

export type Stage = {
  id: string;
  label: string;
  body: string;
};

type Props = {
  stages: Stage[];
  scene: React.ReactNode;
};

export function TransformationStages({ stages, scene }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const { reducedMotion } = useDeviceTier();

  const { scrollYProgress } = useScroll({
    target: track,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (value) => {
    const next = clamp(Math.floor(value * stages.length), 0, stages.length - 1);
    setActive((current) => (current === next ? current : next));
  });

  /** Jumps the pinned sequence to a stage — keyboard parity with scrolling. */
  const goTo = useCallback(
    (index: number) => {
      const element = track.current;
      if (!element) return;
      const top = element.getBoundingClientRect().top + window.scrollY;
      const travel = element.offsetHeight - window.innerHeight;
      window.scrollTo({
        top: top + travel * ((index + 0.5) / stages.length),
        behavior: reducedMotion ? 'auto' : 'smooth',
      });
    },
    [reducedMotion, stages.length],
  );

  return (
    <div ref={track} className="relative" style={{ height: `calc(${stages.length} * 100svh)` }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="shell grid-12 w-full items-center gap-y-8">
          {/* --------------------------------------------------------- scene */}
          <div className="col-span-4 md:col-span-8 lg:col-span-7 lg:col-start-6">
            <div className="relative h-[42svh] w-full sm:h-[48svh] lg:h-[72svh]">{scene}</div>
          </div>

          {/* ------------------------------------------------------ captions */}
          <div className="col-span-4 md:col-span-8 lg:col-span-4 lg:col-start-1 lg:row-start-1">
            <div className="flex gap-6">
              <div aria-hidden className="relative hidden w-px shrink-0 bg-[var(--border)] lg:block">
                <motion.span
                  style={reducedMotion ? { scaleY: 1 } : { scaleY: scrollYProgress }}
                  className="absolute inset-0 block origin-top bg-[var(--fg)]"
                />
              </div>

              <ol className="w-full">
                {stages.map((stage, index) => {
                  const on = index === active;
                  return (
                    <li key={stage.id}>
                      <button
                        type="button"
                        onClick={() => goTo(index)}
                        aria-current={on ? 'step' : undefined}
                        data-cursor="link"
                        className="relative flex w-full items-start gap-5 border-t border-[var(--border)] py-5 text-left md:py-6"
                      >
                        {/* The active rule slides between rows, never blinks. */}
                        {on ? (
                          <motion.span
                            aria-hidden
                            layoutId={reducedMotion ? undefined : 'stage-rule'}
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

                        <span className="block">
                          <span
                            className={cn(
                              't-h3 block uppercase tracking-[0.16em] transition-colors duration-[var(--d-standard)] ease-[var(--e-out)]',
                              on ? 'text-[var(--fg)]' : 'text-[var(--fg-subtle)]',
                            )}
                          >
                            {stage.label}
                          </span>
                          <span
                            className={cn(
                              't-body-sm t-pretty mt-2 block max-w-[42ch] transition-colors duration-[var(--d-standard)] ease-[var(--e-out)]',
                              on ? 'text-[var(--fg-muted)]' : 'text-[var(--fg-subtle)]',
                            )}
                          >
                            {stage.body}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
