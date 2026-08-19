/**
 * VAYRO AR layer — one import surface.
 *
 *   import { ARProductLauncher } from '@/components/ar';
 *
 * `ARProductLauncher` is the only thing a product surface needs to mount. The
 * rest is exported for the AR landing page and for anything that has already
 * detected capability and wants to skip a second probe.
 */

export { detectAR, useARCapability, AR_MODE_LABEL } from './ARCapabilityDetector';
export type { ARCapability, ARCapabilityState, ARMode } from './ARCapabilityDetector';

export { ARButton } from './ARButton';
export type { ARButtonProps } from './ARButton';

export { ARProductLauncher } from './ARProductLauncher';
export type { ARProductLauncherProps } from './ARProductLauncher';

export { ARStage } from './ARStage';
export type { ARStageProps } from './ARStage';

export { ModelViewerFallback } from './ModelViewerFallback';
export type { ModelViewerFallbackProps, ARStatus } from './ModelViewerFallback';

export { WebXRExperience } from './WebXRExperience';
export type { WebXRExperienceProps } from './WebXRExperience';

export {
  METRES_PER_UNIT,
  MODEL_HEM_Y,
  MODEL_SHOULDER_Y,
  MODEL_CROWN_Y,
  metresPerUnit,
  modelViewerScale,
  modelHeightMetres,
  groundOffsetMetres,
} from './ar-scale';
