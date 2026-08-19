'use client';

import { useCallback, useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';
import { useCart } from '@/store/cart';
import { useToast } from '@/components/ui/Toast';

/* ==========================================================================
   DiscountField — one code entry, shared by the cart page and the checkout
   summary so a code applied in either place is the same code.
   ========================================================================== */

export type DiscountFieldProps = {
  /** Hides the field behind a link until asked for. */
  collapsible?: boolean;
  className?: string;
};

export function DiscountField({ collapsible = false, className }: DiscountFieldProps) {
  const discountCode = useCart((state) => state.discountCode);
  const discountPercent = useCart((state) => state.discountPercent);
  const applyDiscount = useCart((state) => state.applyDiscount);
  const clearDiscount = useCart((state) => state.clearDiscount);
  const { toast } = useToast();

  const id = useId();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(!collapsible);

  const submit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = value.trim();
      if (!trimmed) {
        setError('Enter a code first.');
        return;
      }
      const result = applyDiscount(trimmed);
      if (result.ok) {
        setValue('');
        setError(null);
        toast({ title: 'Discount applied', description: result.message, tone: 'success' });
      } else {
        setError(result.message);
      }
    },
    [applyDiscount, toast, value],
  );

  if (discountCode) {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-4 border border-[var(--border)] px-4 py-3',
          className,
        )}
      >
        <p className="t-label-sm min-w-0 truncate text-[var(--fg)]">
          {discountCode}
          <span className="ml-2 text-[var(--positive)]">−{discountPercent}%</span>
        </p>
        <button
          type="button"
          onClick={() => {
            clearDiscount();
            setError(null);
          }}
          className="t-caption shrink-0 text-[var(--fg-subtle)] underline underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          Remove
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          't-label-sm text-[var(--fg-subtle)] underline decoration-[var(--border-strong)] underline-offset-4',
          'transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]',
          className,
        )}
      >
        Add a discount code
      </button>
    );
  }

  return (
    <form onSubmit={submit} className={className} noValidate>
      <label htmlFor={id} className="t-label-sm block text-[var(--fg-subtle)]">
        Discount code
      </label>
      <div className="mt-2 flex items-end gap-3">
        <input
          id={id}
          name="discount"
          value={value}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="done"
          onChange={(event) => {
            setValue(event.target.value);
            setError(null);
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="t-spec w-full min-w-0 flex-1 border-b border-[var(--border-strong)] bg-transparent py-2 tracking-[0.14em] uppercase transition-colors duration-[var(--d-fast)] focus:border-[var(--fg)] focus:outline-none aria-[invalid=true]:border-[var(--danger)]"
        />
        <button
          type="submit"
          className="t-label-sm shrink-0 border-b border-[var(--border-strong)] py-2 text-[var(--fg)] transition-colors duration-[var(--d-fast)] hover:border-[var(--fg)]"
        >
          Apply
        </button>
      </div>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            id={`${id}-error`}
            role="alert"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto', transition: t.fast }}
            exit={{ opacity: 0, height: 0, transition: t.fast }}
            className="t-caption overflow-hidden text-[var(--danger)]"
          >
            <span className="block pt-2">{error}</span>
          </motion.p>
        ) : null}
      </AnimatePresence>
    </form>
  );
}
