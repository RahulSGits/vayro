'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Check, Link2, Mail, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/components/ui/Toast';

/* ==========================================================================
   ShareRow — three ways out of the page, no third-party widgets.

   Nothing here loads a network script or reports a share back to a platform.
   The native sheet is offered only once the browser has confirmed it exists,
   which is after hydration — assuming it on the server would desynchronise the
   markup on every device that does not support it.
   ========================================================================== */

export type ShareRowProps = {
  title: string;
  /** Absolute URL. Built server-side so it is correct in email and previews. */
  url: string;
  /** Used as the mail body's opening line. */
  excerpt?: string;
  className?: string;
};

/** Never changes after load, so there is nothing to subscribe to. */
const noopSubscribe = () => () => {};

export function ShareRow({ title, url, excerpt, className }: ShareRowProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // False through the hydration render, then whatever the browser reports —
  // reading `navigator` during render would desynchronise the server markup.
  const canShare = useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    () => false,
  );

  useEffect(() => {
    if (!copied) return;
    const handle = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(handle);
  }, [copied]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: 'Link copied', description: url, tone: 'success' });
    } catch {
      toast({
        title: 'Could not copy the link',
        description: 'Your browser blocked clipboard access. Copy it from the address bar instead.',
        tone: 'error',
      });
    }
  }, [toast, url]);

  const share = useCallback(async () => {
    try {
      await navigator.share({ title, text: excerpt, url });
    } catch (error) {
      // A dismissed sheet is not a failure — only report a genuine one.
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast({
        title: 'Sharing is unavailable',
        description: 'Use the copy-link option instead.',
        tone: 'error',
      });
    }
  }, [excerpt, title, toast, url]);

  const mailHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
    `${excerpt ? `${excerpt}\n\n` : ''}${url}`,
  )}`;

  const item =
    't-label-sm inline-flex items-center gap-2.5 border border-[var(--border-strong)] px-4 py-2.5 ' +
    'text-[var(--fg-muted)] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] ' +
    'hover:border-[var(--fg)] hover:text-[var(--fg)]';

  return (
    <div className={cn('flex flex-wrap items-center gap-x-6 gap-y-4', className)}>
      <p className="t-label-sm text-[var(--fg-subtle)]">Share</p>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={copy} data-cursor="link" className={item}>
          {copied ? (
            <Check size={14} strokeWidth={1.25} aria-hidden />
          ) : (
            <Link2 size={14} strokeWidth={1.25} aria-hidden />
          )}
          {copied ? 'Copied' : 'Copy link'}
        </button>

        <a href={mailHref} data-cursor="link" className={item}>
          <Mail size={14} strokeWidth={1.25} aria-hidden />
          Email
        </a>

        {canShare ? (
          <button type="button" onClick={share} data-cursor="link" className={item}>
            <Share2 size={14} strokeWidth={1.25} aria-hidden />
            Share
          </button>
        ) : null}
      </div>
    </div>
  );
}
