'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';

/**
 * The order exists whether or not this screen renders — say that first, so
 * nobody is tempted to place it a second time.
 */
export default function ConfirmationError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[vayro:confirmation]', error);
  }, [error]);

  return (
    <div className="shell section-tight">
      <ErrorState
        title="We could not display your confirmation"
        body="Your order was placed — do not submit it again. The confirmation is also in your email, and every order is listed on your account."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="md" onClick={() => retry()}>
              Try again
            </Button>
            <ButtonLink href="/account" variant="secondary" size="md">
              View your orders
            </ButtonLink>
          </div>
        }
      />
      {error.digest ? (
        <p className="t-spec mt-6 text-center text-[var(--fg-subtle)]">
          Reference {error.digest}
        </p>
      ) : null}
    </div>
  );
}
