'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import type { ProductHotspot } from '@/types';
import { clamp } from '@/lib/utils';
import {
  JACKET_STAGES,
  disposeParts,
  jacketPartMotion,
  type JacketPart,
  type JacketQuality,
  type PartMotion,
} from './geometry';
import {
  attachPackShader,
  createJacketMaterialFactory,
  createPackUniforms,
  getFinish,
  resolveColorway,
  setPackWeight,
  syncPackMatrices,
  type FinishKey,
  type PackMaterial,
  type PackUniforms,
  type ShellMaterial,
} from './materials';
import { SceneErrorBoundary } from './SceneErrorBoundary';

/* ==========================================================================
   JacketModel — the Meridian Carry Shell in three dimensions.

   Two sources, one interface:

   - PROCEDURAL (today). Revolved and swept geometry, built one stage at a
     time behind a real progress readout, folding into the 2.1 L carry unit
     through the shader in ./materials.
   - GLB (the moment the asset lands). `/models/meridian-shell.glb` is probed
     on mount; if it is there it is loaded with Draco and takes over, using the
     same node names, the same motion table and the same fold. Nothing else on
     the site changes. If the load fails, the procedural shell stands in.

   Hotspot anchors are named Object3Ds positioned on `hotspots[].anchor3d`, so
   annotation markers ride the model instead of floating over a screenshot.
   ========================================================================== */

export const JACKET_MODEL_URL = '/models/meridian-shell.glb';
/** Self-hosted decoders. See public/models/README.md. */
export const DRACO_DECODER_PATH = '/draco/';

export type JacketModelProps = {
  /** Hex or catalogue colourway name. */
  colorway?: string;
  finish?: FinishKey;
  /** 0 = worn, 1 = packed. React-driven. */
  packProgress?: number;
  /** Frame-driven alternative for scroll scenes — avoids a render per tick. */
  getPackProgress?: () => number;
  /** 0 = assembled, 1 = exploded. */
  explode?: number;
  quality?: JacketQuality;
  hotspots?: ProductHotspot[];
  /** Rendered inside each anchor group — markers, labels, leaders. */
  renderAnchor?: (hotspot: ProductHotspot, index: number) => ReactNode;
  onAnchors?: (anchors: Record<string, THREE.Object3D>) => void;
  /** 0..1 across the staged build. Drives the branded loader. */
  onProgress?: (value: number) => void;
  onReady?: () => void;
  /** Pass null to force the procedural shell. */
  modelUrl?: string | null;
};

type PartNode = {
  key: string;
  motion: PartMotion;
  object: THREE.Object3D;
  material: PackMaterial | ShellMaterial | null;
  base: { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 };
  /** Set when a GLB carries a `pack` morph target. */
  morph: { mesh: THREE.Mesh; index: number } | null;
};

/* ------------------------------------------------------------ GLB probe --- */

let probe: Promise<boolean> | null = null;

/**
 * Resolves true when a real model is sitting at `url`. The result is cached for
 * the session, and a hit warms the GLTF + Draco cache immediately so the swap
 * from procedural to scanned geometry happens without a second round trip.
 */
export function loadJacketGLB(url: string = JACKET_MODEL_URL): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  probe ??= fetch(url, { method: 'HEAD' })
    .then((response) => {
      if (!response.ok) return false;
      const type = response.headers.get('content-type') ?? '';
      const length = Number(response.headers.get('content-length') ?? '0');
      // A dev-server 404 page is HTML with a 200 in some setups — reject both.
      const looksLikeModel = !type.includes('text/html') && (length === 0 || length > 1024);
      if (looksLikeModel) useGLTF.preload(url, DRACO_DECODER_PATH);
      return looksLikeModel;
    })
    .catch(() => false);
  return probe;
}

function useJacketGLB(url: string | null | undefined) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    if (url === null) return;
    let alive = true;
    loadJacketGLB(url ?? JACKET_MODEL_URL).then((ok) => {
      if (alive) setAvailable(ok);
    });
    return () => {
      alive = false;
    };
  }, [url]);
  return available;
}

/* ------------------------------------------------------------- the model --- */

