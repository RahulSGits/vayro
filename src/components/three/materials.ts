import * as THREE from 'three';
import { palette, three as threeTokens } from '@/lib/design-tokens';
import type { MaterialKey } from './geometry';
import { CARRY_BOX } from './geometry';

/* ==========================================================================
   VAYRO — shell materials

   Two pieces of shader work sit on top of MeshPhysicalMaterial:

   1. THE COLLAPSE. `uPack` drives every vertex toward a rounded box — the
      2.1 L carry unit. The fold is evaluated in the model root's space, so a
      sleeve that is rotating inward while it packs still lands inside the
      same box. Normals are re-derived from the box face so the packed unit
      shades like a slab, not like a crumpled jacket.

   2. THE WEAVE. Ripstop is a grid, and a grid is a roughness pattern. A cheap
      two-axis modulation on the UVs gives the shell its 20D grid without
      shipping a texture. Dropped entirely on medium and low tiers.

   Roughness and metalness always resolve from `three.material` in the design
   tokens — finishes are offsets from those numbers, never fresh inventions.
   ========================================================================== */

const { shellRoughness, shellMetalness, hardwareRoughness, hardwareMetalness } = threeTokens.material;

export type FinishKey = 'ripstop' | 'twill' | 'coated' | 'softshell';

export type Finish = {
  key: FinishKey;
  label: string;
  /** Shown under the swatch — the catalogue's own language. */
  spec: string;
  roughness: number;
  metalness: number;
  sheen: number;
  sheenRoughness: number;
  clearcoat: number;
  clearcoatRoughness: number;
  weave: number;
  weaveScale: number;
};

export const SHELL_FINISHES: Finish[] = [
  {
    key: 'ripstop',
    label: 'Ripstop',
    spec: '20D recycled nylon, 42 gsm',
    roughness: shellRoughness,
    metalness: shellMetalness,
    sheen: 0.34,
    sheenRoughness: 0.62,
    clearcoat: 0,
    clearcoatRoughness: 0.4,
    weave: 1,
    weaveScale: 46,
  },
  {
    key: 'twill',
    label: 'Twill',
    spec: 'Tight weave, matte hand',
    roughness: shellRoughness + 0.16,
    metalness: shellMetalness,
    sheen: 0.5,
    sheenRoughness: 0.8,
    clearcoat: 0,
    clearcoatRoughness: 0.4,
    weave: 0.55,
    weaveScale: 88,
  },
  {
    key: 'coated',
    label: 'Coated',
    spec: 'PU face film, wind sealed',
    roughness: shellRoughness - 0.3,
    metalness: shellMetalness + 0.06,
    sheen: 0.18,
    sheenRoughness: 0.35,
    clearcoat: 0.55,
    clearcoatRoughness: 0.28,
    weave: 0.3,
    weaveScale: 46,
  },
  {
    key: 'softshell',
    label: 'Softshell',
    spec: 'Brushed back, air permeable',
    roughness: shellRoughness + 0.26,
    metalness: 0,
    sheen: 0.66,
    sheenRoughness: 0.9,
    clearcoat: 0,
    clearcoatRoughness: 0.4,
    weave: 0.24,
    weaveScale: 130,
  },
];

export function getFinish(key: FinishKey | undefined): Finish {
  return SHELL_FINISHES.find((f) => f.key === key) ?? SHELL_FINISHES[0];
}

/* ------------------------------------------------------------ colourway --- */

/** The Meridian's catalogue colourways, so a name resolves without a lookup. */
export const COLORWAY_HEX: Record<string, string> = {
  Basalt: palette.ink80,
  'Deep Forest': palette.forest,
  Sandstone: palette.sand,
  Titanium: palette.titanium,
  Olive: palette.olive,
  Bone: palette.bone,
};

const HEX = /^#?[0-9a-f]{6}$/i;

