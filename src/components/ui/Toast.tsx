'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/lib/motion';
import { z as zIndex } from '@/lib/design-tokens';
import { Portal } from './Dialog';

/* ==========================================================================
   Toast — the only way VAYRO speaks to a user out-of-band. Never alert().
   Auto-dismiss, pause on hover or focus, max three on screen, polite live
   region so screen readers are informed without stealing focus.
   ========================================================================== */

export type ToastTone = 'default' | 'success' | 'error' | 'warning';

export type ToastOptions = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds on screen. Pass 0 to require a manual dismiss. */
  duration?: number;
  action?: { label: string; onClick: () => void };
};

type ToastRecord = Required<Pick<ToastOptions, 'title' | 'tone' | 'duration'>> &
  Omit<ToastOptions, 'title' | 'tone' | 'duration'> & { id: string };

type ToastApi = {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const MAX_VISIBLE = 3;
const DEFAULT_DURATION = 5000;

const TONE_ICON = {
  default: Info,
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
} as const;

const TONE_ACCENT: Record<ToastTone, string> = {
  default: 'bg-[var(--fg-subtle)]',
  success: 'bg-[var(--positive)]',
  error: 'bg-[var(--danger)]',
  warning: 'bg-[var(--warning)]',
};

const TONE_FG: Record<ToastTone, string> = {
  default: 'text-[var(--fg-subtle)]',
  success: 'text-[var(--positive)]',
  error: 'text-[var(--danger)]',
  warning: 'text-[var(--warning)]',
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef(new Map<string, { handle: number; startedAt: number; remaining: number }>());
  const counter = useRef(0);

  const clearTimer = useCallback((id: string) => {
    const entry = timers.current.get(id);
    if (entry) window.clearTimeout(entry.handle);
    timers.current.delete(id);
  }, []);

  const dismiss = useCallback(
    (id: string) => {
      clearTimer(id);
      setToasts((current) => current.filter((item) => item.id !== id));
    },
    [clearTimer],
  );

  const dismissAll = useCallback(() => {
    timers.current.forEach((entry) => window.clearTimeout(entry.handle));
    timers.current.clear();
    setToasts([]);
  }, []);

  const schedule = useCallback(
    (id: string, ms: number) => {
      if (ms <= 0) return;
      const handle = window.setTimeout(() => dismiss(id), ms);
      timers.current.set(id, { handle, startedAt: Date.now(), remaining: ms });
    },
    [dismiss],
  );

  const pause = useCallback((id: string) => {
    const entry = timers.current.get(id);
    if (!entry) return;
    window.clearTimeout(entry.handle);
    entry.remaining = Math.max(0, entry.remaining - (Date.now() - entry.startedAt));
  }, []);

  const resume = useCallback(
    (id: string) => {
      const entry = timers.current.get(id);
      if (!entry) return;
      entry.startedAt = Date.now();
      entry.handle = window.setTimeout(() => dismiss(id), entry.remaining);
    },
    [dismiss],
  );

  const toast = useCallback(
    ({ title, description, tone = 'default', duration = DEFAULT_DURATION, action }: ToastOptions) => {
      counter.current += 1;
      const id = `toast-${counter.current}`;
      const record: ToastRecord = { id, title, description, tone, duration, action };

      setToasts((current) => {
        const next = [...current, record];
        // Oldest falls off the stack so the newest message is always readable.
        const overflow = next.slice(0, Math.max(0, next.length - MAX_VISIBLE));
        overflow.forEach((item) => clearTimer(item.id));
        return next.slice(-MAX_VISIBLE);
      });

      schedule(id, duration);
      return id;
    },
    [clearTimer, schedule],
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((entry) => window.clearTimeout(entry.handle));
  }, []);

  const api = useMemo<ToastApi>(() => ({ toast, dismiss, dismissAll }), [toast, dismiss, dismissAll]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Portal>
        <div
          aria-live="polite"
          aria-atomic="false"
          className="pointer-events-none fixed inset-x-0 bottom-0 flex flex-col items-center gap-2 p-4 sm:inset-x-auto sm:right-[var(--gutter)] sm:bottom-[var(--gutter)] sm:items-end sm:p-0"
          style={{ zIndex: zIndex.toast }}
        >
          <AnimatePresence initial={false}>
            {toasts.map((item) => (
              <ToastCard
                key={item.id}
                toast={item}
                onDismiss={() => dismiss(item.id)}
                onPause={() => pause(item.id)}
                onResume={() => resume(item.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </Portal>
    </ToastContext.Provider>
  );
}

function ToastCard({
  toast,
  onDismiss,
  onPause,
  onResume,
}: {
  toast: ToastRecord;
  onDismiss: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  const Icon = TONE_ICON[toast.tone];

  return (
    <motion.div
      layout
      role="status"
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1, transition: t.standard }}
      exit={{ opacity: 0, y: 8, scale: 0.98, transition: t.fast }}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocusCapture={onPause}
      onBlurCapture={onResume}
      className={cn(
        'pointer-events-auto relative w-full overflow-hidden sm:w-[22rem]',
        'rounded-[var(--r-sm)] border border-[var(--border)] bg-[var(--bg-elevated)] shadow-[var(--sh-lg)]',
      )}
    >
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-[2px]', TONE_ACCENT[toast.tone])} />
      <div className="flex items-start gap-3 py-4 pr-3 pl-5">
        <Icon
          size={16}
          strokeWidth={1.25}
          strokeLinecap="square"
          strokeLinejoin="miter"
          aria-hidden
          className={cn('mt-0.5 shrink-0', TONE_FG[toast.tone])}
        />
        <div className="min-w-0 flex-1">
          <p className="t-label-sm text-[var(--fg)]">{toast.title}</p>
          {toast.description ? (
            <p className="t-body-sm t-pretty mt-1.5 text-[var(--fg-muted)]">{toast.description}</p>
          ) : null}
          {toast.action ? (
            <button
              type="button"
              onClick={() => {
                toast.action?.onClick();
                onDismiss();
              }}
              className="t-label-sm mt-3 inline-block text-[var(--fg)] underline underline-offset-4 decoration-[var(--border-strong)] transition-colors duration-[var(--d-fast)] hover:decoration-[var(--fg)]"
            >
              {toast.action.label}
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="-mt-1 -mr-1 inline-flex h-8 w-8 shrink-0 items-center justify-center text-[var(--fg-subtle)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
        >
          <X size={14} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden />
        </button>
      </div>
    </motion.div>
  );
}

/** Access the toast queue. Requires `ToastProvider` (mounted in Providers). */
export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used inside <ToastProvider>. It is mounted in src/components/providers/Providers.tsx.');
  }
  return context;
}
