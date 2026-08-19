'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import type { FinishKey } from '@/components/three/materials';
import { resolveProduct } from '@/components/product-3d/product-source';

/* ==========================================================================
   TransformationScene — WEAR to PACK to CARRY, driven by the scroll.

   Two ways to use it:

   - EMBEDDED (default). Drop it into a frame that something else is pinning —
     it finds the sticky ancestor, binds to that element's track, and fills the
     frame. This is how the homepage uses it.
   - STANDALONE. `TransformationTrack` builds its own ~300vh track with a
     sticky stage and the WEAR / PACK / CARRY captions.

   Neither one scroll-jacks: the page scrolls at its own speed and the fold is
   read off the position, never driven by a hijacked wheel event.

   Reduced motion or a low-tier device gets the four-frame sequence instead —
   the same four moments, the same captions, no canvas and no scroll binding.
   ========================================================================== */

const Canvas = dynamic(
  () => import('./TransformationCanvas').then((module) => module.TransformationCanvas),
  { ssr: false },
);

export type TransformationStage = {
  id: string;
  label: string;
  spec: string;
  image: string;
  alt: string;
};

/** The four moments. Shared by the canvas read-out and the still sequence. */
export const TRANSFORMATION_STAGES: TransformationStage[] = [
  {
    id: 'wear',
    label: 'Wear',
    spec: '318 g · size M',
    image: '/media/field-ascent.webp',
    alt: 'The Meridian Carry Shell worn on a ridgeline',
  },
  {
    id: 'fold',
    label: 'Fold',
    spec: 'Collar inverts',
    image: '/media/studio-dark.webp',
    alt: 'The shell folding into its hood cavity',
  },
  {
    id: 'pack',
    label: 'Pack',
    spec: '24 × 16 × 9 cm',
    image: '/media/studio-stone.webp',
    alt: 'The shell compressed into the carry unit',
  },
  {
    id: 'carry',
    label: 'Carry',
    spec: '2.1 L on the shoulder',
    image: '/media/field-transit.webp',
    alt: 'The packed carry unit in transit',
  },
];

const MILESTONES = [0.25, 0.5, 0.75, 1] as const;

export type TransformationSceneProps = {
  productSlug?: string;
  product?: Product | null;
  className?: string;
  colorway?: string;
  finish?: FinishKey;
  /** Draws the stage read-out over the canvas. Off when the page owns copy. */
  captions?: boolean;
};

