import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ==========================================================================
   Shared account furniture.

   Everything here is a rule, a label and space. No cards, no shadows, no
   rounded panels — the account should read like the rest of the site, not
   like a dashboard that wandered in.
   ========================================================================== */

export function PageHeading({
  eyebrow,
  title,
  lede,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex flex-wrap items-end justify-between gap-6', className)}>
      <div className="max-w-[34rem]">
        {eyebrow ? <p className="t-label-sm text-[var(--fg-subtle)]">{eyebrow}</p> : null}
        <h1 className={cn('t-h1 t-balance', eyebrow ? 'mt-3' : '')}>{title}</h1>
        {lede ? <p className="t-body-lg t-pretty mt-4 text-[var(--fg-muted)]">{lede}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

/** A titled block separated by a hairline. The account's only container. */
export function Panel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('border-t border-[var(--border)] pt-8', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-[30rem]">
          <h2 className="t-label text-[var(--fg)]">{title}</h2>
          {description ? (
            <p className="t-body-sm t-pretty mt-2 text-[var(--fg-muted)]">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}

/** Label / value pair on a hairline. Used for read-only account facts. */
export function DefinitionRow({
  label,
  children,
  mono = false,
}: {
  label: string;
  children: React.ReactNode;
  /** Technical values — order numbers, SKUs, tracking — take the mono face. */
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-1 border-b border-[var(--border)] py-4 last:border-b-0">
      <dt className="t-label-sm text-[var(--fg-subtle)]">{label}</dt>
      <dd className={cn('min-w-0 text-right', mono ? 't-spec' : 't-body-sm', 'text-[var(--fg)]')}>
        {children}
      </dd>
    </div>
  );
}

/**
 * The account-wide demo label. It appears on every screen that is rendering
 * synthetic content, because unlabelled demo data is indistinguishable from a
 * bug — or worse, from a real order.
 */
export function DemoDataBanner({ what = 'this screen' }: { what?: string }) {
  return (
    <div className="relative border border-[var(--border)] py-5 pr-5 pl-6">
      <span aria-hidden className="absolute inset-y-0 left-0 w-px bg-[var(--warning)]" />
      <p className="t-label-sm text-[var(--warning)]">Demo data</p>
      <p className="t-body-sm t-pretty mt-2 max-w-[46rem] text-[var(--fg-muted)]">
        No Supabase project is attached to this build, so {what} is showing
        synthetic content. Nothing here is a real order, address or customer,
        and nothing you change will be saved. Set{' '}
        <span className="t-spec">NEXT_PUBLIC_SUPABASE_URL</span> and{' '}
        <span className="t-spec">NEXT_PUBLIC_SUPABASE_ANON_KEY</span> to switch
        to live data.
      </p>
    </div>
  );
}

/** Inline result of a server action. Announced, never a toast-only message. */
export function StatusNote({
  status,
  message,
  className,
}: {
  status: 'idle' | 'success' | 'error';
  message: string;
  className?: string;
}) {
  if (status === 'idle' || !message) return null;
  const error = status === 'error';
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={cn(
        't-body-sm t-pretty relative pl-4',
        error ? 'text-[var(--danger)]' : 'text-[var(--positive)]',
        className,
      )}
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-px"
        style={{ background: error ? 'var(--danger)' : 'var(--positive)' }}
      />
      {message}
    </p>
  );
}

/** Big quiet figure — the overview's at-a-glance numbers. */
export function StatFigure({
  label,
  value,
  note,
  href,
}: {
  label: string;
  value: string;
  note?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="t-label-sm text-[var(--fg-subtle)]">{label}</p>
      <p className="t-display-md mt-4 tabular-nums">{value}</p>
      {note ? <p className="t-body-sm t-pretty mt-3 text-[var(--fg-muted)]">{note}</p> : null}
    </>
  );

  if (!href) {
    return <div className="border-t border-[var(--border)] pt-6">{body}</div>;
  }

  return (
    <Link
      href={href}
      data-cursor="link"
      className="group block border-t border-[var(--border-strong)] pt-6 transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:border-[var(--fg)]"
    >
      {body}
    </Link>
  );
}
