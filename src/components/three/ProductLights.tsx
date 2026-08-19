'use client';

import { useMemo } from 'react';
import { useTheme } from '@/components/providers/ThemeProvider';
import { StudioEnvironment, type StudioEnvironmentProps } from './Environment';
import {
  getLightingRig,
  LIGHTING_PRESET_LABELS,
  LIGHTING_PRESET_NAMES,
  type LightingPresetName,
  type LightingRig,
  type LightingScheme,
} from './lightingPresets';

/* ==========================================================================
   ProductLights — the lighting rig, addressed by name.

   This is the rig `StudioEnvironment` has always built; nothing about it is
   new and nothing about it is duplicated here. What this file adds is the
   vocabulary: a scene asks for `studio`, `outdoor` or `night` instead of
   reaching for individual light intensities, and `useLightingRig()` hands the
   surrounding DOM the same numbers so a scrim or a caption can be tinted to
   match the room the product is standing in.

     <ProductLights preset="night" fog />

   Presets live in ./lightingPresets. `studio` is the default everywhere.
   ========================================================================== */

export type ProductLightsProps = StudioEnvironmentProps;

export function ProductLights(props: ProductLightsProps) {
  return <StudioEnvironment {...props} />;
}

/**
 * The rig's raw values for the preset and scheme currently on screen. Lives
 * outside the canvas as happily as inside it — it touches no Three.js state,
 * only the theme.
 */
export function useLightingRig(
  preset: LightingPresetName = 'studio',
  scheme?: LightingScheme,
): LightingRig {
  const { resolvedTheme } = useTheme();
  const active: LightingScheme = (scheme ?? resolvedTheme) === 'light' ? 'light' : 'dark';
  return useMemo(() => getLightingRig(preset, active), [preset, active]);
}

export {
  StudioEnvironment,
  LIGHTING_PRESET_NAMES,
  LIGHTING_PRESET_LABELS,
  getLightingRig,
};
export type { LightingPresetName, LightingRig, LightingScheme, StudioEnvironmentProps };

export default ProductLights;
