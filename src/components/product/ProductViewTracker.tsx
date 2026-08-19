'use client';

import { useEffect } from 'react';
import { track } from '@/lib/analytics';
import type { Currency } from '@/types';

/**
 * Fires the product_view event once per product. Rendering nothing keeps the
 * PDP itself a Server Component — this is the only client cost of tracking.
 */
export function ProductViewTracker({
  productId,
  slug,
  price,
  currency,
}: {
  productId: string;
  slug: string;
  price: number;
  currency: Currency;
}) {
  useEffect(() => {
    track('product_view', { productId, slug, price, currency });
  }, [productId, slug, price, currency]);

  return null;
}
