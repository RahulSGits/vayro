'use client';

import { useSyncExternalStore } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWishlist } from '@/store/wishlist';

const noopSubscribe = () => () => {};

/**
 * False for exactly one render. The wishlist rehydrates from localStorage
 * before React runs, so the filled state must not be painted on the server.
 */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

type Props = {
  productId: string;
  productName: string;
  /** `icon` is the card overlay; `inline` sits in the PDP action row. */
  variant?: 'icon' | 'inline';
  className?: string;
};

export function WishlistButton({ productId, productName, variant = 'icon', className }: Props) {
  const hydrated = useHydrated();
  const toggle = useWishlist((state) => state.toggle);
  const saved = useWishlist((state) => state.ids.includes(productId)) && hydrated;

  const label = saved ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`;

  if (variant === 'inline') {
    return (
      <button
        type="button"
        onClick={() => toggle(productId)}
        aria-pressed={saved}
        aria-label={label}
        data-cursor="link"
        className={cn(
          't-label inline-flex h-12 items-center justify-center gap-3 px-5',
          'border border-[var(--border-strong)] text-[var(--fg)]',
          'transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
          'hover:border-[var(--fg)]',
          className,
        )}
      >
        <Heart
          size={15}
          strokeWidth={1.25}
          aria-hidden
          className={cn('transition-transform duration-[var(--d-fast)]', saved && 'scale-110')}
          fill={saved ? 'currentColor' : 'none'}
        />
        {saved ? 'Saved' : 'Save'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle(productId)}
      aria-pressed={saved}
      aria-label={label}
      data-cursor="link"
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center',
        'bg-[color-mix(in_oklab,var(--bg)_82%,transparent)] backdrop-blur-[2px]',
        'text-[var(--fg)] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)]',
        'hover:bg-[var(--bg)]',
        className,
      )}
    >
      <Heart
        size={15}
        strokeWidth={1.25}
        aria-hidden
        fill={saved ? 'currentColor' : 'none'}
        className={cn('transition-transform duration-[var(--d-fast)] ease-[var(--e-out)]', saved && 'scale-110')}
      />
    </button>
  );
}
