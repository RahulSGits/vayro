'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Box, Expand, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';
import { z as zIndex } from '@/lib/design-tokens';
import { Portal, useEscapeKey, useFocusTrap, useScrollLock } from '@/components/ui/Dialog';
// The 3D entry point owns capability detection and its own 2D fallback, so the
// gallery hands it the product and the selected colourway and stays out of it.
import { ProductViewer } from '@/components/product-3d/ProductViewer';
import { useProductState } from './ProductProvider';

/* ==========================================================================
   ProductGallery — the sticky plate column.

   The gallery is bound to the selected colourway: choosing Sandstone drops the
   Basalt studio plate and leads with the Sandstone one. A thumbnail rail gives
   every frame a real tab stop, the main frame expands to a full-bleed
   lightbox, and the 3D viewer takes over the same frame rather than opening a
   separate context.
   ========================================================================== */

export function ProductGallery({ className }: { className?: string }) {
  const { product, images, activeImage, setActiveImage, colorway } = useProductState('ProductGallery');
  const [lightbox, setLightbox] = useState(false);
  const [viewer3d, setViewer3d] = useState(false);

  const count = images.length;
  const current = images[Math.min(activeImage, count - 1)];
  const has3d = product.models.length > 0;

  const step = useCallback(
    (delta: number) => {
      if (count === 0) return;
      setActiveImage((((activeImage + delta) % count) + count) % count);
    },
    [activeImage, count, setActiveImage],
  );

  return (
    <div className={cn('lg:flex lg:items-start lg:gap-4', className)}>
      {/* ------------------------------------------------------ thumbnails */}
      {count > 1 ? (
        <ul
          className={cn(
            'order-2 mt-3 flex gap-3 overflow-x-auto pb-1',
            'lg:order-1 lg:mt-0 lg:w-[4.75rem] lg:shrink-0 lg:flex-col lg:overflow-visible lg:pb-0',
          )}
          aria-label={`${product.name} images`}
        >
          {images.map((image, index) => {
            const selected = index === activeImage && !viewer3d;
            return (
              <li key={image.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setViewer3d(false);
                    setActiveImage(index);
                  }}
                  aria-current={selected ? 'true' : undefined}
                  aria-label={image.alt}
                  data-cursor="link"
                  className={cn(
                    'relative block h-[4.75rem] w-[3.6rem] overflow-hidden bg-[var(--bg-sunken)] lg:h-[6rem] lg:w-full',
                    'transition-opacity duration-[var(--d-fast)] ease-[var(--e-out)]',
                    selected ? 'opacity-100' : 'opacity-55 hover:opacity-100',
                  )}
                >
                  <Image
                    src={image.url}
                    alt=""
                    aria-hidden
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                  <span
                    aria-hidden
                    className={cn(
                      'absolute inset-0 border transition-colors duration-[var(--d-fast)]',
                      selected ? 'border-[var(--fg)]' : 'border-transparent',
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {/* ------------------------------------------------------ main frame */}
      <div className="relative order-1 flex-1 lg:order-2">
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-[var(--bg-sunken)]">
          {viewer3d ? (
            <ProductViewer
              productSlug={product.slug}
              product={product}
              colorway={colorway}
              className="absolute inset-0"
            />
          ) : (
            <AnimatePresence initial={false} mode="popLayout">
              {current ? (
                <motion.div
                  key={`${colorway}-${current.id}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: t.standard }}
                  exit={{ opacity: 0, transition: t.fast }}
                  className="absolute inset-0"
                >
                  <Image
                    src={current.url}
                    alt={current.alt}
                    fill
                    priority={activeImage === 0}
                    sizes="(min-width: 1024px) 46vw, 100vw"
                    className="object-cover"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          )}

          {/* Frame controls. Kept as real buttons so they are all tab stops. */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-3">
            <div className="flex justify-end">
              {!viewer3d ? (
                <FrameButton
                  onClick={() => setLightbox(true)}
                  label={`Expand ${current?.alt ?? product.name}`}
                >
                  <Expand size={14} strokeWidth={1.25} aria-hidden />
                </FrameButton>
              ) : null}
            </div>

            <div className="flex items-end justify-between gap-3">
              {has3d ? (
                <button
                  type="button"
                  onClick={() => setViewer3d((value) => !value)}
                  aria-pressed={viewer3d}
                  data-cursor="link"
                  className={cn(
                    't-label-sm pointer-events-auto inline-flex h-10 items-center gap-2.5 px-4',
                    'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                    viewer3d
                      ? 'bg-[var(--bg)] text-[var(--fg)]'
                      : 'bg-[var(--fg)] text-[var(--bg)] hover:opacity-90',
                  )}
                >
                  {viewer3d ? <X size={13} strokeWidth={1.5} aria-hidden /> : <Box size={13} strokeWidth={1.5} aria-hidden />}
                  {viewer3d ? 'Close 3D' : 'View in 3D'}
                </button>
              ) : (
                <span />
              )}

              {!viewer3d && count > 1 ? (
                <div className="pointer-events-auto flex items-center gap-2">
                  <FrameButton onClick={() => step(-1)} label="Previous image">
                    <ArrowLeft size={14} strokeWidth={1.25} aria-hidden />
                  </FrameButton>
                  <p className="t-spec bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] px-2 py-1 text-[var(--fg-muted)]">
                    {activeImage + 1}/{count}
                  </p>
                  <FrameButton onClick={() => step(1)} label="Next image">
                    <ArrowRight size={14} strokeWidth={1.25} aria-hidden />
                  </FrameButton>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {current ? (
          <p className="t-caption mt-3 text-[var(--fg-subtle)]">{current.alt}</p>
        ) : null}
      </div>

      <Lightbox
        open={lightbox}
        onClose={() => setLightbox(false)}
        images={images}
        index={activeImage}
        onIndexChange={setActiveImage}
        productName={product.name}
      />
    </div>
  );
}

/* ------------------------------------------------------------ primitives -- */

function FrameButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-cursor="link"
      className={cn(
        'pointer-events-auto inline-flex h-9 w-9 items-center justify-center',
        'bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] text-[var(--fg)] backdrop-blur-[2px]',
        'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:bg-[var(--bg)]',
      )}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------- lightbox -- */

function Lightbox({
  open,
  onClose,
  images,
  index,
  onIndexChange,
  productName,
}: {
  open: boolean;
  onClose: () => void;
  images: { id: string; url: string; alt: string }[];
  index: number;
  onIndexChange: (index: number) => void;
  productName: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const count = images.length;
  const current = images[Math.min(index, count - 1)];

  useScrollLock(open);
  useFocusTrap(panelRef, open);
  useEscapeKey(open, onClose);

  const step = useCallback(
    (delta: number) => {
      if (count === 0) return;
      onIndexChange((((index + delta) % count) + count) % count);
    },
    [count, index, onIndexChange],
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') { event.preventDefault(); step(1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); step(-1); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, step]);

  return (
    <Portal>
      <AnimatePresence>
        {open && current ? (
          <motion.div
            key="lightbox"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={`${productName} — image viewer`}
            tabIndex={-1}
            data-surface="inverse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: t.standard }}
            exit={{ opacity: 0, transition: t.fast }}
            className="fixed inset-0 flex flex-col outline-none"
            style={{ zIndex: zIndex.modal }}
          >
            <header className="flex shrink-0 items-center justify-between gap-4 px-[var(--gutter)] py-4">
              <p className="t-label text-[var(--fg-muted)]">{productName}</p>
              <div className="flex items-center gap-4">
                <p className="t-spec text-[var(--fg-subtle)]">
                  {index + 1}/{count}
                </p>
                <button
                  type="button"
                  onClick={onClose}
                  data-autofocus
                  aria-label="Close image viewer"
                  data-cursor="link"
                  className="inline-flex h-10 w-10 items-center justify-center text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
                >
                  <X size={18} strokeWidth={1.25} aria-hidden />
                </button>
              </div>
            </header>

            <div className="relative min-h-0 flex-1">
              <Image
                key={current.id}
                src={current.url}
                alt={current.alt}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-4 px-[var(--gutter)] py-4">
              <p className="t-caption max-w-[26rem] text-[var(--fg-muted)]">{current.alt}</p>
              {count > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => step(-1)}
                    aria-label="Previous image"
                    data-cursor="link"
                    className="inline-flex h-10 w-10 items-center justify-center border border-[var(--border-strong)] transition-colors duration-[var(--d-fast)] hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                  >
                    <ArrowLeft size={15} strokeWidth={1.25} aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => step(1)}
                    aria-label="Next image"
                    data-cursor="link"
                    className="inline-flex h-10 w-10 items-center justify-center border border-[var(--border-strong)] transition-colors duration-[var(--d-fast)] hover:bg-[var(--fg)] hover:text-[var(--bg)]"
                  >
                    <ArrowRight size={15} strokeWidth={1.25} aria-hidden />
                  </button>
                </div>
              ) : null}
            </footer>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
