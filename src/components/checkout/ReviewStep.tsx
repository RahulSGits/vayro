'use client';

import Link from 'next/link';
import { AnimatePresence, motion } from 'motion/react';
import { cn, formatDate, formatPrice } from '@/lib/utils';
import { t } from '@/lib/motion';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Field';
import { Spinner } from '@/components/ui/States';
import { CartLineItem } from '@/components/cart/CartLineItem';
import type { CartLine, Currency } from '@/types';
import { StepActions, StepHeading } from './StepShell';
import type { PaymentMode } from './PaymentStep';
import {
  type AddressValues,
  type CheckoutTotals,
  type InformationValues,
  type ShippingMethodId,
  addressLines,
  methodFor,
} from './schema';

/* ==========================================================================
   Step 04 — Review.

   Everything agreed to, on one screen, with a route back to each decision.
   The order is only placed from here, and only once.
   ========================================================================== */

export type ReviewStepProps = {
  lines: CartLine[];
  totals: CheckoutTotals;
  currency: Currency;
  information: InformationValues;
  address: AddressValues;
  method: ShippingMethodId;
  billingSame: boolean;
  delivery: { earliest: string; latest: string } | null;
  mode: PaymentMode;
  notes: string;
  onNotesChange: (next: string) => void;
  placing: boolean;
  error: { title: string; body: string; reference?: string | null } | null;
  onEdit: (step: number) => void;
  onBack: () => void;
  onPlace: () => void;
};

