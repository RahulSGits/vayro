'use client';

import { useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';
import { Minus, Plus } from 'lucide-react';
import { cn, formatPrice, pluralise } from '@/lib/utils';
import { t } from '@/lib/motion';
import { useCart } from '@/store/cart';
import { useWishlist } from '@/store/wishlist';
import { useToast } from '@/components/ui/Toast';
import { VayroMark } from '@/components/brand';
import type { CartLine } from '@/types';

/* ==========================================================================
   CartLineItem — one piece of equipment in the bag.

   The same row serves the drawer and the cart page; `variant` only changes
   the density and which secondary controls are offered. Quantity and removal
   write straight to the store, so every surface showing this row stays in
   agreement without lifting state.
   ========================================================================== */

export type CartLineItemVariant = 'compact' | 'expanded';

export type CartLineItemProps = {
  line: CartLine;
  /** `compact` for the drawer, `expanded` for the cart page. */
  variant?: CartLineItemVariant;
  /** Renders as a static summary — no stepper, no removal. Used at review. */
  readOnly?: boolean;
  /** Called when a link inside the row navigates. Closes the drawer. */
  onNavigate?: () => void;
  /** Hides the save-for-later control even in the expanded variant. */
  allowSaveForLater?: boolean;
  className?: string;
};

export function CartLineItem({
  line,
  variant = 'compact',
  readOnly = false,
  onNavigate,
  allowSaveForLater = true,
  className,
}: CartLineItemProps) {
  const setQuantity = useCart((state) => state.setQuantity);
  const remove = useCart((state) => state.remove);
  const toggleWishlist = useWishlist((state) => state.toggle);
  const inWishlist = useWishlist((state) => state.ids.includes(line.productId));
  const { toast } = useToast();
  const router = useRouter();

  const expanded = variant === 'expanded';
  const atMax = line.quantity >= line.maxQuantity;
  const lineTotal = line.unitPrice * line.quantity;
  const hasImage = line.image.startsWith('/');

  const saveForLater = useCallback(() => {
    if (!inWishlist) toggleWishlist(line.productId);
    remove(line.id);
    toast({
      title: 'Moved to wishlist',
      description: `${line.name} — ${line.colorway}, ${line.size}.`,
      tone: 'default',
      action: { label: 'View wishlist', onClick: () => router.push('/wishlist') },
    });
  }, [inWishlist, toggleWishlist, line, remove, toast, router]);

  return (
    <motion.li
      layout="position"
      initial={false}
      exit={{
        opacity: 0,
        height: 0,
        paddingTop: 0,
        paddingBottom: 0,
        overflow: 'hidden',
        transition: t.fast,
      }}
      className={cn(
        'flex border-b border-[var(--border)]',
        expanded ? 'gap-5 py-7 sm:gap-8 sm:py-9' : 'gap-5 py-6',
        className,
      )}
    >
      {/* -------------------------------------------------------- media -- */}
      <Link
        href={`/products/${line.slug}`}
        onClick={onNavigate}
        tabIndex={-1}
        aria-hidden
        data-cursor="product"
        className={cn(
          'group relative block shrink-0 overflow-hidden bg-[var(--bg-sunken)]',
          expanded
            ? 'h-32 w-[6.25rem] sm:h-44 sm:w-[8.75rem]'
            : 'h-[7.5rem] w-24',
        )}
      >
        {hasImage ? (
          <Image
            src={line.image}
            alt=""
            fill
            sizes={expanded ? '(min-width: 640px) 140px, 100px' : '96px'}
            className="object-cover transition-transform duration-[var(--d-slow)] ease-[var(--e-out)] group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex h-full items-center justify-center">
            <VayroMark size={20} className="text-[var(--fg-subtle)]" />
          </span>
        )}
      </Link>

      {/* --------------------------------------------------------- body -- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href={`/products/${line.slug}`}
              onClick={onNavigate}
              data-cursor="product"
              className={cn(
                'block truncate text-[var(--fg)] transition-opacity duration-[var(--d-fast)] hover:opacity-70',
                expanded && 't-h3',
              )}
            >
              {line.name}
            </Link>

            <p className="t-spec mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[var(--fg-subtle)]">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 border border-[var(--border-strong)]"
                style={{ background: line.colorHex }}
              />
              {line.colorway}
              <span aria-hidden className="text-[var(--border-strong)]">
                /
              </span>
              {line.size}
            </p>

            {expanded ? (
              <p className="t-caption mt-3 text-[var(--fg-subtle)]">
                {formatPrice(line.unitPrice, line.currency)} each
              </p>
            ) : null}
          </div>

          <p className="t-price shrink-0 text-[var(--fg)]">
            {formatPrice(lineTotal, line.currency)}
          </p>
        </div>

        {readOnly ? (
          <p className="t-spec mt-auto pt-4 text-[var(--fg-muted)]">
            Qty {line.quantity}
          </p>
        ) : (
          <div
            className={cn(
              'mt-auto flex flex-wrap items-end justify-between gap-x-4 gap-y-3',
              expanded ? 'pt-6' : 'pt-5',
            )}
          >
            <div className="inline-flex items-center border border-[var(--border)]">
              <StepperButton
                label={`Decrease quantity of ${line.name}`}
                onClick={() => setQuantity(line.id, line.quantity - 1)}
              >
                <Minus
                  size={13}
                  strokeWidth={1.25}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  aria-hidden
                />
              </StepperButton>
              <span className="t-spec w-8 text-center text-[var(--fg)]">
                <span className="sr-only">Quantity: </span>
                {line.quantity}
              </span>
              <StepperButton
                label={`Increase quantity of ${line.name}`}
                disabled={atMax}
                onClick={() => setQuantity(line.id, line.quantity + 1)}
              >
                <Plus
                  size={13}
                  strokeWidth={1.25}
                  strokeLinecap="square"
                  strokeLinejoin="miter"
                  aria-hidden
                />
              </StepperButton>
            </div>

            <div className="flex items-center gap-4">
              {expanded && allowSaveForLater ? (
                <RowAction onClick={saveForLater}>Save for later</RowAction>
              ) : null}
              <RowAction danger onClick={() => remove(line.id)}>
                Remove
              </RowAction>
            </div>
          </div>
        )}

        {/* Stock is stated, never dressed up as scarcity marketing. */}
        {!readOnly && atMax ? (
          <p className="t-caption mt-2.5 text-[var(--fg-subtle)]">
            {pluralise(line.maxQuantity, 'unit')} available in this size.
          </p>
        ) : null}
      </div>
    </motion.li>
  );
}

/* ---------------------------------------------------------------- pieces -- */

function StepperButton({
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

function RowAction({
  onClick,
  danger,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        't-label-sm underline decoration-[var(--border-strong)] underline-offset-4',
        'text-[var(--fg-subtle)] transition-colors duration-[var(--d-fast)]',
        danger
          ? 'hover:text-[var(--danger)] hover:decoration-[var(--danger)]'
          : 'hover:text-[var(--fg)] hover:decoration-[var(--fg)]',
      )}
    >
      {children}
    </button>
  );
}
