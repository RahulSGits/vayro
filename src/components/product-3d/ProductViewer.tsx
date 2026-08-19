'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import type { FinishKey } from '@/components/three/materials';
import { ViewerFallback } from './ViewerFallback';
import { resolveProduct } from './product-source';

/* ==========================================================================
   ProductViewer — the public entry to the interactive view.

   Small on purpose. It resolves the product, decides whether this device
   should be running WebGL at all, and only then requests the viewer chunk.
   Nothing in this file imports Three.js, so a page that imports the viewer
   does not pay for it until a capable device asks.

   Reduced motion keeps the 3D view but starts it still — no auto-rotation,
   no idle drift. Movement only happens when the reader asks for it.
   ========================================================================== */

const Scene = dynamic(
  () => import('./ProductViewerScene').then((module) => module.ProductViewerScene),
  { ssr: false },
);

export type ProductViewerProps = {
  productSlug: string;
  /** Skips the catalogue lookup when the page already has the product. */
  product?: Product | null;
  className?: string;
  colorway?: string;
  finish?: FinishKey;
};

export function ProductViewer({
  productSlug,
  product: provided,
  className,
  colorway,
  finish,
}: ProductViewerProps) {
  const product = useMemo(() => resolveProduct(productSlug, provided), [productSlug, provided]);
  const { pending, webgl } = useDeviceTier();

  if (pending || !webgl) {
    return (
      <ViewerFallback
        product={product}
        variant="gallery"
        className={cn('h-full w-full', className)}
        alt={`${product.name} — every angle`}
        note={
          pending
            ? undefined
            : 'This browser cannot run the interactive view. Every angle and detail is here instead.'
        }
      />
    );
  }

  return <Scene product={product} className={className} colorway={colorway} finish={finish} />;
}

export default ProductViewer;