const scratch = {
  position: new THREE.Vector3(),
  offset: new THREE.Vector3(),
  quaternion: new THREE.Quaternion(),
  euler: new THREE.Euler(),
};

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

/** Drives a GLB's own `pack` morph target, when the export carries one. */
function applyMorph(node: PartNode, value: number) {
  const morph = node.morph;
  if (!morph) return;
  const influences = morph.mesh.morphTargetInfluences;
  if (influences) influences[morph.index] = value;
}

/** Carry hardware fades in; worn hardware fades out. Zero-opacity parts are
 *  skipped by the renderer entirely rather than drawn transparent. */
function applyOpacity(node: PartNode, value: number) {
  const material = node.material;
  if (!material) return;
  material.opacity = value;
  material.depthWrite = value > 0.92;
  node.object.visible = value > 0.012;
}

function window01(value: number, from: number, to: number) {
  if (to <= from) return value >= to ? 1 : 0;
  return clamp((value - from) / (to - from), 0, 1);
}

export function JacketModel({
  colorway = 'Basalt',
  finish = 'ripstop',
  packProgress = 0,
  getPackProgress,
  explode = 0,
  quality = 'high',
  hotspots = [],
  renderAnchor,
  onAnchors,
  onProgress,
  onReady,
  modelUrl,
}: JacketModelProps) {
  const rootRef = useRef<THREE.Group>(null);
  const nodesRef = useRef<PartNode[]>([]);
  const anchorGroupRef = useRef<THREE.Group>(null);
  const packRef = useRef(0);
  const explodeRef = useRef(0);
  const invalidate = useThree((state) => state.invalidate);

  const packUniforms = useMemo<PackUniforms>(() => createPackUniforms(), []);
  // The frame loop drives the fold through a ref — a memo is not for mutating.
  const fold = useRef(packUniforms);
  const glbAvailable = useJacketGLB(modelUrl);
  const url = modelUrl ?? JACKET_MODEL_URL;

  const handleNodes = useCallback((nodes: PartNode[]) => {
    nodesRef.current = nodes;
  }, []);

  const anchorCallback = useRef(onAnchors);
  useEffect(() => {
    anchorCallback.current = onAnchors;
  }, [onAnchors]);

  /* Anchors are reported once the graph exists so overlays can attach to them. */
  useLayoutEffect(() => {
    const report = anchorCallback.current;
    const group = anchorGroupRef.current;
    if (!report || !group) return;
    const map: Record<string, THREE.Object3D> = {};
    for (const child of group.children) {
      if (child.name.startsWith('anchor_')) map[child.name.slice(7)] = child;
    }
    report(map);
  }, [hotspots]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const damping = 1 - Math.exp(-dt * 11);

    const targetPack = clamp(getPackProgress ? getPackProgress() : packProgress, 0, 1);
    const targetExplode = clamp(explode, 0, 1);
    const settledBefore =
      Math.abs(targetPack - packRef.current) < 0.0004 &&
      Math.abs(targetExplode - explodeRef.current) < 0.0004;

    packRef.current += (targetPack - packRef.current) * damping;
    explodeRef.current += (targetExplode - explodeRef.current) * damping;

    const pack = packRef.current;
    const eased = easeInOut(pack);
    const burst = explodeRef.current;

    for (const node of nodesRef.current) {
      const { motion, object, base } = node;

      scratch.position.copy(base.position);
      if (motion.packPosition) {
        scratch.position.addScaledVector(scratch.offset.set(...motion.packPosition), eased);
      }
      if (motion.explode) {
        scratch.position.addScaledVector(scratch.offset.set(...motion.explode), burst);
      }
      object.position.copy(scratch.position);

      if (motion.packRotation) {
        scratch.euler.set(
          motion.packRotation[0] * eased,
          motion.packRotation[1] * eased,
          motion.packRotation[2] * eased,
        );
        object.quaternion.copy(base.quaternion).multiply(scratch.quaternion.setFromEuler(scratch.euler));
      }

      if (motion.packScale) {
        object.scale.set(
          base.scale.x * (1 + (motion.packScale[0] - 1) * eased),
          base.scale.y * (1 + (motion.packScale[1] - 1) * eased),
          base.scale.z * (1 + (motion.packScale[2] - 1) * eased),
        );
      }

      applyMorph(node, eased);

      if (motion.appear) {
        applyOpacity(node, window01(pack, motion.appear[0], motion.appear[1]));
      } else if (motion.vanish) {
        applyOpacity(node, 1 - window01(pack, motion.vanish[0], motion.vanish[1]));
      }
    }

    fold.current.uPack.value = eased;

    const root = rootRef.current;
    if (root && (eased > 0.0002 || burst > 0.0002)) {
      root.updateWorldMatrix(true, true);
      syncPackMatrices(root);
    }

    const anchors = anchorGroupRef.current;
    if (anchors) anchors.visible = pack < 0.08;

    if (!settledBefore) invalidate();
  });

  const shellProps = {
    colorway,
    finish,
    quality,
    packUniforms,
    onNodes: handleNodes,
    onProgress,
    onReady,
  };

  return (
    <group ref={rootRef} name="meridian-shell">
      {glbAvailable ? (
        <SceneErrorBoundary fallback={<ProceduralShell {...shellProps} />}>
          <Suspense fallback={<ProceduralShell {...shellProps} />}>
            <GLBShell {...shellProps} url={url} />
          </Suspense>
        </SceneErrorBoundary>
      ) : (
        <ProceduralShell {...shellProps} />
      )}

      <group ref={anchorGroupRef} name="anchors">
        {hotspots.map((hotspot, index) =>
          hotspot.anchor3d ? (
            <group key={hotspot.id} name={`anchor_${hotspot.id}`} position={hotspot.anchor3d}>
              {renderAnchor?.(hotspot, index)}
            </group>
          ) : null,
        )}
      </group>
    </group>
  );
}

