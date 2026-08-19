import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getOAuthProviders, getSession, isDemoAuth } from '@/lib/auth';
import { LoginForm } from '@/components/auth/LoginForm';
import { AuthCallout } from '@/components/auth/AuthCallout';
import { safeNext } from '@/components/auth/schemas';

export const metadata: Metadata = {
  title: 'Sign in',
  description: 'Sign in to your VAYRO account to track orders, manage addresses and review saved pieces.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/login' },
};

/** Reasons another screen may have sent someone here, in the brand's voice. */
const NOTICES: Record<string, { label: string; body: string }> = {
  'signed-out': { label: 'Signed out', body: 'You have been signed out on this device.' },
  'session-expired': { label: 'Session expired', body: 'Sign in again to pick up where you left off.' },
  'callback-failed': { label: 'Link not accepted', body: 'That sign-in link could not be verified. Request a new one.' },
};

export default async function LoginPage(props: PageProps<'/login'>) {
  const searchParams = await props.searchParams;

  const nextParam = typeof searchParams.next === 'string' ? searchParams.next : null;
  const next = safeNext(nextParam);

  const demoMode = isDemoAuth();
  // Defence in depth: the proxy bounces signed-in visitors, but the page must
  // not rely on that. Demo mode has no session, so the screens stay reachable.
  if (!demoMode && (await getSession())) redirect(next);

  const noticeKey = typeof searchParams.notice === 'string' ? searchParams.notice : null;
  const notice = noticeKey ? NOTICES[noticeKey] : undefined;

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <p className="t-label-sm text-[var(--fg-subtle)]">Account</p>
        <h1 className="t-display-md t-balance">Sign in</h1>
        <p className="t-body-lg t-pretty max-w-[24rem] text-[var(--fg-muted)]">
          Orders, addresses and saved pieces, kept in one place.
        </p>
      </header>

      {notice ? (
        <AuthCallout tone="neutral" role="status" label={notice.label}>
          <p>{notice.body}</p>
        </AuthCallout>
      ) : null}

      {nextParam && next !== '/account' ? (
        <AuthCallout tone="neutral" label="Continue">
          <p>
            Sign in to carry on to <span className="t-spec">{next}</span>.
          </p>
        </AuthCallout>
      ) : null}

      <LoginForm providers={getOAuthProviders()} next={next} demoMode={demoMode} />
    </div>
  );
}
