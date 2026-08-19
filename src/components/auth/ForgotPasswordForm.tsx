'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button, Field, Input, Spinner } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { AuthCallout, DemoAuthNotice } from './AuthCallout';
import { fieldErrorsFrom, forgotPasswordSchema, type FieldErrors } from './schemas';

/* ==========================================================================
   ForgotPasswordForm

   The response is deliberately identical whether or not the address exists —
   confirming which emails have accounts is an information leak, and Supabase
   behaves the same way at the API. The copy says so, so nobody waits on an
   email that was never going to arrive.
   ========================================================================== */

export function ForgotPasswordForm({ demoMode }: { demoMode: boolean }) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setErrors(fieldErrorsFrom(parsed.error));
      return;
    }
    setErrors({});

    const supabase = createClient();
    if (!supabase) {
      setFormError('Password recovery needs a Supabase project, which this build does not have.');
      return;
    }

    setPending(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent('/reset-password')}`,
    });
    setPending(false);

    if (error && !error.message.toLowerCase().includes('user not found')) {
      setFormError(error.message);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex flex-col gap-8">
        <AuthCallout tone="positive" role="status" label="Sent" title={`If ${email} has an account, a reset link is on its way`}>
          <p>
            The link is valid for one hour and can be used once. Nothing changes
            until you set a new password.
          </p>
        </AuthCallout>
        <div className="flex flex-col gap-3">
          <Button type="button" variant="secondary" size="lg" block onClick={() => setSent(false)}>
            Use a different address
          </Button>
          <Link
            href="/login"
            className="t-body-sm text-center text-[var(--fg-muted)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      {demoMode ? <DemoAuthNotice action="Password recovery" /> : null}

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
        <Field
          label="Email"
          error={errors.email}
          hint="The address on the account."
          required
        >
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

        {formError ? (
          <AuthCallout tone="danger" role="alert" label="Cannot send link">
            <p>{formError}</p>
          </AuthCallout>
        ) : null}

        <Button type="submit" size="lg" block disabled={pending}>
          {pending ? <Spinner size={14} /> : null}
          {pending ? 'Sending' : 'Send reset link'}
        </Button>
      </form>

      <p className="t-body-sm text-[var(--fg-muted)]">
        Remembered it?{' '}
        <Link
          href="/login"
          className="text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:decoration-[var(--fg)]"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
