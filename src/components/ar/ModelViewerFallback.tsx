'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import dynamic from 'next/dynamic';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { ViewerFallback } from '@/components/product-3d/ViewerFallback';
import { modelViewerScale } from './ar-scale';

/* ==========================================================================
   ModelViewerFallback — `<model-viewer>` as the AR runtime.

   Where WebXR is unavailable but the platform still has a native AR route —
   Android Scene Viewer, iOS Quick Look — the hand-off is a solved problem and
   Google's custom element is the thing that solves it. It is used for exactly
   that: the model, the two hand-offs, and a camera-controlled preview to look
   at while the hand-off is arranged.

   The element is loaded lazily and client-side only. It registers itself into
   the custom element registry on import, so it can never be evaluated during
   a server render, and a 4 MB dependency has no business being in the bundle
   of a page whose reader may never tap the button.

   `ar-scale="fixed"` is deliberate. The scale below is derived from the
   catalogue's published packed size (see ./ar-scale.ts), so the product
   appears at the size it actually is. Letting a reader pinch it larger would
   turn a measurement into a suggestion.
   ========================================================================== */

/* ------------------------------------------------------- the custom element */

type ModelViewerElement = HTMLElement & {
  /** True once the model is loaded and a hand-off is genuinely possible. */
  canActivateAR: boolean;
  activateAR: () => Promise<void>;
};

type ModelViewerAttributes = React.DetailedHTMLProps<
  React.HTMLAttributes<ModelViewerElement>,
  ModelViewerElement
> & {
  src?: string;
  'ios-src'?: string;
  alt?: string;
  poster?: string;
  ar?: boolean | '';
  'ar-modes'?: string;
  'ar-scale'?: 'auto' | 'fixed';
  'ar-placement'?: 'floor' | 'wall';
  'camera-controls'?: boolean | '';
  'disable-zoom'?: boolean | '';
  'camera-orbit'?: string;
  'min-camera-orbit'?: string;
  'max-camera-orbit'?: string;
  'field-of-view'?: string;
  'interaction-prompt'?: 'auto' | 'none';
  'shadow-intensity'?: string;
  'shadow-softness'?: string;
  'touch-action'?: string;
  'environment-image'?: string;
  'skybox-image'?: string;
  exposure?: string;
  scale?: string;
  loading?: 'auto' | 'lazy' | 'eager';
  reveal?: 'auto' | 'manual' | 'interaction';
  autoplay?: boolean | '';
};

/*
 * React 19 keeps the JSX namespace inside the `react` module rather than in
 * global scope, so a custom element is declared by augmenting it there. The
 * namespace is not optional — this is the only shape TypeScript accepts.
 */
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'model-viewer': ModelViewerAttributes;
    }
  }
}

/* ------------------------------------------------------------------ props -- */

export type ARStatus =
  | 'not-presenting'
  | 'session-started'
  | 'object-placed'
  | 'failed'
  | 'unsupported';

export type ModelViewerFallbackProps = {
  product: Product;
  /** GLB or glTF. Verified by the caller before it gets here. */
  src: string;
  /** USDZ for Quick Look. Omitted, model-viewer derives one from the GLB. */
  iosSrc?: string | null;
  /** Product plate behind the model while it loads. */
  poster?: string | null;
  alt?: string;
  className?: string;
  /** Attempts the hand-off as soon as the model can support it. */
  autoActivateAR?: boolean;
  onStatus?: (status: ARStatus) => void;
  onLoad?: () => void;
  onError?: () => void;
};

const POSTER_KIND_ORDER: Product['images'][number]['kind'][] = ['technical', 'detail', 'editorial'];

function posterFor(product: Product): string | undefined {
  for (const kind of POSTER_KIND_ORDER) {
    const match = product.images.find((image) => image.kind === kind);
    if (match) return match.url;
  }
  return product.images[0]?.url;
}

/* ------------------------------------------------------------------ stage -- */

function ModelViewerStage({
  product,
  src,
  iosSrc,
  poster,
  alt,
  className,
  autoActivateAR = false,
  onStatus,
  onLoad,
  onError,
}: ModelViewerFallbackProps) {
  const ref = useRef<ModelViewerElement>(null);
  const [failed, setFailed] = useState(false);

  /* Status, load and failure all arrive as DOM events on the element. */
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleStatus = (event: Event) => {
      const detail = (event as CustomEvent<{ status?: ARStatus }>).detail;
      if (detail?.status) onStatus?.(detail.status);
    };
    const handleLoad = () => onLoad?.();
    const handleError = () => {
      setFailed(true);
      onError?.();
    };

    element.addEventListener('ar-status', handleStatus);
    element.addEventListener('load', handleLoad);
    element.addEventListener('error', handleError);
    return () => {
      element.removeEventListener('ar-status', handleStatus);
      element.removeEventListener('load', handleLoad);
      element.removeEventListener('error', handleError);
    };
  }, [onStatus, onLoad, onError]);

  /*
   * The hand-off. It is attempted rather than assumed: both platforms require
   * the navigation to sit inside a user activation, and a slow model can
   * outlive the tap that opened this view. The element keeps its own AR button
   * on screen throughout, so a failed attempt costs the reader one more tap
   * rather than the whole feature.
   */
  useEffect(() => {
    const element = ref.current;
    if (!element || !autoActivateAR) return;

    let cancelled = false;
    const attempt = () => {
      if (cancelled || !element.canActivateAR) return;
      element.activateAR().catch(() => onStatus?.('failed'));
    };

    element.addEventListener('load', attempt);
    // `load` may have fired before this effect ran.
    attempt();
    return () => {
      cancelled = true;
      element.removeEventListener('load', attempt);
    };
  }, [autoActivateAR, onStatus]);

  if (failed) return <UnavailableStage product={product} className={className} />;

  const plate = poster ?? posterFor(product);

  return (
    <model-viewer
      ref={ref}
      src={src}
      {...(iosSrc ? { 'ios-src': iosSrc } : {})}
      {...(plate ? { poster: plate } : {})}
      alt={alt ?? `${product.name} in three dimensions`}
      ar
      ar-modes="webxr scene-viewer quick-look"
      ar-scale="fixed"
      ar-placement="floor"
      camera-controls
      touch-action="pan-y"
      interaction-prompt="none"
      shadow-intensity="1"
      shadow-softness="0.8"
      exposure="1"
      scale={modelViewerScale(product)}
      loading="eager"
      className={cn('block h-full w-full', className)}
      style={MODEL_VIEWER_STYLE}
    />
  );
}

/** Transparent surround so the element sits on the page's own ground colour. */
const MODEL_VIEWER_STYLE: CSSProperties = {
  width: '100%',
  height: '100%',
  backgroundColor: 'transparent',
};

/** The element could not be loaded, or the model could not be parsed. */
function UnavailableStage({
  product,
  className,
}: Pick<ModelViewerFallbackProps, 'product' | 'className'>) {
  return (
    <ViewerFallback
      product={product}
      variant="gallery"
      className={cn('h-full w-full', className)}
      alt={`${product.name} — every angle`}
      note="The augmented reality view could not be loaded. Every angle is here instead."
    />
  );
}

/* --------------------------------------------------------------- exported -- */

/**
 * The element registers itself on import and reads `window` while doing it,
 * so the import is deferred to the browser and the failure path lands on the
 * product plate rather than an error boundary.
 */
export const ModelViewerFallback = dynamic(
  () =>
    import('@google/model-viewer')
      .then(() => ModelViewerStage)
      .catch(() => UnavailableStage as typeof ModelViewerStage),
  { ssr: false },
);

export default ModelViewerFallback;
