'use client';

import Link from 'next/link';
import { motion } from 'motion/react';
import { ArrowUpRight, Heart, Search, ShoppingBag, User } from 'lucide-react';
import { cn, formatPrice } from '@/lib/utils';
import { clipText, fadeUp, staggerText } from '@/lib/motion';
import { SHIPPING_FREE_THRESHOLD } from '@/store/cart';
import { Drawer } from '@/components/ui/Drawer';
import { VayroLockup } from '@/components/brand';
import { ThemeToggle } from '@/components/layout/ThemeToggle';

/* ==========================================================================
   MobileMenu — the full-bleed drawer behind the hamburger.
   Numbered, masked, staggered. It reads like a contents page, not a dropdown.
   ========================================================================== */

export type NavItem = { href: string; label: string; note?: string };

const UTILITIES = [
  { href: '/account', label: 'Account', Icon: User },
  { href: '/wishlist', label: 'Wishlist', Icon: Heart },
  { href: '/cart', label: 'Cart', Icon: ShoppingBag },
] as const;

export function MobileMenu({
  open,
  onClose,
  links,
  onSearch,
  activePath,
  cartCount,
  wishlistCount,
  showCounts,
}: {
  open: boolean;
  onClose: () => void;
  links: NavItem[];
  onSearch: () => void;
  activePath: string;
  cartCount: number;
  wishlistCount: number;
  /** False until the persisted stores have hydrated — keeps SSR output stable. */
  showCounts: boolean;
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      side="right"
      size="full"
      label="Menu"
      showClose={false}
      bodyClassName="flex flex-col"
      header={
        <div className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] px-[var(--gutter)] py-4">
          <Link href="/" onClick={onClose} aria-label="VAYRO — home" className="inline-flex">
            <VayroLockup cap={13} />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="t-label-sm -mr-1 inline-flex h-10 items-center gap-2.5 px-1 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
          >
            Close
            <span aria-hidden className="relative block h-3 w-3">
              <span className="absolute top-1/2 left-0 h-px w-full rotate-45 bg-current" />
              <span className="absolute top-1/2 left-0 h-px w-full -rotate-45 bg-current" />
            </span>
          </button>
        </div>
      }
    >
      <motion.div
        variants={staggerText}
        initial="hidden"
        animate="show"
        className="flex min-h-full flex-col"
      >
        {/* ---------------------------------------------------- primary nav */}
        <nav aria-label="Primary" className="px-[var(--gutter)] pt-8">
          <ul>
            {links.map((item, index) => {
              const active = activePath === item.href || activePath.startsWith(`${item.href}/`);
              return (
                <li key={item.href} className="border-b border-[var(--border)]">
                  <Link
                    href={item.href}
                    onClick={onClose}
                    aria-current={active ? 'page' : undefined}
                    className="group flex items-baseline gap-5 py-4"
                  >
                    <span className="t-spec w-6 shrink-0 text-[var(--fg-subtle)]">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="block flex-1 overflow-hidden">
                      <motion.span
                        variants={clipText}
                        className={cn(
                          't-display-md -mb-[0.1em] block pb-[0.1em] transition-colors duration-[var(--d-fast)]',
                          active ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)] group-hover:text-[var(--fg)]',
                        )}
                      >
                        {item.label}
                      </motion.span>
                    </span>
                    <ArrowUpRight
                      size={18}
                      strokeWidth={1.25}
                      strokeLinecap="square"
                      strokeLinejoin="miter"
                      aria-hidden
                      className="shrink-0 self-center text-[var(--fg-subtle)] transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* ------------------------------------------------------ utilities */}
        <motion.div variants={fadeUp} className="px-[var(--gutter)] pt-10">
          <p className="t-label-sm mb-4 text-[var(--fg-subtle)]">Your VAYRO</p>
          <ul className="grid grid-cols-2 gap-px overflow-hidden border border-[var(--border)] bg-[var(--border)]">
            <li className="col-span-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSearch();
                }}
                className="flex w-full items-center gap-3 bg-[var(--bg)] px-4 py-4 text-left transition-colors duration-[var(--d-fast)] hover:bg-[var(--bg-elevated)]"
              >
                <Search size={16} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden className="text-[var(--fg-subtle)]" />
                <span className="t-label flex-1">Search</span>
              </button>
            </li>
            {UTILITIES.map(({ href, label, Icon }) => {
              const count =
                label === 'Cart' ? cartCount : label === 'Wishlist' ? wishlistCount : 0;
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    className="flex h-full items-center gap-3 bg-[var(--bg)] px-4 py-4 transition-colors duration-[var(--d-fast)] hover:bg-[var(--bg-elevated)]"
                  >
                    <Icon size={16} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden className="text-[var(--fg-subtle)]" />
                    <span className="t-label flex-1">{label}</span>
                    {showCounts && count > 0 ? (
                      <span className="t-spec text-[var(--fg-muted)]">{count}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
            <li>
              <div className="flex h-full items-center gap-1 bg-[var(--bg)] px-3 py-2">
                <ThemeToggle withLabel />
              </div>
            </li>
          </ul>
        </motion.div>

        {/* ---------------------------------------------------------- close */}
        <motion.div
          variants={fadeUp}
          className="mt-auto border-t border-[var(--border)] px-[var(--gutter)] py-6"
        >
          <p className="t-label-sm text-[var(--fg-subtle)]">Engineered for the way forward</p>
          <p className="t-caption mt-2 text-[var(--fg-subtle)]">
            Free shipping over {formatPrice(SHIPPING_FREE_THRESHOLD)}. 30-day exchanges.
          </p>
        </motion.div>
      </motion.div>
    </Drawer>
  );
}
