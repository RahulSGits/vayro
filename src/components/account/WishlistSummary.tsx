'use client';

import { useSyncExternalStore } from 'react';
import { useWishlist } from '@/store/wishlist';
import { StatFigure } from './AccountShell';

const noopSubscribe = () => () => {};

/**
 * The wishlist lives in a persisted client store, so its count cannot be
 * rendered on the server without a hydration mismatch. It shows an em dash for
 * exactly one frame, then the real number.
 */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function WishlistSummary() {
  const hydrated = useHydrated();
  const count = useWishlist((state) => state.ids.length);

  return (
    <StatFigure
      label="Saved"
      value={hydrated ? String(count) : '—'}
      note={
        !hydrated
          ? 'Reading your saved pieces.'
          : count === 0
            ? 'Nothing saved yet.'
            : count === 1
              ? 'One piece waiting on a decision.'
              : `${count} pieces waiting on a decision.`
      }
      href="/account/wishlist"
    />
  );
}
