import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { ACCOUNT_NAV, AccountNav } from '@/components/account/AccountNav';
import { SignOutButton } from '@/components/account/SignOutButton';
import { DemoDataBanner } from '@/components/account/AccountShell';

export const metadata: Metadata = {
  title: { default: 'Account', template: '%s — Account — VAYRO' },
  robots: { index: false, follow: false },
};

/**
 * The account is server-guarded at the layout, and again inside every page
 * that reads data. The proxy redirect is a courtesy; this is the boundary.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const { profile, demo } = await requireUser({ next: '/account' });

  const name = profile.fullName?.trim() || profile.email.split('@')[0];
  const nav = profile.role === 'admin'
    ? [...ACCOUNT_NAV, { href: '/admin', label: 'Admin' }]
    : ACCOUNT_NAV;

  return (
    <div className="shell section-tight">
      <header className="flex flex-wrap items-end justify-between gap-x-10 gap-y-6">
        <div className="min-w-0">
          <p className="t-label-sm text-[var(--fg-subtle)]">Account</p>
          <h1 className="t-display-md t-balance mt-4 break-words">{name}</h1>
          <p className="t-spec mt-4 text-[var(--fg-muted)]">{profile.email}</p>
        </div>

        <div className="flex items-center gap-8">
          <Link
            href="/shop"
            data-cursor="link"
            className="t-label text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
          >
            Continue shopping
          </Link>
          <SignOutButton />
        </div>
      </header>

      {demo ? (
        <div className="mt-12">
          <DemoDataBanner what="the account area" />
        </div>
      ) : null}

      <div className="mt-14 grid gap-x-[var(--gutter)] gap-y-10 lg:mt-20 lg:grid-cols-[minmax(0,13rem)_minmax(0,1fr)]">
        <AccountNav items={nav} />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
