'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SUPPORT_GROUPS } from './documents';

/* ==========================================================================
   SupportNav — the sticky rail.

   Below `lg` it is a wrapped row above the document; from `lg` it is a pinned
   column beside it. One markup tree either way — the group headings and the
   active marker are the only things that change shape.
   ========================================================================== */

export function SupportNav({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Support and legal"
      className={cn(
        'lg:sticky lg:top-[calc(var(--header-h)+2rem)]',
        className,
      )}
    >
      <div className="flex flex-col gap-10">
        {SUPPORT_GROUPS.map((group) => (
          <div key={group.title}>
            <h2 className="t-label-sm border-b border-[var(--border)] pb-3 text-[var(--fg-subtle)]">
              {group.title}
            </h2>

            <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1 lg:flex-col lg:gap-x-0">
              {group.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-cursor="link"
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        't-body-sm group inline-flex items-center gap-3 py-1.5',
                        'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
                        active ? 'text-[var(--fg)]' : 'text-[var(--fg-muted)] hover:text-[var(--fg)]',
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'block h-px bg-current transition-[width] duration-[var(--d-standard)] ease-[var(--e-fold)]',
                          active ? 'w-5' : 'w-0 group-hover:w-3',
                        )}
                      />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
