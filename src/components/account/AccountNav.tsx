'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';

/* ==========================================================================
   AccountNav

   A hairline index, not a sidebar of buttons. On large screens it is a
   vertical list with a travelling rule; below `lg` it becomes a single
   horizontal scroller so the content keeps the full width.
   ========================================================================== */

export type AccountNavItem = { href: string; label: string; badge?: string };

export const ACCOUNT_NAV: AccountNavItem[] = [
  { href: '/account', label: 'Overview' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/settings', label: 'Settings' },
];

function useActive(href: string) {
  const pathname = usePathname();
  return href === '/account' ? pathname === '/account' : pathname.startsWith(href);
}

export function AccountNav({ items = ACCOUNT_NAV }: { items?: AccountNavItem[] }) {
  return (
    <nav aria-label="Account" className="lg:sticky lg:top-[calc(var(--header-h)+2rem)]">
      {/* ------------------------------------------------------- large up */}
      <ul className="hidden lg:block">
        {items.map((item) => (
          <li key={item.href}>
            <NavRow item={item} />
          </li>
        ))}
      </ul>

      {/* ----------------------------------------------------------- small */}
      <ul
        className="-mx-[var(--gutter)] flex gap-8 overflow-x-auto px-[var(--gutter)] pb-4 lg:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((item) => (
          <li key={item.href} className="shrink-0">
            <NavChip item={item} />
          </li>
        ))}
      </ul>
      <span aria-hidden className="rule block lg:hidden" />
    </nav>
  );
}

function NavRow({ item }: { item: AccountNavItem }) {
  const active = useActive(item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      data-cursor="link"
      className={cn(
        'group relative flex items-center justify-between gap-4 border-b border-[var(--border)] py-4 pl-4',
        'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
        active ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]',
      )}
    >
      {active ? (
        <motion.span
          layoutId="account-nav-rule"
          transition={t.standard}
          aria-hidden
          className="absolute top-0 bottom-px left-0 w-px bg-[var(--fg)]"
        />
      ) : (
        <span aria-hidden className="absolute top-0 bottom-px left-0 w-px bg-transparent" />
      )}
      <span className="t-label">{item.label}</span>
      {item.badge ? <span className="t-spec text-[var(--fg-subtle)]">{item.badge}</span> : null}
    </Link>
  );
}

function NavChip({ item }: { item: AccountNavItem }) {
  const active = useActive(item.href);
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative block py-2 transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
        active ? 'text-[var(--fg)]' : 'text-[var(--fg-subtle)]',
      )}
    >
      <span className="t-label whitespace-nowrap">{item.label}</span>
      {item.badge ? <span className="t-spec ml-2 text-[var(--fg-subtle)]">{item.badge}</span> : null}
      {active ? (
        <motion.span
          layoutId="account-nav-chip"
          transition={t.standard}
          aria-hidden
          className="absolute right-0 -bottom-px left-0 h-px bg-[var(--fg)]"
        />
      ) : null}
    </Link>
  );
}
