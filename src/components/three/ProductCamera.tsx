'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { three as threeTokens } from '@/lib/design-tokens';
import { clamp } from '@/lib/utils';

/* ==========================================================================
   ProductCamera — the camera rig, addressed by name.

   The orbit maths here is the rig that already drives the product viewer
   (`ViewerRig` in product-3d/ProductViewerScene.tsx), lifted out so any scene
   can use it: convert the camera's offset from the orbit centre to spherical
   coordinates, damp theta / phi / radius toward a goal, write the position
   back. Nothing about the feel changes — same exponential damping, same polar
   clamp from `three.orbit` in the design tokens.

   What it adds is a vocabulary and a way in:

     const camera = useProductCamera();
     camera.goTo('back');                 // named view, smooth dolly
     camera.focus([0, 1.15, 0.18]);       // swing round to a hotspot anchor
     camera.zoom(0.82);                   // step in
     camera.reset();

   Commands travel through a subscription, not React state, so a control bar
   can drive the camera without re-rendering the scene. Place one
   <ProductCamera controller={camera} /> inside the canvas.

   It cooperates with OrbitControls rather than fighting it: the orbit centre
   is read from `makeDefault` controls when they are present, and the position
   is written at default frame priority — after drei has run controls.update()
   at priority -1 — so a dolly in flight wins, and the controls resynchronise
   from the camera on the next tick.
   ========================================================================== */

export type CameraViewName = 'front' | 'back' | 'left' | 'right' | 'detail';

export type CameraView = {
  /** Azimuth, radians. 0 faces the front placket. */
  theta: number;
  /** Polar angle, radians. Clamped to the token orbit limits. */
  phi: number;
  /** Distance from the orbit centre. Clamped to the rig range. */
  radius: number;
};

/** The rest view — three-quarter, eye level. Matches the viewer's default. */
export const DEFAULT_PRODUCT_VIEW: CameraView = { theta: 0.34, phi: 1.36, radius: 4.9 };

/** How close and how far the rig will ever go. Shared with ProductControls. */
export const CAMERA_RANGE = { min: 2.6, max: 7.4 } as const;

/** The orbit centre — mid-chest on the shell, a touch above the origin. */
export const CAMERA_TARGET: readonly [number, number, number] = [0, 0.04, 0];

/**
 * Named views. Theta follows the viewer's existing convention: front is 0,
 * the shell's right shoulder is +π/2, back is π.
 */
export const PRODUCT_VIEWS: Record<CameraViewName, CameraView> = {
  front: { theta: 0, phi: 1.36, radius: 4.6 },
  back: { theta: Math.PI, phi: 1.36, radius: 4.9 },
  left: { theta: -Math.PI / 2, phi: 1.38, radius: 4.9 },
  right: { theta: Math.PI / 2, phi: 1.38, radius: 4.9 },
  /** Close on the chest and the placket — near enough to read the weave. */
  detail: { theta: 0.34, phi: 1.18, radius: 3.05 },
};

export const PRODUCT_VIEW_NAMES = ['front', 'back', 'left', 'right', 'detail'] as const;

export const PRODUCT_VIEW_LABELS: Record<CameraViewName, string> = {
  front: 'Front',
  back: 'Back',
  left: 'Left',
  right: 'Right',
  detail: 'Detail',
};

export type CameraCommand =
  | { kind: 'view'; view: CameraView }
  | { kind: 'nudge'; theta: number; phi: number }
  | { kind: 'zoom'; factor: number }
  | { kind: 'focus'; point: readonly [number, number, number]; radius: number }
  | { kind: 'stop' };

export type ProductCameraController = {
  /** Move to a named view, or to explicit spherical coordinates. */
  goTo(view: CameraViewName | CameraView): void;
  /** Turn by a delta without changing the distance. */
  nudge(theta: number, phi?: number): void;
  /** Multiply the current distance. Below 1 moves in. */
  zoom(factor: number): void;
  /** Swing round to face a point in model space and dolly in on it. */
  focus(point: readonly [number, number, number], options?: { radius?: number }): void;
  /** Back to the rest view. */
  reset(): void;
  /** Abandon a transition in flight — a drag has taken over. */
  stop(): void;
  /** True while a transition is running. Auto-rotate should stand down. */
  busy(): boolean;
  send(command: CameraCommand): void;
  subscribe(listener: (command: CameraCommand) => void): () => void;
  /** Internal. `ProductCamera` reports its settle state through this. */
  reportBusy(value: boolean): void;
};

