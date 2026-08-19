'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Spinner } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { AuthCallout, DemoAuthNotice } from './AuthCallout';
import { PasswordField } from './PasswordField';
import { fieldErrorsFrom, resetPasswordSchema, type FieldErrors } from './schemas';

/* ==========================================================================
   ResetPasswordForm

   Reached only from a recovery link. By the time this renders, the callback
   route has exchanged the one-time code for a short-lived session — so the
   page's first job is to confirm that session exists and say something useful
   when it does not (expired link, link already used, opened in another
   browser).
   ========================================================================== */

type Readiness = 'checking' | 'ready' | 'invalid';

export function ResetPasswordForm({ demoMode }: { demoMode: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [readiness, setReadiness] = useState<Readiness>(demoMode ? 'invalid' : 'checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    // Demo mode already initialised `readiness` to 'invalid' — there is no
    // client to ask and nothing to subscribe to.
    if (!supabase) return;

    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setReadiness(data.session ? 'ready' : 'invalid');
    });

    // Covers the implicit flow, where the token arrives in the URL fragment and
    // the client establishes the session a beat after mount.
    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY' || session) setReadiness('ready');
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = resetPasswordSchema.safeParse({ password, confirm });
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
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setPending(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    toast({
      title: 'Password updated',
      description: 'The previous password no longer works.',
      tone: 'success',
    });

    startTransition(() => {
      router.replace('/account');
      router.refresh();
    });
  }

  if (demoMode) {
    return <DemoAuthNotice action="Password recovery" />;
  }

  if (readiness === 'checking') {
    return (
      <div className="flex items-center gap-3 text-[var(--fg-muted)]">
        <Spinner size={16} />
        <p className="t-body-sm">Checking the recovery link…</p>
      </div>
    );
  }

  if (readiness === 'invalid') {
    return (
      <div className="flex flex-col gap-8">
        <AuthCallout tone="warning" role="alert" label="Link not valid" title="This recovery link cannot be used">
          <p>
            Reset links last one hour and work once. If you opened this in a
            different browser to the one that requested it, request a new one.
          </p>
        </AuthCallout>
        <Button type="button" size="lg" block onClick={() => router.push('/forgot-password')}>
          Request a new link
        </Button>
        <Link
          href="/login"
          className="t-body-sm text-center text-[var(--fg-muted)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-7">
      <PasswordField
        label="New password"
        name="password"
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
        error={errors.password}
        showStrength
      />

      <PasswordField
        label="Repeat new password"
        name="confirm"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        error={errors.confirm}
      />

      {formError ? (
        <AuthCallout tone="danger" role="alert" label="Cannot update password">
          <p>{formError}</p>
        </AuthCallout>
      ) : null}

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? <Spinner size={14} /> : null}
        {pending ? 'Updating' : 'Set new password'}
      </Button>
    </form>
  );
}
