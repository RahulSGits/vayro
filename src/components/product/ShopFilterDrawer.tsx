'use client';

import { useCallback, useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';

/* ==========================================================================
   ShopFilterDrawer — the mobile filter sheet.

   The panel inside is server-rendered and made of links, so choosing a filter
   navigates. The sheet is stamped with the URL state it was opened against;
   when that state changes the sheet is no longer "open for" the current view
   and closes itself — no route-change effect, no flash of stale results.
   ========================================================================== */

type Props = {
  /** Identity of the current URL state — changes on every filter navigation. */
  stateKey: string;
  activeCount: number;
  resultCount: number;
  className?: string;
  children: React.ReactNode;
};

export function ShopFilterDrawer({ stateKey, activeCount, resultCount, className, children }: Props) {
  const [sheet, setSheet] = useState<{ open: boolean; at: string }>({ open: false, at: stateKey });
  const open = sheet.open && sheet.at === stateKey;

  const close = useCallback(() => setSheet({ open: false, at: stateKey }), [stateKey]);

  return (
    <>
      <button
        type="button"
        onClick={() => setSheet({ open: true, at: stateKey })}
        data-cursor="link"
        className={cn(
          't-label flex h-11 flex-1 items-center justify-center gap-2.5',
          'border border-[var(--border-strong)] text-[var(--fg)]',
          'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:border-[var(--fg)]',
          className,
        )}
      >
        <SlidersHorizontal size={14} strokeWidth={1.25} aria-hidden />
        Filter
        {activeCount > 0 ? (
          <span className="t-spec inline-flex h-5 min-w-5 items-center justify-center bg-[var(--fg)] px-1 text-[0.625rem] leading-none text-[var(--bg)]">
            {activeCount}
          </span>
        ) : null}
      </button>

      <Drawer
        open={open}
        onClose={close}
        side="left"
        size="md"
        title="Filter & sort"
        bodyClassName="px-[var(--gutter)] pb-6"
        footer={
          <div className="px-[var(--gutter)] py-4">
            <Button block onClick={close}>
              Show {resultCount} {resultCount === 1 ? 'piece' : 'pieces'}
            </Button>
          </div>
        }
      >
        {children}
      </Drawer>
    </>
  );
}