export function TransformationScene({
  productSlug = 'meridian-carry-shell',
  product: provided,
  className,
  colorway,
  finish,
  captions = false,
}: TransformationSceneProps) {
  const product = useMemo(() => resolveProduct(productSlug, provided), [productSlug, provided]);
  const { pending, webgl, tier, reducedMotion } = useDeviceTier();

  const rootRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const sentRef = useRef<Set<number>>(new Set());
  const [stage, setStage] = useState(0);
  const [inRange, setInRange] = useState(false);
  const [ready, setReady] = useState(false);

  const use3D = !pending && webgl && tier !== 'low' && !reducedMotion;

  const report = useCallback(
    (progress: number) => {
      for (const milestone of MILESTONES) {
        if (progress + 0.001 < milestone || sentRef.current.has(milestone)) continue;
        sentRef.current.add(milestone);
        track('product_transformation_view', {
          productId: product.id,
          progress: Math.round(milestone * 100),
        });
      }
    },
    [product.id],
  );

  const getProgress = useCallback(() => progressRef.current, []);

  /* ------------------------------------------------- scroll binding (3D) */
  useEffect(() => {
    if (!use3D) return;
    const element = rootRef.current;
    if (!element) return;

    gsap.registerPlugin(ScrollTrigger);

    // Whoever owns the pin owns the track. Fall back to our own box.
    let sticky: HTMLElement | null = element.parentElement;
    while (sticky && sticky !== document.body) {
      if (getComputedStyle(sticky).position === 'sticky') break;
      sticky = sticky.parentElement;
    }
    const pinned = sticky && sticky !== document.body ? sticky : null;
    const trigger = pinned?.parentElement ?? element;
    const start = pinned ? 'top top' : 'top bottom';
    const end = pinned ? 'bottom bottom' : 'bottom top';

    const proxy = { value: 0 };
    const context = gsap.context(() => {
      gsap.to(proxy, {
        value: 1,
        ease: 'none',
        scrollTrigger: {
          trigger,
          start,
          end,
          scrub: 0.55,
          invalidateOnRefresh: true,
          onToggle: (self) => setInRange(self.isActive),
          onUpdate: (self) => {
            report(self.progress);
            const next = Math.min(
              TRANSFORMATION_STAGES.length - 1,
              Math.floor(self.progress * TRANSFORMATION_STAGES.length),
            );
            setStage((current) => (current === next ? current : next));
          },
          onRefresh: (self) => setInRange(self.isActive),
        },
        onUpdate: () => {
          progressRef.current = proxy.value;
        },
      });
    }, element);

    return () => context.revert();
  }, [use3D, report]);

  /* ------------------------------- keep the canvas mounted only near view */
  useEffect(() => {
    if (!use3D) return;
    const element = rootRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => setInRange((current) => current || entry.isIntersecting),
      { rootMargin: '60% 0px 60% 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [use3D]);

  /* ---------------------------------------------------------- 2D sequence */
  if (!use3D) {
    return (
      <StillSequence
        className={className}
        productId={product.id}
        onMilestone={report}
        pending={pending}
      />
    );
  }

  const current = TRANSFORMATION_STAGES[stage];

  return (
    <div ref={rootRef} className={cn('relative h-full w-full overflow-hidden', className)}>
      {/* The first frame stands in until the shell is built. */}
      <Image
        src={TRANSFORMATION_STAGES[0].image}
        alt={TRANSFORMATION_STAGES[0].alt}
        fill
        sizes="(min-width: 1024px) 55vw, 100vw"
        className={cn(
          'object-cover transition-opacity duration-[var(--d-cine)] ease-[var(--e-out)]',
          ready ? 'opacity-0' : 'opacity-100',
        )}
      />

      {inRange ? (
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-[var(--d-cine)] ease-[var(--e-out)]',
            ready ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Canvas
            product={product}
            getProgress={getProgress}
            colorway={colorway}
            finish={finish}
            onReady={() => setReady(true)}
          />
        </div>
      ) : null}

      {captions ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-5">
          <div>
            <p className="t-label text-[var(--fg)]">{current.label}</p>
            <p className="t-spec text-[var(--fg-muted)]">{current.spec}</p>
          </div>
          <p className="t-spec text-[var(--fg-subtle)]">
            {String(stage + 1).padStart(2, '0')} / {String(TRANSFORMATION_STAGES.length).padStart(2, '0')}
          </p>
        </div>
      ) : null}

      {/* Every stage stays in the document for readers who never scroll it. */}
      <ol className="sr-only">
        {TRANSFORMATION_STAGES.map((entry) => (
          <li key={entry.id}>
            {entry.label} — {entry.spec}
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------- still sequence --- */

function StillSequence({
  className,
  productId,
  onMilestone,
  pending,
}: {
  className?: string;
  productId: string;
  onMilestone: (progress: number) => void;
  pending: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (pending) return;
    const element = rootRef.current;
    if (!element) return;
    const frames = Array.from(element.querySelectorAll<HTMLElement>('[data-frame]'));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = Number(entry.target.getAttribute('data-frame'));
          onMilestone((index + 1) / TRANSFORMATION_STAGES.length);
        }
      },
      { threshold: 0.6 },
    );
    frames.forEach((frame) => observer.observe(frame));
    return () => observer.disconnect();
  }, [onMilestone, pending, productId]);

  return (
    <div
      ref={rootRef}
      className={cn('grid h-full w-full grid-cols-2 gap-px bg-[var(--border)]', className)}
    >
      {TRANSFORMATION_STAGES.map((entry, index) => (
        <figure
          key={entry.id}
          data-frame={index}
          className="relative min-h-[8rem] overflow-hidden bg-[var(--bg-sunken)]"
        >
          <Image
            src={entry.image}
            alt={entry.alt}
            fill
            sizes="(min-width: 1024px) 28vw, 50vw"
            className="object-cover"
          />
          <figcaption className="absolute inset-x-0 bottom-0 bg-[color-mix(in_oklab,var(--ink)_62%,transparent)] px-3 py-2 text-[var(--ivory)]">
            <span className="t-label-sm block">{entry.label}</span>
            <span className="t-spec block opacity-80">{entry.spec}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ standalone --- */

export type TransformationTrackProps = TransformationSceneProps & {
  /** Height of the scroll track. Three viewports by default. */
  viewports?: number;
};

/**
 * The self-contained version: its own scroll track, its own pin. Use this on
 * any page that is not already supplying a pinned layout.
 */
export function TransformationTrack({
  viewports = 3,
  className,
  ...props
}: TransformationTrackProps) {
  return (
    <div className={cn('relative', className)} style={{ height: `calc(${viewports} * 100svh)` }}>
      <div className="sticky top-0 flex h-[100svh] items-center overflow-hidden">
        <div className="shell w-full">
          <div className="relative h-[70svh] w-full">
            <TransformationScene {...props} captions />
          </div>
        </div>
      </div>
    </div>
  );
}
