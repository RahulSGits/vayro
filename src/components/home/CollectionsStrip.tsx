'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { Collection } from '@/types';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { cn } from '@/lib/utils';

/* ==========================================================================
   CollectionsStrip — the catalogue, grouped by intent.

   A real scroll container: snap points and momentum on touch, grab-and-throw
   on a mouse, arrow keys and buttons for the keyboard. Snapping is suspended
   while a drag is in flight so the pointer stays glued to the sheet, then
   restored so the browser settles onto the nearest card.
   ========================================================================== */

const DRAG_THRESHOLD = 6;

const STEP_CONTROL = [
  'inline-flex h-11 w-11 items-center justify-center',
  'border border-[var(--border-strong)] text-[var(--fg)]',
  'transition-[background-color,color,border-color,opacity]',
  'duration-[var(--d-fast)] ease-[var(--e-out)]',
  'hover:border-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--bg)]',
  'disabled:pointer-events-none disabled:opacity-30',
].join(' ');

type Props = {
  collections: Collection[];
};

export function CollectionsStrip({ collections }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startLeft: 0, moved: 0 });
  const [edge, setEdge] = useState({ start: true, end: false });
  const [progress, setProgress] = useState(0);
  const { coarsePointer } = useDeviceTier();

  const measure = useCallback(() => {
    const element = scroller.current;
    if (!element) return;
    const max = element.scrollWidth - element.clientWidth;
    setEdge({ start: element.scrollLeft <= 1, end: element.scrollLeft >= max - 1 });
    setProgress(max > 0 ? element.scrollLeft / max : 0);
  }, []);

  useEffect(() => {
    measure();
    const element = scroller.current;
    if (!element) return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [measure]);

  const step = useCallback((direction: 1 | -1) => {
    const element = scroller.current;
    if (!element) return;
    const card = element.querySelector<HTMLElement>('[data-card]');
    const distance = card ? card.offsetWidth + 24 : element.clientWidth * 0.8;
    element.scrollBy({ left: distance * direction, behavior: 'smooth' });
  }, []);

  /* ------------------------------------------------- grab-and-throw (mouse) */
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = scroller.current;
    if (!element || event.pointerType !== 'mouse' || event.button !== 0) return;
    drag.current = {
      active: true,
      startX: event.clientX,
      startLeft: element.scrollLeft,
      moved: 0,
    };
    element.style.scrollSnapType = 'none';
    element.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = scroller.current;
    if (!element || !drag.current.active) return;
    const delta = event.clientX - drag.current.startX;
    drag.current.moved = Math.max(drag.current.moved, Math.abs(delta));
    element.scrollLeft = drag.current.startLeft - delta;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const element = scroller.current;
    if (!element || !drag.current.active) return;
    drag.current.active = false;
    element.style.scrollSnapType = '';
    if (element.hasPointerCapture(event.pointerId)) element.releasePointerCapture(event.pointerId);
  };

  // A throw that ends over a card must not also open it.
  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current.moved > DRAG_THRESHOLD) {
      event.preventDefault();
      event.stopPropagation();
    }
    drag.current.moved = 0;
  };

  return (
    <div className="mt-12 md:mt-16">
      <div
        ref={scroller}
        onScroll={measure}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
        className={cn(
          'flex snap-x snap-mandatory gap-6 overflow-x-auto overscroll-x-contain pb-2',
          // The scroller starts at the shell gutter and runs off the right edge.
          '-mx-[var(--gutter)] px-[var(--gutter)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          !coarsePointer && 'cursor-grab active:cursor-grabbing',
        )}
      >
        {collections.map((collection, index) => (
          <article
            key={collection.id}
            data-card
            className="w-[80vw] shrink-0 snap-start sm:w-[54vw] lg:w-[30vw] lg:max-w-[26rem]"
          >
            <Link
              href={`/collections/${collection.slug}`}
              data-cursor="link"
              className="group block"
              draggable={false}
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--bg-sunken)]">
                {collection.heroImage ? (
                  <Image
                    src={collection.heroImage}
                    alt=""
                    fill
                    draggable={false}
                    sizes="(min-width: 1024px) 30vw, (min-width: 640px) 54vw, 80vw"
                    className="object-cover transition-transform duration-[var(--d-cine)] ease-[var(--e-fold)] group-hover:scale-[1.04]"
                  />
                ) : null}
                <span
                  aria-hidden
                  className="t-spec absolute top-4 left-4 text-[var(--ivory)] mix-blend-difference"
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>

              <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-[var(--border)] pt-5">
                <h3 className="t-h3">{collection.name}</h3>
                {collection.tagline ? (
                  <p className="t-spec shrink-0 text-[var(--fg-subtle)]">{collection.tagline}</p>
                ) : null}
              </div>

              {collection.description ? (
                <p className="t-body-sm t-pretty mt-3 max-w-[38ch] text-[var(--fg-muted)]">
                  {collection.description}
                </p>
              ) : null}

              <span className="t-label-sm mt-6 inline-flex items-center gap-2 text-[var(--fg)]">
                View collection
                <ArrowRight
                  size={13}
                  strokeWidth={1.25}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  aria-hidden
                  className="transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:translate-x-1"
                />
              </span>
            </Link>
          </article>
        ))}
      </div>

      {/* ---------------------------------------------------------- controls */}
      <div className="mt-8 flex items-center gap-6">
        <div aria-hidden className="relative h-px flex-1 bg-[var(--border)]">
          <span
            className="absolute inset-y-0 left-0 block w-1/4 bg-[var(--fg)] transition-transform duration-[var(--d-standard)] ease-[var(--e-out)]"
            style={{ transform: `translateX(${progress * 300}%)` }}
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            disabled={edge.start}
            aria-label="Previous collections"
            data-cursor="link"
            className={STEP_CONTROL}
          >
            <ArrowLeft
              size={16}
              strokeWidth={1.25}
              strokeLinecap="square"
              strokeLinejoin="miter"
              aria-hidden
            />
          </button>
          <button
            type="button"
            onClick={() => step(1)}
            disabled={edge.end}
            aria-label="More collections"
            data-cursor="link"
            className={STEP_CONTROL}
          >
            <ArrowRight
              size={16}
              strokeWidth={1.25}
              strokeLinecap="square"
              strokeLinejoin="miter"
              aria-hidden
            />
          </button>
        </div>
      </div>
    </div>
  );
}
