'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { cn, formatDate, formatPrice, pluralise } from '@/lib/utils';
import { t } from '@/lib/motion';
import { VayroMark } from '@/components/brand';
import type { CartLine, Currency } from '@/types';
import { DiscountField } from './DiscountField';
import { type CheckoutTotals, type ShippingMethodId, methodFor } from './schema';

/* ==========================================================================
   OrderSummary — what is in the bag and what it costs.

   Sticky beside the form on desktop; a disclosure above it on mobile, so the
   figure being agreed to is one tap away at every step without pushing the
   fields below the fold.
   ========================================================================== */

export type OrderSummaryProps = {
  lines: CartLine[];
  totals: CheckoutTotals;
  currency: Currency;
  method?: ShippingMethodId;
  /** ISO dates from `estimateDelivery`. Client-resolved, so may be absent. */
  delivery?: { earliest: string; latest: string } | null;
  variant?: 'panel' | 'disclosure';
  showDiscountField?: boolean;
  /** Where "Edit" points. Omitted on the cart page itself. */
  editHref?: string;
  className?: string;
};

export function OrderSummary({
  lines,
  totals,
  currency,
  method,
  delivery,
  variant = 'panel',
  showDiscountField = true,
  editHref,
  className,
}: OrderSummaryProps) {
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);

  if (variant === 'disclosure') {
    return (
      <SummaryDisclosure total={totals.total} currency={currency} count={count} className={className}>
        <SummaryBody
          lines={lines}
          totals={totals}
          currency={currency}
          method={method}
          delivery={delivery}
          showDiscountField={showDiscountField}
          editHref={editHref}
        />
      </SummaryDisclosure>
    );
  }

  return (
    <section
      aria-labelledby="order-summary-heading"
      className={cn('border border-[var(--border)] bg-[var(--bg-elevated)]', className)}
    >
      <header className="flex items-baseline justify-between gap-4 border-b border-[var(--border)] px-6 py-5">
        <h2 id="order-summary-heading" className="t-label text-[var(--fg)]">
          Order summary
        </h2>
        <span className="t-spec text-[var(--fg-subtle)]">{pluralise(count, 'item')}</span>
      </header>
      <div className="px-6 py-6">
        <SummaryBody
          lines={lines}
          totals={totals}
          currency={currency}
          method={method}
          delivery={delivery}
          showDiscountField={showDiscountField}
          editHref={editHref}
        />
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- disclosure -- */

function SummaryDisclosure({
  total,
  currency,
  count,
  className,
  children,
}: {
  total: number;
  currency: Currency;
  count: number;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();

  return (
    <section className={cn('border-y border-[var(--border)] bg-[var(--bg-elevated)]', className)}>
      <h2>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={id}
          className="flex w-full items-center justify-between gap-4 px-[var(--gutter)] py-4 text-left"
        >
          <span className="flex items-center gap-2.5">
            <span className="t-label-sm text-[var(--fg-muted)]">
              {open ? 'Hide order summary' : 'Show order summary'}
            </span>
            <motion.span
              aria-hidden
              initial={false}
              animate={{ rotate: open ? 180 : 0, transition: t.fast }}
              className="inline-flex text-[var(--fg-subtle)]"
            >
              <ChevronDown size={14} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" />
            </motion.span>
          </span>
          <span className="t-price text-[var(--fg)]">
            <span className="sr-only">{pluralise(count, 'item')}, total </span>
            {formatPrice(total, currency)}
          </span>
        </button>
      </h2>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: t.standard }}
            exit={{ height: 0, opacity: 0, transition: t.fast }}
            className="overflow-hidden"
          >
            <div className="border-t border-[var(--border)] px-[var(--gutter)] py-6">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}

/* ----------------------------------------------------------------- body -- */

function SummaryBody({
  lines,
  totals,
  currency,
  method,
  delivery,
  showDiscountField,
  editHref,
}: Omit<OrderSummaryProps, 'variant' | 'className'>) {
  const shippingLabel = method ? `Shipping · ${methodFor(method).name}` : 'Estimated shipping';

  return (
    <>
      <ul className="flex flex-col gap-5">
        {lines.map((line) => (
          <SummaryLine key={line.id} line={line} />
        ))}
      </ul>

      {editHref ? (
        <Link
          href={editHref}
          className="t-label-sm mt-6 inline-block text-[var(--fg-subtle)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          Edit bag
        </Link>
      ) : null}

      {showDiscountField ? (
        <div className="mt-7 border-t border-[var(--border)] pt-6">
          <DiscountField />
        </div>
      ) : null}

      <dl className="mt-7 flex flex-col gap-2.5 border-t border-[var(--border)] pt-6">
        <SummaryRow label="Subtotal" value={formatPrice(totals.subtotal, currency)} />
        {totals.discount > 0 ? (
          <SummaryRow
            label="Discount"
            value={`− ${formatPrice(totals.discount, currency)}`}
            tone="positive"
          />
        ) : null}
        <SummaryRow
          label={shippingLabel}
          value={totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping, currency)}
        />
        <SummaryRow
          label="Taxes"
          value={totals.taxIncluded ? 'Included' : 'At import'}
          muted
        />

        <div className="mt-3.5 flex items-baseline justify-between gap-4 border-t border-[var(--border)] pt-6">
          <dt className="t-label text-[var(--fg-muted)]">Total</dt>
          <dd className="t-price-lg text-[var(--fg)]">{formatPrice(totals.total, currency)}</dd>
        </div>
      </dl>

      {delivery ? (
        <p className="t-caption mt-4 text-[var(--fg-subtle)]">
          Estimated delivery {formatDate(delivery.earliest, { year: undefined })} –{' '}
          {formatDate(delivery.latest)}.
        </p>
      ) : null}

      {!totals.taxIncluded ? (
        <p className="t-caption mt-2 text-[var(--fg-subtle)]">
          Import duties and local taxes are collected by the carrier on delivery.
        </p>
      ) : (
        <p className="t-caption mt-2 text-[var(--fg-subtle)]">
          Prices include applicable taxes.
        </p>
      )}
    </>
  );
}

function SummaryLine({ line }: { line: CartLine }) {
  const hasImage = line.image.startsWith('/');

  return (
    <li className="flex gap-4">
      <div className="relative h-[4.5rem] w-14 shrink-0 overflow-hidden border border-[var(--border)] bg-[var(--bg-sunken)]">
        {hasImage ? (
          <Image src={line.image} alt="" fill sizes="56px" className="object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center">
            <VayroMark size={14} className="text-[var(--fg-subtle)]" />
          </span>
        )}
        <span className="t-spec absolute -top-px -right-px inline-flex h-5 min-w-[1.25rem] items-center justify-center bg-[var(--fg)] px-1 text-[0.625rem] leading-none tracking-normal text-[var(--bg)]">
          {line.quantity}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="t-body-sm truncate text-[var(--fg)]">{line.name}</p>
          <p className="t-spec mt-1 truncate text-[var(--fg-subtle)]">
            {line.colorway} / {line.size}
          </p>
        </div>
        <p className="t-body-sm shrink-0 tabular-nums text-[var(--fg)]">
          {formatPrice(line.unitPrice * line.quantity, line.currency)}
        </p>
      </div>
    </li>
  );
}

function SummaryRow({
  label,
  value,
  tone = 'default',
  muted = false,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'positive';
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="t-body-sm text-[var(--fg-muted)]">{label}</dt>
      <dd
        className={cn(
          't-body-sm tabular-nums',
          tone === 'positive'
            ? 'text-[var(--positive)]'
            : muted
              ? 'text-[var(--fg-subtle)]'
              : 'text-[var(--fg)]',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
