'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import type { FinishKey } from '@/components/three/materials';
import { ViewerFallback } from './ViewerFallback';
import { ProductViewer } from './ProductViewer';
import { resolveProduct } from './product-source';

/* ==========================================================================
   ProductStage — the only 3D entry point a page ever imports.

   It is deliberately small and free of any Three.js import: the entire WebGL
   layer arrives through a dynamic, client-only chunk that is never requested
   on a device that should not run it. A server component can import this file
   safely.

   The 2D plate is not a spinner. It renders first, stays mounted underneath,
   and the canvas crossfades over it once the shell is built — so the frame is
   never empty and a failure at any point leaves a finished-looking page.
   ========================================================================== */

const Scene = dynamic(
  () => import('./ProductStageScene').then((module) => module.ProductStageScene),
  { ssr: false },
);

export type ProductStageProps = {
  productSlug: string;
  mode?: 'hero' | 'viewer';
  className?: string;
  /** Skips the client-side catalogue lookup when the page already has it. */
  product?: Product | null;
  colorway?: string;
  finish?: FinishKey;
  /** Marks the 2D plate as LCP-critical. Use on the homepage hero only. */
  priority?: boolean;
};

export function ProductStage({
  productSlug,
  mode = 'hero',
  className,
  product: provided,
  colorway,
  finish,
  priority = false,
}: ProductStageProps) {
  const product = useMemo(() => resolveProduct(productSlug, provided), [productSlug, provided]);
  const { pending, webgl, tier, reducedMotion } = useDeviceTier();
  const [ready, setReady] = useState(false);

  if (mode === 'viewer') {
    return (
      <ProductViewer
        product={product}
        productSlug={productSlug}
        className={className}
        colorway={colorway}
        finish={finish}
      />
    );
  }

  // Low tier, no WebGL, or a reader who asked for stillness: the plate stands.
  const canRender3D = !pending && webgl && tier !== 'low' && !reducedMotion;

  return (
    <div className={cn('relative h-full w-full overflow-hidden', className)}>
      <ViewerFallback
        product={product}
        variant="plate"
        priority={priority}
        alt={`${product.name} — ${product.subtitle ?? 'studio view'}`}
        className={cn(
          'absolute inset-0 transition-opacity duration-[var(--d-cine)] ease-[var(--e-out)]',
          ready ? 'opacity-0' : 'opacity-100',
        )}
      />

      {canRender3D ? (
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-[var(--d-cine)] ease-[var(--e-out)]',
            ready ? 'opacity-100' : 'opacity-0',
          )}
        >
          <Scene
            product={product}
            colorway={colorway}
            finish={finish}
            onReady={() => setReady(true)}
          />
        </div>
      ) : null}
    </div>
  );
}

export default ProductStage;
