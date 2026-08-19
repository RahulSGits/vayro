'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { Heart, Search, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';
import { layout, z as zIndex } from '@/lib/design-tokens';
import { useCart, selectCount } from '@/store/cart';
import { useWishlist } from '@/store/wishlist';
import { VayroLockup, VayroMark } from '@/components/brand';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { MobileMenu, type NavItem } from '@/components/navigation/MobileMenu';
import { SearchOverlay } from '@/components/navigation/SearchOverlay';

/* ==========================================================================
   Header — the first thing anyone sees.

   Over the homepage hero it is glass: no background, ivory tokens, no rule.
   Past 60px, or on any other route, it settles onto the surface, gains its
   hairline, and compacts. The two states share one element so the transition
   is a genuine settle rather than a swap.
   ========================================================================== */

export const NAV: NavItem[] = [
  { href: '/shop', label: 'Shop' },
  { href: '/collections', label: 'Collections' },
  { href: '/technology', label: 'Technology' },
  { href: '/story', label: 'Story' },
  { href: '/journal', label: 'Journal' },
];

const SCROLL_ENTER = 60;
const SCROLL_EXIT = 24;

const noopSubscribe = () => () => {};

/**
 * False during the hydration render, true afterwards. The cart and wishlist
 * stores rehydrate from localStorage before React runs, so counts must stay
 * hidden for exactly one render or the markup will not match the server.
 */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * Ivory token overlay for the transparent state. Declared with palette vars so
 * the header reads correctly over a dark hero plate in either theme.
 */
const OVERLAY_TOKENS = {
  '--bg': 'var(--ink)',
  '--bg-elevated': 'var(--ink-80)',
  '--fg': 'var(--ivory)',
  '--fg-muted': 'color-mix(in srgb, var(--ivory) 74%, transparent)',
  '--fg-subtle': 'color-mix(in srgb, var(--ivory) 52%, transparent)',
  '--border': 'color-mix(in srgb, var(--ivory) 16%, transparent)',
  '--border-strong': 'color-mix(in srgb, var(--ivory) 34%, transparent)',
} as React.CSSProperties;

export function Header() {
  const pathname = usePathname();
  const isHome = pathname === '/';

  const [scrolled, setScrolled] = useState(false);
  const mounted = useHydrated();

  // One transient surface at a time, stamped with the route it was opened on.
  // Navigating therefore dismisses it without a synchronising effect.
  const [overlay, setOverlay] = useState<{ kind: 'menu' | 'search' | null; at: string }>({
    kind: null,
    at: pathname,
  });
  const menuOpen = overlay.kind === 'menu' && overlay.at === pathname;
  const searchOpen = overlay.kind === 'search' && overlay.at === pathname;

  const closeOverlay = useCallback(() => setOverlay({ kind: null, at: pathname }), [pathname]);
  const openMenu = useCallback(() => setOverlay({ kind: 'menu', at: pathname }), [pathname]);
  const openSearch = useCallback(() => setOverlay({ kind: 'search', at: pathname }), [pathname]);
  const setSearchOpen = useCallback(
    (next: boolean) => setOverlay({ kind: next ? 'search' : null, at: pathname }),
    [pathname],
  );

  const cartCount = useCart(selectCount);
  const setCartOpen = useCart((state) => state.setOpen);
  const wishlistCount = useWishlist((state) => state.ids.length);

  /* ------------------------------------------------------------- scroll */
  useEffect(() => {
    // Hysteresis: it takes 60px to settle, but only returns to glass near the
    // very top, so the header never flickers around a single threshold.
    // React bails out when the value is unchanged, so this stays cheap.
    const read = () => {
      const y = window.scrollY;
      setScrolled((current) => (current ? y > SCROLL_EXIT : y > SCROLL_ENTER));
    };
    // Deferred so a reload part-way down the page settles into the solid state.
    const initial = window.setTimeout(read, 0);
    window.addEventListener('scroll', read, { passive: true });
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener('scroll', read);
    };
  }, []);

  const openCart = useCallback(() => setCartOpen(true), [setCartOpen]);

  const transparent = isHome && !scrolled;
  const height = scrolled ? layout.headerHSm : layout.headerH;

  return (
    <>
      <header
        data-transparent={transparent ? 'true' : undefined}
        style={{
          zIndex: zIndex.header,
          paddingRight: 'var(--scrollbar-gap, 0px)',
          ...(transparent ? OVERLAY_TOKENS : null),
        }}
        className={cn(
          'fixed inset-x-0 top-0 text-[var(--fg)]',
          'transition-[background-color,border-color,backdrop-filter] duration-[var(--d-standard)] ease-[var(--e-out)]',
          transparent
            ? 'border-b border-transparent bg-transparent'
            : 'border-b border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_86%,transparent)] backdrop-blur-xl',
        )}
      >
        <div
          className="shell flex items-center justify-between gap-6"
          style={{ height, transition: 'height var(--d-standard) var(--e-out)' }}
        >
          {/* ------------------------------------------------------ brand */}
          <Link
            href="/"
            aria-label="VAYRO — home"
            data-cursor="link"
            className="group -my-2 inline-flex shrink-0 items-center py-2"
          >
            <span className="hidden lg:inline-flex">
              <VayroLockup cap={scrolled ? 13 : 15} className="transition-opacity duration-[var(--d-fast)] group-hover:opacity-70" />
            </span>
            <span className="inline-flex lg:hidden">
              <VayroMark size={26} cut="regular" className="transition-opacity duration-[var(--d-fast)] group-hover:opacity-70" />
            </span>
          </Link>

          {/* -------------------------------------------------------- nav */}
          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {NAV.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    label={item.label}
                    active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  />
                </li>
              ))}
            </ul>
          </nav>

          {/* ---------------------------------------------------- utility */}
          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <button
              type="button"
              onClick={openSearch}
              data-cursor="link"
              aria-label="Search"
              aria-haspopup="dialog"
              className="group hidden h-10 items-center gap-2.5 px-3 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:text-[var(--fg)] xl:inline-flex"
            >
              <Search size={16} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
              <span className="t-label-sm">Search</span>
              <kbd className="t-spec ml-1 border border-[var(--border)] px-1.5 py-0.5 text-[0.5625rem] leading-none opacity-70">
                ⌘K
              </kbd>
            </button>

            <IconAction onClick={openSearch} label="Search" className="xl:hidden">
              <Search size={17} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
            </IconAction>

            <span aria-hidden className="mx-2 hidden h-4 w-px bg-[var(--border)] xl:block" />

            <IconLink href="/account" label="Account" className="hidden sm:inline-flex">
              <User size={17} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
            </IconLink>

            <IconLink
              href="/wishlist"
              label="Wishlist"
              count={mounted ? wishlistCount : 0}
              className="hidden sm:inline-flex"
            >
              <Heart size={17} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
            </IconLink>

            <IconAction
              onClick={openCart}
              label="Cart"
              count={mounted ? cartCount : 0}
              cursor="add-to-cart"
              expanded
            >
              <ShoppingBag size={17} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
            </IconAction>

            <span aria-hidden className="mx-1 hidden h-4 w-px bg-[var(--border)] lg:block" />

            <ThemeToggle className="hidden lg:inline-flex" />

            <button
              type="button"
              onClick={openMenu}
              aria-label="Open menu"
              aria-expanded={menuOpen}
              aria-haspopup="dialog"
              data-cursor="link"
              className="group -mr-2 inline-flex h-10 w-10 items-center justify-center text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)] lg:hidden"
            >
              <span aria-hidden className="relative block h-3 w-[18px]">
                <span className="absolute top-0 left-0 h-px w-full bg-current transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:translate-y-px" />
                <span className="absolute bottom-0 left-0 h-px w-full bg-current transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:-translate-y-px" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Fixed chrome needs its space back on every route that is not the
          full-bleed homepage hero. */}
      {isHome ? null : <div aria-hidden style={{ height: layout.headerH }} />}

      <MobileMenu
        open={menuOpen}
        onClose={closeOverlay}
        links={NAV}
        activePath={pathname}
        onSearch={openSearch}
        cartCount={mounted ? cartCount : 0}
        wishlistCount={mounted ? wishlistCount : 0}
        showCounts={mounted}
      />

      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

