import { palette } from '@/lib/design-tokens';

/* ==========================================================================
   Lighting presets — three rooms the Meridian can stand in.

   A preset is a complete rig, not a mood name: key, fill, rim and counter-rim
   (colour and intensity), the hemisphere ambient, the contact-shadow density,
   and the tint of the enclosing environment sphere that supplies every
   specular reflection on the hardware.

   Every colour is a palette token. Nothing here invents a hex.

   Each preset carries a `light` and a `dark` variant, because the rig has to
   answer to the plate the product actually sits on. `StudioEnvironment` picks
   the variant from the site theme, or from a pinned `scheme` where a section
   sets its own (the hero is night in both themes).

   `studio` is today's rig, value for value. It is the default everywhere, so
   adding this file changed nothing that was already on screen.
   ========================================================================== */

export type LightingPresetName = 'studio' | 'outdoor' | 'night';
export type LightingScheme = 'light' | 'dark';

export type LightingRig = {
  /** Key — high and camera-right. Draws the silhouette. */
  key: string;
  keyIntensity: number;
  /** Fill — low and opposite. Lifts the shadow side without flattening it. */
  fill: string;
  fillIntensity: number;
  /** Rim — behind and above. Separates the shell from the ground. */
  rim: string;
  rimIntensity: number;
  /** Counter-rim — behind, camera-right. Two edges read as a garment. */
  counterRim: string;
  counterRimIntensity: number;
  /** Hemisphere sky/ground pair and its strength. */
  sky: string;
  ground: string;
  ambient: number;
  /** Scene fog, for stages that ask for atmospheric depth. */
  fog: string;
  /** Contact shadow under the hem. */
  shadow: string;
  shadowOpacity: number;
  /** The enclosing sphere behind the lightformers — the reflection tint. */
  envTint: string;
  /** Multiplier on the lightformer box. 1 is the studio reference. */
  envIntensity: number;
  /** Drifting motes. */
  particleColor: string;
  particleOpacity: number;
};

