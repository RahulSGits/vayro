'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';

/**
 * Segment error boundary. Server errors reach the client with a generic
 * message and a digest, so the digest is surfaced — it is the only thing that
 * ties this screen to a server log line.
 */
export default function AdminError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[vayro:admin]', error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col justify-center py-16" role="alert">
      <p className="t-label-sm text-[var(--danger)]">Error</p>
      <h1 className="t-h1 t-balance mt-5 max-w-[20ch]">This screen could not be loaded.</h1>
      <p className="t-body-sm t-pretty mt-4 max-w-[54ch] text-[var(--fg-muted)]">
        The request failed before the data was ready. Nothing has been changed. Try again — if it keeps
        failing, the database connection or a permission is likely at fault.
      </p>

      {error.digest ? (
        <p className="t-spec mt-6 text-[var(--fg-subtle)]">
          Reference <span className="text-[var(--fg-muted)]">{error.digest}</span>
        </p>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3">
        <Button onClick={() => retry()} size="sm">Try again</Button>
        <ButtonLink href="/admin" variant="secondary" size="sm">Back to dashboard</ButtonLink>
      </div>
    </div>
  );
}
