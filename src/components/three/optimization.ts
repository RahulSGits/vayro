'use client';

import { useEffect, useRef, type RefObject } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { KTX2Loader } from 'three-stdlib';
import type { GLTFLoader } from 'three-stdlib';
import { three as threeTokens } from '@/lib/design-tokens';
import { clamp } from '@/lib/utils';

/* ==========================================================================
   Optimization — the four things that keep WebGL honest on a real device.

   1. Compressed delivery.  DRACO for geometry, KTX2/Basis for texture.
   2. Adaptive resolution.  Measure the frame, not the hardware.
   3. Culling and bounds.   Do not draw what is off screen; do not cull what
                            the vertex shader has moved off its own bounds.
   4. Disposal.             A scene that unmounts gives its VRAM back.

   Plus a small LOD helper, because the carry unit at arm's length and the
   carry unit at six metres are not the same amount of geometry.
   ========================================================================== */

/* ------------------------------------------------------------- decoders --- */

/**
 * Where the self-hosted decoders live. The site loads no third-party scripts,
 * so both sets are served from `public/`:
 *
 *   DRACO — geometry compression
 *     mkdir -p public/draco
 *     cp node_modules/three/examples/jsm/libs/draco/gltf/* public/draco/
 *     (draco_decoder.js, draco_decoder.wasm, draco_wasm_wrapper.js —
 *      the encoder in that folder can be deleted)
 *
 *   KTX2 / Basis — texture transcoding
 *     mkdir -p public/basis
 *     cp node_modules/three/examples/jsm/libs/basis/* public/basis/
 *     (basis_transcoder.js, basis_transcoder.wasm)
 *
 * Neither is fetched unless a model actually uses it. The procedural shell
 * ships no textures at all, and `meridian-shell.glb` is only Draco-compressed
 * if the export pipeline in public/models/README.md was followed.
 */
export const DECODER_PATHS = {
  draco: '/draco/',
  ktx2: '/basis/',
} as const;

let ktx2Loader: KTX2Loader | null = null;
let knownRenderer: THREE.WebGLRenderer | null = null;

/**
 * KTX2 has to ask the renderer which compressed formats the GPU can take, so
 * the canvas hands its renderer over on creation. Called from `SceneCanvas`.
 */
export function registerRenderer(renderer: THREE.WebGLRenderer) {
  knownRenderer = renderer;
  if (ktx2Loader) ktx2Loader.detectSupport(renderer);
}

/**
 * `extendLoader` for drei's `useGLTF`. Draco is configured by drei itself from
 * the decoder path argument; this adds the KTX2 transcoder on top.
 *
 *   useGLTF(url, DECODER_PATHS.draco, true, configureModelLoader)
 *
 * It is a stable module-level reference on purpose: `useGLTF.preload()` and
 * `useGLTF()` must be handed the same configuration or a warmed cache entry
 * and a rendered one can disagree about what the file contains.
 */
export function configureModelLoader(loader: GLTFLoader) {
  if (!ktx2Loader) {
    ktx2Loader = new KTX2Loader().setTranscoderPath(DECODER_PATHS.ktx2);
    if (knownRenderer) ktx2Loader.detectSupport(knownRenderer);
  }
  loader.setKTX2Loader(ktx2Loader);
}

/** Frees the transcoder's worker pool. Only for a full teardown. */
export function disposeModelLoader() {
  ktx2Loader?.dispose();
  ktx2Loader = null;
  knownRenderer = null;
}

/* --------------------------------------------------------- adaptive dpr --- */

export type AdaptiveDprOptions = {
  /** Never go below this. Defaults to the token floor. */
  min?: number;
  /** Never go above this. Pass the tier's dpr budget. */
  max?: number;
  /** Frame time that means we are behind. Default 22 ms — roughly 45 fps. */
  budgetMs?: number;
  /** Frame time that means we have room. Default 13 ms — roughly 77 fps. */
  headroomMs?: number;
  /** Frames averaged before a decision. Short windows chase noise. */
  window?: number;
  /** How much resolution moves per decision. */
  step?: number;
  enabled?: boolean;
  onChange?: (dpr: number) => void;
};