export const LIGHTING_PRESETS: Record<LightingPresetName, Record<LightingScheme, LightingRig>> = {
  /* ------------------------------------------------------------ studio ---
     Clean product photography. A large soft key overhead, a broad bounce
     opposite it, and enough edge to hold the shell off the backdrop. This is
     the rig the site shipped with; the numbers are unchanged. */
  studio: {
    // The shell colourways run to near-black (Basalt is #1A1C1A) and the dark
    // ground is #0B0C0B, so there is almost no tonal gap between product and
    // backdrop. Separation therefore has to come from the edges, not the
    // faces: the rim is a bright warm bone rather than a dark moss, it runs
    // hot, and a counter-rim picks up the opposite shoulder. Without this the
    // jacket is genuinely invisible on the hero.
    dark: {
      key: palette.ivory,
      keyIntensity: 4.7,
      fill: palette.stone,
      fillIntensity: 1.2,
      rim: palette.bone,
      rimIntensity: 3.4,
      counterRim: palette.titanium,
      counterRimIntensity: 1.9,
      sky: palette.stone,
      ground: palette.forest,
      ambient: 0.66,
      fog: palette.ink,
      shadow: '#000000',
      shadowOpacity: 0.62,
      envTint: palette.forest,
      envIntensity: 1,
      particleColor: palette.bone,
      particleOpacity: 0.34,
    },
    // Light mode has the opposite problem — plenty of tonal gap — so the rim
    // stays restrained and the key does the work.
    light: {
      key: palette.white,
      keyIntensity: 2.35,
      fill: palette.bone,
      fillIntensity: 0.9,
      rim: palette.sand,
      rimIntensity: 0.85,
      counterRim: palette.stone,
      counterRimIntensity: 0.35,
      sky: palette.white,
      ground: palette.stone,
      ambient: 0.78,
      fog: palette.ivory,
      shadow: palette.ink,
      shadowOpacity: 0.4,
      envTint: palette.stone,
      envIntensity: 1,
      particleColor: palette.slate,
      particleOpacity: 0.2,
    },
  },

  /* ----------------------------------------------------------- outdoor ---
     Natural daylight. One dominant warm source, a wide sky bounce instead of
     a second lamp, and a ground colour that returns warmth into the underside
     of the hem. Shadows are shorter and lighter than the studio's — daylight
     is bright everywhere, not just where the key points. */
  outdoor: {
    dark: {
      key: palette.bone,
      keyIntensity: 5.4,
      fill: palette.sand,
      fillIntensity: 1.75,
      rim: palette.ivory,
      rimIntensity: 2.6,
      counterRim: palette.stone,
      counterRimIntensity: 1.25,
      sky: palette.titanium,
      ground: palette.olive,
      ambient: 0.94,
      fog: palette.forest,
      shadow: palette.ink,
      shadowOpacity: 0.5,
      envTint: palette.olive,
      envIntensity: 1.22,
      particleColor: palette.sand,
      particleOpacity: 0.24,
    },
    light: {
      key: palette.white,
      keyIntensity: 3.15,
      fill: palette.sand,
      fillIntensity: 1.3,
      rim: palette.bone,
      rimIntensity: 1.05,
      counterRim: palette.stone,
      counterRimIntensity: 0.45,
      sky: palette.white,
      ground: palette.sand,
      ambient: 1.02,
      fog: palette.bone,
      shadow: palette.graphite,
      shadowOpacity: 0.32,
      envTint: palette.sand,
      envIntensity: 1.3,
      particleColor: palette.stone,
      particleOpacity: 0.14,
    },
  },

  /* ------------------------------------------------------------- night ---
     Cinematic low-key. The ambient drops away, the key narrows, and almost
     all of the read comes from the two back edges. High contrast, deep
     contact shadow, and an ink-tinted environment so reflections stay cold. */
  night: {
    dark: {
      key: palette.bone,
      keyIntensity: 3.6,
      fill: palette.slate,
      fillIntensity: 0.42,
      rim: palette.ivory,
      rimIntensity: 4.3,
      counterRim: palette.titanium,
      counterRimIntensity: 2.5,
      sky: palette.titanium,
      ground: palette.ink,
      ambient: 0.34,
      fog: palette.ink,
      shadow: '#000000',
      shadowOpacity: 0.8,
      envTint: palette.ink,
      envIntensity: 0.68,
      particleColor: palette.bone,
      particleOpacity: 0.4,
    },
    light: {
      key: palette.bone,
      keyIntensity: 2.1,
      fill: palette.stone,
      fillIntensity: 0.5,
      rim: palette.ivory,
      rimIntensity: 1.7,
      counterRim: palette.titanium,
      counterRimIntensity: 0.8,
      sky: palette.titanium,
      ground: palette.graphite,
      ambient: 0.52,
      fog: palette.slate,
      shadow: palette.ink,
      shadowOpacity: 0.56,
      envTint: palette.graphite,
      envIntensity: 0.82,
      particleColor: palette.titanium,
      particleOpacity: 0.22,
    },
  },
};

export const LIGHTING_PRESET_NAMES = ['studio', 'outdoor', 'night'] as const satisfies readonly LightingPresetName[];

/** Human-readable, for any surface that offers the choice. */
export const LIGHTING_PRESET_LABELS: Record<LightingPresetName, string> = {
  studio: 'Studio',
  outdoor: 'Daylight',
  night: 'Night',
};

/** Resolves a preset and a scheme to a single rig. Falls back to `studio`. */
export function getLightingRig(
  preset: LightingPresetName | undefined,
  scheme: LightingScheme,
): LightingRig {
  const set = LIGHTING_PRESETS[preset ?? 'studio'] ?? LIGHTING_PRESETS.studio;
  return set[scheme] ?? set.dark;
}
