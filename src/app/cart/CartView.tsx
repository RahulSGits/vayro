'use client';

import { useMemo, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { cn, formatPrice, pluralise } from '@/lib/utils';
import { t } from '@/lib/motion';
import { SHIPPING_FREE_THRESHOLD, cartTotals, useCart } from '@/store/cart';
import { ButtonLink } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/States';
import { Reveal, RevealChild, RevealText } from '@/components/ui/Reveal';
import { CartLineItem } from '@/components/cart/CartLineItem';
import { DiscountField } from '@/components/checkout/DiscountField';
import { TrustRow } from '@/components/checkout/TrustRow';
import type { Currency } from '@/types';

/* ==========================================================================
   The cart page — the full read of the bag.

   Everything here is derived from the same store the drawer uses, and every
   figure comes from `cartTotals`, so the two can never disagree. Tax is not
   quoted: it depends on a destination that has not been given yet.
   ========================================================================== */

export type CartSuggestion = {
  slug: string;
  name: string;
  subtitle: string | null;
  price: number;
  currency: Currency;
  image: string | null;
  alt: string;
};

const noopSubscribe = () => () => {};

/** False for exactly one render — the cart rehydrates from localStorage. */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function CartView({ suggestions }: { suggestions: CartSuggestion[] }) {
  const hydrated = useHydrated();
  const lines = useCart((state) => state.lines);
  const discountCode = useCart((state) => state.discountCode);
  const discountPercent = useCart((state) => state.discountPercent);

  const totals = useMemo(() => cartTotals(lines, discountPercent), [lines, discountPercent]);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const currency: Currency = lines[0]?.currency ?? 'INR';
  const merchandise = totals.subtotal - totals.discount;

  if (!hydrated) return <CartSkeleton />;
  if (lines.length === 0) return <EmptyCart suggestions={suggestions} />;

  return (
    <>
      <section className="shell pt-12 pb-10 md:pt-16">
        <p className="t-label-sm text-[var(--fg-subtle)]">Cart</p>
        <div className="mt-6 flex flex-wrap items-end justify-between gap-x-10 gap-y-4">
          <RevealText as="h1" text={'Ready to move.'} className="t-display-md t-balance" />
          <p className="t-spec text-[var(--fg-subtle)]">{pluralise(count, 'piece')}</p>
        </div>
      </section>

      <ShippingProgress merchandise={merchandise} currency={currency} />

      <div className="shell grid-12 pb-20 md:pb-28">
        {/* ------------------------------------------------------- lines -- */}
        <div className="col-span-4 md:col-span-7">
          <ul className="border-t border-[var(--border)]">
            <AnimatePresence initial={false}>
              {lines.map((line) => (
                <CartLineItem key={line.id} line={line} variant="expanded" />
              ))}
            </AnimatePresence>
          </ul>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/shop"
              data-cursor="link"
              className="t-label-sm group inline-flex items-center gap-2.5 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
            >
              Continue shopping
              <ArrowRight
                size={13}
                strokeWidth={1.25}
                strokeLinecap="square"
                strokeLinejoin="miter"
                aria-hidden
                className="transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:translate-x-1"
              />
            </Link>
            <p className="t-caption text-[var(--fg-subtle)]">
              Sizes are held in the bag, not reserved.
            </p>
          </div>

          <TrustRow currency={currency} className="mt-14" />
        </div>

        {/* ----------------------------------------------------- summary -- */}
        <aside className="col-span-4 mt-14 md:col-span-5 md:col-start-8 md:mt-0">
          <div className="sticky top-[calc(var(--header-h)+1.5rem)]">
            <div className="border border-[var(--border)] bg-[var(--bg-elevated)]">
              <h2 className="t-label border-b border-[var(--border)] px-6 py-5 text-[var(--fg)]">
                Summary
              </h2>

              <div className="px-6 py-6">
                <DiscountField />

                <dl className="mt-7 flex flex-col gap-2.5 border-t border-[var(--border)] pt-6">
                  <Row label="Subtotal" value={formatPrice(totals.subtotal, currency)} />
                  {totals.discount > 0 ? (
                    <Row
                      label={`Discount${discountCode ? ` · ${discountCode}` : ''}`}
                      value={`− ${formatPrice(totals.discount, currency)}`}
                      tone="positive"
                    />
                  ) : null}
                  <Row
                    label="Estimated shipping"
                    value={totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping, currency)}
                  />

                  <div className="mt-3.5 flex items-baseline justify-between gap-4 border-t border-[var(--border)] pt-6">
                    <dt className="t-label text-[var(--fg-muted)]">Estimated total</dt>
                    <dd className="t-price-lg text-[var(--fg)]">
                      {formatPrice(totals.total, currency)}
                    </dd>
                  </div>
                </dl>

                <p className="t-caption mt-4 text-[var(--fg-subtle)]">
                  Taxes and duties are calculated at checkout against your destination.
                </p>

                <div className="mt-7">
                  <ButtonLink href="/checkout" size="lg" block data-cursor="link">
                    Checkout
                  </ButtonLink>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {suggestions.length > 0 ? (
        <Suggestions
          suggestions={suggestions}
          title={'Complete\nthe system.'}
          lede="Pieces cut to layer with what is already in your bag."
        />
      ) : null}
    </>
  );
}

