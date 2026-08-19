'use client';

import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { Product } from '@/types';
import { clamp, mapRange } from '@/lib/utils';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { SceneCanvas } from '@/components/three/Canvas';
import { StudioEnvironment } from '@/components/three/Environment';
import { JacketModel } from '@/components/three/JacketModel';
import type { JacketQuality } from '@/components/three/geometry';
import type { FinishKey } from '@/components/three/materials';

/* ==========================================================================
   The transformation canvas.

   Scroll drives one number. That number folds the shell and walks the camera
   along a fixed path — a slow arc from a three-quarter standing view down to
   the packed unit, close enough at the end to read the webbing.

   The scroll value arrives through a getter, not a prop, so a scroll tick
   never causes a React render. Nothing here re-renders while you scroll.
   ========================================================================== */

export type TransformationCanvasProps = {
  product: Product;
  /** 0..1 scroll progress. Read every frame. */
  getProgress: () => number;
  colorway?: string;
  finish?: FinishKey;
  onReady?: () => void;
  onProgress?: (value: number) => void;
};

/** Camera stations: standing, circling, descending, close on the carry unit. */
const PATH = [
  new THREE.Vector3(1.05, 0.5, 5.15),
  new THREE.Vector3(2.35, 0.95, 4.0),
  new THREE.Vector3(1.75, 0.34, 2.95),
  new THREE.Vector3(0.42, 0.02, 2.45),
];

const LOOK_FROM = new THREE.Vector3(0, 0.14, 0);
const LOOK_TO = new THREE.Vector3(0, 0, 0);

/** Hold on WEAR, fold through the middle, hold on CARRY. */
export function packFromScroll(progress: number) {
  return clamp(mapRange(progress, 0.16, 0.82, 0, 1), 0, 1);
}

export function TransformationCanvas({
  product,
  getProgress,
  colorway,
  finish = 'ripstop',
  onReady,
  onProgress,
}: TransformationCanvasProps) {
  const { tier } = useDeviceTier();
  const quality: JacketQuality = tier === 'high' ? 'high' : 'medium';

  return (
    <SceneCanvas
      label={`${product.name} folding from worn to carried`}
      interactive={false}
      camera={{ position: [PATH[0].x, PATH[0].y, PATH[0].z] }}
    >
      <StudioEnvironment fog particles={tier === 'high'} intensity={1} />
      <Dolly getProgress={getProgress} />
      <Turntable getProgress={getProgress}>
        <JacketModel
          colorway={colorway}
          finish={finish}
          quality={quality}
          getPackProgress={() => packFromScroll(getProgress())}
          onReady={onReady}
          onProgress={onProgress}
        />
      </Turntable>
    </SceneCanvas>
  );
}

function Dolly({ getProgress }: { getProgress: () => number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(PATH, false, 'catmullrom', 0.25), []);
  const station = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const progress = clamp(getProgress(), 0, 1);
    curve.getPointAt(progress, station);

    const damping = 1 - Math.exp(-Math.min(delta, 0.05) * 7);
    state.camera.position.lerp(station, damping);
    look.lerpVectors(LOOK_FROM, LOOK_TO, progress);
    state.camera.lookAt(look);
  });

  return null;
}

/** A slow quarter-turn as the shell folds — the fold is read from two sides. */
function Turntable({ getProgress, children }: { getProgress: () => number; children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const node = group.current;
    if (!node) return;
    const progress = clamp(getProgress(), 0, 1);
    const damping = 1 - Math.exp(-Math.min(delta, 0.05) * 6);
    node.rotation.y += (progress * 0.92 - node.rotation.y) * damping;
  });

  return <group ref={group}>{children}</group>;
}
