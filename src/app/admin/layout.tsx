import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { AdminMobileBar, AdminSidebar, DemoBanner } from '@/components/admin';
import { adminContext } from './_data/queries';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s — VAYRO Admin' },
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The admin shares the storefront's root layout (fonts, theme, toasts) but not
 * its chrome — a marketing header and footer around an operations tool is
 * noise. Rather than duplicate the root layout, the segment declares the
 * storefront furniture hidden for as long as it is mounted. Scoped to
 * `#vayro-admin`, so it reverts the moment you navigate back to the store.
 */
const HIDE_STOREFRONT_CHROME = `
  body:has(#vayro-admin) > header,
  body:has(#vayro-admin) > footer,
  body:has(#vayro-admin) > .skip-link { display: none !important; }
  body:has(#vayro-admin) > main { padding-block: 0 !important; }
`;

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  // Server-side authorisation for the whole segment. Every page and every
  // action re-checks independently — this is defence in depth, not the gate.
  const { profile } = await requireAdmin();
  const context = await adminContext();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: HIDE_STOREFRONT_CHROME }} />

      <div id="vayro-admin" className="min-h-dvh bg-[var(--bg)] lg:grid lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <a href="#admin-main" className="skip-link">Skip to admin content</a>

        <aside className="sticky top-0 hidden h-dvh border-r border-[var(--border)] bg-[var(--bg-elevated)] lg:block">
          <AdminSidebar email={profile.email} />
        </aside>

        <div className="min-w-0">
          <AdminMobileBar email={profile.email} />

          <main id="admin-main" className="shell-wide pb-24 lg:pb-20">
            {context.demo ? (
              <div className="pt-6">
                <DemoBanner message={context.message} />
              </div>
            ) : null}
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
