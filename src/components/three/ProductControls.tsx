'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { three as threeTokens } from '@/lib/design-tokens';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { CAMERA_RANGE, CAMERA_TARGET, type ProductCameraController } from './ProductCamera';

/* ==========================================================================
   ProductControls — drag, pinch, pan, auto-rotate.

   The same OrbitControls configuration the product viewer already ships,
   given a name and two things it did not have:

   1. It tells you *what kind* of interaction happened. OrbitControls fires one
      undifferentiated change event, so rotate and zoom are separated here at
      the source — wheel and two-finger touch are zoom, everything else that
      starts a drag is rotate. The viewer's analytics needs that distinction
      and was previously guessing at it from the DOM.

   2. It stands down while a camera transition is in flight. Pass the same
      `ProductCameraController` you gave <ProductCamera /> and auto-rotate
      pauses for the dolly instead of dragging against it.

   Touch: one finger rotates, two fingers dolly — and rotate as well, unless
   panning is enabled, in which case two fingers dolly and pan. Rotate speed
   drops on a coarse pointer, because a thumb travels further than a mouse.
   ========================================================================== */

export type ProductControlsProps = {
  /** Orbit centre. Defaults to the shell's mid-chest. */
  target?: readonly [number, number, number];
  autoRotate?: boolean;
  /** Multiplier on the token orbit speed. The viewer runs at 6. */
  autoRotateSpeed?: number;
  enableRotate?: boolean;
  enableZoom?: boolean;
  /** Off by default — a product on a plinth should not slide out of frame. */
  enablePan?: boolean;
  /** Dolly limits. Keep identical to the ProductCamera range. */
  range?: { min: number; max: number };
  /** Pauses auto-rotate while a named-view transition runs. */
  camera?: ProductCameraController;
  onRotate?: () => void;
  onZoom?: () => void;
  onStart?: () => void;
  onEnd?: () => void;
  children?: ReactNode;
};

export function ProductControls({
  target = CAMERA_TARGET,
  autoRotate = false,
  autoRotateSpeed = 6,
  enableRotate = true,
  enableZoom = true,
  enablePan = false,
  range = CAMERA_RANGE,
  camera,
  onRotate,
  onZoom,
  onStart,
  onEnd,
  children,
}: ProductControlsProps) {
  const controls = useRef<OrbitControlsImpl>(null);
  const domElement = useThree((state) => state.gl.domElement);
  const { coarsePointer, reducedMotion } = useDeviceTier();

  const handlers = useRef({ onRotate, onZoom, onStart, onEnd });
  useEffect(() => {
    handlers.current = { onRotate, onZoom, onStart, onEnd };
  }, [onRotate, onZoom, onStart, onEnd]);

  /* Rotate and zoom are told apart at the input, not inferred afterwards.
     A drag that begins with two fingers down, or any wheel movement, is a
     zoom; everything else that begins a drag is a rotation. */
  const gesture = useRef<'rotate' | 'zoom'>('rotate');

  useEffect(() => {
    if (!domElement) return;

    const wheel = () => {
      gesture.current = 'zoom';
      handlers.current.onZoom?.();
    };
    const touch = (event: TouchEvent) => {
      gesture.current = event.touches.length > 1 ? 'zoom' : 'rotate';
      if (gesture.current === 'zoom') handlers.current.onZoom?.();
    };
    const pointer = () => {
      gesture.current = 'rotate';
    };

    domElement.addEventListener('wheel', wheel, { passive: true });
    domElement.addEventListener('touchstart', touch, { passive: true });
    domElement.addEventListener('touchmove', touch, { passive: true });
    domElement.addEventListener('pointerdown', pointer);

    return () => {
      domElement.removeEventListener('wheel', wheel);
      domElement.removeEventListener('touchstart', touch);
      domElement.removeEventListener('touchmove', touch);
      domElement.removeEventListener('pointerdown', pointer);
    };
  }, [domElement]);

  /* Auto-rotate is decided per frame rather than passed as a prop, because a
     camera transition can start and finish between two renders and the spin
     has to stand down for the whole of it. */
  useFrame(() => {
    const node = controls.current;
    if (node) node.autoRotate = autoRotate && !reducedMotion && !(camera?.busy() ?? false);
  });

  return (
    <>
      <OrbitControls
        ref={controls}
        makeDefault
        target={[target[0], target[1], target[2]]}
        enableRotate={enableRotate}
        enableZoom={enableZoom}
        enablePan={enablePan}
        enableDamping
        dampingFactor={threeTokens.orbit.damping}
        rotateSpeed={coarsePointer ? 0.62 : 0.85}
        zoomSpeed={0.7}
        panSpeed={0.6}
        minDistance={range.min}
        maxDistance={range.max}
        minPolarAngle={threeTokens.orbit.minPolar}
        maxPolarAngle={threeTokens.orbit.maxPolar}
        autoRotateSpeed={threeTokens.orbit.speed * autoRotateSpeed}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: enablePan ? THREE.TOUCH.DOLLY_PAN : THREE.TOUCH.DOLLY_ROTATE,
        }}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: enablePan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
        }}
        onStart={() => {
          // A hand on the model outranks a transition the page started.
          camera?.stop();
          handlers.current.onStart?.();
          if (gesture.current === 'rotate') handlers.current.onRotate?.();
        }}
        onEnd={() => handlers.current.onEnd?.()}
      />
      {children}
    </>
  );
}

export default ProductControls;
