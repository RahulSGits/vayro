import Link from 'next/link';
import { cn } from '@/lib/utils';

/* ==========================================================================
   CategoryFilter — the journal's only control.

   Plain links, not buttons: the filter is a URL, so it is shareable, it works
   without JavaScript, and the back button behaves. Counts come from the posts
   actually being rendered, so a category can never advertise entries that are
   not there.
   ========================================================================== */

export type JournalCategory = { name: string; count: number };

export type CategoryFilterProps = {
  categories: JournalCategory[];
  /** The active category name, or null for "everything". */
  active: string | null;
  /** Route the filter writes onto — '/journal'. */
  basePath: string;
  /** Total entry count, shown against the "All" option. */
  total: number;
  className?: string;
};

export function CategoryFilter({
  categories,
  active,
  basePath,
  total,
  className,
}: CategoryFilterProps) {
  if (categories.length < 2) return null;

  const options = [
    { name: null as string | null, label: 'All', count: total },
    ...categories.map((entry) => ({ name: entry.name, label: entry.name, count: entry.count })),
  ];

  return (
    <nav aria-label="Filter entries by category" className={cn('flex w-full', className)}>
      <ul className="flex flex-wrap items-center gap-x-2 gap-y-3">
        {options.map((option) => {
          const isActive = option.name === active;
          const href = option.name
            ? `${basePath}?category=${encodeURIComponent(option.name)}`
            : basePath;

          return (
            <li key={option.label}>
              <Link
                href={href}
                scroll={false}
                data-cursor="link"
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  't-label-sm inline-flex items-baseline gap-2 border px-4 py-2.5',
                  'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                  isActive
                    ? 'border-[var(--fg)] bg-[var(--fg)] text-[var(--bg)]'
                    : 'border-[var(--border-strong)] text-[var(--fg-muted)] hover:border-[var(--fg)] hover:text-[var(--fg)]',
                )}
              >
                {option.label}
                <span
                  aria-hidden
                  className={cn(
                    't-spec text-[0.5625rem]',
                    isActive ? 'opacity-70' : 'text-[var(--fg-subtle)]',
                  )}
                >
                  {String(option.count).padStart(2, '0')}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Categories present in a set of entries, in first-published order, with counts. */
export function categoriesOf(posts: { category: string }[]): JournalCategory[] {
  const counts = new Map<string, number>();
  for (const post of posts) counts.set(post.category, (counts.get(post.category) ?? 0) + 1);
  return [...counts].map(([name, count]) => ({ name, count }));
}
