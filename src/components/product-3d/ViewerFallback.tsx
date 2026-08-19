'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import type { Product, ProductHotspot, ProductImage } from '@/types';
import { cn } from '@/lib/utils';
import { ErrorState } from '@/components/ui/States';
import { VayroMark } from '@/components/brand';

/* ==========================================================================
   ViewerFallback — the 2D product view.

   This is not a placeholder for the 3D. It is the product view for every
   device that should not be running WebGL: no hardware acceleration, a low
   tier, or a reader who has asked the system for reduced motion. It carries
   the same information the viewer carries — every angle, every annotated
   detail — with keyboard access and no animation debt.

   `plate` fills its frame for the hero. `gallery` is the full 2D viewer.
   ========================================================================== */

export type ViewerFallbackProps = {
  product?: Product | null;
  /** Overrides the product's own images. */
  images?: ProductImage[];
  hotspots?: ProductHotspot[];
  variant?: 'plate' | 'gallery';
  className?: string;
  alt?: string;
  priority?: boolean;
  sizes?: string;
  /** Shown under the frame — usually why 3D is not running. */
  note?: string;
};

const DEFAULT_PLATE = '/media/studio-dark.webp';

/** Every plate ships as .webp and .jpg. If one fails, the twin is right there. */
function jpgTwin(url: string) {
  return url.endsWith('.webp') ? url.replace(/\.webp$/, '.jpg') : null;
}

function pickImages(product: Product | null | undefined, override?: ProductImage[]): ProductImage[] {
  if (override?.length) return override;
  const all = product?.images ?? [];
  const technical = all.filter((image) => image.kind === 'technical');
  const rest = all.filter((image) => image.kind !== 'technical');
  const ordered = [...technical, ...rest].sort((a, b) => a.position - b.position);
  if (ordered.length) return ordered;
  return [
    {
      id: 'plate',
      url: DEFAULT_PLATE,
      alt: product?.name ? `${product.name}, studio` : 'Meridian Carry Shell, studio',
      position: 1,
      kind: 'technical',
    },
  ];
}

