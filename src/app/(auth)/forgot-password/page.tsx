import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession, isDemoAuth } from '@/lib/auth';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = {
  title: 'Reset password',
  description: 'Request a password reset link for your VAYRO account.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/forgot-password' },
};

export default async function ForgotPasswordPage() {
  const demoMode = isDemoAuth();
  if (!demoMode && (await getSession())) redirect('/account/settings');

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <p className="t-label-sm text-[var(--fg-subtle)]">Recovery</p>
        <h1 className="t-display-md t-balance">Reset password</h1>
        <p className="t-body-lg t-pretty max-w-[25rem] text-[var(--fg-muted)]">
          Enter the address on the account. We will send a single-use link.
        </p>
      </header>

      <ForgotPasswordForm demoMode={demoMode} />
    </div>
  );
}
