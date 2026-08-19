'use client';

import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { passwordStrength } from './schemas';

/* ==========================================================================
   PasswordField — the Field/Input pair with a reveal toggle and, on the
   screens that create a credential, a four-segment strength read.

   It does not use the `Field` render-prop shell because the control needs a
   sibling button inside the underline, which the shell does not model.
   ========================================================================== */

export function PasswordField({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  hint,
  autoComplete,
  showStrength = false,
  disabled,
  required = true,
  action,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  autoComplete: 'current-password' | 'new-password';
  /** Renders the strength meter — only on create/reset, never on sign-in. */
  showStrength?: boolean;
  disabled?: boolean;
  required?: boolean;
  /** Trailing control on the label row, e.g. the "Forgot?" link. */
  action?: React.ReactNode;
}) {
  const id = useId();
  const [revealed, setRevealed] = useState(false);

  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const meterId = showStrength ? `${id}-meter` : undefined;
  const describedBy = [hintId, errorId, meterId].filter(Boolean).join(' ') || undefined;

  const strength = passwordStrength(value);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-4">
        <label htmlFor={id} className="t-label text-[var(--fg-muted)]">
          {label}
          {required ? <span aria-hidden className="ml-1 text-[var(--fg-subtle)]">*</span> : null}
        </label>
        {action}
      </div>

      <div
        data-invalid={error ? 'true' : undefined}
        className={cn(
          'relative flex items-center border-b border-[var(--border-strong)]',
          'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
          'focus-within:border-[var(--fg)] data-[invalid=true]:border-[var(--danger)]',
        )}
      >
        <input
          id={id}
          name={name}
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          autoComplete={autoComplete}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="w-full bg-transparent px-0 py-3 pr-10 text-[var(--fg)] placeholder:text-[var(--fg-subtle)] focus:outline-none disabled:opacity-40"
        />
        <button
          type="button"
          onClick={() => setRevealed((current) => !current)}
          aria-pressed={revealed}
          aria-controls={id}
          aria-label={revealed ? 'Hide password' : 'Show password'}
          className="absolute right-0 inline-flex h-9 w-9 items-center justify-center text-[var(--fg-subtle)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          {revealed ? (
            <EyeOff size={16} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
          ) : (
            <Eye size={16} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
          )}
        </button>
      </div>

      {showStrength ? (
        <div id={meterId} className="mt-2 flex items-center gap-3">
          <div aria-hidden className="flex flex-1 gap-1">
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                className={cn(
                  'h-px flex-1 transition-colors duration-[var(--d-standard)] ease-[var(--e-out)]',
                  index < strength.score
                    ? strength.score >= 3
                      ? 'bg-[var(--positive)]'
                      : 'bg-[var(--warning)]'
                    : 'bg-[var(--border)]',
                )}
              />
            ))}
          </div>
          <span className="t-spec text-[var(--fg-subtle)]">
            {value ? strength.label : 'Min. 8 characters'}
          </span>
        </div>
      ) : null}

      {hint && !error ? (
        <p id={hintId} className="t-caption text-[var(--fg-subtle)]">{hint}</p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="t-caption text-[var(--danger)]">{error}</p>
      ) : null}
    </div>
  );
}
