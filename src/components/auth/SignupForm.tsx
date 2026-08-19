'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Checkbox, Field, Input, Spinner } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { identify, track } from '@/lib/analytics';
import { AuthCallout, DemoAuthNotice } from './AuthCallout';
import { PasswordField } from './PasswordField';
import { AuthDivider, OAuthButtons } from './OAuthButtons';
import { fieldErrorsFrom, safeNext, signupSchema, type FieldErrors } from './schemas';
import type { OAuthProvider } from '@/lib/auth';

/* ==========================================================================
   SignupForm

   Two outcomes, both handled: a project with email confirmation on returns a
   user with no session and we show the "check your inbox" state; a project
   with confirmation off returns a live session and we go straight through.
   ========================================================================== */

function readableError(message: string): string {
  const value = message.toLowerCase();
  if (value.includes('already registered') || value.includes('already been registered')) {
    return 'An account already exists for this address. Sign in instead, or reset the password.';
  }
  if (value.includes('password')) return message;
  if (value.includes('rate limit') || value.includes('too many')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  return message;
}

export function SignupForm({
  providers,
  next,
  demoMode,
}: {
  providers: OAuthProvider[];
  next: string;
  demoMode: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [marketingOptIn, setMarketingOptIn] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const destination = safeNext(next);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = signupSchema.safeParse({ fullName, email, password, marketingOptIn });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setErrors({});

    const supabase = createClient();
    if (!supabase) {
      setFormError('Accounts are not available in this build — there is no Supabase project to create one in.');
      return;
    }

    setPending(true);
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          full_name: parsed.data.fullName,
          marketing_opt_in: parsed.data.marketingOptIn,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
    setPending(false);

    if (error) {
      setFormError(readableError(error.message));
      return;
    }

    track('signup', { method: 'password' });
    if (data.user) identify(data.user.id, { email: parsed.data.email });

    // No session means the project requires a confirmed address first.
    if (!data.session) {
      setAwaitingConfirmation(true);
      return;
    }

    startTransition(() => {
      router.replace(destination);
      router.refresh();
    });
  }

  if (awaitingConfirmation) {
    return (
      <div className="flex flex-col gap-8">
        <AuthCallout tone="positive" role="status" label="Check your inbox" title={`Confirmation sent to ${email}`}>
          <p>
            Open the link in that email to activate the account. It expires in
            24 hours; requesting another invalidates the first.
          </p>
        </AuthCallout>
        <p className="t-body-sm text-[var(--fg-muted)]">
          Wrong address?{' '}
          <button
            type="button"
            onClick={() => setAwaitingConfirmation(false)}
            className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:decoration-[var(--fg)]"
          >
            Go back and change it
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {demoMode ? <DemoAuthNotice action="Creating an account" /> : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
        <Field label="Name" error={errors.fullName} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="fullName"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              required
            />
          )}
        </Field>

        <Field label="Email" error={errors.email} required>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-describedby={describedBy}
              aria-invalid={invalid || undefined}
              required
            />
          )}
        </Field>

        <PasswordField
          label="Password"
          name="password"
          autoComplete="new-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          showStrength
        />

        <Checkbox
          label="Send me new releases and field notes. Occasional, never resold."
          checked={marketingOptIn}
          onChange={(event) => setMarketingOptIn(event.target.checked)}
        />

        {formError ? (
          <AuthCallout tone="danger" role="alert" label="Cannot create account">
            <p>{formError}</p>
          </AuthCallout>
        ) : null}

        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? <Spinner size={14} /> : null}
          {pending ? 'Creating account' : 'Create account'}
        </Button>

        <p className="t-caption text-[var(--fg-subtle)]">
          Creating an account means you accept the{' '}
          <Link href="/legal/terms" className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]">
            terms
          </Link>{' '}
          and{' '}
          <Link href="/legal/privacy" className="underline decoration-[var(--border-strong)] underline-offset-4 hover:decoration-[var(--fg)]">
            privacy policy
          </Link>
          .
        </p>
      </form>

      <AuthDivider />

      <OAuthButtons providers={providers} next={destination} intent="Sign up" />

      <p className="t-body-sm text-[var(--fg-muted)]">
        Already have an account?{' '}
        <Link
          href={destination === '/account' ? '/login' : `/login?next=${encodeURIComponent(destination)}`}
          className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:decoration-[var(--fg)]"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
