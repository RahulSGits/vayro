'use client';

import { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

const control = [
  'w-full bg-transparent text-[var(--fg)] placeholder:text-[var(--fg-subtle)]',
  'border-b border-[var(--border-strong)] px-0 py-3',
  'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
  'focus:border-[var(--fg)] focus:outline-none',
  'disabled:opacity-40',
  'aria-[invalid=true]:border-[var(--danger)]',
].join(' ');

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: (props: { id: string; describedBy?: string; invalid: boolean }) => React.ReactNode;
};

export function Field({ label, hint, error, required, className, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  const describedBy = [hintId, errId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="t-label text-[var(--fg-muted)]">
        {label}{required ? <span aria-hidden className="ml-1 text-[var(--fg-subtle)]">*</span> : null}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error ? <p id={hintId} className="t-caption text-[var(--fg-subtle)]">{hint}</p> : null}
      {error ? <p id={errId} role="alert" className="t-caption text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(control, className)} {...props} />,
);
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) =>
    <textarea ref={ref} rows={rows} className={cn(control, 'resize-y', className)} {...props} />,
);
Textarea.displayName = 'Textarea';

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select ref={ref} className={cn(control, 'cursor-pointer appearance-none pr-6', className)} {...props}>
      {children}
    </select>
  ),
);
Select.displayName = 'Select';

export function Checkbox({ label, className, ...props }: { label: React.ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id} type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer appearance-none border border-[var(--border-strong)] transition-colors checked:border-[var(--fg)] checked:bg-[var(--fg)] focus-visible:outline-2"
        {...props}
      />
      <label htmlFor={id} className="t-body-sm cursor-pointer text-[var(--fg-muted)]">{label}</label>
    </div>
  );
}