/* -------------------------------------------------------------- progress -- */

function ShippingProgress({ merchandise, currency }: { merchandise: number; currency: Currency }) {
  const remaining = Math.max(0, SHIPPING_FREE_THRESHOLD - merchandise);
  const progress = Math.min(1, merchandise / SHIPPING_FREE_THRESHOLD);

  return (
    <div className="shell pb-10">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <p className="t-body-sm text-[var(--fg-muted)]">
          {remaining > 0 ? (
            <>
              <span className="text-[var(--fg)]">{formatPrice(remaining, currency)}</span> from free
              standard shipping
            </>
          ) : (
            <span className="text-[var(--fg)]">Free standard shipping applied</span>
          )}
        </p>
        <p className="t-spec text-[var(--fg-subtle)]">
          {formatPrice(SHIPPING_FREE_THRESHOLD, currency)} threshold
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Progress towards free shipping"
        className="mt-4 h-px w-full bg-[var(--border)]"
      >
        <motion.div
          className="h-px w-full origin-left bg-[var(--fg)]"
          initial={false}
          animate={{ scaleX: progress, transition: t.slow }}
        />
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- empty -- */

function EmptyCart({ suggestions }: { suggestions: CartSuggestion[] }) {
  return (
    <>
      <section className="shell section">
        <div className="grid-12 items-center gap-y-14">
          <div className="col-span-4 md:col-span-5">
            <p className="t-label-sm text-[var(--fg-subtle)]">Cart</p>
            <RevealText
              as="h1"
              text={'Nothing\npacked yet.'}
              className="t-display-lg t-balance mt-7"
            />
            <p className="t-body-lg t-pretty mt-7 max-w-sm text-[var(--fg-muted)]">
              One layer. Every destination. Start with the shell that folds into its own hood and
              travels as a 2.1&nbsp;litre carry unit.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/shop" size="lg">
                Browse equipment
              </ButtonLink>
              <ButtonLink href="/collections" variant="secondary" size="lg">
                Collections
              </ButtonLink>
            </div>

            <dl className="mt-14 flex flex-wrap gap-x-12 gap-y-6 border-t border-[var(--border)] pt-8">
              <div>
                <dt className="t-label-sm text-[var(--fg-subtle)]">Free shipping</dt>
                <dd className="t-spec mt-1.5 text-[var(--fg)]">
                  Above {formatPrice(SHIPPING_FREE_THRESHOLD)}
                </dd>
              </div>
              <div>
                <dt className="t-label-sm text-[var(--fg-subtle)]">Returns</dt>
                <dd className="t-spec mt-1.5 text-[var(--fg)]">30 days</dd>
              </div>
              <div>
                <dt className="t-label-sm text-[var(--fg-subtle)]">Despatch</dt>
                <dd className="t-spec mt-1.5 text-[var(--fg)]">2 working days</dd>
              </div>
            </dl>
          </div>

          {/* The mask sits on an inner layer, never on the observed element:
              a clipped box reports zero intersection and would never be told
              to reveal itself. */}
          <Reveal
            variant="staggerTight"
            as="figure"
            className="relative col-span-4 aspect-[4/5] overflow-hidden bg-[var(--bg-sunken)] md:col-span-6 md:col-start-7"
          >
            <RevealChild variant="imageReveal" className="absolute inset-0">
              <Image
                src="/media/field-transit.webp"
                alt="A packed Meridian Carry Shell in transit"
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
                priority
              />
            </RevealChild>
            <figcaption className="absolute inset-x-0 bottom-0 p-5">
              {/* The chip carries the inversion, not the caption box — the
                  surface attribute paints whatever element it sits on. */}
              <span data-surface="inverse" className="t-spec inline-block px-3 py-2">
                Meridian Carry Shell — packed, 2.1 L
              </span>
            </figcaption>
          </Reveal>
        </div>
      </section>

      {suggestions.length > 0 ? (
        <Suggestions
          suggestions={suggestions}
          title={'Start here.'}
          lede="The three pieces most people build a kit around."
        />
      ) : null}
    </>
  );
}

/* ----------------------------------------------------------- suggestions -- */

function Suggestions({
  suggestions,
  title,
  lede,
}: {
  suggestions: CartSuggestion[];
  title: string;
  lede: string;
}) {
  return (
    <section className="shell section-tight border-t border-[var(--border)]">
      <div className="grid-12 items-end gap-y-6">
        <div className="col-span-4 md:col-span-6">
          <RevealText as="h2" text={title} className="t-h1 t-balance" />
        </div>
        <p className="t-body-sm t-pretty col-span-4 max-w-sm text-[var(--fg-muted)] md:col-span-5 md:col-start-8">
          {lede}
        </p>
      </div>

      <ul className="grid-12 mt-14">
        {suggestions.map((item, index) => (
          <li key={item.slug} className="col-span-4 md:col-span-4">
            <Reveal delay={index * 0.06}>
              <Link href={`/products/${item.slug}`} data-cursor="product" className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-[var(--bg-sunken)]">
                  {item.image ? (
                    <Image
                      src={item.image}
                      alt={item.alt}
                      fill
                      sizes="(min-width: 768px) 30vw, 100vw"
                      className="object-cover transition-transform duration-[var(--d-cine)] ease-[var(--e-out)] group-hover:scale-[1.03]"
                    />
                  ) : null}
                </div>
                <div className="mt-5 flex items-baseline justify-between gap-4">
                  <h3 className="t-h3 transition-opacity duration-[var(--d-fast)] group-hover:opacity-70">
                    {item.name}
                  </h3>
                  <p className="t-price shrink-0 text-[var(--fg)]">
                    {formatPrice(item.price, item.currency)}
                  </p>
                </div>
                {item.subtitle ? (
                  <p className="t-body-sm mt-2 text-[var(--fg-muted)]">{item.subtitle}</p>
                ) : null}
              </Link>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------------------------------------------- parts -- */

function Row({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'positive';
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="t-body-sm text-[var(--fg-muted)]">{label}</dt>
      <dd
        className={cn(
          't-body-sm tabular-nums',
          tone === 'positive' ? 'text-[var(--positive)]' : 'text-[var(--fg)]',
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div className="shell pt-12 pb-24 md:pt-16" aria-busy="true">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="mt-6 h-14 w-80 max-w-full" />
      <Skeleton className="mt-10 h-px w-full" />
      <div className="grid-12 mt-12">
        <div className="col-span-4 flex flex-col gap-8 md:col-span-7">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex gap-6">
              <Skeleton className="h-44 w-[8.75rem] shrink-0" />
              <div className="flex flex-1 flex-col gap-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="mt-auto h-9 w-32" />
              </div>
            </div>
          ))}
        </div>
        <div className="col-span-4 mt-12 md:col-span-5 md:col-start-8 md:mt-0">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}