/* ---------------------------------------------------------------- pieces -- */

/** Nav item with a rolling label and a travelling underline for the active route. */
function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      data-cursor="link"
      className={cn(
        'group relative block py-1.5 transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
        active ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]',
      )}
    >
      <span className="t-label relative block overflow-hidden">
        <span className="block transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:-translate-y-full">
          {label}
        </span>
        <span
          aria-hidden
          className="absolute inset-0 block translate-y-full transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:translate-y-0"
        >
          {label}
        </span>
      </span>
      {active ? (
        <motion.span
          layoutId="vayro-nav-underline"
          transition={t.standard}
          aria-hidden
          className="absolute -bottom-1 left-0 h-px w-full bg-[var(--fg)]"
        />
      ) : null}
    </Link>
  );
}

function Count({ value }: { value: number }) {
  if (value <= 0) return null;
  return (
    <motion.span
      key={value}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, transition: t.fast }}
      aria-hidden
      className="t-spec absolute -top-0.5 -right-0.5 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-[var(--r-pill)] bg-[var(--fg)] px-1 text-[0.5rem] leading-none tracking-normal text-[var(--bg)]"
    >
      {value > 99 ? '99+' : value}
    </motion.span>
  );
}

const iconBase =
  'group relative inline-flex h-10 w-10 items-center justify-center text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:text-[var(--fg)]';

function IconLink({
  href,
  label,
  count = 0,
  className,
  children,
}: {
  href: string;
  label: string;
  count?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      data-cursor="link"
      aria-label={count > 0 ? `${label}, ${count} item${count === 1 ? '' : 's'}` : label}
      className={cn(iconBase, className)}
    >
      {children}
      <Count value={count} />
    </Link>
  );
}

function IconAction({
  onClick,
  label,
  count = 0,
  className,
  cursor = 'link',
  expanded,
  children,
}: {
  onClick: () => void;
  label: string;
  count?: number;
  className?: string;
  cursor?: string;
  /** Marks the control as opening a dialog surface. */
  expanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-cursor={cursor}
      aria-label={count > 0 ? `${label}, ${count} item${count === 1 ? '' : 's'}` : label}
      aria-haspopup={expanded ? 'dialog' : undefined}
      className={cn(iconBase, className)}
    >
      {children}
      <Count value={count} />
    </button>
  );
}
