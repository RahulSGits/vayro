'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, ButtonLink } from '@/components/ui/Button';
import { VayroMark } from '@/components/brand';

/* ==========================================================================
   Root error boundary.

   Catches anything thrown below the root layout that a nested `error.tsx`
   did not already handle. The header, footer and theme survive — only the
   page content is replaced — so this file owns one column of recovery, not a
   whole document. (`global-error.tsx` handles the case where the layout
   itself fails.)

   `retry()` re-fetches and re-renders the boundary's children, which is the
   right first move: most failures here are a transient read, not a broken
   build. The digest is surfaced verbatim so a customer can quote it and it
   matches a server log line exactly.
   ========================================================================== */

export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[vayro:root]', error);
  }, [error]);

  return (
    <div className="shell section">
      <div className="grid-12 items-start">
        <div className="col-span-4 md:col-span-8 lg:col-span-7">
          <p className="t-label-sm flex items-center gap-3 text-[var(--danger)]">
            <VayroMark size={14} />
            <span>Something failed</span>
          </p>

          <h1 className="t-display-md t-balance mt-8 max-w-[18ch]">
            This page didn&rsquo;t load.
          </h1>

          <p className="t-body-lg t-pretty mt-8 max-w-[46ch] text-[var(--fg-muted)]">
            The fault is ours, not yours, and nothing you were doing has been lost — your bag is
            held on this device. Try the page again; if it fails a second time, the rest of the
            site is unaffected.
          </p>

          <div className="mt-11 flex flex-wrap gap-3">
            <Button size="lg" onClick={() => retry()}>
              Try again
            </Button>
            <ButtonLink href="/shop" variant="secondary" size="lg">
              Shop everything
            </ButtonLink>
            <ButtonLink href="/" variant="quiet" size="lg">
              Home
            </ButtonLink>
          </div>
        </div>

        {/* --------------------------------------------------------- reference */}
        <div className="col-span-4 md:col-span-8 lg:col-span-4 lg:col-start-9">
          <p className="t-label-sm text-[var(--fg-subtle)]">Reference</p>
          <dl className="mt-6 border-t border-[var(--border)]">
            <div className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-4">
              <dt className="t-caption text-[var(--fg-muted)]">Digest</dt>
              <dd className="t-spec text-[var(--fg)]">{error.digest ?? 'Not recorded'}</dd>
            </div>
            <div className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-4">
              <dt className="t-caption text-[var(--fg-muted)]">Scope</dt>
              <dd className="t-spec text-[var(--fg)]">PAGE CONTENT</dd>
            </div>
            <div className="flex items-baseline justify-between gap-6 border-b border-[var(--border)] py-4">
              <dt className="t-caption text-[var(--fg-muted)]">Your bag</dt>
              <dd className="t-spec text-[var(--fg)]">INTACT</dd>
            </div>
          </dl>
          <p className="t-caption t-pretty mt-8 text-[var(--fg-muted)]">
            If this keeps happening, quote the digest to{' '}
            <Link
              href="/contact"
              className="underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--fg)]"
            >
              our team
            </Link>{' '}
            and we can find the exact request in the logs.
          </p>
        </div>
      </div>
    </div>
  );
}