export function ReviewStep({
  lines,
  totals,
  currency,
  information,
  address,
  method,
  billingSame,
  delivery,
  mode,
  notes,
  onNotesChange,
  placing,
  error,
  onEdit,
  onBack,
  onPlace,
}: ReviewStepProps) {
  const shipping = methodFor(method);

  return (
    <div data-checkout-step="4">
      <StepHeading index={4} title="Review" lede="Confirm the detail, then place the order." />

      <dl className="border-t border-[var(--border)]">
        <ReviewRow label="Contact" onEdit={() => onEdit(1)} editLabel="Edit contact details">
          <p className="text-[var(--fg)]">{information.email}</p>
          <p className="t-body-sm mt-1 text-[var(--fg-muted)]">{information.phone}</p>
        </ReviewRow>

        <ReviewRow label="Ship to" onEdit={() => onEdit(2)} editLabel="Edit delivery address">
          <address className="t-body-sm not-italic text-[var(--fg-muted)]">
            {addressLines(address).map((line, index) => (
              <span key={line} className={cn('block', index === 0 && 'text-[var(--fg)]')}>
                {line}
              </span>
            ))}
          </address>
        </ReviewRow>

        <ReviewRow label="Despatch" onEdit={() => onEdit(2)} editLabel="Edit despatch method">
          <p className="text-[var(--fg)]">
            {shipping.name}
            <span className="t-body-sm ml-3 text-[var(--fg-muted)]">
              {totals.shipping === 0 ? 'Free' : formatPrice(totals.shipping, currency)}
            </span>
          </p>
          {delivery ? (
            <p className="t-body-sm mt-1 text-[var(--fg-muted)]">
              Estimated {formatDate(delivery.earliest, { year: undefined })} –{' '}
              {formatDate(delivery.latest)}
            </p>
          ) : null}
        </ReviewRow>

        <ReviewRow label="Payment" onEdit={() => onEdit(3)} editLabel="Edit payment details">
          {mode === 'demo' ? (
            <>
              <p className="flex flex-wrap items-center gap-3 text-[var(--fg)]">
                Demo order
                <Badge tone="warning">No payment taken</Badge>
              </p>
              <p className="t-body-sm mt-1.5 text-[var(--fg-muted)]">
                No payment processor is configured in this environment.
              </p>
            </>
          ) : (
            <>
              <p className="text-[var(--fg)]">Card — processed by Stripe</p>
              <p className="t-body-sm mt-1 text-[var(--fg-muted)]">
                {billingSame
                  ? 'Billed to the delivery address.'
                  : 'Billed to the address entered in the payment form.'}
              </p>
            </>
          )}
        </ReviewRow>
      </dl>

      {/* --------------------------------------------------------- items -- */}
      <section className="mt-12">
        <h3 className="t-label text-[var(--fg-muted)]">
          In this order
          <Link
            href="/cart"
            className="t-label-sm ml-4 font-normal text-[var(--fg-subtle)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
          >
            Edit bag
          </Link>
        </h3>
        <ul className="mt-5 border-t border-[var(--border)]">
          {lines.map((line) => (
            <CartLineItem key={line.id} line={line} readOnly />
          ))}
        </ul>
      </section>

      {/* --------------------------------------------------------- notes -- */}
      <div className="mt-10">
        <label htmlFor="checkout-notes" className="t-label text-[var(--fg-muted)]">
          Delivery notes
          <span className="t-caption ml-3 font-normal normal-case tracking-normal text-[var(--fg-subtle)]">
            Optional
          </span>
        </label>
        <Textarea
          id="checkout-notes"
          name="notes"
          rows={3}
          maxLength={400}
          value={notes}
          placeholder="Gate code, reception hours, a landmark the courier will recognise."
          onChange={(event) => onNotesChange(event.target.value)}
          className="mt-3"
        />
      </div>

      {/* --------------------------------------------------------- error -- */}
      <AnimatePresence initial={false}>
        {error ? (
          <motion.div
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', transition: t.standard }}
            exit={{ opacity: 0, height: 0, transition: t.fast }}
            className="overflow-hidden"
          >
            <div className="mt-8 border border-[var(--danger)] bg-[var(--bg-elevated)] px-6 py-5">
              <p className="t-label-sm text-[var(--danger)]">{error.title}</p>
              <p className="t-body-sm t-pretty mt-2 text-[var(--fg-muted)]">{error.body}</p>
              {error.reference ? (
                <p className="t-spec mt-3 text-[var(--fg-subtle)]">
                  Reference {error.reference}
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <StepActions>
        <Button type="button" variant="quiet" size="lg" onClick={onBack} disabled={placing}>
          Back to payment
        </Button>
        <Button
          type="button"
          size="lg"
          onClick={onPlace}
          disabled={placing || lines.length === 0}
          className="sm:min-w-[16rem]"
        >
          {placing ? (
            <>
              <Spinner
                size={14}
                className="border-[color-mix(in_oklab,var(--bg)_40%,transparent)] border-t-[var(--bg)]"
              />
              {mode === 'demo' ? 'Placing order' : 'Authorising'}
            </>
          ) : (
            <>
              {mode === 'demo' ? 'Place demo order' : 'Place order'}
              <span aria-hidden className="ml-1 opacity-60">
                ·
              </span>
              {formatPrice(totals.total, currency)}
            </>
          )}
        </Button>
      </StepActions>

      <p className="t-caption t-pretty mt-6 text-[var(--fg-subtle)]">
        By placing this order you agree to the{' '}
        <Link href="/legal/terms" className="underline underline-offset-4 hover:text-[var(--fg)]">
          terms of sale
        </Link>{' '}
        and the{' '}
        <Link href="/legal/privacy" className="underline underline-offset-4 hover:text-[var(--fg)]">
          privacy policy
        </Link>
        . Returns are accepted unworn, with tags, within 30 days of delivery.
      </p>
    </div>
  );
}

/* ----------------------------------------------------------------- parts -- */

function ReviewRow({
  label,
  editLabel,
  onEdit,
  children,
}: {
  label: string;
  editLabel: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-2 border-b border-[var(--border)] py-5">
      <dt className="t-label w-full shrink-0 text-[var(--fg-subtle)] sm:w-28">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
      <button
        type="button"
        onClick={onEdit}
        aria-label={editLabel}
        className="t-label-sm shrink-0 text-[var(--fg-subtle)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
      >
        Edit
      </button>
    </div>
  );
}
