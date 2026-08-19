'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Drawer } from '@/components/ui/Drawer';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { VayroLockup, VayroMark } from '@/components/brand';
import { cn } from '@/lib/utils';

/* ==========================================================================
   Admin navigation.
   A quiet rail: hairline rules, uppercase labels, a single active marker. It
   carries the VAYRO identity (mark, type scale, tokens) but behaves like a
   tool — no animation on hover beyond a colour change, nothing that moves
   while you are reading a table.
   ========================================================================== */

type NavItem = { href: string; label: string; hint: string };
type NavGroup = { title: string; items: NavItem[] };

export const ADMIN_NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard', hint: 'Revenue, orders and stock at a glance' },
      { href: '/admin/analytics', label: 'Analytics', hint: 'Traffic and the conversion funnel' },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { href: '/admin/products', label: 'Products', hint: 'Create, edit and publish' },
      { href: '/admin/inventory', label: 'Inventory', hint: 'Stock levels by SKU' },
      { href: '/admin/content', label: 'Content', hint: 'Journal, featured and homepage' },
    ],
  },
  {
    title: 'Commerce',
    items: [
      { href: '/admin/orders', label: 'Orders', hint: 'Fulfilment and status' },
      { href: '/admin/customers', label: 'Customers', hint: 'Profiles and order history' },
    ],
  },
  {
    title: 'System',
    items: [{ href: '/admin/settings', label: 'Settings', hint: 'Store, shipping, tax and integrations' }],
  },
];

function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavList({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Admin" className="flex flex-col gap-8">
      {ADMIN_NAV.map((group) => (
        <div key={group.title}>
          <p className="t-label-sm px-5 text-[var(--fg-subtle)]">{group.title}</p>
          <ul className="mt-3 flex flex-col">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'relative flex items-center gap-3 py-2.5 pr-5 pl-5',
                      't-body-sm transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                      active
                        ? 'bg-[color-mix(in_oklab,var(--fg)_6%,transparent)] text-[var(--fg)]'
                        : 'text-[var(--fg-muted)] hover:bg-[color-mix(in_oklab,var(--fg)_4%,transparent)] hover:text-[var(--fg)]',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'absolute inset-y-0 left-0 w-[2px] transition-opacity duration-[var(--d-fast)]',
                        active ? 'bg-[var(--fg)] opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function RailFooter({ email }: { email: string }) {
  return (
    <div className="border-t border-[var(--border)] px-5 py-4">
      <p className="t-label-sm text-[var(--fg-subtle)]">Signed in</p>
      <p className="t-caption mt-1.5 truncate text-[var(--fg-muted)]" title={email}>{email}</p>
      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          href="/"
          className="t-label-sm inline-flex items-center gap-2 text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          <VayroMark size={14} />
          View store
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
}

export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--border)] px-5">
        <Link href="/admin" aria-label="VAYRO admin — dashboard" className="inline-flex items-center gap-3">
          <VayroLockup cap={12} />
          <span className="t-label-sm border-l border-[var(--border)] pl-3 text-[var(--fg-subtle)]">Admin</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto py-7">
        <NavList pathname={pathname} />
      </div>
      <RailFooter email={email} />
    </div>
  );
}

/** Mobile bar: brand, current section, and a sheet holding the same nav. */
export function AdminMobileBar({ email }: { email: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const current = ADMIN_NAV.flatMap((group) => group.items).find((item) => isActive(pathname, item.href));

  return (
    <>
      <div className="flex h-14 items-center justify-between gap-4 border-b border-[var(--border)] bg-[var(--bg-elevated)] px-[var(--gutter)] lg:hidden">
        <Link href="/admin" aria-label="VAYRO admin — dashboard" className="inline-flex items-center gap-2.5">
          <VayroMark size={20} />
          <span className="t-label-sm text-[var(--fg-subtle)]">Admin</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="t-label-sm inline-flex items-center gap-2.5 border border-[var(--border-strong)] px-3 py-2 text-[var(--fg)] transition-colors duration-[var(--d-fast)] hover:bg-[color-mix(in_oklab,var(--fg)_6%,transparent)]"
        >
          {current?.label ?? 'Menu'}
          <span aria-hidden className="text-[var(--fg-subtle)]">▾</span>
        </button>
      </div>

      <Drawer open={open} onClose={() => setOpen(false)} side="left" size="sm" title="Admin navigation">
        <div className="py-6">
          <NavList pathname={pathname} onNavigate={() => setOpen(false)} />
          <div className="mt-8">
            <RailFooter email={email} />
          </div>
        </div>
      </Drawer>
    </>
  );
}