/* ---------------------------------------------------------- procedural --- */

type ShellProps = {
  colorway: string;
  finish: FinishKey;
  quality: JacketQuality;
  packUniforms: PackUniforms;
  onNodes: (nodes: PartNode[]) => void;
  onProgress?: (value: number) => void;
  onReady?: () => void;
};

/**
 * Builds the shell one stage at a time across animation frames. Six stages,
 * six progress steps — the loader is reporting real work, not a fake timer,
 * and no single frame stalls long enough to drop the page's own animation.
 */
function useStagedParts(quality: JacketQuality, onProgress?: (value: number) => void) {
  const [parts, setParts] = useState<JacketPart[]>([]);
  const progressRef = useRef(onProgress);

  useEffect(() => {
    progressRef.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let stage = 0;
    const built: JacketPart[] = [];

    progressRef.current?.(0);

    const step = () => {
      if (cancelled) return;
      built.push(...JACKET_STAGES[stage].build(quality));
      stage += 1;
      progressRef.current?.(stage / JACKET_STAGES.length);
      if (stage < JACKET_STAGES.length) {
        frame = requestAnimationFrame(step);
      } else {
        setParts(built.slice());
      }
    };

    frame = requestAnimationFrame(step);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      setParts([]);
      disposeParts(built);
    };
  }, [quality]);

  return parts;
}

