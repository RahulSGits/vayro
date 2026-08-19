'use client';

import { useActionState, useEffect, useState } from 'react';
import { Button, Checkbox, Spinner } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { updatePreferencesAction } from '@/app/account/actions';
import { IDLE } from '@/app/account/schemas';
import { StatusNote } from './AccountShell';

/* ==========================================================================
   PreferencesForm

   One real switch. Order and dispatch mail is transactional — it is stated
   here as a fact rather than offered as a toggle that would either lie or
   break the delivery of an order confirmation.
   ========================================================================== */

export function PreferencesForm({
  marketingOptIn,
  demo,
}: {
  marketingOptIn: boolean;
  demo: boolean;
}) {
  const [state, formAction, pending] = useActionState(updatePreferencesAction, IDLE);
  const [checked, setChecked] = useState(marketingOptIn);
  const { toast } = useToast();

  useEffect(() => {
    if (state.status !== 'success') return;
    toast({ title: 'Preferences saved', description: state.message, tone: 'success' });
  }, [state, toast]);

  return (
    <form action={formAction} className="flex max-w-[32rem] flex-col gap-8">
      <div className="flex flex-col gap-6">
        <Checkbox
          name="marketingOptIn"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          label={
            <span>
              <span className="block text-[var(--fg)]">New releases and field notes</span>
              <span className="mt-1 block">
                A few times a season. Unsubscribe from any message; your address
                is never passed on.
              </span>
            </span>
          }
        />

        <div className="flex items-start gap-3 opacity-70">
          <span
            aria-hidden
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border border-[var(--border-strong)] bg-[var(--fg)]"
          >
            <span className="h-1.5 w-1.5 bg-[var(--bg)]" />
          </span>
          <p className="t-body-sm text-[var(--fg-muted)]">
            <span className="block text-[var(--fg)]">Order and dispatch updates</span>
            <span className="mt-1 block">
              Transactional. Sent for every order you place, and not something we
              switch off — you need the tracking number.
            </span>
          </p>
        </div>
      </div>

      <StatusNote status={state.status} message={state.message} />

      <div className="flex items-center gap-6">
        <Button type="submit" size="md" disabled={pending}>
          {pending ? <Spinner size={14} /> : null}
          {pending ? 'Saving' : 'Save preferences'}
        </Button>
        {demo ? (
          <span className="t-caption text-[var(--fg-subtle)]">Demo mode — saving is disabled.</span>
        ) : null}
      </div>
    </form>
  );
}
