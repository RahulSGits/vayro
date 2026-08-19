'use client';

import { useCallback, useState } from 'react';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { ProductViewer } from '@/components/product-3d/ProductViewer';
import { ViewerFallback } from '@/components/product-3d/ViewerFallback';
import { ARProductLauncher } from './ARProductLauncher';

/* ==========================================================================
   ARStage — the stack of ways to look at the product, in order of cost.

     plate    the product photograph, which is what loads first
     3D       the interactive viewer, on request
     AR       the product in the reader's own room, where the device allows it

   The ladder runs both ways. This is the page a phone camera lands on from a
   QR code, on whatever connection the reader happens to be standing in, so
   WebGL is not started until somebody asks for it. And when an AR view opens,
   the page's viewer is unmounted rather than left running: two live WebGL
   contexts on a phone that is also running a camera and a pose tracker is a
   budget worth not spending.
   ========================================================================== */

export type ARStageProps = {
  product: Product;
  /** Colourway name or hex. Carried into both the 3D and the AR views. */
  colorway?: string;
  className?: string;
};

export function ARStage({ product, colorway, className }: ARStageProps) {
  const [revealed, setRevealed] = useState(false);
  const [arOpen, setArOpen] = useState(false);

  const reveal = useCallback(() => setRevealed(true), []);
  const live = revealed && !arOpen;

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      <div className="relative aspect-[4/5] w-full overflow-hidden border border-[var(--border)] bg-[var(--bg-sunken)] sm:aspect-[4/3]">
        {live ? (
          <ProductViewer
            productSlug={product.slug}
            product={product}
            colorway={colorway}
            className="h-full w-full"
          />
        ) : (
          <>
            <ViewerFallback
              product={product}
              variant="plate"
              className="h-full w-full"
              alt={`${product.name}, studio`}
              priority
              sizes="(min-width: 1024px) 640px, 100vw"
            />
            <div className="absolute inset-x-0 bottom-0 flex justify-center p-4">
              <Button
                variant="secondary"
                onClick={reveal}
                className="border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-md"
              >
                View in 3D
              </Button>
            </div>
          </>
        )}
      </div>

      <ARProductLauncher
        product={product}
        colorway={colorway}
        onOpenChange={setArOpen}
        fallbackAction={
          revealed ? undefined : (
            <Button variant="secondary" size="lg" block onClick={reveal}>
              View in 3D
            </Button>
          )
        }
      />
    </div>
  );
}

export default ARStage;
