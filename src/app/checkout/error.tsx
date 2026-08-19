'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';

/**
 * A render failure inside checkout never touches a payment: the card is only
 * authorised by an explicit action on the review step. Say so plainly.
 */
export default function CheckoutError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[vayro:checkout]', error);
  }, [error]);

  return (
    <div className="shell section-tight">
      <ErrorState
        title="Checkout could not be opened"
        body="Nothing has been charged and your bag is untouched. Try again — if it keeps failing, your details are saved for this session and will still be here."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="md" onClick={() => retry()}>
              Try again
            </Button>
            <ButtonLink href="/cart" variant="secondary" size="md">
              Back to cart
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
