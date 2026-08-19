import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ==========================================================================
   Admin chrome.
   Shared page furniture: headers, panels, the demo notice, definition lists.
   Dense where density helps — this is a tool, not a campaign page — but built
   from the same tokens and type scale as the storefront.
   ========================================================================== */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  back,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="border-b border-[var(--border)] pb-8">
      {back ? (
        <Link
          href={back.href}
          className="t-label-sm mb-5 inline-flex items-center gap-2 text-[var(--fg-subtle)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          <span aria-hidden>←</span>
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="t-label-sm mb-3 text-[var(--fg-subtle)]">{eyebrow}</p> : null}
          <h1 className="t-h1 t-balance">{title}</h1>
          {description ? (
            <p className="t-body-sm t-pretty mt-3 max-w-[46ch] text-[var(--fg-muted)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Panel({
  title,
  description,
  actions,
  footer,
  bleed = false,
  className,
  children,
}: {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  /** Removes body padding — use for full-bleed tables. */
  bleed?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        'flex min-w-0 flex-col border border-[var(--border)] bg-[var(--bg-elevated)]',
        'rounded-[var(--r-sm)]',
        className,
      )}
    >
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="t-label text-[var(--fg)]">{title}</h2> : null}
            {description ? (
              <p className="t-caption mt-2 max-w-[52ch] text-[var(--fg-subtle)]">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn('min-w-0 flex-1', bleed ? '' : 'p-5')}>{children}</div>
      {footer ? (
        <div className="border-t border-[var(--border)] px-5 py-3.5">{footer}</div>
      ) : null}
    </section>
  );
}

/** Persistent notice shown on every admin screen while the data is synthetic. */
export function DemoBanner({ message }: { message: string }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 border border-[var(--warning)] bg-[color-mix(in_oklab,var(--warning)_10%,transparent)] px-4 py-3 rounded-[var(--r-sm)]"
    >
      <span aria-hidden className="mt-[5px] h-[7px] w-[7px] shrink-0" style={{ backgroundColor: 'var(--warning)' }} />
      <p className="t-caption t-pretty text-[var(--fg)]">{message}</p>
    </div>
  );
}

/** Compact definition list. `mono` renders values in the technical face. */
export function MetaList({
  items,
  columns = 1,
  className,
}: {
  items: { label: string; value: React.ReactNode; mono?: boolean }[];
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="t-label-sm text-[var(--fg-subtle)]">{item.label}</dt>
          <dd className={cn('mt-1.5 break-words', item.mono ? 't-spec' : 't-body-sm')}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** A thin bordered strip used for counts above tables. */
export function StatStrip({
  items,
  className,
}: {
  items: { label: string; value: string; tone?: 'default' | 'warning' | 'danger' | 'positive' }[];
  className?: string;
}) {
  const tones = {
    default: 'var(--fg)',
    warning: 'var(--warning)',
    danger: 'var(--danger)',
    positive: 'var(--positive)',
  } as const;

  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-x divide-[var(--border)] border border-[var(--border)]',
        'rounded-[var(--r-sm)] bg-[var(--bg-elevated)] sm:grid-cols-4',
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="px-5 py-4">
          <p className="t-label-sm text-[var(--fg-subtle)]">{item.label}</p>
          <p className="t-price mt-2" style={{ color: tones[item.tone ?? 'default'] }}>{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function SectionRule({ label }: { label?: string }) {
  if (!label) return <hr className="rule my-10" />;
  return (
    <div className="my-10 flex items-center gap-4">
      <span className="t-label-sm shrink-0 text-[var(--fg-subtle)]">{label}</span>
      <hr className="rule flex-1" />
    </div>
  );
}