/**
 * Lowers the pixel ratio when frames start costing more than the budget, and
 * gives it back once they do not. Two hysteresis bands and a settle delay, so
 * the resolution does not oscillate around a threshold — a visible pulse is
 * worse than a slightly soft frame.
 *
 * Samples longer than 100 ms are discarded rather than acted on: a backgrounded
 * tab, a garbage-collection pause and the gap between two frames on the demand
 * frameloop are all long, and none of them mean the GPU is struggling.
 */
export function useAdaptiveDpr({
  min = threeTokens.dpr.min,
  max = threeTokens.dpr.max,
  budgetMs = 22,
  headroomMs = 13,
  window: windowSize = 45,
  step = 0.25,
  enabled = true,
  onChange,
}: AdaptiveDprOptions = {}) {
  const setDpr = useThree((state) => state.setDpr);
  const initialDpr = useThree((state) => state.viewport.initialDpr);
  const current = useRef(clamp(initialDpr, min, max));
  const frames = useRef(0);
  const elapsed = useRef(0);
  const settle = useRef(0);
  const report = useRef(onChange);

  useEffect(() => {
    report.current = onChange;
  }, [onChange]);

  // A tab that comes back from the background reports one enormous frame and
  // then a few fast ones. Start the window again rather than trust either.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const reset = () => {
      frames.current = 0;
      elapsed.current = 0;
      settle.current = 12;
    };
    document.addEventListener('visibilitychange', reset);
    return () => document.removeEventListener('visibilitychange', reset);
  }, []);

  useEffect(() => {
    // Re-clamp when the tier budget changes underneath us.
    const next = clamp(current.current, min, max);
    if (next !== current.current) {
      current.current = next;
      setDpr(next);
    }
  }, [min, max, setDpr]);

  useFrame((_, delta) => {
    if (!enabled) return;

    const ms = delta * 1000;
    if (ms > 100 || ms <= 0) {
      frames.current = 0;
      elapsed.current = 0;
      return;
    }

    if (settle.current > 0) {
      settle.current -= 1;
      return;
    }

    frames.current += 1;
    elapsed.current += ms;
    if (frames.current < windowSize) return;

    const average = elapsed.current / frames.current;
    frames.current = 0;
    elapsed.current = 0;

    let next = current.current;
    if (average > budgetMs) next = clamp(current.current - step, min, max);
    else if (average < headroomMs) next = clamp(current.current + step, min, max);

    if (Math.abs(next - current.current) < 0.001) return;

    current.current = next;
    setDpr(next);
    // Resolution changes force a full resize; give it a moment before judging
    // the frames that follow.
    settle.current = 20;
    report.current?.(next);
  });
}

export type AdaptiveResolutionProps = AdaptiveDprOptions;

/** The hook as a component, for scenes that compose rather than call hooks. */
export function AdaptiveResolution(props: AdaptiveResolutionProps) {
  useAdaptiveDpr(props);
  return null;
}

/* ---------------------------------------------------------- culling --- */

export type CullingOptions = {
  enabled?: boolean;
  /**
   * Pads every bounding sphere by this factor. The fold shader moves vertices
   * a long way from where the CPU thinks they are, and a mesh culled because
   * its authored bounds left the frustum pops out of existence mid-transform.
   * 1.6 covers the full collapse into the carry box.
   */
  padding?: number;
};

/**
 * Turns frustum culling on across a subtree and makes the bounds trustworthy.
 *
 * Anything marked `userData.noCull` is left alone — the drifting motes place
 * themselves in the vertex shader and have no meaningful bounds at all.
 * Returns the number of meshes it configured.
 */
