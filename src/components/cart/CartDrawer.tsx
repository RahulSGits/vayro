'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import { cn, formatPrice, pluralise } from '@/lib/utils';
import { t } from '@/lib/motion';
import {
  SHIPPING_FREE_THRESHOLD,
  cartTotals,
  useCart,
} from '@/store/cart';
import type { CartLine } from '@/types';
import { Drawer } from '@/components/ui/Drawer';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { VayroMark } from '@/components/brand';

/* ==========================================================================
   CartDrawer — the bag, opened from the header.

   Totals are derived from cartTotals() so the drawer, the cart page and
   checkout can never disagree about what is owed.
   ========================================================================== */

export function CartDrawer() {
  const open = useCart((state) => state.open);
  const setOpen = useCart((state) => state.setOpen);
  const lines = useCart((state) => state.lines);
  const discountCode = useCart((state) => state.discountCode);
  const discountPercent = useCart((state) => state.discountPercent);

  const close = useCallback(() => setOpen(false), [setOpen]);
  const totals = useMemo(() => cartTotals(lines, discountPercent), [lines, discountPercent]);
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const currency = lines[0]?.currency ?? 'INR';

  return (
    <Drawer
      open={open}
      onClose={close}
      side="right"
      size="lg"
      label="Cart"
      bodyClassName="flex flex-col"
      header={
        <div className="flex shrink-0 items-baseline justify-between gap-4 border-b border-[var(--border)] px-[var(--gutter)] py-5">
          <h2 className="t-label text-[var(--fg)]">
            Cart
            {count > 0 ? <span className="t-spec ml-3 text-[var(--fg-subtle)]">{count}</span> : null}
          </h2>
          <button
            type="button"
            onClick={close}
            className="t-label-sm -mr-1 inline-flex h-8 items-center gap-2.5 px-1 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
          >
            Close
            <span aria-hidden className="relative block h-3 w-3">
              <span className="absolute top-1/2 left-0 h-px w-full rotate-45 bg-current" />
              <span className="absolute top-1/2 left-0 h-px w-full -rotate-45 bg-current" />
            </span>
          </button>
        </div>
      }
      footer={
        lines.length > 0 ? (
          <Summary
            currency={currency}
            totals={totals}
            discountCode={discountCode}
            discountPercent={discountPercent}
            onNavigate={close}
          />
        ) : null
      }
    >
      {lines.length === 0 ? (
        <EmptyState
          className="flex-1"
          title="Nothing packed yet"
          body="One layer. Every destination. Start with the shell that folds into its own hood."
          action={
            <ButtonLink href="/shop" variant="secondary" size="md" onClick={close}>
              Browse equipment
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ShippingProgress subtotal={totals.subtotal - totals.discount} currency={currency} />
          <ul className="px-[var(--gutter)]">
            {lines.map((line) => (
              <CartRow key={line.id} line={line} onNavigate={close} />
            ))}
          </ul>
          <p className="t-caption px-[var(--gutter)] py-6 text-[var(--fg-subtle)]">
            Taxes and duties are calculated at checkout against your destination.
          </p>
        </>
      )}
    </Drawer>
  );
}

/* ------------------------------------------------------------- progress -- */

function ShippingProgress({ subtotal, currency }: { subtotal: number; currency: CartLine['currency'] }) {
  const remaining = Math.max(0, SHIPPING_FREE_THRESHOLD - subtotal);
  const progress = Math.min(1, subtotal / SHIPPING_FREE_THRESHOLD);

  return (
    <div className="border-b border-[var(--border)] px-[var(--gutter)] py-5">
      <p className="t-caption text-[var(--fg-muted)]">
        {remaining > 0 ? (
          <>
            <span className="text-[var(--fg)]">{formatPrice(remaining, currency)}</span> from free
            shipping
          </>
        ) : (
          <span className="text-[var(--fg)]">Free shipping applied</span>
        )}
      </p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label="Progress towards free shipping"
        className="mt-3 h-px w-full bg-[var(--border)]"
      >
        <motion.div
          className="h-px origin-left bg-[var(--fg)]"
          initial={false}
          animate={{ scaleX: progress, transition: t.slow }}
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ row -- */

function CartRow({ line, onNavigate }: { line: CartLine; onNavigate: () => void }) {
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);
  const atMax = line.quantity >= line.maxQuantity;
  const local = line.image.startsWith('/');

  return (
    <li className="flex gap-5 border-b border-[var(--border)] py-6">
      <Link
        href={`/products/${line.slug}`}
        onClick={onNavigate}
        tabIndex={-1}
        aria-hidden
        data-cursor="product"
        className="relative block h-[7.5rem] w-24 shrink-0 overflow-hidden bg-[var(--bg-sunken)]"
      >
        {local ? (
          <Image
            src={line.image}
            alt=""
            fill
            sizes="96px"
            className="object-cover transition-transform duration-[var(--d-slow)] ease-[var(--e-out)] hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <VayroMark size={20} className="text-[var(--fg-subtle)]" />
          </span>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/products/${line.slug}`}
              onClick={onNavigate}
              data-cursor="product"
              className="block truncate text-[var(--fg)] transition-opacity duration-[var(--d-fast)] hover:opacity-70"
            >
              {line.name}
            </Link>
            <p className="t-spec mt-1.5 flex items-center gap-2 text-[var(--fg-subtle)]">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 border border-[var(--border-strong)]"
                style={{ background: line.colorHex }}
              />
              {line.colorway}
              <span aria-hidden className="text-[var(--border-strong)]">/</span>
              {line.size}
            </p>
          </div>
          <p className="t-price shrink-0 text-[var(--fg)]">
            {formatPrice(line.unitPrice * line.quantity, line.currency)}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-4 pt-5">
          <div className="inline-flex items-center border border-[var(--border)]">
            <Stepper
              label={`Decrease quantity of ${line.name}`}
              onClick={() => setQuantity(line.id, line.quantity - 1)}
            >
              <Minus size={13} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
            </Stepper>
            <span className="t-spec w-8 text-center text-[var(--fg)]" aria-live="polite">
              {line.quantity}
            </span>
            <Stepper
              label={`Increase quantity of ${line.name}`}
              disabled={atMax}
              onClick={() => setQuantity(line.id, line.quantity + 1)}
            >
              <Plus size={13} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
            </Stepper>
          </div>

          <button
            type="button"
            onClick={() => remove(line.id)}
            className="t-label-sm text-[var(--fg-subtle)] underline underline-offset-4 decoration-[var(--border-strong)] transition-colors duration-[var(--d-fast)] hover:text-[var(--danger)] hover:decoration-[var(--danger)]"
          >
            Remove
          </button>
        </div>

        {atMax ? (
          <p className="t-caption mt-2 text-[var(--fg-subtle)]">
            {pluralise(line.maxQuantity, 'unit')} available in this size.
          </p>
        ) : null}
      </div>
    </li>
  );
}

function Stepper({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)] disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------- summary -- */

function Summary({
  currency,
  totals,
  discountCode,
  discountPercent,
  onNavigate,
}: {
  currency: CartLine['currency'];
  totals: ReturnType<typeof cartTotals>;
  discountCode: string | null;
  discountPercent: number;
  onNavigate: () => void;
}) {
  return (
    <div className="px-[var(--gutter)] py-6">
      <DiscountField discountCode={discountCode} discountPercent={discountPercent} />

      <dl className="mt-6 flex flex-col gap-2.5">
        <Row label="Subtotal" value={formatPrice(totals.subtotal, currency)} />
        {totals.discount > 0 ? (
          <Row
            label={`Discount${discountCode ? ` · ${discountCode}` : ''}`}
            value={`− ${formatPrice(totals.discount, currency)}`}
            tone="positive"
          />
        ) : null}
        <Row
          label="Shipping"
          value={totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping, currency)}
        />
      </dl>

      <div className="mt-5 flex items-baseline justify-between border-t border-[var(--border)] pt-5">
        <dt className="t-label text-[var(--fg-muted)]">Total</dt>
        <dd className="t-price-lg text-[var(--fg)]">{formatPrice(totals.total, currency)}</dd>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <ButtonLink href="/checkout" size="lg" block onClick={onNavigate} data-cursor="link">
          Checkout
        </ButtonLink>
        <ButtonLink href="/cart" variant="ghost" size="sm" block onClick={onNavigate}>
          View full cart
        </ButtonLink>
      </div>
    </div>
  );
}

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

/* ------------------------------------------------------------- discount -- */

function DiscountField({
  discountCode,
  discountPercent,
}: {
  discountCode: string | null;
  discountPercent: number;
}) {
  const applyDiscount = useCart((state) => state.applyDiscount);
  const clearDiscount = useCart((state) => state.clearDiscount);
  const [value, setValue] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [openField, setOpenField] = useState(false);

  if (discountCode) {
    return (
      <div className="flex items-center justify-between gap-4 border border-[var(--border)] px-4 py-3">
        <p className="t-label-sm text-[var(--fg)]">
          {discountCode}
          <span className="ml-2 text-[var(--fg-subtle)]">−{discountPercent}%</span>
        </p>
        <button
          type="button"
          onClick={() => {
            clearDiscount();
            setFeedback(null);
          }}
          className="t-caption text-[var(--fg-subtle)] underline underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          Remove
        </button>
      </div>
    );
  }

  if (!openField) {
    return (
      <button
        type="button"
        onClick={() => setOpenField(true)}
        className="t-label-sm text-[var(--fg-subtle)] underline underline-offset-4 decoration-[var(--border-strong)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
      >
        Add a discount code
      </button>
    );
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const trimmed = value.trim();
        if (!trimmed) return;
        const result = applyDiscount(trimmed);
        setFeedback(result);
        if (result.ok) setValue('');
      }}
    >
      <label htmlFor="cart-discount" className="t-label-sm block text-[var(--fg-subtle)]">
        Discount code
      </label>
      <div className="mt-2 flex items-end gap-3">
        <input
          id="cart-discount"
          value={value}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          onChange={(event) => {
            setValue(event.target.value);
            setFeedback(null);
          }}
          aria-invalid={feedback?.ok === false || undefined}
          aria-describedby={feedback ? 'cart-discount-status' : undefined}
          className="t-spec w-full min-w-0 flex-1 border-b border-[var(--border-strong)] bg-transparent py-2 tracking-[0.14em] uppercase transition-colors duration-[var(--d-fast)] focus:border-[var(--fg)] focus:outline-none"
        />
        <button
          type="submit"
          className="t-label-sm shrink-0 border-b border-[var(--border-strong)] py-2 text-[var(--fg)] transition-colors duration-[var(--d-fast)] hover:border-[var(--fg)]"
        >
          Apply
        </button>
      </div>
      {feedback ? (
        <p
          id="cart-discount-status"
          role={feedback.ok ? 'status' : 'alert'}
          className={cn('t-caption mt-2', feedback.ok ? 'text-[var(--positive)]' : 'text-[var(--danger)]')}
        >
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}
