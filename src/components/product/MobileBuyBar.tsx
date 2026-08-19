'use client';

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn, formatPrice } from '@/lib/utils';
import { t } from '@/lib/motion';
import { z as zIndex } from '@/lib/design-tokens';
import { Button } from '@/components/ui/Button';
import { useProductState } from './ProductProvider';

/* ==========================================================================
   MobileBuyBar — the sticky purchase rail on small screens.

   It appears only once the real buy panel has left the viewport, so it never
   competes with the controls it mirrors. When no size is chosen it returns you
   to the selector instead of failing silently.
   ========================================================================== */

export function MobileBuyBar({ anchorId }: { anchorId: string }) {
  const { product, colorway, size, variant, blockedReason, addToCart } =
    useProductState('MobileBuyBar');
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorId]);

  const needsSize = blockedReason === 'Select a size';
  const price = variant?.priceOverride ?? product.price;

  return (
    <AnimatePresence>
      {shown ? (
        <motion.div
          key="buy-bar"
          initial={{ y: '100%' }}
          animate={{ y: 0, transition: t.standard }}
          exit={{ y: '100%', transition: t.fast }}
          style={{ zIndex: zIndex.sticky }}
          className={cn(
            'fixed inset-x-0 bottom-0 lg:hidden',
            'border-t border-[var(--border)] bg-[var(--bg)]',
            'px-[var(--gutter)] pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]',
          )}
        >
          <div className="flex items-center gap-4">
            <div className="min-w-0 flex-1">
              <p className="t-label-sm truncate text-[var(--fg-subtle)]">{product.name}</p>
              <p className="t-caption truncate text-[var(--fg-muted)]">
                {formatPrice(price, product.currency)} · {colorway}
                {size ? `, ${size}` : ''}
              </p>
            </div>
            <Button
              size="md"
              className="shrink-0"
              onClick={() => {
                if (needsSize) {
                  document.getElementById(anchorId)?.scrollIntoView({ block: 'center' });
                  return;
                }
                addToCart();
              }}
              disabled={Boolean(blockedReason) && !needsSize}
            >
              {needsSize ? 'Select size' : blockedReason ? 'Sold out' : 'Add to cart'}
            </Button>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
