'use client';

import { useId, useRef } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';
import { cn } from '@/lib/utils';
import { drawer, t } from '@/lib/motion';
import { z as zIndex } from '@/lib/design-tokens';
import { CloseButton, Overlay, Portal, useEscapeKey, useFocusTrap, useScrollLock } from './Dialog';

/* ==========================================================================
   Drawer — the side sheet. Cart, filters and the mobile menu all sit on this.
   Built on the same portal / trap / lock primitives as Dialog.
   ========================================================================== */

export type DrawerSide = 'right' | 'left' | 'bottom';

const bottomSheet: Variants = {
  hidden: { y: '100%' },
  show: { y: 0, transition: t.fold },
  exit: { y: '100%', transition: { ...t.standard } },
};

const SIZES = {
  sm: 'max-w-[22rem]',
  md: 'max-w-[27rem]',
  lg: 'max-w-[34rem]',
  full: 'max-w-none',
} as const;

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  side?: DrawerSide;
  /** Width for left/right sheets. Ignored for `bottom`. */
  size?: keyof typeof SIZES;
  /** Visible heading rendered in the sheet header. */
  title?: string;
  /** Accessible name when no visible title is rendered. */
  label?: string;
  /** Replaces the default header entirely. */
  header?: React.ReactNode;
  footer?: React.ReactNode;
  showClose?: boolean;
  dismissible?: boolean;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
};

export function Drawer({
  open,
  onClose,
  side = 'right',
  size = 'md',
  title,
  label,
  header,
  footer,
  showClose = true,
  dismissible = true,
  className,
  bodyClassName,
  children,
}: DrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const titleId = title ? `${id}-title` : undefined;

  useScrollLock(open);
  useFocusTrap(panelRef, open);
  useEscapeKey(open && dismissible, onClose);

  const isBottom = side === 'bottom';
  const variants = isBottom ? bottomSheet : (drawer as Variants);

  return (
    <Portal>
      <AnimatePresence custom={side}>
        {/* Keyed so AnimatePresence can release the sheet when it exits. */}
        {open ? (
          <div key="drawer" className="fixed inset-0" style={{ zIndex: zIndex.drawer }}>
            <Overlay onClick={dismissible ? onClose : undefined} />

            <motion.aside
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              aria-label={titleId ? undefined : (label ?? 'Panel')}
              tabIndex={-1}
              custom={side}
              variants={variants}
              initial="hidden"
              animate="show"
              exit="exit"
              className={cn(
                'absolute flex flex-col outline-none',
                'border-[var(--border)] bg-[var(--bg)] shadow-[var(--sh-xl)]',
                isBottom
                  ? 'inset-x-0 bottom-0 max-h-[85vh] w-full border-t'
                  : 'inset-y-0 w-full',
                side === 'right' && 'right-0 border-l',
                side === 'left' && 'left-0 border-r',
                !isBottom && SIZES[size],
                className,
              )}
            >
              {header ?? (title || showClose ? (
                <header className="flex shrink-0 items-center justify-between gap-4 border-b border-[var(--border)] px-[var(--gutter)] py-5">
                  {title ? (
                    <h2 id={titleId} className="t-label text-[var(--fg-muted)]">
                      {title}
                    </h2>
                  ) : (
                    <span />
                  )}
                  {showClose ? <CloseButton onClick={onClose} className="-mr-3" /> : null}
                </header>
              ) : null)}

              <div className={cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', bodyClassName)}>
                {children}
              </div>

              {footer ? (
                <div className="shrink-0 border-t border-[var(--border)]">{footer}</div>
              ) : null}
            </motion.aside>
          </div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
