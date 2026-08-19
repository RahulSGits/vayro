'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useThree, type RootState } from '@react-three/fiber';
import { AdaptiveDpr } from '@react-three/drei';
import * as THREE from 'three';
import { three as threeTokens } from '@/lib/design-tokens';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { cn } from '@/lib/utils';
import { SceneErrorBoundary } from './SceneErrorBoundary';

/* ==========================================================================
   SceneCanvas — the single entry point to WebGL on this site.

   Rules it enforces so no calling surface has to:
   - Nothing renders until `useDeviceTier()` has finished measuring the device.
   - Nothing renders when WebGL is unavailable. The caller's 2D plate stands in.
   - Resolution, antialiasing and shadows come from the tier budget, never from
     the component that happens to be mounting the scene.
   - A lost context is caught, surfaced and recoverable — not a black rectangle.
   ========================================================================== */

export type SceneCanvasProps = {
  children: ReactNode;
  className?: string;
  /** Shown while capability is unknown, when WebGL is absent, or on failure. */
  fallback?: ReactNode;
  /** Shown while the scene's own Suspense boundary is pending. */
  loading?: ReactNode;
  camera?: { position?: [number, number, number]; fov?: number };
  /** Accessible name for the rendered frame. */
  label?: string;
  /** Force the demand frameloop (scroll-driven scenes drive their own frames). */
  demand?: boolean;
  /** Pointer interaction. Hero stages set this false so the page scrolls. */
  interactive?: boolean;
  onCreated?: (state: RootState) => void;
  onContextLost?: () => void;
};

export function SceneCanvas({
  children,
  className,
  fallback = null,
  loading = null,
  camera,
  label,
  demand = false,
  interactive = true,
  onCreated,
  onContextLost,
}: SceneCanvasProps) {
  const { pending, webgl, tier, settings } = useDeviceTier();
  const [contextLost, setContextLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  const cleanupRef = useRef<(() => void) | null>(null);

  const cameraConfig = useMemo(
    () => ({
      fov: camera?.fov ?? threeTokens.camera.fov,
      near: threeTokens.camera.near,
      far: threeTokens.camera.far,
      position: camera?.position ?? ([...threeTokens.camera.position] as [number, number, number]),
    }),
    [camera?.fov, camera?.position],
  );

  const handleCreated = useCallback(
    (state: RootState) => {
      const canvas = state.gl.domElement;
      state.gl.setClearAlpha(0);
      state.gl.toneMapping = THREE.ACESFilmicToneMapping;
      state.gl.toneMappingExposure = 1.02;

      const lost = (event: Event) => {
        // Preventing the default is what allows the browser to restore it.
        event.preventDefault();
        setContextLost(true);
        onContextLost?.();
      };
      const restored = () => {
        setContextLost(false);
        state.invalidate();
      };

      canvas.addEventListener('webglcontextlost', lost, false);
      canvas.addEventListener('webglcontextrestored', restored, false);
      cleanupRef.current = () => {
        canvas.removeEventListener('webglcontextlost', lost);
        canvas.removeEventListener('webglcontextrestored', restored);
      };

      if (process.env.NODE_ENV === 'development') {
        (window as unknown as { __vayroScene?: RootState }).__vayroScene = state;
      }

      onCreated?.(state);
    },
    [onCreated, onContextLost],
  );

  useEffect(() => () => cleanupRef.current?.(), []);

  const remount = useCallback(() => {
    setContextLost(false);
    setGeneration((n) => n + 1);
  }, []);

  if (pending || !webgl) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn('relative h-full w-full', className)}>
      <SceneErrorBoundary fallback={<>{fallback}</>}>
        <Canvas
          key={generation}
          className={cn('h-full w-full', !interactive && 'pointer-events-none')}
          role={label ? 'img' : 'presentation'}
          aria-label={label}
          aria-hidden={label ? undefined : true}
          dpr={[threeTokens.dpr.min, settings.dpr]}
          shadows={settings.shadows}
          frameloop={demand || tier === 'low' ? 'demand' : 'always'}
          camera={cameraConfig}
          gl={{
            antialias: settings.aa,
            powerPreference: 'high-performance',
            alpha: true,
            stencil: false,
            depth: true,
            preserveDrawingBuffer: false,
          }}
          resize={{ scroll: false, debounce: { scroll: 50, resize: 120 } }}
          onCreated={handleCreated}
        >
          <Suspense fallback={null}>{children}</Suspense>
          {tier !== 'high' ? <AdaptiveDpr pixelated={false} /> : null}
        </Canvas>
      </SceneErrorBoundary>

      {loading}

      {contextLost ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-[var(--bg)]/80 px-6 text-center backdrop-blur-sm">
          <p className="t-label text-[var(--fg-subtle)]">Graphics context lost</p>
          <button
            type="button"
            onClick={remount}
            className="t-label border border-[var(--border-strong)] px-5 py-3 text-[var(--fg)] transition-colors duration-[var(--d-fast)] ease-[var(--e-out)] hover:bg-[var(--fg)] hover:text-[var(--bg)]"
          >
            Restore view
          </button>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Requests a frame whenever a dependency changes. Required by any scene that
 * runs on the demand frameloop — React state alone will not draw a frame.
 */
export function InvalidateOnChange({ values }: { values: readonly unknown[] }) {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    invalidate();
  }, [invalidate, values]);
  return null;
}
