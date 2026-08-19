'use client';

import { Minus, Plus } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { SHIPPING_FLAT, SHIPPING_FREE_THRESHOLD } from '@/store/cart';
import { Button } from '@/components/ui/Button';
import { Accordion, AccordionItem } from '@/components/ui/Accordion';
import { useProductState } from './ProductProvider';
import { WishlistButton } from './WishlistButton';
import { SizeGuideDialog } from './SizeGuideDialog';
import { colorwaysOf } from './product-utils';

/* ==========================================================================
   ProductPurchase — the buy column.

   Colourway drives the gallery through the shared provider. Sizes that cannot
   be bought stay in the list, focusable and clearly marked, rather than
   vanishing or silently refusing a click.
   ========================================================================== */

export function ProductPurchase({ className }: { className?: string }) {
  const {
    product,
    colorway,
    setColorway,
    size,
    setSize,
    quantity,
    setQuantity,
    sizeVariants,
    variant,
    blockedReason,
    addToCart,
    buyNow,
  } = useProductState('ProductPurchase');

  const swatches = colorwaysOf(product);
  const price = variant?.priceOverride ?? product.price;
  const maxQuantity = Math.min(Math.max(variant?.stock ?? 1, 1), 10);
  const canBuy = blockedReason === null;

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-baseline gap-4">
        <p className="t-price-lg">{formatPrice(price, product.currency)}</p>
        {product.compareAtPrice ? (
          <p className="t-body-sm text-[var(--fg-subtle)] line-through">
            {formatPrice(product.compareAtPrice, product.currency)}
          </p>
        ) : null}
      </div>
      <p className="t-caption mt-2 text-[var(--fg-subtle)]">
        Free shipping over {formatPrice(SHIPPING_FREE_THRESHOLD, product.currency)}.
      </p>

      {/* --------------------------------------------------------- colour */}
      {swatches.length > 0 ? (
        <section className="mt-10" aria-labelledby="colourway-label">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="colourway-label" className="t-label text-[var(--fg-subtle)]">
              Colourway
            </h2>
            <p className="t-caption text-[var(--fg-muted)]">{colorway}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {swatches.map((swatch) => {
              const selected = swatch.name === colorway;
              return (
                <button
                  key={swatch.name}
                  type="button"
                  onClick={() => setColorway(swatch.name)}
                  aria-pressed={selected}
                  aria-label={swatch.inStock ? swatch.name : `${swatch.name} — sold out`}
                  title={swatch.name}
                  data-cursor="link"
                  className={cn(
                    'relative h-10 w-10 border transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                    selected
                      ? 'border-[var(--fg)] ring-1 ring-[var(--fg)] ring-offset-2 ring-offset-[var(--bg)]'
                      : 'border-[var(--border-strong)] hover:border-[var(--fg)]',
                  )}
                  style={{ background: swatch.hex }}
                >
                  {!swatch.inStock ? (
                    <span
                      aria-hidden
                      className="absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--danger)_calc(50%-0.5px),var(--danger)_calc(50%+0.5px),transparent_calc(50%+0.5px))]"
                    />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ---------------------------------------------------------- sizes */}
      {sizeVariants.length > 0 ? (
        <section className="mt-9" aria-labelledby="size-label">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="size-label" className="t-label text-[var(--fg-subtle)]">
              Size
            </h2>
            <SizeGuideDialog product={product} />
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {sizeVariants.map((option) => {
              const soldOut = !option.available || option.stock <= 0;
              const selected = option.size === size;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => { if (!soldOut) setSize(option.size); }}
                  aria-pressed={selected}
                  aria-disabled={soldOut || undefined}
                  data-cursor={soldOut ? undefined : 'link'}
                  className={cn(
                    't-label-sm relative h-12 border transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                    soldOut
                      ? 'cursor-not-allowed border-[var(--border)] text-[var(--fg-subtle)]'
                      : selected
                        ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
                        : 'border-[var(--border-strong)] hover:border-[var(--fg)]',
                  )}
                >
                  {option.size}
                  {soldOut ? (
                    <>
                      <span
                        aria-hidden
                        className="absolute inset-0 bg-[linear-gradient(to_top_right,transparent_calc(50%-0.5px),var(--border-strong)_calc(50%-0.5px),var(--border-strong)_calc(50%+0.5px),transparent_calc(50%+0.5px))]"
                      />
                      <span className="sr-only"> — sold out</span>
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* ------------------------------------------------------- quantity */}
      <div className="mt-9 flex items-center justify-between gap-6">
        <span className="t-label text-[var(--fg-subtle)]">Quantity</span>
        <div className="flex items-center border border-[var(--border-strong)]">
          <button
            type="button"
            onClick={() => setQuantity(quantity - 1)}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            data-cursor="link"
            className="inline-flex h-11 w-11 items-center justify-center transition-colors duration-[var(--d-fast)] hover:bg-[color-mix(in_oklab,var(--fg)_7%,transparent)] disabled:opacity-30"
          >
            <Minus size={14} strokeWidth={1.25} aria-hidden />
          </button>
          <output className="t-spec w-10 text-center" aria-live="polite">
            {quantity}
          </output>
          <button
            type="button"
            onClick={() => setQuantity(quantity + 1)}
            disabled={quantity >= maxQuantity}
            aria-label="Increase quantity"
            data-cursor="link"
            className="inline-flex h-11 w-11 items-center justify-center transition-colors duration-[var(--d-fast)] hover:bg-[color-mix(in_oklab,var(--fg)_7%,transparent)] disabled:opacity-30"
          >
            <Plus size={14} strokeWidth={1.25} aria-hidden />
          </button>
        </div>
      </div>

      {/* -------------------------------------------------------- actions */}
      <div className="mt-8 flex flex-col gap-3">
        <Button size="lg" block onClick={addToCart} disabled={!canBuy}>
          {canBuy ? 'Add to cart' : (blockedReason ?? 'Unavailable')}
        </Button>
        <div className="flex gap-3">
          <Button size="lg" variant="secondary" className="flex-1" onClick={buyNow} disabled={!canBuy}>
            Buy now
          </Button>
          <WishlistButton
            productId={product.id}
            productName={product.name}
            variant="inline"
            className="h-14 shrink-0 px-6"
          />
        </div>
      </div>

      <p aria-live="polite" className="t-caption mt-3 min-h-[1.2rem] text-[var(--fg-muted)]">
        {blockedReason ?? `${colorway}, size ${size ?? '—'} — ready to ship.`}
      </p>

      {/* ---------------------------------------------- shipping / returns */}
      <Accordion type="single" className="mt-10">
        <AccordionItem value="shipping" title="Shipping">
          <ul className="space-y-2">
            <li>
              Flat {formatPrice(SHIPPING_FLAT, product.currency)} across India. Free over{' '}
              {formatPrice(SHIPPING_FREE_THRESHOLD, product.currency)}.
            </li>
            <li>Orders are dispatched on the next working day. Tracking is emailed on despatch.</li>
          </ul>
        </AccordionItem>
        <AccordionItem value="returns" title="Returns">
          <ul className="space-y-2">
            <li>Thirty days from delivery, unworn, with tags attached.</li>
            <li>Return shipping within India is on us. Exchanges are processed as a new order.</li>
          </ul>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