/** Accepts a hex string or a catalogue colourway name. Always returns a hex. */
export function resolveColorway(input: string | undefined | null): string {
  if (!input) return COLORWAY_HEX.Basalt;
  if (HEX.test(input)) return input.startsWith('#') ? input : `#${input}`;
  return COLORWAY_HEX[input] ?? COLORWAY_HEX.Basalt;
}

/* --------------------------------------------------------------- shader --- */

export type PackUniforms = {
  uPack: { value: number };
  uPackCenter: { value: THREE.Vector3 };
  uPackHalf: { value: THREE.Vector3 };
  uPackRadius: { value: number };
};

type MatrixUniforms = {
  uToRoot: { value: THREE.Matrix4 };
  uFromRoot: { value: THREE.Matrix4 };
  /** 0 opts a part out of the fold — hardware that rides on top of it. */
  uPackWeight: { value: number };
};

type WeaveUniforms = {
  uWeave: { value: number };
  uWeaveScale: { value: number };
};

export type PackUserData = {
  pack?: MatrixUniforms;
  weave?: WeaveUniforms;
  materialKey?: MaterialKey;
};

/** Any standard-lit material carrying the fold. */
export type PackMaterial = THREE.MeshStandardMaterial & { userData: PackUserData };
/** The shell's own material — physical, so it can carry sheen and clearcoat. */
export type ShellMaterial = THREE.MeshPhysicalMaterial & { userData: PackUserData };

/** Turns the fold off for a single material — used by hardware and by GLB
 *  meshes that carry a real `pack` morph target instead. */
export function setPackWeight(material: THREE.Material | THREE.Material[], weight: number) {
  const list = Array.isArray(material) ? material : [material];
  for (const entry of list) {
    const uniforms = (entry as PackMaterial).userData?.pack;
    if (uniforms) uniforms.uPackWeight.value = weight;
  }
}

const PACK_DECL = /* glsl */ `
uniform float uPack;
uniform float uPackWeight;
uniform vec3 uPackCenter;
uniform vec3 uPackHalf;
uniform float uPackRadius;
uniform mat4 uToRoot;
uniform mat4 uFromRoot;

vec3 vayroFold( vec3 rootPos ) {
  vec3 lim = max( uPackHalf - vec3( uPackRadius ), vec3( 0.0 ) );
  vec3 q = clamp( rootPos, uPackCenter - lim, uPackCenter + lim );
  vec3 d = rootPos - q;
  float dl = length( d );
  return dl > 1e-5 ? q + d * ( min( dl, uPackRadius ) / dl ) : rootPos;
}
`;

const PACK_NORMAL = /* glsl */ `
{
  float pk = uPack * uPackWeight;
  if ( pk > 0.0001 ) {
    vec3 rp = ( uToRoot * vec4( position, 1.0 ) ).xyz;
    vec3 lim = max( uPackHalf - vec3( uPackRadius ), vec3( 0.0 ) );
    vec3 q = clamp( rp, uPackCenter - lim, uPackCenter + lim );
    vec3 d = rp - q;
    if ( length( d ) > 1e-4 ) {
      vec3 boxNormal = normalize( ( uFromRoot * vec4( normalize( d ), 0.0 ) ).xyz );
      vec3 blended = mix( objectNormal, boxNormal, pk * 0.85 );
      if ( length( blended ) > 1e-4 ) objectNormal = normalize( blended );
    }
  }
}
`;

const PACK_POSITION = /* glsl */ `
{
  float pk = uPack * uPackWeight;
  if ( pk > 0.0001 ) {
    vec3 rootPos = ( uToRoot * vec4( transformed, 1.0 ) ).xyz;
    vec3 folded = mix( rootPos, vayroFold( rootPos ), pk );
    transformed = ( uFromRoot * vec4( folded, 1.0 ) ).xyz;
  }
}
`;

const WEAVE_DECL = /* glsl */ `
uniform float uWeave;
uniform float uWeaveScale;
`;

