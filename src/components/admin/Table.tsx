import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ==========================================================================
   Admin tables.
   Real semantic tables — a screen reader announces rows and columns, and a
   caption names the set. Horizontal overflow is contained by the scroller so
   the page itself never scrolls sideways on a phone.
   ========================================================================== */

export function TableScroller({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn('w-full overflow-x-auto', className)}
      // Keyboard users need to be able to reach a scrollable region.
      tabIndex={0}
      role="group"
    >
      {children}
    </div>
  );
}

export function Table({
  caption,
  children,
  className,
}: {
  /** Announced to assistive technology; visually hidden. */
  caption: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <table className={cn('w-full min-w-[44rem] text-left', className)}>
      <caption className="sr-only">{caption}</caption>
      {children}
    </table>
  );
}

export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-[var(--border)]">
      <tr>{children}</tr>
    </thead>
  );
}

export function TH({
  children,
  align = 'left',
  className,
  width,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  width?: string;
}) {
  return (
    <th
      scope="col"
      style={width ? { width } : undefined}
      className={cn(
        't-label-sm px-5 py-3.5 font-medium whitespace-nowrap text-[var(--fg-subtle)]',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-[var(--border)]">{children}</tbody>;
}

export function TR({
  children,
  className,
  muted,
}: {
  children: React.ReactNode;
  className?: string;
  muted?: boolean;
}) {
  return (
    <tr
      className={cn(
        'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
        'hover:bg-[color-mix(in_oklab,var(--fg)_4%,transparent)]',
        muted && 'opacity-60',
        className,
      )}
    >
      {children}
    </tr>
  );
}

export function TD({
  children,
  align = 'left',
  mono,
  className,
}: {
  children?: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  mono?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        'px-5 py-4 align-middle',
        mono ? 't-spec' : 't-body-sm',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center',
        className,
      )}
    >
      {children}
    </td>
  );
}

/** Primary cell in a row — carries the link to the detail screen. */
export function RowLink({
  href,
  title,
  meta,
}: {
  href: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <Link href={href} className="group block min-w-0">
      <span className="block truncate font-medium text-[var(--fg)] underline decoration-transparent underline-offset-[5px] transition-[text-decoration-color] duration-[var(--d-fast)] group-hover:decoration-[var(--border-strong)]">
        {title}
      </span>
      {meta ? <span className="t-caption mt-1 block truncate text-[var(--fg-subtle)]">{meta}</span> : null}
    </Link>
  );
}

export function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-16 text-center">
        <p className="t-body-sm text-[var(--fg-muted)]">{children}</p>
      </td>
    </tr>
  );
}

/** Small square colour chip used for variant colourways. */
export function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <span
      aria-hidden
      title={label}
      className="inline-block h-3 w-3 shrink-0 border border-[var(--border-strong)] align-middle"
      style={{ backgroundColor: hex }}
    />
  );
}
