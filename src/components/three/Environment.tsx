'use client';

import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { palette } from '@/lib/design-tokens';
import { useDeviceTier } from '@/hooks/useDeviceTier';
import { useTheme } from '@/components/providers/ThemeProvider';

/* ==========================================================================
   StudioEnvironment — the room the product stands in.

   A three-light studio rig (key / fill / rim) plus a lightformer box that
   supplies the specular reflections the hardware needs. No HDRI is fetched:
   the environment is rendered once, in-engine, from brand-coloured emitters,
   so the scene is self-contained and matches ink / ivory / forest exactly.

   Everything reads the active theme. Flip the site to light and the studio
   flips with it — the product does not sit in a dark room on an ivory page.
   ========================================================================== */

export type StudioEnvironmentProps = {
  /** Ground plane height. Sits just under the hem by default. */
  groundY?: number;
  /** Atmospheric depth. Hero scenes want it, viewers do not. */
  fog?: boolean;
  /** Drifting motes. Count comes from the tier budget. */
  particles?: boolean;
  /** Global multiplier on the rig, for scenes that need a quieter room. */
  intensity?: number;
  shadows?: boolean;
  /**
   * Pins the lighting rig to a colour scheme, ignoring the site theme. Use it
   * in sections that set their own scheme (the hero is night in both themes).
   */
  scheme?: 'light' | 'dark';
};

type Rig = {
  key: string;
  fill: string;
  rim: string;
  counterRim: string;
  sky: string;
  ground: string;
  fog: string;
  shadow: string;
  ambient: number;
  keyIntensity: number;
  fillIntensity: number;
  rimIntensity: number;
  counterRimIntensity: number;
  shadowOpacity: number;
  particleColor: string;
  particleOpacity: number;
};

const RIGS: Record<'dark' | 'light', Rig> = {
  // The shell colourways run to near-black (Basalt is #1A1C1A) and the dark
  // ground is #0B0C0B, so there is almost no tonal gap between product and
  // backdrop. Separation therefore has to come from the edges, not the faces:
  // the rim is a bright warm bone rather than a dark moss, it runs hot, and a
  // counter-rim picks up the opposite shoulder. Without this the jacket is
  // genuinely invisible on the hero.
  dark: {
    key: palette.ivory,
    fill: palette.stone,
    rim: palette.bone,
    counterRim: palette.titanium,
    sky: palette.stone,
    ground: palette.forest,
    fog: palette.ink,
    shadow: '#000000',
    ambient: 0.66,
    keyIntensity: 4.7,
    fillIntensity: 1.2,
    rimIntensity: 3.4,
    counterRimIntensity: 1.9,
    shadowOpacity: 0.62,
    particleColor: palette.bone,
    particleOpacity: 0.34,
  },
  // Light mode has the opposite problem — plenty of tonal gap — so the rim
  // stays restrained and the key does the work.
  light: {
    key: palette.white,
    fill: palette.bone,
    rim: palette.sand,
    counterRim: palette.stone,
    sky: palette.white,
    ground: palette.stone,
    fog: palette.ivory,
    shadow: palette.ink,
    ambient: 0.78,
    keyIntensity: 2.35,
    fillIntensity: 0.9,
    rimIntensity: 0.85,
    counterRimIntensity: 0.35,
    shadowOpacity: 0.4,
    particleColor: palette.slate,
    particleOpacity: 0.2,
  },
};

