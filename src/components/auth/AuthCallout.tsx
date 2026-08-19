import { cn } from '@/lib/utils';

/* ==========================================================================
   AuthCallout — the flat, hairline notice used across the auth screens.
   A left keyline carries the tone; there is no tinted panel and no icon soup.
   ========================================================================== */

export type CalloutTone = 'neutral' | 'positive' | 'warning' | 'danger';

const KEYLINE: Record<CalloutTone, string> = {
  neutral: 'bg-[var(--border-strong)]',
  positive: 'bg-[var(--positive)]',
  warning: 'bg-[var(--warning)]',
  danger: 'bg-[var(--danger)]',
};

const LABEL: Record<CalloutTone, string> = {
  neutral: 'text-[var(--fg-subtle)]',
  positive: 'text-[var(--positive)]',
  warning: 'text-[var(--warning)]',
  danger: 'text-[var(--danger)]',
};

export function AuthCallout({
  tone = 'neutral',
  label,
  title,
  children,
  className,
  role,
}: {
  tone?: CalloutTone;
  /** Small uppercase eyebrow — e.g. "Demo mode". */
  label?: string;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  role?: 'alert' | 'status';
}) {
  return (
    <div role={role} className={cn('relative pl-5', className)}>
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-px', KEYLINE[tone])} />
      {label ? <p className={cn('t-label-sm mb-2', LABEL[tone])}>{label}</p> : null}
      {title ? <p className="t-body-sm font-medium text-[var(--fg)]">{title}</p> : null}
      {children ? (
        <div className={cn('t-body-sm t-pretty text-[var(--fg-muted)]', title ? 'mt-1.5' : '')}>
          {children}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The demo-mode explanation. Deliberately specific: it names the two variables
 * and where they come from, because a vague "not configured" costs an hour.
 */
export function DemoAuthNotice({
  action = 'Signing in',
  className,
}: {
  action?: string;
  className?: string;
}) {
  return (
    <AuthCallout tone="warning" label="Demo mode" className={className}>
      <p>
        {action} is unavailable — this build has no Supabase project attached, so
        there is nothing to authenticate against. Nothing you type here is sent
        anywhere.
      </p>
      <p className="mt-3">To enable accounts, add to <span className="t-spec">.env.local</span>:</p>
      <ul className="t-spec mt-2 space-y-1 text-[var(--fg-subtle)]">
        <li>NEXT_PUBLIC_SUPABASE_URL</li>
        <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
      </ul>
      <p className="mt-3">
        Then run the migration in{' '}
        <span className="t-spec">supabase/migrations</span> and restart the dev server.
      </p>
    </AuthCallout>
  );
}
