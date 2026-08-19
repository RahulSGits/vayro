'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';
import { Button, ButtonLink, EmptyState, Skeleton } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { ProductCard } from '@/components/product/ProductCard';
import { defaultColorway, variantsFor } from '@/components/product/product-utils';
import { useWishlist } from '@/store/wishlist';
import { useCart } from '@/store/cart';
import type { Product, ProductVariant } from '@/types';

/* ==========================================================================
   WishlistGrid

   The saved list lives in a persisted client store, so the grid is assembled
   in the browser from the catalogue the server sent. Until the store has
   rehydrated it shows skeletons rather than an empty state — telling someone
   their wishlist is empty when it is not is the worst available outcome.

   "Move to bag" only appears when there is exactly one thing it could add.
   Anything with a size decision routes to the product page instead of
   guessing on the customer's behalf.
   ========================================================================== */

const noopSubscribe = () => () => {};

function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * The single purchasable variant, or null when a choice has to be made.
 *
 * Mirrors the rule `ProductCard`'s quick-add uses: a colourway with one size
 * needs no decision, so it can go straight into the bag. A size run does, and
 * routes to the product page instead of guessing.
 */
function unambiguousVariant(product: Product): ProductVariant | null {
  const variants = variantsFor(product, defaultColorway(product));
  if (variants.length !== 1) return null;
  const only = variants[0];
  return only.available && only.stock > 0 ? only : null;
}

export function WishlistGrid({ products }: { products: Product[] }) {
  const hydrated = useHydrated();
  const ids = useWishlist((state) => state.ids);
  const toggle = useWishlist((state) => state.toggle);
  const add = useCart((state) => state.add);
  const setCartOpen = useCart((state) => state.setOpen);
  const { toast } = useToast();

  if (!hydrated) {
    return (
      <div className="grid gap-x-[var(--gutter)] gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="flex flex-col gap-4">
            <Skeleton className="aspect-[3/4] w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const saved = ids
    .map((id) => products.find((product) => product.id === id))
    .filter((product): product is Product => Boolean(product));

  // An id with no matching product means the piece has been unpublished or
  // withdrawn. Say so rather than silently shrinking the list.
  const missing = ids.length - saved.length;

  if (saved.length === 0) {
    return (
      <EmptyState
        title="Nothing saved"
        body="Save a piece from the shop and it waits here until you decide."
        action={<ButtonLink href="/shop" size="md">Browse the shop</ButtonLink>}
      />
    );
  }

  function moveToBag(product: Product, variant: ProductVariant) {
    add(product, variant, 1);
    toggle(product.id);
    toast({
      title: 'Moved to bag',
      description: `${product.name} — ${variant.colorway}, ${variant.size}`,
      tone: 'success',
      action: { label: 'Open bag', onClick: () => setCartOpen(true) },
    });
  }

  return (
    <div className="flex flex-col gap-10">
      <div className="grid gap-x-[var(--gutter)] gap-y-14 sm:grid-cols-2 xl:grid-cols-3">
        {saved.map((product, index) => {
          const variant = unambiguousVariant(product);
          return (
            <div key={product.id} className="flex flex-col">
              <ProductCard product={product} priority={index < 3} />

              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-5">
                {variant ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => moveToBag(product, variant)}
                  >
                    Move to bag
                  </Button>
                ) : (
                  <ButtonLink href={`/product/${product.slug}`} variant="secondary" size="sm">
                    Choose size
                  </ButtonLink>
                )}

                <button
                  type="button"
                  onClick={() => toggle(product.id)}
                  className="t-label-sm ml-auto text-[var(--fg-subtle)] transition-colors duration-[var(--d-fast)] hover:text-[var(--fg)]"
                >
                  Remove
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {missing > 0 ? (
        <p className="t-caption border-t border-[var(--border)] pt-6 text-[var(--fg-subtle)]">
          {missing === 1
            ? 'One saved piece is no longer available and is not shown.'
            : `${missing} saved pieces are no longer available and are not shown.`}{' '}
          <Link
            href="/shop"
            className="underline decoration-[var(--border-strong)] underline-offset-4 hover:text-[var(--fg)]"
          >
            See what replaced them
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
