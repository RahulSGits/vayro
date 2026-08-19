'use client';

import { useEffect } from 'react';
import { Button, ButtonLink, ErrorState } from '@/components/ui';

/**
 * Account-scoped error boundary. A failure reading orders should cost the
 * account screen, not the whole site — the header, footer and cart survive.
 */
export default function AccountError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[vayro:account]', error);
  }, [error]);

  return (
    <div className="shell section">
      <ErrorState
        title="We could not load your account"
        body="The request failed on our side. Nothing has changed on your account — try again, and if it keeps happening the order history is safe."
        action={
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button type="button" size="md" onClick={reset}>
              Try again
            </Button>
            <ButtonLink href="/" variant="secondary" size="md">
              Back to the site
            </ButtonLink>
          </div>
        }
      />
      {error.digest ? (
        <p className="t-spec mt-8 text-center text-[var(--fg-subtle)]">
          Reference {error.digest}
        </p>
      ) : null}
    </div>
  );
}
