import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getOAuthProviders, getSession, isDemoAuth } from '@/lib/auth';
import { SignupForm } from '@/components/auth/SignupForm';
import { safeNext } from '@/components/auth/schemas';

export const metadata: Metadata = {
  title: 'Create account',
  description: 'Create a VAYRO account to track orders, save pieces and keep your addresses to hand.',
  robots: { index: false, follow: false },
  alternates: { canonical: '/signup' },
};

export default async function SignupPage(props: PageProps<'/signup'>) {
  const searchParams = await props.searchParams;

  const next = safeNext(typeof searchParams.next === 'string' ? searchParams.next : null);

  const demoMode = isDemoAuth();
  if (!demoMode && (await getSession())) redirect(next);

  return (
    <div className="flex flex-col gap-12">
      <header className="flex flex-col gap-4">
        <p className="t-label-sm text-[var(--fg-subtle)]">New account</p>
        <h1 className="t-display-md t-balance">Create account</h1>
        <p className="t-body-lg t-pretty max-w-[25rem] text-[var(--fg-muted)]">
          Three fields. Your order history and saved sizes follow you from there.
        </p>
      </header>

      <SignupForm providers={getOAuthProviders()} next={next} demoMode={demoMode} />
    </div>
  );
}
