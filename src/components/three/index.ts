export { SceneCanvas, InvalidateOnChange } from './Canvas';
export type { SceneCanvasProps } from './Canvas';
export { StudioEnvironment } from './Environment';
export type { StudioEnvironmentProps } from './Environment';
export { JacketModel, loadJacketGLB, JACKET_MODEL_URL, DRACO_DECODER_PATH } from './JacketModel';
export type { JacketModelProps, JacketLoadInfo, JacketModelSource } from './JacketModel';
export { SceneErrorBoundary } from './SceneErrorBoundary';
export {
  SHELL_FINISHES,
  COLORWAY_HEX,
  getFinish,
  resolveColorway,
  createPackUniforms,
} from './materials';
export type { Finish, FinishKey } from './materials';
export { CARRY_BOX, buildJacketParts, jacketPartMotion } from './geometry';
export type { JacketQuality, JacketPart } from './geometry';

/* ------------------------------------------------ the decomposed scene --- */

export {
  ProductCamera,
  createProductCamera,
  useProductCamera,
  CAMERA_RANGE,
  CAMERA_TARGET,
  DEFAULT_PRODUCT_VIEW,
  PRODUCT_VIEWS,
  PRODUCT_VIEW_LABELS,
  PRODUCT_VIEW_NAMES,
} from './ProductCamera';
export type {
  CameraCommand,
  CameraView,
  CameraViewName,
  ProductCameraController,
  ProductCameraProps,
} from './ProductCamera';

export { ProductControls } from './ProductControls';
export type { ProductControlsProps } from './ProductControls';

export { ProductLights, useLightingRig } from './ProductLights';
export type { ProductLightsProps } from './ProductLights';
export {
  LIGHTING_PRESETS,
  LIGHTING_PRESET_LABELS,
  LIGHTING_PRESET_NAMES,
  getLightingRig,
} from './lightingPresets';
export type { LightingPresetName, LightingRig, LightingScheme } from './lightingPresets';

export { ProductHotspots, HotspotMarker, useHotspotRenderer } from './ProductHotspots';
export type {
  HotspotBehaviour,
  HotspotMarkerProps,
  ProductHotspotsProps,
} from './ProductHotspots';

export { ProductMaterials, applyProductMaterial } from './ProductMaterials';
export type { ProductMaterialOptions, ProductMaterialsProps } from './ProductMaterials';

/* ------------------------------------------------------- optimization --- */

export {
  AdaptiveResolution,
  DECODER_PATHS,
  applyFrustumCulling,
  configureModelLoader,
  createLOD,
  disposeModelLoader,
  disposeObject3D,
  lodDistances,
  registerRenderer,
  useAdaptiveDpr,
  useDisposeOnUnmount,
} from './optimization';
export type {
  AdaptiveDprOptions,
  AdaptiveResolutionProps,
  CullingOptions,
  DisposalReport,
  LODLevel,
} from './optimization';
