'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { Skeleton } from '@/components/ui/States';
import { ARButton } from './ARButton';
import { useARCapability, type ARCapability } from './ARCapabilityDetector';
import { ModelViewerFallback, type ARStatus } from './ModelViewerFallback';
import { WebXRExperience } from './WebXRExperience';
import { modelHeightMetres } from './ar-scale';

/* ==========================================================================
   ARProductLauncher — the one thing a product surface has to mount.

   It answers two questions before it offers anything, and both of them have
   real answers rather than assumptions:

     1. Can this device do AR?      — ARCapabilityDetector
     2. Is there a model to place?  — a HEAD request for the declared asset

   Either answer being no produces a short, specific note instead of a button.
   A catalogue entry that names a GLB is not evidence the GLB exists; the
   catalogue ships `placeholder: true` against all three of them today.

   When both answers are yes, the launch takes the route the device supports.
   WebXR keeps the reader on the page and renders our own scene into the
   session. Scene Viewer and Quick Look are hand-offs to a native viewer, and
   `<model-viewer>` arranges them.
   ========================================================================== */

export type ARProductLauncherProps = {
  product: Product;
  /** Colourway name or hex, so AR shows what the page was showing. */
  colorway?: string;
  className?: string;
  /**
   * Rendered beneath the note when AR is unavailable — the caller's own way
   * into the 3D view, usually a "View in 3D" button.
   */
  fallbackAction?: React.ReactNode;
  /** Suppresses the note entirely, for surfaces that explain it themselves. */
  showNote?: boolean;
  /** Fires when an AR view opens or closes. Free the page's WebGL context. */
  onOpenChange?: (open: boolean) => void;
};

type View = 'closed' | 'webxr' | 'model-viewer';

/* --------------------------------------------------------------- assets -- */

const probes = new Map<string, Promise<boolean>>();

/**
 * True when something that is not a 404 page is sitting at `url`. A dev server
 * can answer a missing file with a 200 and an HTML document, which is exactly
 * the failure this has to catch.
 */
function probeAsset(url: string): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  const existing = probes.get(url);
  if (existing) return existing;

  const probe = fetch(url, { method: 'HEAD' })
    .then((response) => {
      if (!response.ok) return false;
      const type = response.headers.get('content-type') ?? '';
      const length = Number(response.headers.get('content-length') ?? '0');
      return !type.includes('text/html') && (length === 0 || length > 1024);
    })
    .catch(() => false);

  probes.set(url, probe);
  return probe;
}

type ModelSource = { pending: boolean; glb: string | null; usdz: string | null };

/** Resolves the declared 3D asset, and its USDZ twin when one is published. */
function useARModelSource(product: Product): ModelSource {
  const declared = useMemo(
    () => product.models.find((model) => model.mode === 'default') ?? product.models[0] ?? null,
    [product.models],
  );

  const [state, setState] = useState<ModelSource>({ pending: true, glb: null, usdz: null });

  useEffect(() => {
    if (!declared) return;

    let alive = true;
    const usdzUrl = declared.url.replace(/\.(glb|gltf)$/i, '.usdz');

    Promise.all([probeAsset(declared.url), probeAsset(usdzUrl)]).then(([glb, usdz]) => {
      if (!alive) return;
      setState({ pending: false, glb: glb ? declared.url : null, usdz: usdz ? usdzUrl : null });
    });

    return () => {
      alive = false;
    };
  }, [declared]);

  // A product with no declared asset is answered without a round trip, and
  // without a state write the effect would only have to undo.
  return declared ? state : NO_MODEL;
}

const NO_MODEL: ModelSource = { pending: false, glb: null, usdz: null };

/* -------------------------------------------------------------- launcher -- */

export function ARProductLauncher({
  product,
  colorway,
  className,
  fallbackAction,
  showNote = true,
  onOpenChange,
}: ARProductLauncherProps) {
  const capability = useARCapability();
  const source = useARModelSource(product);
  const [view, setView] = useState<View>('closed');

  const launch = useCallback(() => {
    setView(capability.webxr ? 'webxr' : 'model-viewer');
    onOpenChange?.(true);
  }, [capability.webxr, onOpenChange]);

  const close = useCallback(() => {
    setView('closed');
    onOpenChange?.(false);
  }, [onOpenChange]);

  const handoffMode = capability.sceneViewer ? 'scene-viewer' : 'quick-look';
  const onStatus = useCallback(
    (status: ARStatus) => {
      if (status === 'session-started') {
        track('ar_session', { productId: product.id, mode: handoffMode, action: 'start' });
      }
      if (status === 'object-placed') {
        track('ar_session', { productId: product.id, mode: handoffMode, action: 'place' });
      }
    },
    [product.id, handoffMode],
  );

  /* ------------------------------------------------------------- states --- */

  if (capability.pending || source.pending) {
    return <Skeleton className={cn('h-14 w-full', className)} />;
  }

  const ready: ARCapability | null =
    capability.mode !== 'none' && source.glb ? capability : null;

  if (!ready) {
    if (!showNote) return null;
    return (
      <div className={cn('border border-[var(--border)] px-5 py-4', className)}>
        <p className="t-label-sm text-[var(--fg-subtle)]">Augmented reality</p>
        <p className="t-body-sm t-pretty mt-2 text-[var(--fg-muted)]">
          {!source.glb
            ? 'AR not available for this piece yet — its 3D asset has not been published.'
            : `AR not available on this device. ${capability.reason}`}
        </p>
        {fallbackAction ? <div className="mt-4">{fallbackAction}</div> : null}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <ARButton productId={product.id} capability={ready} onLaunch={launch} />
      <p className="t-caption text-[var(--fg-subtle)]">
        Placed at true size — {modelHeightMetres(product).toFixed(2)} m, crown to hem. Point your
        camera at the floor.
      </p>

      {view === 'webxr' ? (
        <WebXRExperience product={product} colorway={colorway} onClose={close} />
      ) : null}

      {view === 'model-viewer' && source.glb ? (
        <ARSheet product={product} onClose={close}>
          <ModelViewerFallback
            product={product}
            src={source.glb}
            iosSrc={source.usdz}
            autoActivateAR
            onStatus={onStatus}
            alt={`${product.name} — place it in your space`}
          />
        </ARSheet>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ sheet -- */

/**
 * The hand-off sheet. `<model-viewer>` needs to be on screen and loaded before
 * either native viewer can be opened, and if the automatic hand-off misses its
 * user-activation window the element's own AR control is right there.
 */
function ARSheet({
  product,
  onClose,
  children,
}: {
  product: Product;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} in your space`}
      className="fixed inset-0 z-[600] flex flex-col bg-[var(--bg)]"
    >
      <div className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-4 py-3">
        <div>
          <p className="t-label-sm text-[var(--fg-subtle)]">Augmented reality</p>
          <p className="t-spec mt-1 text-[var(--fg-muted)]">{product.name}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="t-label border border-[var(--border-strong)] px-5 py-3 text-[var(--fg)] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:bg-[var(--fg)] hover:text-[var(--bg)]"
        >
          Close
        </button>
      </div>
      <div className="min-h-0 flex-1 bg-[var(--bg-sunken)]">{children}</div>
    </div>
  );
}

export default ARProductLauncher;
