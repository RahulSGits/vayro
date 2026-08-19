'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';

/**
 * The bag itself is held in the browser, so nothing here is lost — only the
 * page around it failed to render.
 */
export default function CartError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error('[vayro:cart]', error);
  }, [error]);

  return (
    <div className="shell section-tight">
      <ErrorState
        title="We could not load your cart"
        body="Your bag is stored on this device and is intact. Try again, or head back to the shop and return in a moment."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button size="md" onClick={() => retry()}>
              Try again
            </Button>
            <ButtonLink href="/shop" variant="secondary" size="md">
              Browse equipment
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
