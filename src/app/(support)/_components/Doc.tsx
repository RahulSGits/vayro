import Link from 'next/link';
import { cn, formatDate } from '@/lib/utils';
import { Reveal } from '@/components/ui/Reveal';
import { SUPPORT_DOCS, CONTACT } from './documents';

/* ==========================================================================
   Doc — the editorial treatment shared by every support and legal page.

   These pages are read, not browsed. So: one measured column, hairline rules
   instead of boxes, a numbered contents list at the top, and no illustration
   that does not carry information. Tables are the exception — they get the
   full column width and scroll horizontally rather than compress.
   ========================================================================== */

/* ---------------------------------------------------------------- header -- */

export function DocHeader({
  eyebrow,
  title,
  lead,
  /** ISO date the document was last substantively changed. */
  updated,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  updated?: string;
}) {
  return (
    <header className="border-b border-[var(--fg)] pb-10">
      <p className="t-label text-[var(--fg-subtle)]">{eyebrow}</p>
      <h1 className="t-display-md t-balance mt-5 max-w-[16ch]">{title}</h1>
      <p className="t-body-lg t-pretty mt-7 max-w-[var(--max-text)] text-[var(--fg-muted)]">
        {lead}
      </p>
      {updated ? (
        <p className="t-spec mt-8 text-[var(--fg-subtle)]">
          Last updated <time dateTime={updated}>{formatDate(updated)}</time>
        </p>
      ) : null}
    </header>
  );
}

/* -------------------------------------------------------------- contents -- */

export type DocSectionRef = { id: string; title: string };

