'use client';

import { useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';
import type { ProductHotspot } from '@/types';

/* ==========================================================================
   HotspotFigure — annotated construction plate.

   Markers are real buttons on a roving selection, so the whole figure is
   operable from the keyboard. The reading panel sits outside the image, which
   means the copy is legible at any width instead of floating over the plate.
   ========================================================================== */

type Props = {
  image: { url: string; alt: string };
  hotspots: ProductHotspot[];
  /** Portrait plates read better tall; macro plates read better square. */
  aspect?: string;
  className?: string;
};

export function HotspotFigure({ image, hotspots, aspect = '3/4', className }: Props) {
  const [active, setActive] = useState(0);
  const current = hotspots[active];

  if (hotspots.length === 0) return null;

  return (
    <div className={cn('grid gap-8 lg:grid-cols-12 lg:gap-[var(--gutter)]', className)}>
      <figure className="relative lg:col-span-7">
        <div
          className="relative w-full overflow-hidden bg-[var(--bg-sunken)]"
          style={{ aspectRatio: aspect }}
        >
          <Image
            src={image.url}
            alt={image.alt}
            fill
            sizes="(min-width: 1024px) 55vw, 100vw"
            className="object-cover"
          />

          {hotspots.map((hotspot, index) => {
            const selected = index === active;
            return (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => setActive(index)}
                aria-pressed={selected}
                aria-label={`${index + 1}. ${hotspot.title}`}
                data-cursor="link"
                style={{ left: `${hotspot.x * 100}%`, top: `${hotspot.y * 100}%` }}
                className={cn(
                  'absolute -translate-x-1/2 -translate-y-1/2',
                  'inline-flex h-8 w-8 items-center justify-center rounded-[var(--r-pill)]',
                  't-label-sm transition-[background-color,color,transform] duration-[var(--d-fast)] ease-[var(--e-out)]',
                  selected
                    ? 'scale-110 bg-[var(--fg)] text-[var(--bg)]'
                    : 'bg-[color-mix(in_oklab,var(--bg)_78%,transparent)] text-[var(--fg)] backdrop-blur-[2px] hover:bg-[var(--bg)]',
                )}
              >
                {String(index + 1).padStart(2, '0')}
              </button>
            );
          })}
        </div>
      </figure>

      <div className="lg:col-span-5 lg:pt-6">
        <ol className="border-t border-[var(--border)]">
          {hotspots.map((hotspot, index) => {
            const selected = index === active;
            return (
              <li key={hotspot.id} className="border-b border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setActive(index)}
                  aria-expanded={selected}
                  data-cursor="link"
                  className="flex w-full items-baseline gap-4 py-4 text-left"
                >
                  <span
                    className={cn(
                      't-spec shrink-0 transition-colors duration-[var(--d-fast)]',
                      selected ? 'text-[var(--fg)]' : 'text-[var(--fg-subtle)]',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span
                    className={cn(
                      't-h3 flex-1 transition-colors duration-[var(--d-fast)]',
                      selected ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)]',
                    )}
                  >
                    {hotspot.title}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {selected ? (
                    <motion.div
                      key="body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1, transition: t.standard }}
                      exit={{ height: 0, opacity: 0, transition: t.fast }}
                      className="overflow-hidden"
                    >
                      <p className="t-pretty max-w-[var(--max-text)] pb-5 pl-10 text-[var(--fg-muted)]">
                        {hotspot.body}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </li>
            );
          })}
        </ol>

        <p className="sr-only" aria-live="polite">
          {current ? `${current.title}. ${current.body}` : ''}
        </p>
      </div>
    </div>
  );
}