export function StudioEnvironment({
  groundY = -0.95,
  fog = false,
  particles = true,
  intensity = 1,
  shadows,
  scheme,
}: StudioEnvironmentProps) {
  const { theme } = useTheme();
  const { tier, settings } = useDeviceTier();
  // Sections that pin their own colour scheme — the hero is always night,
  // whatever the site theme — pass `scheme` so the rig matches the plate the
  // product actually sits on rather than the surrounding page.
  const rig = RIGS[(scheme ?? theme) === 'light' ? 'light' : 'dark'];

  const castShadows = shadows ?? settings.shadows;
  const shadowMap = tier === 'high' ? 2048 : 1024;
  const particleCount = particles ? settings.particles : 0;

  return (
    <>
      {fog ? <fog attach="fog" args={[rig.fog, 6.4, 21]} /> : null}

      <hemisphereLight args={[rig.sky, rig.ground, rig.ambient * intensity]} />

      {/* Key — high and camera-right, the light that draws the silhouette. */}
      <directionalLight
        position={[3.4, 4.6, 3.2]}
        intensity={rig.keyIntensity * intensity}
        color={rig.key}
        castShadow={castShadows}
        shadow-mapSize={[shadowMap, shadowMap]}
        shadow-bias={-0.0006}
        shadow-normalBias={0.022}
      >
        <orthographicCamera attach="shadow-camera" args={[-3, 3, 3, -3, 0.5, 16]} />
      </directionalLight>

      {/* Fill — low and opposite, lifting the shadow side without flattening. */}
      <directionalLight
        position={[-4.2, 1.3, 2.4]}
        intensity={rig.fillIntensity * intensity}
        color={rig.fill}
      />

      {/* Rim — behind and above, separating the shell from the ground. */}
      <directionalLight
        position={[-1.4, 2.6, -4.6]}
        intensity={rig.rimIntensity * intensity}
        color={rig.rim}
      />

      {/* Counter-rim — behind and camera-right, catching the opposite
          shoulder. Two edges read as a garment; one reads as a flat cut-out. */}
      <directionalLight
        position={[3.6, 2.1, -4.2]}
        intensity={rig.counterRimIntensity * intensity}
        color={rig.counterRim}
      />

      {settings.env === 'studio' ? (
        <Environment resolution={tier === 'high' ? 256 : 128} frames={1} background={false}>
          <Lightformer form="rect" intensity={2.4} color={rig.key} position={[0, 4.5, 1.4]} rotation={[Math.PI / 2, 0, 0]} scale={[7, 4, 1]} />
          <Lightformer form="rect" intensity={1.15} color={rig.fill} position={[-4.2, 1.2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[4, 5, 1]} />
          <Lightformer form="rect" intensity={0.8} color={rig.rim} position={[4.2, 1.6, -1.6]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 5, 1]} />
          <Lightformer form="ring" intensity={0.55} color={rig.sky} position={[0, 0.4, 6]} scale={4} />
          <mesh scale={[14, 14, 14]}>
            <sphereGeometry args={[1, 20, 12]} />
            <meshBasicMaterial color={rig.ground} side={THREE.BackSide} toneMapped={false} />
          </mesh>
        </Environment>
      ) : null}

      {castShadows ? (
        <ContactShadows
          position={[0, groundY, 0]}
          scale={6}
          resolution={tier === 'high' ? 1024 : 512}
          blur={2.6}
          far={2.4}
          opacity={rig.shadowOpacity}
          color={rig.shadow}
          frames={Infinity}
          smooth
        />
      ) : null}

      {particleCount > 0 ? (
        <DriftingMotes
          count={particleCount}
          color={rig.particleColor}
          opacity={rig.particleOpacity}
          additive={theme !== 'light'}
        />
      ) : null}
    </>
  );
}

/* --------------------------------------------------------------- motes --- */

const MOTE_VERTEX = /* glsl */ `
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
attribute float aSeed;
attribute float aScale;
varying float vFade;

void main() {
  vec3 p = position;
  float t = uTime * 0.06 + aSeed * 6.2831;
  p.y = mod( p.y + uTime * 0.012 + aSeed, 5.2 ) - 2.6;
  p.x += sin( t ) * 0.22;
  p.z += cos( t * 0.83 ) * 0.18;

  vec4 mv = modelViewMatrix * vec4( p, 1.0 );
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * aScale * uPixelRatio * ( 1.0 / max( -mv.z, 0.4 ) );
  vFade = smoothstep( 0.0, 1.2, abs( p.y ) );
}
`;

const MOTE_FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vFade;

void main() {
  vec2 d = gl_PointCoord - vec2( 0.5 );
  float mask = smoothstep( 0.5, 0.08, length( d ) );
  float alpha = mask * uOpacity * ( 1.0 - vFade * 0.75 );
  if ( alpha < 0.004 ) discard;
  gl_FragColor = vec4( uColor, alpha );
}
`;

/**
 * Dust in a light beam, not a particle demo. Deterministic seeding keeps the
 * field identical across mounts, and the whole thing is skipped on low tier.
 */
function DriftingMotes({
  count,
  color,
  opacity,
  additive,
}: {
  count: number;
  color: string;
  opacity: number;
  additive: boolean;
}) {
  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const scales = new Float32Array(count);
    // Deterministic hash — no Math.random, so the field never re-rolls.
    let s = 0x2f6f2b1;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 0xffffffff;
    };
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 7.2;
      positions[i * 3 + 1] = (rand() - 0.5) * 5.2;
      positions[i * 3 + 2] = (rand() - 0.5) * 4.4 - 0.4;
      seeds[i] = rand();
      scales[i] = 0.55 + rand() * 0.9;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
    return geo;
  }, [count]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 26 },
      uPixelRatio: { value: 1 },
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
    }),
    // Colour and opacity are pushed in the effect below to avoid a rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // Held in a ref so the frame loop can drive it without touching a memo.
  const live = useRef(uniforms);

  useEffect(() => {
    live.current.uColor.value.set(color);
    live.current.uOpacity.value = opacity;
  }, [color, opacity]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame((state, delta) => {
    live.current.uTime.value += delta;
    live.current.uPixelRatio.value = state.viewport.dpr;
  });

  return (
    <points geometry={geometry} frustumCulled={false} renderOrder={-1}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={MOTE_VERTEX}
        fragmentShader={MOTE_FRAGMENT}
        transparent
        depthWrite={false}
        blending={additive ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}