function ProceduralShell({
  colorway,
  finish,
  quality,
  packUniforms,
  onNodes,
  onProgress,
  onReady,
}: ShellProps) {
  const groupRef = useRef<THREE.Group>(null);
  const readyCallback = useRef(onReady);
  const parts = useStagedParts(quality, onProgress);

  useEffect(() => {
    readyCallback.current = onReady;
  }, [onReady]);

  const factory = useMemo(
    () =>
      createJacketMaterialFactory({
        colorway,
        finish,
        weave: quality === 'high',
        packUniforms,
      }),
    // Colour and finish are pushed in below — a swatch change must not rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [quality, packUniforms],
  );

  useEffect(() => () => factory.dispose(), [factory]);
  useEffect(() => factory.update({ colorway, finish }), [colorway, finish, factory]);

  const materials = useMemo(() => {
    const map = new Map<string, ShellMaterial>();
    for (const part of parts) {
      const material = factory.create(part.material);
      if (part.appear || part.vanish) {
        material.transparent = true;
        material.opacity = part.appear ? 0 : 1;
        material.depthWrite = !part.appear;
      }
      if (part.noClamp) setPackWeight(material, 0);
      map.set(part.key, material);
    }
    return map;
  }, [parts, factory]);

  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group || parts.length === 0) return;

    const byKey = new Map(parts.map((part) => [part.key, part]));
    const nodes: PartNode[] = [];
    for (const child of group.children) {
      const part = byKey.get(child.name);
      if (!part) continue;
      nodes.push({
        key: part.key,
        motion: part,
        object: child,
        material: materials.get(part.key) ?? null,
        base: {
          position: child.position.clone(),
          quaternion: child.quaternion.clone(),
          scale: child.scale.clone(),
        },
        morph: null,
      });
    }
    onNodes(nodes);
    readyCallback.current?.();

    return () => onNodes([]);
  }, [parts, materials, onNodes]);

  return (
    <group ref={groupRef} name="shell-procedural">
      {parts.map((part) => (
        <group
          key={part.key}
          name={part.key}
          position={part.position}
          rotation={part.rotation}
          scale={part.scale}
        >
          <mesh
            geometry={part.geometry}
            material={materials.get(part.key)}
            castShadow={part.castShadow}
            receiveShadow={part.receiveShadow}
          />
        </group>
      ))}
    </group>
  );
}

/* ----------------------------------------------------------------- GLB --- */

function GLBShell({
  url,
  colorway,
  finish,
  quality,
  packUniforms,
  onNodes,
  onReady,
}: ShellProps & { url: string }) {
  const gltf = useGLTF(url, DRACO_DECODER_PATH);
  const scene = useMemo(() => SkeletonUtils.clone(gltf.scene), [gltf]);
  const motion = useMemo(() => jacketPartMotion(), []);
  const owned = useRef<THREE.Material[]>([]);
  const readyCallback = useRef(onReady);

  useEffect(() => {
    readyCallback.current = onReady;
  }, [onReady]);

  useLayoutEffect(() => {
    const nodes: PartNode[] = [];
    const shellColor = new THREE.Color(resolveColorway(colorway));
    const spec = getFinish(finish);
    owned.current = [];

    scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.isMesh) {
        // Clone so two viewers can hold two colourways of the same asset.
        const source = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const material = source.clone() as PackMaterial;
        owned.current.push(material);
        mesh.material = material;
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        const isShell = /shell|body|sleeve|hood|placket|pocket/i.test(material.name || mesh.name);
        if (isShell) {
          material.color.copy(shellColor);
          material.roughness = spec.roughness;
          material.metalness = spec.metalness;
        }
        attachPackShader(material, {
          pack: packUniforms,
          weave: quality === 'high' && isShell,
          finish: spec,
        });

        const morphIndex = mesh.morphTargetDictionary?.pack;
        if (morphIndex !== undefined && mesh.morphTargetInfluences) {
          // A real export brings its own fold — the shader one stands down.
          setPackWeight(material, 0);
        }
      }

      const entry = motion[object.name];
      const morphIndex = (object as THREE.Mesh).morphTargetDictionary?.pack;
      if (!entry && morphIndex === undefined) return;
      nodes.push({
        key: object.name,
        motion: entry ?? {},
        object,
        material: ((object as THREE.Mesh).material as PackMaterial) ?? null,
        base: {
          position: object.position.clone(),
          quaternion: object.quaternion.clone(),
          scale: object.scale.clone(),
        },
        morph:
          morphIndex !== undefined && (object as THREE.Mesh).morphTargetInfluences
            ? { mesh: object as THREE.Mesh, index: morphIndex }
            : null,
      });
    });

    onNodes(nodes);
    readyCallback.current?.();
    return () => onNodes([]);
  }, [scene, motion, colorway, finish, quality, packUniforms, onNodes]);

  useEffect(
    () => () => {
      // Geometry belongs to the GLTF cache; the cloned materials do not.
      for (const material of owned.current) material.dispose();
      owned.current = [];
    },
    [scene],
  );

  return <primitive object={scene} />;
}
