'use client';

import { createContext, useCallback, useContext, useId, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';

/* ==========================================================================
   Accordion — hairline disclosure list.
   Buttons carry the semantics; ArrowUp/ArrowDown/Home/End move between them.
   ========================================================================== */

type AccordionContextValue = {
  isOpen: (value: string) => boolean;
  toggle: (value: string) => void;
  baseId: string;
};

const AccordionContext = createContext<AccordionContextValue | null>(null);

function useAccordion(component: string) {
  const context = useContext(AccordionContext);
  if (!context) throw new Error(`<${component}> must be used inside <Accordion>.`);
  return context;
}

export type AccordionProps = {
  /** 'single' collapses siblings on open. 'multiple' allows any combination. */
  type?: 'single' | 'multiple';
  defaultValue?: string | string[];
  /** Controlled open set. Pair with `onValueChange`. */
  value?: string[];
  onValueChange?: (value: string[]) => void;
  className?: string;
  children: React.ReactNode;
};

export function Accordion({
  type = 'single',
  defaultValue,
  value,
  onValueChange,
  className,
  children,
}: AccordionProps) {
  const baseId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [uncontrolled, setUncontrolled] = useState<string[]>(() =>
    defaultValue === undefined ? [] : Array.isArray(defaultValue) ? defaultValue : [defaultValue],
  );

  const open = value ?? uncontrolled;

  const setOpen = useCallback(
    (next: string[]) => {
      if (value === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  const toggle = useCallback(
    (item: string) => {
      const isOpen = open.includes(item);
      if (type === 'single') setOpen(isOpen ? [] : [item]);
      else setOpen(isOpen ? open.filter((entry) => entry !== item) : [...open, item]);
    },
    [open, setOpen, type],
  );

  const onKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const root = rootRef.current;
    if (!root) return;

    const triggers = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-accordion-trigger]'));
    const index = triggers.indexOf(document.activeElement as HTMLButtonElement);
    if (index === -1) return;

    event.preventDefault();
    const last = triggers.length - 1;
    const next =
      event.key === 'ArrowDown' ? (index === last ? 0 : index + 1)
      : event.key === 'ArrowUp' ? (index === 0 ? last : index - 1)
      : event.key === 'Home' ? 0
      : last;
    triggers[next]?.focus();
  }, []);

  const context = useMemo<AccordionContextValue>(
    () => ({ isOpen: (item: string) => open.includes(item), toggle, baseId }),
    [open, toggle, baseId],
  );

  return (
    <AccordionContext.Provider value={context}>
      <div
        ref={rootRef}
        onKeyDown={onKeyDown}
        className={cn('border-t border-[var(--border)]', className)}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  );
}

export type AccordionItemProps = {
  value: string;
  title: React.ReactNode;
  /** Optional right-aligned metadata on the trigger row — counts, specs, prices. */
  meta?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

export function AccordionItem({ value, title, meta, className, children }: AccordionItemProps) {
  const { isOpen, toggle, baseId } = useAccordion('AccordionItem');
  const open = isOpen(value);
  const triggerId = `${baseId}-${value}-trigger`;
  const panelId = `${baseId}-${value}-panel`;

  return (
    <div className={cn('border-b border-[var(--border)]', className)}>
      <h3>
        <button
          type="button"
          id={triggerId}
          data-accordion-trigger
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => toggle(value)}
          data-cursor="link"
          className="group flex w-full items-center gap-6 py-5 text-left transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:text-[var(--fg)]"
        >
          <span className="t-h3 flex-1 text-[var(--fg)]">{title}</span>
          {meta ? <span className="t-spec shrink-0 text-[var(--fg-subtle)]">{meta}</span> : null}
          <Plus open={open} />
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            key="panel"
            id={panelId}
            role="region"
            aria-labelledby={triggerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1, transition: t.standard }}
            exit={{ height: 0, opacity: 0, transition: t.fast }}
            className="overflow-hidden"
          >
            <div className="t-pretty max-w-[var(--max-text)] pb-6 text-[var(--fg-muted)]">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** A plus that becomes a minus — drawn, not iconographic, to hold the hairline. */
function Plus({ open }: { open: boolean }) {
  return (
    <span aria-hidden className="relative block h-3 w-3 shrink-0 text-[var(--fg-subtle)] group-hover:text-[var(--fg)]">
      <span className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-current" />
      <span
        className={cn(
          'absolute top-0 left-1/2 h-full w-px -translate-x-1/2 bg-current',
          'transition-transform duration-[var(--d-standard)] ease-[var(--e-fold)]',
          open ? 'scale-y-0' : 'scale-y-100',
        )}
      />
    </span>
  );
}
