'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ==========================================================================
   CopyValue — a mono value with a copy affordance.

   Used for tracking numbers and order references, the two things people paste
   into someone else's form. Degrades to plain text when the clipboard is
   unavailable (insecure origin, older browser) rather than offering a control
   that silently fails.
   ========================================================================== */

const noopSubscribe = () => () => {};

/** False on the server and for the hydration render, then the real answer. */
function useClipboard() {
  return useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== 'undefined' && Boolean(navigator.clipboard),
    () => false,
  );
}

export function CopyValue({
  value,
  label,
  className,
}: {
  value: string;
  /** Announced to screen readers, e.g. "tracking number". */
  label: string;
  className?: string;
}) {
  const clipboard = useClipboard();
  const [refused, setRefused] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const handle = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(handle);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Permission denied or a non-secure context — fall back to plain text
      // rather than leaving a button that does nothing.
      setRefused(true);
    }
  }

  if (!clipboard || refused) {
    return <span className={cn('t-spec text-[var(--fg)]', className)}>{value}</span>;
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        't-spec group inline-flex items-center gap-2 text-[var(--fg)]',
        'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:text-[var(--fg-muted)]',
        className,
      )}
    >
      <span>{value}</span>
      {copied ? (
        <Check size={13} strokeWidth={1.5} strokeLinecap="square" strokeLinejoin="miter" aria-hidden className="text-[var(--positive)]" />
      ) : (
        <Copy size={13} strokeWidth={1.25} strokeLinecap="square" strokeLinejoin="miter" aria-hidden className="opacity-45 transition-opacity duration-[var(--d-fast)] group-hover:opacity-100" />
      )}
      <span className="sr-only">{copied ? `${label} copied` : `Copy ${label}`}</span>
    </button>
  );
}