export function createProductCamera(): ProductCameraController {
  const listeners = new Set<(command: CameraCommand) => void>();
  let busy = false;

  const send = (command: CameraCommand) => {
    for (const listener of listeners) listener(command);
  };

  return {
    send,
    goTo(view) {
      send({ kind: 'view', view: typeof view === 'string' ? PRODUCT_VIEWS[view] : view });
    },
    nudge(theta, phi = 0) {
      send({ kind: 'nudge', theta, phi });
    },
    zoom(factor) {
      send({ kind: 'zoom', factor });
    },
    focus(point, options) {
      send({ kind: 'focus', point, radius: options?.radius ?? PRODUCT_VIEWS.detail.radius });
    },
    reset() {
      send({ kind: 'view', view: DEFAULT_PRODUCT_VIEW });
    },
    stop() {
      send({ kind: 'stop' });
    },
    busy: () => busy,
    reportBusy(value) {
      busy = value;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

/** A controller that survives re-renders. Create it outside the canvas. */
export function useProductCamera(): ProductCameraController {
  return useMemo(() => createProductCamera(), []);
}

/* ------------------------------------------------------------------ rig --- */

const spherical = new THREE.Spherical();
const offset = new THREE.Vector3();
const centre = new THREE.Vector3();
const anchor = new THREE.Vector3();

/** Shortest signed way round the circle, so `back` never takes the long path. */
function shortestAngle(delta: number) {
  const twoPi = Math.PI * 2;
  let d = delta % twoPi;
  if (d > Math.PI) d -= twoPi;
  if (d < -Math.PI) d += twoPi;
  return d;
}

type OrbitLike = { target?: unknown };

/** Reads the orbit centre from `makeDefault` controls, or falls back. */
function orbitCentre(controls: unknown, fallback: readonly [number, number, number]) {
  const target = (controls as OrbitLike | null)?.target;
  if (target instanceof THREE.Vector3) return centre.copy(target);
  return centre.set(fallback[0], fallback[1], fallback[2]);
}

type Goal = CameraView & { active: boolean };

export type ProductCameraProps = {
  controller: ProductCameraController;
  /** Orbit centre, when no `makeDefault` controls are mounted. */
  target?: readonly [number, number, number];
  /** Dolly range. Keep it identical to the controls' min/max distance. */
  range?: { min: number; max: number };
  /** Higher is snappier. 6.5 is the viewer's feel. */
  speed?: number;
  /** Declarative view. Changing it dollies there. */
  view?: CameraViewName | CameraView;
  onSettled?: () => void;
};

/**
 * Drives the default camera. Renders nothing; mount it anywhere in the scene.
 */
export function ProductCamera({
  controller,
  target = CAMERA_TARGET,
  range = CAMERA_RANGE,
  speed = 6.5,
  view,
  onSettled,
}: ProductCameraProps) {
  const invalidate = useThree((state) => state.invalidate);
  const getState = useThree((state) => state.get);
  const goal = useRef<Goal>({ ...DEFAULT_PRODUCT_VIEW, active: false });
  const settled = useRef(onSettled);

  useEffect(() => {
    settled.current = onSettled;
  }, [onSettled]);

  /* A command resolves to a spherical goal the moment it arrives; the frame
     loop only walks toward it. Resolving here — rather than one frame later —
     is what lets two quick taps on "turn right" add up to a half turn. */
  useEffect(
    () =>
      controller.subscribe((command) => {
        const node = goal.current;

        if (command.kind === 'stop') {
          node.active = false;
          controller.reportBusy(false);
          return;
        }

        const state = getState();
        const centreVec = orbitCentre(state.controls, target);
        offset.copy(state.camera.position).sub(centreVec);
        spherical.setFromVector3(offset);

        // A transition already in flight is the honest starting point for a
        // relative command; a settled rig starts from where the camera is.
        const fromTheta = node.active ? node.theta : spherical.theta;
        const fromPhi = node.active ? node.phi : spherical.phi;
        const fromRadius = node.active ? node.radius : spherical.radius;

        switch (command.kind) {
          case 'view':
            node.theta = command.view.theta;
            node.phi = command.view.phi;
            node.radius = command.view.radius;
            break;
          case 'nudge':
            node.theta = fromTheta + command.theta;
            node.phi = fromPhi + command.phi;
            node.radius = fromRadius;
            break;
          case 'zoom':
            node.theta = fromTheta;
            node.phi = fromPhi;
            node.radius = fromRadius * command.factor;
            break;
          case 'focus': {
            // Face the anchor from outside, at reading distance. The orbit
            // centre never moves, so the controls stay in agreement with us.
            anchor.set(command.point[0], command.point[1], command.point[2]).sub(centreVec);
            if (anchor.lengthSq() < 1e-6) {
              node.theta = fromTheta;
              node.phi = fromPhi;
            } else {
              spherical.setFromVector3(anchor);
              node.theta = spherical.theta;
              node.phi = spherical.phi;
            }
            node.radius = command.radius;
            break;
          }
        }

        node.phi = clamp(node.phi, threeTokens.orbit.minPolar, threeTokens.orbit.maxPolar);
        node.radius = clamp(node.radius, range.min, range.max);
        node.active = true;
        controller.reportBusy(true);
        invalidate();
      }),
    [controller, getState, invalidate, range.min, range.max, target],
  );

  useEffect(() => {
    if (!view) return;
    controller.goTo(view);
  }, [view, controller]);

  useEffect(() => () => controller.reportBusy(false), [controller]);

  useFrame((state, delta) => {
    const node = goal.current;
    if (!node.active) return;

    const k = 1 - Math.exp(-Math.min(delta, 0.05) * speed);
    const centreVec = orbitCentre(state.controls, target);
    offset.copy(state.camera.position).sub(centreVec);
    spherical.setFromVector3(offset);

    const dTheta = shortestAngle(node.theta - spherical.theta);
    const dPhi = node.phi - spherical.phi;
    const dRadius = node.radius - spherical.radius;

    spherical.theta += dTheta * k;
    spherical.phi = clamp(
      spherical.phi + dPhi * k,
      threeTokens.orbit.minPolar,
      threeTokens.orbit.maxPolar,
    );
    spherical.radius = clamp(spherical.radius + dRadius * k, range.min, range.max);

    offset.setFromSpherical(spherical);
    state.camera.position.copy(centreVec).add(offset);
    state.camera.lookAt(centreVec);

    if (Math.abs(dTheta) < 0.002 && Math.abs(dPhi) < 0.002 && Math.abs(dRadius) < 0.004) {
      node.active = false;
      controller.reportBusy(false);
      settled.current?.();
    } else {
      invalidate();
    }
  });

  return null;
}

export default ProductCamera;
