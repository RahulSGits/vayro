'use client';

import { useEffect, useId, useRef, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fadeIn, t } from '@/lib/motion';
import { z as zIndex } from '@/lib/design-tokens';

/* ==========================================================================
   Overlay primitives.
   Dialog, Drawer, SearchOverlay and the cart sheet all share this machinery:
   one portal, one scroll lock, one focus trap, one Escape contract.
   ========================================================================== */

const noopSubscribe = () => () => {};

/** Renders into document.body once the client has hydrated. SSR-safe. */
export function Portal({ children }: { children: React.ReactNode }) {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  return hydrated ? createPortal(children, document.body) : null;
}

/* ------------------------------------------------------------ scroll lock */

let lockCount = 0;
let restore: { overflow: string; paddingRight: string } | null = null;

/**
 * Locks the document scroller while an overlay is open. Nested overlays are
 * reference-counted, and the scrollbar gutter is published as
 * `--scrollbar-gap` so fixed chrome (the header) can compensate.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    const body = document.body;

    if (lockCount === 0) {
      const gap = window.innerWidth - root.clientWidth;
      restore = { overflow: root.style.overflow, paddingRight: body.style.paddingRight };
      root.style.overflow = 'hidden';
      if (gap > 0) {
        body.style.paddingRight = `${gap}px`;
        root.style.setProperty('--scrollbar-gap', `${gap}px`);
      }
    }
    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0 && restore) {
        root.style.overflow = restore.overflow;
        body.style.paddingRight = restore.paddingRight;
        root.style.removeProperty('--scrollbar-gap');
        restore = null;
      }
    };
  }, [active]);
}

/* ------------------------------------------------------------- focus trap */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusables(node: HTMLElement) {
  return Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement,
  );
}

/**
 * Traps Tab inside `ref` while active, moves focus in on open and returns it
 * to the trigger on close. Honours `[data-autofocus]` for the initial target.
 */
export function useFocusTrap(ref: React.RefObject<HTMLElement | null>, active: boolean) {
  useEffect(() => {
    if (!active) return;
    const node = ref.current;
    if (!node) return;

    const previous = document.activeElement as HTMLElement | null;
    // Deferred by a task, not a frame: a backgrounded tab never paints, and the
    // overlay must still be keyboard-operable the moment it is looked at again.
    const entry = window.setTimeout(() => {
      const target = node.querySelector<HTMLElement>('[data-autofocus]') ?? focusables(node)[0] ?? node;
      target.focus({ preventScroll: true });
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const items = focusables(node);
      if (items.length === 0) {
        event.preventDefault();
        node.focus({ preventScroll: true });
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const current = document.activeElement as HTMLElement | null;
      const outside = !current || !node.contains(current);

      if (event.shiftKey && (outside || current === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || current === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(entry);
      document.removeEventListener('keydown', onKeyDown, true);
      if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [ref, active]);
}

/** Closes the topmost overlay on Escape. */
export function useEscapeKey(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onEscape();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, onEscape]);
}

/* ---------------------------------------------------------------- overlay */

export function Overlay({ onClick, className }: { onClick?: () => void; className?: string }) {
  return (
    <motion.div
      aria-hidden
      onClick={onClick}
      variants={fadeIn}
      initial="hidden"
      animate="show"
      exit="hidden"
      className={cn('absolute inset-0 bg-[var(--overlay)] backdrop-blur-[3px]', className)}
    />
  );
}

/** Dismiss control shared by every overlay surface. */
export function CloseButton({
  onClick, label = 'Close', className,
}: { onClick: () => void; label?: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      data-cursor="link"
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center text-[var(--fg-muted)]',
        'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:text-[var(--fg)]',
        className,
      )}
    >
      <X size={18} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
    </button>
  );
}

/* ----------------------------------------------------------------- dialog */

const SIZES = {
  sm: 'max-w-[26rem]',
  md: 'max-w-[34rem]',
  lg: 'max-w-[48rem]',
  full: 'max-w-[min(72rem,100%)]',
} as const;

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  /** Visible heading. Omit and pass `label` for an unlabelled surface. */
  title?: string;
  /** Accessible name when no visible title is rendered. */
  label?: string;
  description?: string;
  size?: keyof typeof SIZES;
  /** Clicking the scrim closes. Disable for destructive confirmations. */
  dismissible?: boolean;
  showClose?: boolean;
  footer?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
};

/**
 * Accessible modal — portalled, scroll-locked, focus-trapped, Escape-aware.
 * Animation is driven by AnimatePresence so exits are never cut short.
 */
export function Dialog({
  open,
  onClose,
  title,
  label,
  description,
  size = 'md',
  dismissible = true,
  showClose = true,
  footer,
  className,
  children,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const titleId = title ? `${id}-title` : undefined;
  const descId = description ? `${id}-desc` : undefined;

  useScrollLock(open);
  useFocusTrap(panelRef, open);
  useEscapeKey(open && dismissible, onClose);

  return (
    <Portal>
      <AnimatePresence>
        {/* AnimatePresence tracks children by key — without one the exiting
            surface is never released and the overlay stays in the DOM. */}
        {open ? (
          <div key="dialog" className="fixed inset-0" style={{ zIndex: zIndex.modal }}>
            <Overlay onClick={dismissible ? onClose : undefined} />

            <div className="pointer-events-none absolute inset-0 grid place-items-center overflow-y-auto p-[var(--gutter)]">
              <motion.div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-label={titleId ? undefined : (label ?? 'Dialog')}
                aria-describedby={descId}
                tabIndex={-1}
                initial={{ opacity: 0, y: 14, scale: 0.99 }}
                animate={{ opacity: 1, y: 0, scale: 1, transition: t.standard }}
                exit={{ opacity: 0, y: 8, scale: 0.995, transition: t.fast }}
                className={cn(
                  'pointer-events-auto relative w-full rounded-[var(--r-sm)] outline-none',
                  'border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--sh-xl)]',
                  SIZES[size],
                  className,
                )}
              >
                {title || showClose ? (
                  <header className="flex items-start justify-between gap-6 border-b border-[var(--border)] px-6 py-5 sm:px-8">
                    <div className="min-w-0">
                      {title ? (
                        <h2 id={titleId} className="t-h3">
                          {title}
                        </h2>
                      ) : null}
                      {description ? (
                        <p id={descId} className="t-body-sm mt-1 text-[var(--fg-muted)]">
                          {description}
                        </p>
                      ) : null}
                    </div>
                    {showClose ? <CloseButton onClick={onClose} className="-mr-2 -mt-1 shrink-0" /> : null}
                  </header>
                ) : null}

                <div className="px-6 py-6 sm:px-8">{children}</div>

                {footer ? (
                  <footer className="flex flex-wrap items-center justify-end gap-3 border-t border-[var(--border)] px-6 py-4 sm:px-8">
                    {footer}
                  </footer>
                ) : null}
              </motion.div>
            </div>
          </div>
        ) : null}
      </AnimatePresence>
    </Portal>
  );
}