const WEAVE_BODY = /* glsl */ `
{
  vec2 wv = vUv * uWeaveScale;
  vec2 g = abs( fract( wv ) - 0.5 );
  float grid = smoothstep( 0.4, 0.5, max( g.x, g.y ) );
  float fine = sin( wv.x * 25.0 ) * sin( wv.y * 25.0 );
  roughnessFactor = clamp(
    roughnessFactor + grid * uWeave * 0.2 + fine * uWeave * 0.035,
    0.04, 1.0
  );
}
`;

type ShaderInjectionOptions = { pack: PackUniforms; weave: boolean; finish: Finish };

/**
 * Attaches the fold (and optionally the weave) to any standard-lit material.
 * The procedural shell uses it through the factory below; the GLB path calls
 * it directly so an exported asset folds with exactly the same maths.
 */
export function attachPackShader(
  material: THREE.MeshStandardMaterial,
  options: ShaderInjectionOptions,
) {
  injectShaders(material as PackMaterial, options);
}

function injectShaders(material: PackMaterial | ShellMaterial, { pack, weave, finish }: ShaderInjectionOptions) {
  const matrices: MatrixUniforms = {
    uToRoot: { value: new THREE.Matrix4() },
    uFromRoot: { value: new THREE.Matrix4() },
    uPackWeight: { value: 1 },
  };
  const weaveUniforms: WeaveUniforms = {
    uWeave: { value: finish.weave },
    uWeaveScale: { value: finish.weaveScale },
  };
  material.userData.pack = matrices;

  if (weave) {
    material.userData.weave = weaveUniforms;
    material.defines = { ...material.defines, USE_UV: '' };
  }

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, pack, matrices);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${PACK_DECL}`)
      .replace('#include <morphnormal_vertex>', `#include <morphnormal_vertex>\n${PACK_NORMAL}`)
      .replace('#include <project_vertex>', `${PACK_POSITION}\n#include <project_vertex>`);

    if (!weave) return;
    Object.assign(shader.uniforms, weaveUniforms);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${WEAVE_DECL}`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>\n${WEAVE_BODY}`);
  };

  material.customProgramCacheKey = () => `vayro-shell-${weave ? 'weave' : 'plain'}`;
  material.needsUpdate = true;
}

/* ------------------------------------------------------------- factory --- */

/** One fold driver. Every material in a scene shares it. */
export function createPackUniforms(): PackUniforms {
  return {
    uPack: { value: 0 },
    uPackCenter: { value: new THREE.Vector3(...CARRY_BOX.center) },
    uPackHalf: { value: new THREE.Vector3(...CARRY_BOX.half) },
    uPackRadius: { value: CARRY_BOX.radius },
  };
}

export type MaterialFactoryOptions = {
  colorway: string;
  finish: FinishKey;
  /** Share one fold driver across several factories (GLB + procedural). */
  packUniforms?: PackUniforms;
  /** Weave modulation is a high-tier luxury. */
  weave?: boolean;
  envMapIntensity?: number;
};

export type JacketMaterialFactory = {
  packUniforms: PackUniforms;
  /** A fresh instance per part — each carries its own root-space matrices. */
  create(key: MaterialKey): ShellMaterial;
  /** Applies a colourway or finish change in place. No rebuild, no reload. */
  update(options: Partial<MaterialFactoryOptions>): void;
  dispose(): void;
};

function tone(base: THREE.Color, amount: number) {
  return base.clone().multiplyScalar(amount);
}

