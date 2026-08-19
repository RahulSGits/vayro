'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { RootState } from '@react-three/fiber';
import type { Product } from '@/types';
import { cn } from '@/lib/utils';
import { track } from '@/lib/analytics';
import { palette } from '@/lib/design-tokens';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { SceneCanvas } from '@/components/three/Canvas';
import { StudioEnvironment } from '@/components/three/Environment';
import { JacketModel } from '@/components/three/JacketModel';
import type { JacketQuality } from '@/components/three/geometry';
import { ViewerFallback } from '@/components/product-3d/ViewerFallback';
import { groundOffsetMetres, metresPerUnit, modelHeightMetres } from './ar-scale';

/* ==========================================================================
   WebXRExperience — the product, in the room, rendered by us.

   Where `navigator.xr` will open an `immersive-ar` session, nothing is handed
   to a native viewer: the same scene the product page runs — the same shell,
   the same colourway, the same materials — is drawn into the session, so what
   the reader sees on the floor is the thing they were just looking at.

   `@react-three/xr` is not a dependency and is not added for this. The raw
   WebXR Device API is enough: a hit-test source against the viewer space
   finds the surface, a reticle marks it, a tap fixes the shell there. React
   Three Fiber already switches its own loop to `session.requestAnimationFrame`
   when a session starts, and hands the live `XRFrame` to `useFrame`, which is
   the only integration point this needs.

   Placement runs through a plain mutable object rather than React state: the
   reticle is updated on every XR frame, and a re-render per frame would be
   both pointless and expensive. React only hears about the two transitions a
   human can see — placed, and not placed.
   ========================================================================== */

export type WebXRExperienceProps = {
  product: Product;
  /** Colourway name or hex. Matches whatever the page was showing. */
  colorway?: string;
  /** Fires when the session ends, by any route the reader or the OS takes. */
  onClose: () => void;
  className?: string;
};

type Placement = {
  reticleVisible: boolean;
  reticleMatrix: THREE.Matrix4;
  placed: boolean;
  placementMatrix: THREE.Matrix4;
};

type Phase = 'starting' | 'running' | 'failed';