export function applyFrustumCulling(
  root: THREE.Object3D | null | undefined,
  { enabled = true, padding = 1.6 }: CullingOptions = {},
): number {
  if (!root) return 0;
  let count = 0;

  root.traverse((object) => {
    if (object.userData?.noCull) {
      object.frustumCulled = false;
      return;
    }
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;

    object.frustumCulled = enabled;
    if (!enabled) return;

    const geometry = mesh.geometry;
    if (geometry) {
      if (!geometry.boundingSphere) geometry.computeBoundingSphere();
      const sphere = geometry.boundingSphere;
      if (sphere && !geometry.userData.paddedBounds) {
        sphere.radius *= padding;
        geometry.userData.paddedBounds = true;
      }
    }
    count += 1;
  });

  return count;
}

/* --------------------------------------------------------------- LOD --- */

export type LODLevel = {
  object: THREE.Object3D;
  /** Camera distance at which this level takes over. Ascending order. */
  distance: number;
};

/**
 * A plain three.js LOD, built from levels in one call and set to update
 * itself. The near level should be level zero at distance zero.
 *
 *   const lod = createLOD([
 *     { object: shellHigh,   distance: 0 },
 *     { object: shellMedium, distance: 4.5 },
 *     { object: shellLow,    distance: 8 },
 *   ]);
 */
export function createLOD(levels: LODLevel[], { autoUpdate = true } = {}): THREE.LOD {
  const lod = new THREE.LOD();
  lod.autoUpdate = autoUpdate;
  for (const level of [...levels].sort((a, b) => a.distance - b.distance)) {
    lod.addLevel(level.object, level.distance);
  }
  return lod;
}

/**
 * The distance bands the shell uses, scaled to the device budget. A phone
 * drops to the cheap level sooner because it is also drawing fewer pixels.
 */
export function lodDistances(tier: 'high' | 'medium' | 'low'): [number, number, number] {
  if (tier === 'high') return [0, 5.4, 9];
  if (tier === 'medium') return [0, 4.2, 7];
  return [0, 3.2, 5.4];
}

/* ----------------------------------------------------------- disposal --- */

export type DisposalReport = { geometries: number; materials: number; textures: number };

function disposeMaterial(material: THREE.Material, keep: Set<unknown>, report: DisposalReport) {
  if (keep.has(material)) return;
  keep.add(material);

  for (const value of Object.values(material as unknown as Record<string, unknown>)) {
    if (value instanceof THREE.Texture && !keep.has(value)) {
      keep.add(value);
      value.dispose();
      report.textures += 1;
    }
  }

  material.dispose();
  report.materials += 1;
}

/**
 * Releases every GPU resource a subtree owns: geometry buffers, materials and
 * the textures hanging off them. Shared resources are disposed once.
 *
 * Pass `keep` for anything the tree does not own — geometry that belongs to
 * the GLTF cache, for instance, is reused by the next mount and must survive.
 */
export function disposeObject3D(
  root: THREE.Object3D | null | undefined,
  { keep = [], detach = true }: { keep?: readonly unknown[]; detach?: boolean } = {},
): DisposalReport {
  const report: DisposalReport = { geometries: 0, materials: 0, textures: 0 };
  if (!root) return report;

  const seen = new Set<unknown>(keep);

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;

    const geometry = mesh.geometry;
    if (geometry && !seen.has(geometry)) {
      seen.add(geometry);
      geometry.dispose();
      report.geometries += 1;
    }

    const material = mesh.material;
    if (!material) return;
    if (Array.isArray(material)) {
      for (const entry of material) disposeMaterial(entry, seen, report);
    } else {
      disposeMaterial(material, seen, report);
    }
  });

  if (detach) root.removeFromParent();
  return report;
}

/** Disposes the subtree under `ref` when the component unmounts. */
export function useDisposeOnUnmount(
  ref: RefObject<THREE.Object3D | null>,
  options?: { keep?: readonly unknown[] },
) {
  const keep = options?.keep;
  useEffect(
    () => () => {
      disposeObject3D(ref.current, { keep, detach: false });
    },
    [ref, keep],
  );
}
