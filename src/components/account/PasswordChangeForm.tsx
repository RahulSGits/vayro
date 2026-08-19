'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Button, Spinner } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { PasswordField } from '@/components/auth/PasswordField';
import { changePasswordAction } from '@/app/account/actions';
import { IDLE, type ActionState } from '@/app/account/schemas';
import { StatusNote } from './AccountShell';

/* ==========================================================================
   PasswordChangeForm

   The current password is required. Supabase does not demand it, but a
   password change that only needs an open tab is not a password change — it
   is an account takeover waiting for someone to walk past a laptop.

   OAuth accounts have no password to change, so they are shown the truth and
   a route to set one.
   ========================================================================== */

export function PasswordChangeForm({
  provider,
  demo,
}: {
  provider: string;
  demo: boolean;
}) {
  const { toast } = useToast();
  // Bumped on success so the field group remounts empty. Clearing three
  // controlled inputs from an effect would cascade a render for each.
  const [resetToken, setResetToken] = useState(0);

  const [state, formAction, pending] = useActionState(
    async (previous: ActionState, formData: FormData) => {
      const result = await changePasswordAction(previous, formData);
      if (result.status === 'success') {
        setResetToken((token) => token + 1);
        toast({ title: 'Password changed', tone: 'success' });
      }
      return result;
    },
    IDLE,
  );

  if (provider !== 'email') {
    return (
      <div className="max-w-[32rem]">
        <p className="t-body-sm t-pretty text-[var(--fg-muted)]">
          This account signs in through {provider}, so there is no VAYRO password
          to change. Manage it with {provider} instead.
        </p>
        <p className="t-body-sm t-pretty mt-4 text-[var(--fg-muted)]">
          To add a password as well, request a reset link — setting one is the
          same flow.
        </p>
        <Link
          href="/forgot-password"
          className="t-label mt-6 inline-block text-[var(--fg)] underline decoration-[var(--border-strong)] underline-offset-[6px] transition-colors duration-[var(--d-fast)] hover:decoration-[var(--fg)]"
        >
          Send a reset link
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex max-w-[28rem] flex-col gap-7">
      <CredentialFields key={resetToken} errors={state.fieldErrors} />

      <StatusNote status={state.status} message={state.message} />

      <div className="flex items-center gap-6">
        <Button type="submit" size="md" disabled={pending}>
          {pending ? <Spinner size={14} /> : null}
          {pending ? 'Updating' : 'Change password'}
        </Button>
        {demo ? (
          <span className="t-caption text-[var(--fg-subtle)]">Demo mode — saving is disabled.</span>
        ) : null}
      </div>
    </form>
  );
}

/** Owns its own values so the parent can clear them all with a remount. */
function CredentialFields({ errors }: { errors?: Record<string, string> }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');

  return (
    <div className="flex flex-col gap-7">
      <PasswordField
        label="Current password"
        name="currentPassword"
        autoComplete="current-password"
        value={current}
        onChange={setCurrent}
        error={errors?.currentPassword}
      />

      <PasswordField
        label="New password"
        name="newPassword"
        autoComplete="new-password"
        value={next}
        onChange={setNext}
        error={errors?.newPassword}
        showStrength
      />

      <PasswordField
        label="Repeat new password"
        name="confirmPassword"
        autoComplete="new-password"
        value={confirm}
        onChange={setConfirm}
        error={errors?.confirmPassword}
      />
    </div>
  );
}
