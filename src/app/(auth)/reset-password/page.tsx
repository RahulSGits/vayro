import type { Metadata } from 'next';
import { isDemoAuth } from '@/lib/auth';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'New password',
  description: 'Choose a new password for your VAYRO account.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/reset-password' },
};

/**
 * The landing page for a recovery link. It is intentionally *not* covered by
 * the proxy's signed-in redirect: arriving here with a session is the normal
 * case — the callback route has just created a short-lived recovery session.
 */
export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <p className="t-label-sm text-[var(--fg-subtle)]">Recovery</p>
        <h1 className="t-display-md t-balance">New password</h1>
        <p className="t-body-lg t-pretty max-w-[25rem] text-[var(--fg-muted)]">
          Choose something you have not used elsewhere. The old password stops
          working the moment this is saved.
        </p>
      </header>

      <ResetPasswordForm demoMode={isDemoAuth()} />
    </div>
  );
}
