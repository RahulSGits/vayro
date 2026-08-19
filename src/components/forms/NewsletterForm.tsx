'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { Spinner } from '@/components/ui/States';

/* ==========================================================================
   NewsletterForm — one input, one commitment.

   Posts to /api/newsletter. If the endpoint is unreachable or rejects the
   address, the form says so plainly and offers a retry. It never reports a
   success it cannot verify.
   ========================================================================== */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type Status = 'idle' | 'submitting' | 'success' | 'error';

export function NewsletterForm({
  source,
  className,
  /** 'inline' keeps the field and button on one hairline. 'stacked' is narrow-column. */
  variant = 'inline',
  label = 'Email address',
  placeholder = 'you@example.com',
}: {
  source: string;
  className?: string;
  variant?: 'inline' | 'stacked';
  label?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  // Bots fill every field they find; humans never see this one.
  const honeypot = useRef<HTMLInputElement>(null);

  const submit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status === 'submitting') return;

      const value = email.trim();
      if (!EMAIL.test(value)) {
        setStatus('error');
        setMessage('Enter a valid email address.');
        return;
      }
      if (honeypot.current?.value) {
        // Silently accept and discard — no feedback for automated submissions.
        setStatus('success');
        setMessage('Confirmed. Look for a note from VAYRO.');
        return;
      }

      setStatus('submitting');
      setMessage('');

      try {
        const response = await fetch('/api/newsletter', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: value, source, consent: true }),
        });

        if (!response.ok) {
          const detail = (await response.json().catch(() => null)) as { message?: string } | null;
          setStatus('error');
          setMessage(
            detail?.message ??
              (response.status === 429
                ? 'Too many attempts. Try again in a moment.'
                : 'We could not save that just now. Try again shortly.'),
          );
          return;
        }

        setStatus('success');
        setMessage('Confirmed. Look for a note from VAYRO.');
        setEmail('');
        track('newsletter_signup', { source });
      } catch {
        setStatus('error');
        setMessage('No connection. Check your network and try again.');
      }
    },
    [email, source, status],
  );

  const invalid = status === 'error';
  const busy = status === 'submitting';

  if (status === 'success') {
    return (
      <div className={cn('flex items-start gap-3', className)}>
        <span aria-hidden className="mt-2 block h-px w-6 shrink-0 bg-[var(--positive)]" />
        <p role="status" className="t-body-sm text-[var(--fg)]">
          {message}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className={cn('w-full', className)}>
      <label htmlFor={id} className="t-label-sm block text-[var(--fg-subtle)]">
        {label}
      </label>

      <div
        className={cn(
          'mt-3',
          variant === 'inline' ? 'flex items-end gap-3' : 'flex flex-col gap-4',
        )}
      >
        <div className="flex-1">
          <input
            id={id}
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            required
            value={email}
            placeholder={placeholder}
            disabled={busy}
            aria-invalid={invalid || undefined}
            aria-describedby={message ? `${id}-status` : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              if (status === 'error') {
                setStatus('idle');
                setMessage('');
              }
            }}
            className={cn(
              'w-full border-b bg-transparent px-0 py-3 text-[var(--fg)] placeholder:text-[var(--fg-subtle)]',
              'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] focus:outline-none disabled:opacity-50',
              invalid
                ? 'border-[var(--danger)]'
                : 'border-[var(--border-strong)] focus:border-[var(--fg)]',
            )}
          />
        </div>

        {/* Honeypot — visually and programmatically removed from the flow. */}
        <input
          ref={honeypot}
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="sr-only"
          defaultValue=""
        />

        <button
          type="submit"
          disabled={busy}
          data-cursor="link"
          className={cn(
            'group t-label inline-flex items-center justify-center gap-3 whitespace-nowrap',
            'border-b border-[var(--border-strong)] py-3 text-[var(--fg)]',
            'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
            'hover:border-[var(--fg)] disabled:pointer-events-none disabled:opacity-50',
            variant === 'inline' ? 'shrink-0' : 'self-start',
          )}
        >
          {busy ? <Spinner size={14} /> : null}
          Subscribe
          <ArrowRight
            size={15}
            strokeWidth={1.25}
            strokeLinecap="square"
            strokeLinejoin="miter"
            aria-hidden
            className="transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)] group-hover:translate-x-1"
          />
        </button>
      </div>

      <p
        id={`${id}-status`}
        role={invalid ? 'alert' : 'status'}
        className={cn('t-caption mt-3', invalid ? 'text-[var(--danger)]' : 'text-[var(--fg-subtle)]')}
      >
        {message || 'Occasional dispatches on new equipment and field notes. Unsubscribe anytime.'}
      </p>
    </form>
  );
}