export function createJacketMaterialFactory(options: MaterialFactoryOptions): JacketMaterialFactory {
  let current: MaterialFactoryOptions = { weave: true, envMapIntensity: 1, ...options };
  const created: ShellMaterial[] = [];

  const packUniforms = options.packUniforms ?? createPackUniforms();

  function paint(material: ShellMaterial, key: MaterialKey) {
    const finish = getFinish(current.finish);
    const shell = new THREE.Color(resolveColorway(current.colorway));
    const hsl = { h: 0, s: 0, l: 0 };
    shell.getHSL(hsl);
    const isDarkShell = hsl.l < 0.34;
    const envMapIntensity = current.envMapIntensity ?? 1;

    switch (key) {
      case 'shell':
        material.color.copy(shell);
        material.roughness = finish.roughness;
        material.metalness = finish.metalness;
        material.sheen = finish.sheen;
        material.sheenRoughness = finish.sheenRoughness;
        material.sheenColor.set(isDarkShell ? palette.stone : palette.white);
        material.clearcoat = finish.clearcoat;
        material.clearcoatRoughness = finish.clearcoatRoughness;
        break;
      case 'shellDeep':
        material.color.copy(tone(shell, isDarkShell ? 0.62 : 0.74));
        material.roughness = Math.min(finish.roughness + 0.08, 1);
        material.metalness = finish.metalness;
        material.sheen = finish.sheen * 0.7;
        material.sheenRoughness = finish.sheenRoughness;
        material.sheenColor.set(isDarkShell ? palette.stone : palette.slate);
        material.clearcoat = finish.clearcoat * 0.5;
        break;
      case 'lining':
        material.color.set(isDarkShell ? palette.stone : palette.graphite);
        material.roughness = 0.92;
        material.metalness = 0;
        material.sheen = 0.2;
        material.sheenRoughness = 0.95;
        material.sheenColor.set(palette.bone);
        break;
      case 'hardware':
        material.color.set(isDarkShell ? palette.titanium : palette.graphite);
        material.roughness = hardwareRoughness;
        material.metalness = hardwareMetalness;
        material.sheen = 0;
        material.clearcoat = 0.2;
        material.clearcoatRoughness = 0.2;
        break;
      case 'webbing':
        material.color.copy(tone(shell, isDarkShell ? 0.5 : 0.4));
        material.roughness = 0.86;
        material.metalness = 0.02;
        material.sheen = 0.25;
        material.sheenRoughness = 0.9;
        material.sheenColor.set(palette.titanium);
        break;
    }

    material.envMapIntensity = key === 'hardware' ? envMapIntensity * 1.35 : envMapIntensity;
    material.needsUpdate = true;
  }

  function create(key: MaterialKey): ShellMaterial {
    const finish = getFinish(current.finish);
    const material = new THREE.MeshPhysicalMaterial({
      side: key === 'lining' ? THREE.BackSide : THREE.FrontSide,
      transparent: false,
      dithering: true,
    }) as ShellMaterial;
    material.name = `vayro-${key}`;
    injectShaders(material, {
      pack: packUniforms,
      weave: Boolean(current.weave) && (key === 'shell' || key === 'shellDeep'),
      finish,
    });
    paint(material, key);
    material.userData.materialKey = key;
    created.push(material);
    return material;
  }

  return {
    packUniforms,
    create,
    update(next) {
      current = { ...current, ...next };
      const finish = getFinish(current.finish);
      for (const material of created) {
        paint(material, material.userData.materialKey ?? 'shell');
        const weave = material.userData.weave;
        if (!weave) continue;
        weave.uWeave.value = finish.weave;
        weave.uWeaveScale.value = finish.weaveScale;
      }
    },
    dispose() {
      for (const material of created) material.dispose();
      created.length = 0;
    },
  };
}

/**
 * Pushes each mesh's object-to-root matrix into its own material. Called once
 * per frame while the shell is mid-fold; skipped entirely at packProgress 0.
 */
const scratchRootInverse = new THREE.Matrix4();

export function syncPackMatrices(root: THREE.Object3D) {
  const rootInverse = scratchRootInverse.copy(root.matrixWorld).invert();
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    const material = mesh.material as PackMaterial | PackMaterial[];
    const list = Array.isArray(material) ? material : [material];
    for (const entry of list) {
      const matrices = entry?.userData?.pack;
      if (!matrices) continue;
      matrices.uToRoot.value.multiplyMatrices(rootInverse, mesh.matrixWorld);
      matrices.uFromRoot.value.copy(matrices.uToRoot.value).invert();
    }
  });
}
