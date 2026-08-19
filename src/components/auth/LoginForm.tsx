'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Field, Input, Spinner } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { identify, track } from '@/lib/analytics';
import { AuthCallout, DemoAuthNotice } from './AuthCallout';
import { PasswordField } from './PasswordField';
import { AuthDivider, OAuthButtons } from './OAuthButtons';
import { fieldErrorsFrom, loginSchema, safeNext, type FieldErrors } from './schemas';
import type { OAuthProvider } from '@/lib/auth';

/* ==========================================================================
   LoginForm

   Email + password against Supabase Auth. Validation is client-side for speed
   and re-run by Supabase for truth. Every failure state is a sentence, not a
   code, and the "email not confirmed" case offers the one action that fixes it.
   ========================================================================== */

/** Supabase speaks in codes; the customer should not have to. */
function readableError(message: string): string {
  const value = message.toLowerCase();
  if (value.includes('invalid login credentials')) {
    return 'That email and password combination is not recognised.';
  }
  if (value.includes('email not confirmed')) {
    return 'This address has not been confirmed yet. Check your inbox for the confirmation link.';
  }
  if (value.includes('rate limit') || value.includes('too many')) {
    return 'Too many attempts. Wait a minute and try again.';
  }
  return message;
}

export function LoginForm({
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

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState(false);
  const [pending, setPending] = useState(false);

  const destination = safeNext(next);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    setUnconfirmed(false);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setErrors({});

    const supabase = createClient();
    if (!supabase) {
      // Demo mode. Say so plainly rather than simulating a session.
      setFormError('Authentication is not configured in this build, so there is no account to sign in to.');
      return;
    }

    setPending(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setPending(false);

    if (error) {
      setUnconfirmed(error.message.toLowerCase().includes('email not confirmed'));
      setFormError(readableError(error.message));
      return;
    }

    track('login', { method: 'password' });
    if (data.user) identify(data.user.id, { email: parsed.data.email });

    startTransition(() => {
      router.replace(destination);
      router.refresh();
    });
  }

  async function resendConfirmation() {
    const supabase = createClient();
    if (!supabase) return;
    const parsed = loginSchema.shape.email.safeParse(email);
    if (!parsed.success) return;
    await supabase.auth.resend({
      type: 'signup',
      email: parsed.data,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}` },
    });
    setResent(true);
  }

  return (
    <div className="flex flex-col gap-10">
      {demoMode ? <DemoAuthNotice action="Signing in" /> : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
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
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          error={errors.password}
          action={
            <Link
              href="/forgot-password"
              className="t-caption text-[var(--fg-muted)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)] hover:decoration-[var(--fg)]"
            >
              Forgot?
            </Link>
          }
        />

        {formError ? (
          <AuthCallout tone="danger" role="alert" label="Cannot sign in">
            <p>{formError}</p>
            {unconfirmed ? (
              resent ? (
                <p className="mt-2 text-[var(--positive)]">Confirmation email sent again.</p>
              ) : (
                <button
                  type="button"
                  onClick={resendConfirmation}
                  className="t-label-sm mt-3 inline-block text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:decoration-[var(--fg)]"
                >
                  Resend confirmation
                </button>
              )
            ) : null}
          </AuthCallout>
        ) : null}

        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? <Spinner size={14} /> : null}
          {pending ? 'Signing in' : 'Sign in'}
        </Button>
      </form>

      <AuthDivider />

      <OAuthButtons providers={providers} next={destination} intent="Continue" />

      <p className="t-body-sm text-[var(--fg-muted)]">
        No account yet?{' '}
        <Link
          href={destination === '/account' ? '/signup' : `/signup?next=${encodeURIComponent(destination)}`}
          className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:decoration-[var(--fg)]"
        >
          Create one
        </Link>
        .
      </p>
    </div>
  );
}
