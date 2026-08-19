'use client';

import { createContext, useCallback, useContext, useId, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import { fadeIn, t } from '@/lib/motion';

/* ==========================================================================
   Tabs — WAI-ARIA tab pattern with a roving tabindex and automatic activation.
   Arrow keys move, Home/End jump, the indicator travels with a shared layoutId.
   ========================================================================== */

type TabsContextValue = {
  value: string;
  setValue: (value: string) => void;
  baseId: string;
  indicatorId: string;
  orientation: 'horizontal' | 'vertical';
};

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabs(component: string) {
  const context = useContext(TabsContext);
  if (!context) throw new Error(`<${component}> must be used inside <Tabs>.`);
  return context;
}

export type TabsProps = {
  defaultValue: string;
  /** Controlled selection. Pair with `onValueChange`. */
  value?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  children: React.ReactNode;
};

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  orientation = 'horizontal',
  className,
  children,
}: TabsProps) {
  const baseId = useId();
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const active = value ?? uncontrolled;

  const setValue = useCallback(
    (next: string) => {
      if (value === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [value, onValueChange],
  );

  const context = useMemo<TabsContextValue>(
    () => ({ value: active, setValue, baseId, indicatorId: `${baseId}-indicator`, orientation }),
    [active, setValue, baseId, orientation],
  );

  return (
    <TabsContext.Provider value={context}>
      <div className={cn(orientation === 'vertical' && 'flex gap-10', className)}>{children}</div>
    </TabsContext.Provider>
  );
}

export function TabsList({
  label,
  className,
  children,
}: {
  /** Accessible name for the tab set — required by the pattern. */
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { orientation } = useTabs('TabsList');
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const horizontalKeys = ['ArrowLeft', 'ArrowRight'];
      const verticalKeys = ['ArrowUp', 'ArrowDown'];
      const keys = orientation === 'vertical' ? verticalKeys : horizontalKeys;
      if (![...keys, 'Home', 'End'].includes(event.key)) return;

      const list = listRef.current;
      if (!list) return;
      const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>('[role="tab"]:not([disabled])'));
      const index = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (index === -1) return;

      event.preventDefault();
      const last = tabs.length - 1;
      const forward = event.key === keys[1];
      const next =
        event.key === 'Home' ? 0
        : event.key === 'End' ? last
        : forward ? (index === last ? 0 : index + 1)
        : (index === 0 ? last : index - 1);

      tabs[next]?.focus();
      tabs[next]?.click();
    },
    [orientation],
  );

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={label}
      aria-orientation={orientation}
      onKeyDown={onKeyDown}
      className={cn(
        'relative',
        orientation === 'vertical'
          ? 'flex shrink-0 flex-col items-start gap-1 border-l border-[var(--border)] pl-0'
          : 'flex gap-8 overflow-x-auto border-b border-[var(--border)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function TabsTrigger({
  value,
  disabled,
  className,
  children,
}: {
  value: string;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const { value: active, setValue, baseId, indicatorId, orientation } = useTabs('TabsTrigger');
  const selected = active === value;

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-tab-${value}`}
      aria-selected={selected}
      aria-controls={`${baseId}-panel-${value}`}
      tabIndex={selected ? 0 : -1}
      disabled={disabled}
      onClick={() => setValue(value)}
      data-cursor="link"
      className={cn(
        't-label relative whitespace-nowrap transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
        orientation === 'vertical' ? 'py-2.5 pl-5 text-left' : 'py-4',
        selected ? 'text-[var(--fg)]' : 'text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]',
        disabled && 'pointer-events-none opacity-40',
        className,
      )}
    >
      {children}
      {selected ? (
        <motion.span
          layoutId={indicatorId}
          aria-hidden
          transition={t.standard}
          className={cn(
            'absolute bg-[var(--fg)]',
            orientation === 'vertical' ? 'top-0 -left-px h-full w-px' : '-bottom-px left-0 h-px w-full',
          )}
        />
      ) : null}
    </button>
  );
}

export function TabsContent({
  value,
  className,
  children,
}: {
  value: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { value: active, baseId } = useTabs('TabsContent');
  const selected = active === value;

  return (
    <div
      role="tabpanel"
      id={`${baseId}-panel-${value}`}
      aria-labelledby={`${baseId}-tab-${value}`}
      hidden={!selected}
      tabIndex={0}
      className={cn('outline-none', className)}
    >
      {selected ? (
        <motion.div variants={fadeIn} initial="hidden" animate="show">
          {children}
        </motion.div>
      ) : null}
    </div>
  );
}