export function ViewerFallback({
  product,
  images,
  hotspots,
  variant = 'gallery',
  className,
  alt,
  priority = false,
  sizes,
  note,
}: ViewerFallbackProps) {
  const frames = useMemo(() => pickImages(product, images), [product, images]);
  const marks = hotspots ?? product?.hotspots ?? [];

  const [index, setIndex] = useState(0);
  const [openMark, setOpenMark] = useState<string | null>(null);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});

  const active = frames[Math.min(index, frames.length - 1)];
  const source = failed[active.url] ? jpgTwin(active.url) : active.url;

  const step = useCallback(
    (direction: 1 | -1) => {
      setOpenMark(null);
      setIndex((current) => (current + direction + frames.length) % frames.length);
    },
    [frames.length],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      step(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      step(-1);
    }
    if (event.key === 'Escape') setOpenMark(null);
  };

  /* ------------------------------------------------------------- plate --- */

  if (variant === 'plate') {
    if (!source) {
      return (
        <div className={cn('relative h-full w-full bg-[var(--bg-sunken)]', className)}>
          <div aria-hidden className="absolute inset-0 contour opacity-40" />
        </div>
      );
    }
    return (
      <div className={cn('relative h-full w-full overflow-hidden bg-[var(--bg-sunken)]', className)}>
        <Image
          src={source}
          alt={alt ?? active.alt}
          fill
          priority={priority}
          sizes={sizes ?? '100vw'}
          className={cn(
            'object-cover transition-opacity duration-[var(--d-cine)] ease-[var(--e-out)]',
            loaded[active.url] ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setLoaded((state) => ({ ...state, [active.url]: true }))}
          onError={() => setFailed((state) => ({ ...state, [active.url]: true }))}
        />
        {!loaded[active.url] ? (
          <div aria-hidden className="absolute inset-0 contour animate-pulse opacity-30" />
        ) : null}
      </div>
    );
  }

  /* ----------------------------------------------------------- gallery --- */

  if (!source) {
    return (
      <div className={cn('bg-[var(--bg-sunken)]', className)}>
        <ErrorState
          title="Product view unavailable"
          body="The imagery for this piece could not be loaded. Refresh, or continue to the specifications below."
        />
      </div>
    );
  }

  const openHotspot = marks.find((mark) => mark.id === openMark) ?? null;

  return (
    <div className={cn('flex h-full w-full flex-col bg-[var(--bg-sunken)]', className)}>
      <div
        role="group"
        aria-roledescription="Product image viewer"
        aria-label={alt ?? product?.name ?? 'Product images'}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative min-h-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--fg)]"
      >
        <Image
          key={source}
          src={source}
          alt={alt ?? active.alt}
          fill
          priority={priority}
          sizes={sizes ?? '(min-width: 1024px) 60vw, 100vw'}
          className={cn(
            'object-contain transition-opacity duration-[var(--d-slow)] ease-[var(--e-out)]',
            loaded[active.url] ? 'opacity-100' : 'opacity-0',
          )}
          onLoad={() => setLoaded((state) => ({ ...state, [active.url]: true }))}
          onError={() => setFailed((state) => ({ ...state, [active.url]: true }))}
        />

        {!loaded[active.url] ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <VayroMark size={26} className="animate-pulse text-[var(--fg-subtle)]" />
          </div>
        ) : null}

        {/* Annotations sit on the flat plate, using the catalogue's 0–1 coords. */}
        {index === 0
          ? marks.map((mark, position) => (
              <button
                key={mark.id}
                type="button"
                aria-expanded={openMark === mark.id}
                aria-label={`Detail ${position + 1}: ${mark.title}`}
                onClick={() => setOpenMark(openMark === mark.id ? null : mark.id)}
                style={{ left: `${mark.x * 100}%`, top: `${mark.y * 100}%` }}
                className={cn(
                  'absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center',
                  'border text-[0.5625rem] tracking-[0.1em] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                  openMark === mark.id
                    ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
                    : 'border-[var(--border-strong)] bg-[var(--bg)]/70 text-[var(--fg)] backdrop-blur-sm hover:border-[var(--fg)]',
                )}
              >
                {String(position + 1).padStart(2, '0')}
              </button>
            ))
          : null}

        {frames.length > 1 ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-4">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="Previous image"
              className="pointer-events-auto t-label border border-[var(--border-strong)] bg-[var(--bg)]/80 px-4 py-2.5 backdrop-blur-sm transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:bg-[var(--fg)] hover:text-[var(--bg)]"
            >
              Prev
            </button>
            <span className="t-spec pointer-events-none text-[var(--fg-subtle)]">
              {String(index + 1).padStart(2, '0')} / {String(frames.length).padStart(2, '0')}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Next image"
              className="pointer-events-auto t-label border border-[var(--border-strong)] bg-[var(--bg)]/80 px-4 py-2.5 backdrop-blur-sm transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:bg-[var(--fg)] hover:text-[var(--bg)]"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      {openHotspot ? (
        <div className="border-t border-[var(--border)] bg-[var(--bg-elevated)] p-5">
          <p className="t-label text-[var(--fg-subtle)]">{openHotspot.title}</p>
          <p className="t-body-sm t-pretty mt-2 max-w-prose text-[var(--fg-muted)]">{openHotspot.body}</p>
        </div>
      ) : null}

      {frames.length > 1 ? (
        <div
          role="tablist"
          aria-label="Product views"
          className="flex gap-2 overflow-x-auto border-t border-[var(--border)] p-3"
        >
          {frames.map((frame, position) => (
            <button
              key={frame.id}
              role="tab"
              type="button"
              aria-selected={position === index}
              aria-label={frame.alt}
              onClick={() => {
                setIndex(position);
                setOpenMark(null);
              }}
              className={cn(
                'relative h-14 w-12 shrink-0 overflow-hidden border transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                position === index
                  ? 'border-[var(--fg)]'
                  : 'border-[var(--border)] opacity-70 hover:opacity-100',
              )}
            >
              <Image
                src={failed[frame.url] ? (jpgTwin(frame.url) ?? frame.url) : frame.url}
                alt=""
                fill
                sizes="48px"
                className="object-cover"
                onError={() => setFailed((state) => ({ ...state, [frame.url]: true }))}
              />
            </button>
          ))}
        </div>
      ) : null}

      {note ? (
        <p className="t-caption border-t border-[var(--border)] px-4 py-3 text-[var(--fg-subtle)]">{note}</p>
      ) : null}
    </div>
  );
}