export function WebXRExperience({ product, colorway, onClose, className }: WebXRExperienceProps) {
  const { tier } = useDeviceTier();
  // AR runs on a phone, at a phone's thermal budget, with a camera feed and a
  // pose tracker already on the GPU. The viewer's top quality tier is not on
  // the table here.
  const quality: JacketQuality = tier === 'low' ? 'low' : 'medium';

  const overlayRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sessionRef = useRef<XRSession | null>(null);
  const hitTestRef = useRef<XRHitTestSource | null>(null);
  /** Which attempt the session effect has already acted on. */
  const startedAttempt = useRef(-1);

  /*
   * The placement bus. It is a ref, not state, because the reticle pose is
   * rewritten on every XR frame and a render per frame would be both useless
   * and expensive. React is told about the two transitions a person can see.
   */
  const placementRef = useRef<Placement>({
    reticleVisible: false,
    reticleMatrix: new THREE.Matrix4(),
    placed: false,
    placementMatrix: new THREE.Matrix4(),
  });

  const [canvasReady, setCanvasReady] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [phase, setPhase] = useState<Phase>('starting');
  const [placed, setPlaced] = useState(false);
  const [surfaceFound, setSurfaceFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ------------------------------------------------------------ actions --- */

  const place = useCallback(() => {
    const placement = placementRef.current;
    if (!placement.reticleVisible || placement.placed) return;
    placement.placementMatrix.copy(placement.reticleMatrix);
    placement.placed = true;
    setPlaced(true);
    track('ar_session', { productId: product.id, mode: 'webxr', action: 'place' });
  }, [product.id]);

  const reset = useCallback(() => {
    placementRef.current.placed = false;
    setPlaced(false);
    track('3d_interaction', { productId: product.id, action: 'reset' });
  }, [product.id]);

  const end = useCallback(() => {
    const session = sessionRef.current;
    if (session) session.end().catch(() => undefined);
    else onClose();
  }, [onClose]);

  /*
   * `requestSession` needs a transient user activation, and the tap that
   * opened this view has to survive mounting a canvas to still be one. It
   * normally does. When it does not, retrying inside a fresh tap is the whole
   * fix, so the failure state offers one rather than a dead end.
   */
  const retry = useCallback(() => {
    setError(null);
    setPhase('starting');
    setAttempt((value) => value + 1);
  }, []);

  /*
   * Both callbacks are read from a ref inside the session effect. Putting them
   * in its dependency list instead would let a re-rendered parent tear down a
   * session request that is still in flight, and end the session the moment it
   * resolved.
   */
  const liveRef = useRef({ place, onClose });
  useEffect(() => {
    liveRef.current = { place, onClose };
  });

  /* ------------------------------------------------------------ session --- */

  useEffect(() => {
    if (!canvasReady || startedAttempt.current === attempt) return;
    const gl = rendererRef.current;
    if (!gl) return;

    startedAttempt.current = attempt;
    let cancelled = false;

    const handleSelect = () => liveRef.current.place();
    const handleEnd = () => {
      hitTestRef.current?.cancel();
      hitTestRef.current = null;
      sessionRef.current = null;
      track('ar_session', { productId: product.id, mode: 'webxr', action: 'end' });
      liveRef.current.onClose();
    };

    (async () => {
      try {
        const xr = navigator.xr;
        if (!xr) throw new Error('no-xr');

        const session = await xr.requestSession('immersive-ar', {
          requiredFeatures: ['hit-test'],
          optionalFeatures: ['dom-overlay', 'light-estimation'],
          ...(overlayRef.current ? { domOverlay: { root: overlayRef.current } } : {}),
        });

        if (cancelled) {
          await session.end().catch(() => undefined);
          return;
        }

        sessionRef.current = session;
        session.addEventListener('select', handleSelect);
        session.addEventListener('end', handleEnd);

        gl.xr.enabled = true;
        // `local` is guaranteed for an immersive session; `local-floor` is not,
        // and the hit test reports an absolute pose either way.
        gl.xr.setReferenceSpaceType('local');
        await gl.xr.setSession(session);

        const viewerSpace = await session.requestReferenceSpace('viewer');
        const request = session.requestHitTestSource;
        hitTestRef.current =
          (request ? await request.call(session, { space: viewerSpace }) : null) ?? null;

        if (cancelled) return;
        setPhase('running');
        track('ar_session', { productId: product.id, mode: 'webxr', action: 'start' });
      } catch (cause) {
        if (cancelled) return;
        setPhase('failed');
        setError(describe(cause));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canvasReady, attempt, product.id]);

  /* The page behind an immersive session must not scroll under it. */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  /* Leaving the page, or the component, must not leave a session running. */
  useEffect(
    () => () => {
      hitTestRef.current?.cancel();
      hitTestRef.current = null;
      const session = sessionRef.current;
      sessionRef.current = null;
      session?.end().catch(() => undefined);
    },
    [],
  );

  /*
   * With `dom-overlay` granted, a tap on these controls also reaches the
   * session as a `select`. Cancelling `beforexrselect` on the overlay root is
   * the specified way to stop a button press from also planting the product.
   */
  useEffect(() => {
    const node = overlayRef.current;
    if (!node) return;
    const block = (event: Event) => event.preventDefault();
    node.addEventListener('beforexrselect', block);
    return () => node.removeEventListener('beforexrselect', block);
  }, []);

  /* ------------------------------------------------------------- render --- */

  return (
    <div
      className={cn('fixed inset-0 z-[600] bg-[var(--bg)]', className)}
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} in your space`}
    >
      <div className="absolute inset-0">
        <SceneCanvas
          label={`${product.name}, placed in your space`}
          fallback={
            <ViewerFallback
              product={product}
              variant="plate"
              className="h-full w-full"
              alt={product.name}
            />
          }
          onCreated={(state: RootState) => {
            rendererRef.current = state.gl;
            setCanvasReady(true);
          }}
        >
          <StudioEnvironment scheme="light" particles={false} shadows={false} intensity={0.95} />
          <XRStage
            product={product}
            colorway={colorway}
            quality={quality}
            placementRef={placementRef}
            hitTestRef={hitTestRef}
            onSurface={setSurfaceFound}
          />
        </SceneCanvas>
      </div>

      {/* The DOM overlay root. Everything the reader can touch lives here. */}
      <div
        ref={overlayRef}
        className="pointer-events-none absolute inset-0 flex flex-col justify-between p-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] px-4 py-3 backdrop-blur-md">
            <p className="t-label-sm text-[var(--fg-subtle)]">{product.name}</p>
            <p className="t-spec mt-1 text-[var(--fg-muted)]">
              {phase === 'failed'
                ? 'Session unavailable'
                : placed
                  ? 'Placed — walk around it'
                  : surfaceFound
                    ? 'Tap to place'
                    : 'Move your phone to find a surface'}
            </p>
          </div>

          <button
            type="button"
            onClick={end}
            className="pointer-events-auto t-label border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] px-5 py-3 text-[var(--fg)] backdrop-blur-md transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:bg-[var(--fg)] hover:text-[var(--bg)]"
          >
            Exit
          </button>
        </div>

        <div className="flex flex-col items-center gap-3">
          {error ? (
            <p className="t-body-sm t-pretty max-w-sm border border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_88%,transparent)] px-5 py-4 text-center text-[var(--fg-muted)] backdrop-blur-md">
              {error}
            </p>
          ) : null}

          <div className="flex items-stretch gap-2">
            {phase === 'failed' ? (
              <button
                type="button"
                onClick={retry}
                className="pointer-events-auto t-label border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] px-6 py-4 text-[var(--fg)] backdrop-blur-md transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:bg-[var(--fg)] hover:text-[var(--bg)]"
              >
                Try again
              </button>
            ) : null}
            <button
              type="button"
              onClick={place}
              disabled={phase === 'failed' || placed || !surfaceFound}
              className="pointer-events-auto t-label border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] px-6 py-4 text-[var(--fg)] backdrop-blur-md transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:pointer-events-none disabled:opacity-40"
            >
              Place
            </button>
            <button
              type="button"
              onClick={reset}
              disabled={!placed}
              className="pointer-events-auto t-label border border-[var(--border-strong)] bg-[color-mix(in_srgb,var(--bg)_78%,transparent)] px-6 py-4 text-[var(--fg)] backdrop-blur-md transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:bg-[var(--fg)] hover:text-[var(--bg)] disabled:pointer-events-none disabled:opacity-40"
            >
              Reset
            </button>
          </div>

          <p className="t-caption text-center text-[var(--fg-subtle)]">
            Shown at true size — {modelHeightMetres(product).toFixed(2)} m, crown to hem.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- the scene -- */

type XRStageProps = {
  product: Product;
  colorway?: string;
  quality: JacketQuality;
  placementRef: React.RefObject<Placement>;
  hitTestRef: React.RefObject<XRHitTestSource | null>;
  onSurface: (found: boolean) => void;
};

function XRStage({
  product,
  colorway,
  quality,
  placementRef,
  hitTestRef,
  onSurface,
}: XRStageProps) {
  const reticle = useRef<THREE.Group>(null);
  const anchor = useRef<THREE.Group>(null);
  const lastSurface = useRef(false);

  const scale = metresPerUnit(product);
  const lift = groundOffsetMetres(product);

  useFrame((state: RootState, _delta: number, frame?: XRFrame) => {
    const reticleNode = reticle.current;
    const anchorNode = anchor.current;
    if (!reticleNode || !anchorNode) return;
    const placement = placementRef.current;

    if (frame) {
      const reference = state.gl.xr.getReferenceSpace();
      const source = hitTestRef.current;
      if (reference && source) {
        const hits = frame.getHitTestResults(source);
        const pose = hits.length > 0 ? hits[0].getPose(reference) : undefined;
        if (pose) {
          placement.reticleVisible = true;
          placement.reticleMatrix.fromArray(pose.transform.matrix);
        } else {
          placement.reticleVisible = false;
        }
      }
    }

    // One state write per transition, never per frame.
    if (placement.reticleVisible !== lastSurface.current) {
      lastSurface.current = placement.reticleVisible;
      onSurface(placement.reticleVisible);
    }

    reticleNode.visible = placement.reticleVisible && !placement.placed;
    if (reticleNode.visible) {
      reticleNode.matrix.copy(placement.reticleMatrix);
      reticleNode.matrixWorldNeedsUpdate = true;
    }

    anchorNode.visible = placement.placed;
    if (anchorNode.visible) {
      anchorNode.matrix.copy(placement.placementMatrix);
      anchorNode.matrixWorldNeedsUpdate = true;
    }
  });

  return (
    <>
      {/* Reticle — the framing mark from the button, laid on the floor. */}
      <group ref={reticle} matrixAutoUpdate={false} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.085, 0.095, 64]} />
          <meshBasicMaterial color={palette.ivory} transparent opacity={0.92} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0, 0.006, 16]} />
          <meshBasicMaterial color={palette.ivory} transparent opacity={0.75} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* The product, lifted so its hem meets the surface rather than its origin. */}
      <group ref={anchor} matrixAutoUpdate={false} visible={false}>
        {/* A contour ring instead of a contact shadow: it grounds the shell
            without a per-frame shadow render on a phone in a live session. */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.268, 72]} />
          <meshBasicMaterial color={palette.graphite} transparent opacity={0.5} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <group scale={scale} position={[0, lift, 0]}>
          <JacketModel colorway={colorway} finish="ripstop" quality={quality} />
        </group>
      </group>
    </>
  );
}

/* ---------------------------------------------------------------- errors -- */

/** WebXR rejects with a DOMException whose name is the useful part. */
function describe(cause: unknown): string {
  const name = cause instanceof DOMException ? cause.name : '';
  if (name === 'NotAllowedError') {
    return 'Camera access was declined, so the session could not start. The 3D view is still available.';
  }
  if (name === 'NotSupportedError' || name === 'InvalidStateError') {
    return 'This device reported AR support but could not open a session. The 3D view is still available.';
  }
  if (name === 'SecurityError') {
    return 'This page is not permitted to start an AR session on this device.';
  }
  return 'The AR session could not be started. The 3D view is still available.';
}

export default WebXRExperience;
