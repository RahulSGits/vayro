'use client';

import { useEffect, type RefObject } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { palette } from '@/lib/design-tokens';
import {
  getFinish,
  resolveColorway,
  SHELL_FINISHES,
  type Finish,
  type FinishKey,
  type PackUserData,
} from './materials';
import type { MaterialKey } from './geometry';

/* ==========================================================================
   ProductMaterials — colourway and finish, applied to the live material.

   A swatch does not swap an image and it does not rebuild the shell. It walks
   the scene graph and writes new values into the MeshPhysicalMaterial that is
   already on screen: base colour, roughness, metalness, sheen, clearcoat, and
   the weave uniforms the ripstop grid reads. The geometry, the fold shader and
   every compiled program stay exactly where they were, so a colour change is a
   uniform upload and the next frame — not a reload.

   Two kinds of material are recognised:

   - Procedural. `createJacketMaterialFactory()` stamps `userData.materialKey`
     on everything it makes, so shell, lining, hardware and webbing each take
     the treatment they are owed.
   - GLB. An exported asset carries its own material names, so anything named
     like a shell panel is treated as shell and everything else is left alone —
     the same rule the loader in JacketModel applies.

   The per-key treatment mirrors the factory's `paint()` in ./materials. Keep
   the two in step: that file owns creation, this one owns live mutation.
   ========================================================================== */

/** A GLB material or mesh whose name reads as shell fabric. */
const SHELL_NAME = /shell|body|sleeve|hood|placket|pocket/i;

type LiveMaterial = THREE.MeshStandardMaterial & {
  userData: PackUserData;
  sheen?: number;
  sheenRoughness?: number;
  sheenColor?: THREE.Color;
  clearcoat?: number;
  clearcoatRoughness?: number;
};

function isPhysical(material: LiveMaterial): material is LiveMaterial & THREE.MeshPhysicalMaterial {
  return (material as THREE.MeshPhysicalMaterial).isMeshPhysicalMaterial === true;
}

function tone(base: THREE.Color, amount: number) {
  return base.clone().multiplyScalar(amount);
}

function paint(material: LiveMaterial, key: MaterialKey, shell: THREE.Color, finish: Finish) {
  const hsl = { h: 0, s: 0, l: 0 };
  shell.getHSL(hsl);
  const isDarkShell = hsl.l < 0.34;
  // Sheen and clearcoat only exist on the physical material. A GLB arriving
  // with a plain standard material still takes the colourway and the finish's
  // roughness — it simply has no cloth sheen to give.
  const physical = isPhysical(material) ? material : null;

  switch (key) {
    case 'shell':
      material.color.copy(shell);
      material.roughness = finish.roughness;
      material.metalness = finish.metalness;
      if (physical) {
        physical.sheen = finish.sheen;
        physical.sheenRoughness = finish.sheenRoughness;
        physical.sheenColor.set(isDarkShell ? palette.stone : palette.white);
        physical.clearcoat = finish.clearcoat;
        physical.clearcoatRoughness = finish.clearcoatRoughness;
      }
      break;
    case 'shellDeep':
      material.color.copy(tone(shell, isDarkShell ? 0.62 : 0.74));
      material.roughness = Math.min(finish.roughness + 0.08, 1);
      material.metalness = finish.metalness;
      if (physical) {
        physical.sheen = finish.sheen * 0.7;
        physical.sheenRoughness = finish.sheenRoughness;
        physical.sheenColor.set(isDarkShell ? palette.stone : palette.slate);
        physical.clearcoat = finish.clearcoat * 0.5;
      }
      break;
    case 'lining':
      material.color.set(isDarkShell ? palette.stone : palette.graphite);
      break;
    case 'webbing':
      material.color.copy(tone(shell, isDarkShell ? 0.5 : 0.4));
      break;
    case 'hardware':
      // Hardware takes the shell's temperature, never its colour.
      material.color.set(isDarkShell ? palette.titanium : palette.graphite);
      break;
  }

  material.needsUpdate = true;
}

export type ProductMaterialOptions = {
  colorway?: string;
  finish?: FinishKey;
};

/**
 * Writes a colourway and finish into every material under `root`, in place.
 * Returns how many materials it touched — zero means the tree is not built
 * yet, which is a normal state during the staged build.
 */
export function applyProductMaterial(
  root: THREE.Object3D | null | undefined,
  { colorway, finish }: ProductMaterialOptions,
): number {
  if (!root) return 0;

  const shell = new THREE.Color(resolveColorway(colorway));
  const spec = getFinish(finish);
  const seen = new Set<THREE.Material>();
  let touched = 0;

  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

    for (const entry of list) {
      if (!entry || seen.has(entry)) continue;
      seen.add(entry);

      const material = entry as LiveMaterial;
      if (!material.color) continue;

      const key: MaterialKey | null =
        material.userData?.materialKey ??
        (SHELL_NAME.test(material.name || mesh.name) ? 'shell' : null);
      if (!key) continue;

      paint(material, key, shell, spec);

      // The ripstop grid is a roughness pattern, not a texture — the finish
      // moves its density and scale rather than swapping a map.
      const weave = material.userData?.weave;
      if (weave) {
        weave.uWeave.value = spec.weave;
        weave.uWeaveScale.value = spec.weaveScale;
      }

      touched += 1;
    }
  });

  return touched;
}

export type ProductMaterialsProps = ProductMaterialOptions & {
  /**
   * The subtree to repaint. Defaults to the whole scene, which is correct for
   * a viewer showing one product; pass a ref to scope it when two models share
   * a canvas.
   */
  root?: RefObject<THREE.Object3D | null>;
  /** Re-run when this changes — pass the model's ready flag or build progress. */
  revision?: unknown;
};

/**
 * Keeps the live materials in step with the selected colourway and finish.
 * Mount it beside the model, inside the canvas.
 */
export function ProductMaterials({ colorway, finish, root, revision }: ProductMaterialsProps) {
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);

  useEffect(() => {
    const target = root?.current ?? scene;
    if (applyProductMaterial(target, { colorway, finish }) > 0) invalidate();
  }, [colorway, finish, root, scene, invalidate, revision]);

  return null;
}

export { SHELL_FINISHES, getFinish, resolveColorway };
export type { Finish, FinishKey };

export default ProductMaterials;
