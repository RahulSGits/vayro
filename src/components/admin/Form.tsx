'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import { idleState, type ActionState } from '@/app/admin/_data/action-state';

/* ==========================================================================
   Form plumbing for the admin.
   `ActionForm` owns the `useActionState` wiring so a screen only writes the
   fields. Every result is surfaced twice — inline (so it survives next to the
   field that failed) and as a toast (so it is noticed on a long page).
   ========================================================================== */

export type ActionFn = (state: ActionState, form: FormData) => Promise<ActionState>;

export function SubmitButton({
  children,
  variant = 'primary',
  size = 'sm',
  className,
  disabled,
  formNoValidate,
}: {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'quiet';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  formNoValidate?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={disabled || pending}
      formNoValidate={formNoValidate}
      aria-busy={pending}
    >
      {pending ? (
        <Spinner
          size={13}
          className="border-[color-mix(in_oklab,currentColor_35%,transparent)] border-t-[currentColor]"
        />
      ) : null}
      {children}
    </Button>
  );
}

const TONE: Record<ActionState['status'], { color: string; label: string } | null> = {
  idle: null,
  success: { color: 'var(--positive)', label: 'Saved' },
  error: { color: 'var(--danger)', label: 'Not saved' },
  demo: { color: 'var(--warning)', label: 'Demo' },
};

export function ActionMessage({ state, className }: { state: ActionState; className?: string }) {
  const tone = TONE[state.status];
  if (!tone || !state.message) return null;
  return (
    <p
      role={state.status === 'error' ? 'alert' : 'status'}
      className={cn('t-caption t-pretty flex items-start gap-2.5', className)}
    >
      <span aria-hidden className="mt-[6px] h-[7px] w-[7px] shrink-0" style={{ backgroundColor: tone.color }} />
      <span>
        <span className="t-label-sm mr-2" style={{ color: tone.color }}>{tone.label}</span>
        <span className="text-[var(--fg-muted)]">{state.message}</span>
      </span>
    </p>
  );
}

/**
 * Wraps a server action in a form and hands the current state back to the
 * caller. `resetOnSuccess` clears the fields after a create-style submission.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  toastOnResult = true,
  id,
}: {
  action: ActionFn;
  children: (state: ActionState) => React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  toastOnResult?: boolean;
  id?: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const { toast } = useToast();
  const announced = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state.status === 'idle' || announced.current === state) return;
    announced.current = state;
    if (resetOnSuccess && state.status === 'success') formRef.current?.reset();
    if (!toastOnResult) return;
    toast({
      title: state.status === 'success' ? 'Saved' : state.status === 'demo' ? 'Demo mode' : 'Not saved',
      description: state.message,
      tone: state.status === 'success' ? 'success' : state.status === 'demo' ? 'warning' : 'error',
    });
  }, [state, resetOnSuccess, toastOnResult, toast]);

  return (
    <form ref={formRef} id={id} action={formAction} className={className} noValidate>
      {children(state)}
    </form>
  );
}

/**
 * A one-button form — status transitions, publish toggles, deletes. Renders as
 * a real form so it works without JavaScript.
 */
export function ActionButtonForm({
  action,
  fields,
  children,
  variant = 'secondary',
  size = 'xs',
  className,
  confirm,
}: {
  action: ActionFn;
  fields: Record<string, string>;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent' | 'quiet';
  size?: 'xs' | 'sm' | 'md';
  className?: string;
  /** Native confirmation copy. Omit for non-destructive transitions. */
  confirm?: string;
}) {
  const [state, formAction] = useActionState(action, idleState);
  const { toast } = useToast();
  const announced = useRef<ActionState | null>(null);

  useEffect(() => {
    if (state.status === 'idle' || announced.current === state) return;
    announced.current = state;
    toast({
      title: state.status === 'success' ? 'Done' : state.status === 'demo' ? 'Demo mode' : 'Not saved',
      description: state.message,
      tone: state.status === 'success' ? 'success' : state.status === 'demo' ? 'warning' : 'error',
    });
  }, [state, toast]);

  return (
    <form
      action={formAction}
      className={cn('inline-flex', className)}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) event.preventDefault();
      }}
    >
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <SubmitButton variant={variant} size={size}>{children}</SubmitButton>
    </form>
  );
}

/** Two-column field grid used across every admin form. */
export function FieldGrid({
  columns = 2,
  className,
  children,
}: {
  columns?: 1 | 2 | 3;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'grid gap-x-8 gap-y-7',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Sticky action bar for long editors. */
export function FormBar({
  state,
  children,
  className,
}: {
  state: ActionState;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-[var(--gutter)] mt-10 flex flex-wrap items-center justify-between gap-4',
        'border-t border-[var(--border)] bg-[color-mix(in_oklab,var(--bg)_92%,transparent)] px-[var(--gutter)] py-4 backdrop-blur-xl',
        className,
      )}
    >
      <ActionMessage state={state} className="min-w-0 flex-1" />
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}
