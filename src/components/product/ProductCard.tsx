'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { cn, formatPrice } from '@/lib/utils';
import { t } from '@/lib/motion';
import type { Product, ProductVariant } from '@/types';
import { useCart } from '@/store/cart';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { WishlistButton } from './WishlistButton';
import { cardImages, colorwaysOf, defaultColorway, inStock, variantsFor } from './product-utils';

/* ==========================================================================
   ProductCard — the unit the whole storefront is built from.

   One tab stop for the card itself (the title link covers the tile via a
   pseudo-element), with the wishlist control and quick-add stacked above it.
   Hover crossfades to the second plate; quick-add opens a size picker rather
   than guessing which variant someone wants.

   Aspect ratio is themeable from the outside — pass `[--card-aspect:4/5]` in
   `className` so grids can break their own rhythm without a new prop.
   ========================================================================== */

export type ProductCardProps = {
  product: Product;
  /** Set on the first row so the LCP plate is not lazy-loaded. */
  priority?: boolean;
  className?: string;
};

export function ProductCard({ product, priority = false, className }: ProductCardProps) {
  const reduceMotion = useReducedMotion();
  const { primary, alternate } = cardImages(product);
  const available = inStock(product);
  const swatches = colorwaysOf(product);
  const href = `/product/${product.slug}`;

  return (
    <motion.article
      className={cn('group relative isolate flex flex-col', className)}
      initial={false}
      whileHover={reduceMotion ? undefined : { y: -6, transition: t.standard }}
    >
      <div
        className={cn(
          'relative overflow-hidden bg-[var(--bg-sunken)]',
          'aspect-[var(--card-aspect,3/4)]',
        )}
      >
        {primary ? (
          <Image
            src={primary.url}
            alt={primary.alt}
            fill
            priority={priority}
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 42vw, 50vw"
            className={cn(
              'object-cover transition-[opacity,transform] duration-[var(--d-slow)] ease-[var(--e-out)]',
              alternate && 'group-hover:opacity-0 group-focus-within:opacity-0',
              'group-hover:scale-[1.03] group-focus-within:scale-[1.03]',
            )}
          />
        ) : null}

        {alternate ? (
          <Image
            src={alternate.url}
            alt=""
            aria-hidden
            fill
            sizes="(min-width: 1280px) 30vw, (min-width: 768px) 42vw, 50vw"
            className={cn(
              'object-cover opacity-0 transition-[opacity,transform] duration-[var(--d-slow)] ease-[var(--e-out)]',
              'group-hover:scale-[1.03] group-hover:opacity-100',
              'group-focus-within:scale-[1.03] group-focus-within:opacity-100',
            )}
          />
        ) : null}

        {/* Badges sit on the plate, never over the type. */}
        {product.badges.length > 0 || !available ? (
          <div className="pointer-events-none absolute top-3 left-3 z-20 flex flex-wrap gap-1.5 pr-16">
            {!available ? <Badge tone="default">Sold out</Badge> : null}
            {product.badges.slice(0, 2).map((badge) => (
              <Badge key={badge} tone="inverse">
                {badge}
              </Badge>
            ))}
          </div>
        ) : null}

        <WishlistButton
          productId={product.id}
          productName={product.name}
          className="absolute top-3 right-3 z-20"
        />

        {available ? <QuickAdd product={product} /> : null}
      </div>

      <div className="mt-5 flex items-start justify-between gap-5">
        <div className="min-w-0">
          <h3 className="t-h3">
            <Link
              href={href}
              data-cursor="link"
              className="before:absolute before:inset-0 before:z-0 before:content-['']"
            >
              {product.name}
            </Link>
          </h3>
          {product.subtitle ? (
            <p className="t-body-sm mt-1 text-[var(--fg-muted)]">{product.subtitle}</p>
          ) : null}
        </div>

        <p className="t-price shrink-0 text-right">
          {formatPrice(product.price, product.currency)}
          {product.compareAtPrice ? (
            <span className="t-caption ml-2 text-[var(--fg-subtle)] line-through">
              {formatPrice(product.compareAtPrice, product.currency)}
            </span>
          ) : null}
        </p>
      </div>

      {swatches.length > 1 ? (
        <ul className="mt-3 flex items-center gap-1.5" aria-label={`${swatches.length} colourways`}>
          {swatches.map((swatch) => (
            <li key={swatch.name} className="relative">
              <span
                className="block h-2.5 w-2.5 border border-[var(--border-strong)]"
                style={{ background: swatch.hex }}
                title={swatch.name}
              />
              <span className="sr-only">{swatch.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </motion.article>
  );
}

/* ------------------------------------------------------------- quick add -- */

function QuickAdd({ product }: { product: Product }) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [colorway, setColorway] = useState(() => defaultColorway(product));

  const add = useCart((state) => state.add);
  const setCartOpen = useCart((state) => state.setOpen);
  const { toast } = useToast();

  const swatches = colorwaysOf(product);
  const variants = variantsFor(product, colorway);
  const single = variants.length === 1 ? variants[0] : null;

  const close = useCallback(() => setOpen(false), []);

  /* Dismiss on outside pointer or Escape — the popover is transient chrome. */
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        close();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open, close]);

  const commit = useCallback(
    (variant: ProductVariant) => {
      add(product, variant, 1);
      close();
      toast({
        title: 'Added to bag',
        description: `${product.name} — ${variant.colorway}, ${variant.size}`,
        tone: 'success',
        action: { label: 'View bag', onClick: () => setCartOpen(true) },
      });
    },
    [add, close, product, setCartOpen, toast],
  );

  return (
    // The wrapper must not eat clicks meant for the card link behind it —
    // only the controls themselves take pointer events, and only when shown.
    <div ref={rootRef} className="pointer-events-none absolute inset-x-3 bottom-3 z-20">
      <AnimatePresence>
        {open && !single ? (
          <motion.div
            key="panel"
            id={panelId}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: t.fast }}
            exit={{ opacity: 0, y: 6, transition: t.fast }}
            className="pointer-events-auto mb-2 border border-[var(--border)] bg-[var(--bg-elevated)] p-3 shadow-[var(--sh-lg)]"
          >
            {swatches.length > 1 ? (
              <div className="mb-3">
                <p className="t-label-sm mb-2 text-[var(--fg-subtle)]">Colourway</p>
                <div className="flex flex-wrap gap-1.5">
                  {swatches.map((swatch) => {
                    const selected = swatch.name === colorway;
                    return (
                      <button
                        key={swatch.name}
                        type="button"
                        onClick={() => setColorway(swatch.name)}
                        aria-pressed={selected}
                        aria-label={swatch.name}
                        title={swatch.name}
                        data-cursor="link"
                        className={cn(
                          'h-6 w-6 border transition-colors duration-[var(--d-fast)]',
                          selected ? 'border-[var(--fg)]' : 'border-[var(--border-strong)]',
                        )}
                        style={{ background: swatch.hex }}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}

            <p className="t-label-sm mb-2 text-[var(--fg-subtle)]">Size</p>
            <div className="grid grid-cols-3 gap-1.5">
              {variants.map((variant) => {
                const soldOut = !variant.available || variant.stock <= 0;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    disabled={soldOut}
                    onClick={() => commit(variant)}
                    data-cursor={soldOut ? undefined : 'link'}
                    aria-label={soldOut ? `${variant.size} — sold out` : `Add size ${variant.size}`}
                    className={cn(
                      't-label-sm h-9 border transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                      soldOut
                        ? 'cursor-not-allowed border-[var(--border)] text-[var(--fg-subtle)] line-through'
                        : 'border-[var(--border-strong)] hover:bg-[var(--fg)] hover:text-[var(--bg)]',
                    )}
                  >
                    {variant.size}
                  </button>
                );
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        aria-expanded={single ? undefined : open}
        aria-controls={single ? undefined : panelId}
        onClick={() => (single ? commit(single) : setOpen((value) => !value))}
        data-cursor="link"
        className={cn(
          't-label-sm h-10 w-full bg-[var(--fg)] text-[var(--bg)]',
          'transition-[opacity,transform] duration-[var(--d-standard)] ease-[var(--e-out)]',
          // Hidden until the tile is hovered or something inside it takes focus.
          // Coarse pointers get it permanently — there is no hover to wait for.
          'opacity-0 translate-y-1 pointer-events-none',
          'group-hover:pointer-events-auto group-hover:translate-y-0 group-hover:opacity-100',
          'group-focus-within:pointer-events-auto group-focus-within:translate-y-0 group-focus-within:opacity-100',
          'focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100',
          '[@media(hover:none)]:pointer-events-auto [@media(hover:none)]:translate-y-0 [@media(hover:none)]:opacity-100',
          open && 'pointer-events-auto translate-y-0 opacity-100',
        )}
      >
        {single ? 'Quick add' : open ? 'Close' : 'Quick add'}
      </button>
    </div>
  );
}
