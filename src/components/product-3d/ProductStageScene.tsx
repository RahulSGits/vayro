'use client';

import { useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { three as threeTokens } from '@/lib/design-tokens';
import { track } from '@/lib/analytics';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import type { Product } from '@/types';
import { SceneCanvas } from '@/components/three/Canvas';
import { StudioEnvironment } from '@/components/three/Environment';
import { JacketModel } from '@/components/three/JacketModel';
import type { FinishKey } from '@/components/three/materials';
import type { JacketQuality } from '@/components/three/geometry';

/* ==========================================================================
   The hero stage.

   One slow revolution every thirty-nine seconds — the orbit speed comes from
   the design tokens, and it is deliberately slower than anything that reads as
   a product demo. Pointer movement leans the shell a few degrees; it never
   takes control away from the page. No controls, no scroll capture.
   ========================================================================== */

export type ProductStageSceneProps = {
  product: Product;
  colorway?: string;
  finish?: FinishKey;
  onReady?: () => void;
  onProgress?: (value: number) => void;
};

export function ProductStageScene({
  product,
  colorway,
  finish = 'ripstop',
  onReady,
  onProgress,
}: ProductStageSceneProps) {
  const { tier } = useDeviceTier();
  const quality: JacketQuality = tier === 'high' ? 'high' : 'medium';

  return (
    <SceneCanvas
      label={`${product.name} — rotating three-dimensional view`}
      interactive={false}
      camera={{ position: [0, 0.12, 5.4] }}
    >
      {/* The hero plate is night in both site themes, so the rig is pinned. */}
      <StudioEnvironment fog particles intensity={1} scheme="dark" />
      <HeroRig>
        <JacketModel
          colorway={colorway}
          finish={finish}
          quality={quality}
          onReady={onReady}
          onProgress={onProgress}
          // The hero is where most first loads happen — it is the one place
          // where `model_load` timings describe the real arrival experience.
          onLoad={({ source, ms }) => track('model_load', { productId: product.id, source, ms })}
        />
      </HeroRig>
    </SceneCanvas>
  );
}

/** Auto-orbit, pointer lean and a breath of vertical drift. */
function HeroRig({ children }: { children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const spin = useRef(0);
  const lean = useRef({ x: 0, y: 0 });
  const width = useThree((state) => state.size.width);

  // The editorial copy sits left, so the shell stands right of centre.
  const offsetX = width >= 1280 ? 0.62 : width >= 900 ? 0.34 : 0;

  useFrame((state, delta) => {
    const node = group.current;
    if (!node) return;
    const dt = Math.min(delta, 0.05);
    spin.current += dt * threeTokens.orbit.speed;

    const damping = 1 - Math.exp(-dt * 3.2);
    lean.current.x += (state.pointer.x - lean.current.x) * damping;
    lean.current.y += (state.pointer.y - lean.current.y) * damping;

    node.rotation.y = spin.current + lean.current.x * 0.24;
    node.rotation.x = -lean.current.y * 0.07;
    node.position.y = Math.sin(state.clock.elapsedTime * 0.32) * 0.02;
  });

  return (
    <group ref={group} position={[offsetX, 0, 0]}>
      {children}
    </group>
  );
}
