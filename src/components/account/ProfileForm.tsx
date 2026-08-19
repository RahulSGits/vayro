'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Field, Input, Spinner } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { updateProfileAction } from '@/app/account/actions';
import { IDLE } from '@/app/account/schemas';
import { StatusNote } from './AccountShell';
import type { Profile } from '@/types';

/* ==========================================================================
   ProfileForm

   Progressively enhanced: it is a real <form> posting to a server action, so
   it submits without JavaScript. With JS it reports inline, keeps what you
   typed on failure, and announces the outcome.
   ========================================================================== */

export function ProfileForm({ profile, demo }: { profile: Profile; demo: boolean }) {
  const [state, formAction, pending] = useActionState(updateProfileAction, IDLE);
  const { toast } = useToast();

  const [fullName, setFullName] = useState(profile.fullName ?? '');
  const [phone, setPhone] = useState(profile.phone ?? '');

  useEffect(() => {
    if (state.status === 'success') {
      toast({ title: 'Profile updated', tone: 'success' });
    }
  }, [state, toast]);

  return (
    <form action={formAction} className="flex max-w-[28rem] flex-col gap-7">
      <Field label="Name" error={state.fieldErrors?.fullName} required>
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

      <Field
        label="Phone"
        hint="Used by the courier on delivery day. Nothing else."
        error={state.fieldErrors?.phone}
      >
        {({ id, describedBy, invalid }) => (
          <Input
            id={id}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="+91"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
          />
        )}
      </Field>

      <Field label="Email">
        {({ id }) => (
          <Input
            id={id}
            type="email"
            value={profile.email}
            readOnly
            disabled
            aria-describedby={`${id}-note`}
          />
        )}
      </Field>
      <p className="-mt-4 t-caption text-[var(--fg-subtle)]">
        The sign-in address cannot be changed here. Contact us to move an account
        to a different address.
      </p>

      <StatusNote status={state.status} message={state.message} />

      <div className="flex items-center gap-6">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Spinner size={14} /> : null}
          {pending ? 'Saving' : 'Save changes'}
        </Button>
        {demo ? (
          <span className="t-caption text-[var(--fg-subtle)]">
            Demo mode — saving is disabled.
          </span>
        ) : null}
      </div>
    </form>
  );
}
