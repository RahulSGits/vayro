'use client';

import { cn, formatPrice } from '@/lib/utils';
import { SHIPPING_FREE_THRESHOLD } from '@/store/cart';
import type { Currency } from '@/types';

/* ==========================================================================
   TrustRow — three plain facts, stated once.

   No badges, no seals, no invented guarantees. Every line here is a policy
   the storefront already publishes in the footer.
   ========================================================================== */

const ITEMS = [
  {
    title: 'Shipping',
    path: 'M1 5h10v9H1zM11 8h4l3 3v3h-7zM5 14.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0M13 14.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 1 0-3 0',
  },
  {
    title: 'Returns',
    path: 'M3 8a7 7 0 1 1 1.5 4.4M3 3v5h5',
  },
  {
    title: 'Secure checkout',
    path: 'M5 10V7a5 5 0 0 1 10 0v3M4 10h12v9H4z',
  },
] as const;

export type TrustRowProps = {
  currency?: Currency;
  className?: string;
};

export function TrustRow({ currency = 'INR', className }: TrustRowProps) {
  const bodies = [
    `Free above ${formatPrice(SHIPPING_FREE_THRESHOLD, currency)}. Dispatched within two working days.`,
    'Unworn, with tags, within 30 days of delivery.',
    'Encrypted payment. Card details never touch our servers.',
  ];

  return (
    <ul className={cn('grid gap-px border-t border-[var(--border)] sm:grid-cols-3', className)}>
      {ITEMS.map((item, index) => (
        <li
          key={item.title}
          className="flex gap-4 border-b border-[var(--border)] py-6 sm:border-b-0 sm:pr-6"
        >
          <svg
            viewBox="0 0 20 20"
            width={18}
            height={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={1}
            strokeLinecap="square"
            strokeLinejoin="miter"
            aria-hidden
            className="mt-0.5 shrink-0 text-[var(--fg-subtle)]"
          >
            <path d={item.path} />
          </svg>
          <div className="min-w-0">
            <p className="t-label-sm text-[var(--fg)]">{item.title}</p>
            <p className="t-caption t-pretty mt-2 text-[var(--fg-muted)]">{bodies[index]}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
