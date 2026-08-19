'use client';

import { useEffect } from 'react';
import { Button, ButtonLink, ErrorState } from '@/components/ui';

/** Keeps a failed auth render inside the form column rather than the whole page. */
export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[vayro:auth]', error);
  }, [error]);

  return (
    <ErrorState
      title="This screen failed to load"
      body="Nothing was submitted and no account was changed. Try again, or head back to the site."
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
  );
}