/** Numbered anchor list. Shown at the head of any document with three or more sections. */
export function DocContents({ sections }: { sections: DocSectionRef[] }) {
  if (sections.length < 3) return null;

  return (
    <nav aria-label="On this page" className="mt-14">
      <h2 className="t-label-sm text-[var(--fg-subtle)]">On this page</h2>
      <ol className="mt-5 grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2">
        {sections.map((section, index) => (
          <li key={section.id} className="bg-[var(--bg)]">
            <a
              href={`#${section.id}`}
              data-cursor="link"
              className="group flex items-baseline gap-4 py-3 pr-4 transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:text-[var(--fg)]"
            >
              <span aria-hidden className="t-spec text-[var(--fg-subtle)]">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="t-body-sm text-[var(--fg-muted)] group-hover:text-[var(--fg)]">
                {section.title}
              </span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/* --------------------------------------------------------------- section -- */

export function DocSection({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn('scroll-mt-[calc(var(--header-h)+2rem)] border-t border-[var(--border)] pt-10', className)}
    >
      <Reveal variant="fadeUp">
        <h2 id={`${id}-heading`} className="t-h1 t-balance max-w-[18ch]">
          {title}
        </h2>
        <div className="mt-7 flex flex-col gap-6">{children}</div>
      </Reveal>
    </section>
  );
}

/** The stack a document body sits in. Sections are separated by their own rules. */
export function DocBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-16 flex flex-col gap-16', className)}>{children}</div>;
}

/* ----------------------------------------------------------------- prose -- */

export function DocP({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn('t-pretty max-w-[var(--max-text)] text-[var(--fg-muted)]', className)}>
      {children}
    </p>
  );
}

/** A lead sentence set at full contrast — one per section at most. */
export function DocLead({ children }: { children: React.ReactNode }) {
  return (
    <p className="t-body-lg t-pretty max-w-[var(--max-text)] text-[var(--fg)]">{children}</p>
  );
}

export function DocList({
  items,
  ordered = false,
  className,
}: {
  items: React.ReactNode[];
  ordered?: boolean;
  className?: string;
}) {
  const Tag = ordered ? 'ol' : 'ul';
  return (
    <Tag className={cn('flex max-w-[var(--max-text)] flex-col', className)}>
      {items.map((item, index) => (
        <li
          key={index}
          className="t-pretty flex gap-4 border-b border-[var(--border)] py-3.5 text-[var(--fg-muted)] first:border-t"
        >
          <span aria-hidden className="t-spec shrink-0 pt-1 text-[var(--fg-subtle)]">
            {ordered ? String(index + 1).padStart(2, '0') : '—'}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </Tag>
  );
}

/** Label/value pairs — delivery options, retention periods, fee schedules. */
export function DocDefinitions({
  rows,
  className,
}: {
  rows: { term: string; detail: React.ReactNode }[];
  className?: string;
}) {
  return (
    <dl className={cn('grid grid-cols-1 gap-px bg-[var(--border)]', className)}>
      {rows.map((row) => (
        <div
          key={row.term}
          className="grid grid-cols-1 gap-2 bg-[var(--bg)] py-5 sm:grid-cols-[14rem_1fr] sm:gap-[var(--gutter)]"
        >
          <dt className="t-label-sm text-[var(--fg)]">{row.term}</dt>
          <dd className="t-body-sm t-pretty max-w-[var(--max-text)] text-[var(--fg-muted)]">
            {row.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------------------------------------------- table -- */

export type DocTableColumn = { key: string; label: string; align?: 'left' | 'right' };

/**
 * A data table, not a layout table. It keeps its minimum width and scrolls
 * inside its own container rather than squeezing figures onto two lines.
 */
export function DocTable({
  caption,
  columns,
  rows,
  /** Column rendered as the row's `<th>`. Defaults to the first column. */
  rowHeaderKey,
  minWidth = '34rem',
  className,
}: {
  caption: string;
  columns: DocTableColumn[];
  rows: Record<string, string>[];
  rowHeaderKey?: string;
  minWidth?: string;
  className?: string;
}) {
  const headerKey = rowHeaderKey ?? columns[0]?.key;

  return (
    <div className={cn('w-full overflow-x-auto', className)}>
      <table className="w-full border-collapse" style={{ minWidth }}>
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-[var(--border-strong)]">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  't-label-sm py-3 pr-6 text-[var(--fg-subtle)] last:pr-0',
                  column.align === 'right' ? 'text-right' : 'text-left',
                )}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row[headerKey] ?? index} className="border-b border-[var(--border)]">
              {columns.map((column) =>
                column.key === headerKey ? (
                  <th
                    key={column.key}
                    scope="row"
                    className="t-label py-4 pr-6 text-left text-[var(--fg)] last:pr-0"
                  >
                    {row[column.key]}
                  </th>
                ) : (
                  <td
                    key={column.key}
                    className={cn(
                      't-spec py-4 pr-6 text-[var(--fg-muted)] last:pr-0',
                      column.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {row[column.key]}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ note -- */

/** A hairline callout. Used for the things people miss, not for decoration. */
export function DocNote({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        'max-w-[var(--max-text)] border-l-2 border-[var(--fg)] bg-[var(--bg-sunken)] px-6 py-5',
        className,
      )}
    >
      <p className="t-label-sm text-[var(--fg)]">{title}</p>
      <div className="t-body-sm t-pretty mt-3 flex flex-col gap-3 text-[var(--fg-muted)]">
        {children}
      </div>
    </aside>
  );
}

/* ---------------------------------------------------------------- footer -- */

/**
 * Closes every document the same way: a line to a person, then the rest of the
 * shelf. Nobody should reach the end of a policy page with nowhere to go.
 */
export function DocFooter({ exclude }: { exclude?: string }) {
  const others = SUPPORT_DOCS.filter((doc) => doc.href !== exclude);

  return (
    <footer className="mt-20 border-t border-[var(--fg)] pt-10">
      <div className="flex flex-wrap items-baseline justify-between gap-6">
        <h2 className="t-h2">Still need a person?</h2>
        <a
          href={`mailto:${CONTACT.general}`}
          data-cursor="link"
          className="t-label border-b border-[var(--fg)] pb-2 transition-opacity duration-[var(--d-fast)] hover:opacity-70"
        >
          {CONTACT.general}
        </a>
      </div>
      <p className="t-body-sm t-pretty mt-5 max-w-[var(--max-text)] text-[var(--fg-muted)]">
        The studio answers within {CONTACT.responseTarget}, {CONTACT.hours}. Include your order
        reference if you have one — it saves a round trip.
      </p>

      <ul className="mt-12 grid grid-cols-1 gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
        {others.map((doc) => (
          <li key={doc.href} className="bg-[var(--bg)]">
            <Link
              href={doc.href}
              data-cursor="link"
              className="group flex h-full flex-col gap-2 py-5 pr-5"
            >
              <span className="t-label-sm text-[var(--fg)]">{doc.label}</span>
              <span className="t-caption t-pretty text-[var(--fg-muted)]">{doc.note}</span>
            </Link>
          </li>
        ))}
      </ul>
    </footer>
  );
}
