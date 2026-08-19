'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { Spinner } from '@/components/ui/States';
import { cn } from '@/lib/utils';

/* ==========================================================================
   List controls.
   State lives in the URL, never in a store — a filtered view is a link an
   operator can bookmark, share in a ticket, or reload without losing.

   The current query string is passed down from the page rather than read with
   `useSearchParams`, which keeps these components free of a Suspense boundary
   and keeps the server as the single source of truth for the view.
   ========================================================================== */

function buildHref(basePath: string, preserve: Record<string, string>, patch: Record<string, string | null>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...preserve, ...patch })) {
    if (value !== null && value !== '') params.set(key, value);
  }
  // Any change to a filter invalidates the current page cursor.
  params.delete('page');
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function SearchField({
  basePath,
  preserve = {},
  defaultValue = '',
  placeholder,
  label,
  name = 'q',
  className,
}: {
  basePath: string;
  preserve?: Record<string, string>;
  defaultValue?: string;
  placeholder: string;
  label: string;
  name?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);
  const [pending, startTransition] = useTransition();

  const go = (next: string) => {
    startTransition(() => router.push(buildHref(basePath, preserve, { [name]: next.trim() || null })));
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        go(value);
      }}
      className={cn(
        'flex h-10 min-w-0 items-center gap-2.5 border border-[var(--border-strong)] px-3',
        'transition-colors duration-[var(--d-fast)] focus-within:border-[var(--fg)]',
        className,
      )}
    >
      <Search size={15} strokeWidth={1.25} strokeLinecap="square" aria-hidden className="shrink-0 text-[var(--fg-subtle)]" />
      <label className="sr-only" htmlFor={`search-${name}`}>{label}</label>
      <input
        id={`search-${name}`}
        name={name}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        className="t-body-sm min-w-0 flex-1 bg-transparent outline-none placeholder:text-[var(--fg-subtle)]"
      />
      {pending ? <Spinner size={13} /> : null}
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setValue(''); go(''); }}
          className="shrink-0 text-[var(--fg-subtle)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          <X size={14} strokeWidth={1.25} strokeLinecap="square" aria-hidden />
        </button>
      ) : null}
      <button type="submit" className="sr-only">Search</button>
    </form>
  );
}

export type FilterOption = { value: string; label: string; count?: number };

export function FilterTabs({
  basePath,
  param,
  current,
  options,
  preserve = {},
  label,
  className,
}: {
  basePath: string;
  param: string;
  current: string;
  options: FilterOption[];
  preserve?: Record<string, string>;
  label: string;
  className?: string;
}) {
  return (
    <nav aria-label={label} className={cn('min-w-0 overflow-x-auto', className)}>
      <ul className="flex items-center gap-1">
        {options.map((option) => {
          const active = option.value === current;
          return (
            <li key={option.value}>
              <Link
                href={buildHref(basePath, preserve, { [param]: option.value === 'all' ? null : option.value })}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  't-label-sm inline-flex items-center gap-2 whitespace-nowrap border px-3 py-2',
                  'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                  active
                    ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
                    : 'border-[var(--border)] text-[var(--fg-muted)] hover:border-[var(--border-strong)] hover:text-[var(--fg)]',
                )}
              >
                {option.label}
                {typeof option.count === 'number' ? (
                  <span className={cn('t-spec', active ? 'opacity-70' : 'text-[var(--fg-subtle)]')}>
                    {option.count}
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function Pagination({
  basePath,
  preserve = {},
  page,
  perPage,
  total,
}: {
  basePath: string;
  preserve?: Record<string, string>;
  page: number;
  perPage: number;
  total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) {
    return (
      <p className="t-spec text-[var(--fg-subtle)]">
        {total.toLocaleString('en-IN')} {total === 1 ? 'record' : 'records'}
      </p>
    );
  }

  const href = (next: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(preserve)) if (value) params.set(key, value);
    if (next > 1) params.set('page', String(next));
    const query = params.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const first = (page - 1) * perPage + 1;
  const last = Math.min(page * perPage, total);

  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-4">
      <p className="t-spec text-[var(--fg-subtle)]">
        {first.toLocaleString('en-IN')}–{last.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}
      </p>
      <ul className="flex items-center gap-1">
        <li>
          <PageLink href={href(page - 1)} disabled={page <= 1}>Previous</PageLink>
        </li>
        <li className="t-spec px-3 text-[var(--fg-muted)]">{page} / {pages}</li>
        <li>
          <PageLink href={href(page + 1)} disabled={page >= pages}>Next</PageLink>
        </li>
      </ul>
    </nav>
  );
}

function PageLink({ href, disabled, children }: { href: string; disabled: boolean; children: React.ReactNode }) {
  const classes = cn(
    't-label-sm inline-flex items-center border px-3 py-2 transition-colors duration-[var(--d-fast)]',
    disabled
      ? 'pointer-events-none border-[var(--border)] text-[var(--fg-subtle)] opacity-50'
      : 'border-[var(--border-strong)] text-[var(--fg)] hover:bg-[color-mix(in_oklab,var(--fg)_6%,transparent)]',
  );
  if (disabled) return <span className={classes} aria-disabled="true">{children}</span>;
  return <Link href={href} className={classes}>{children}</Link>;
}
