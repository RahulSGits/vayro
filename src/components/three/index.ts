export { SceneCanvas, InvalidateOnChange } from './Canvas';
export type { SceneCanvasProps } from './Canvas';
export { StudioEnvironment } from './Environment';
export type { StudioEnvironmentProps } from './Environment';
export { JacketModel, loadJacketGLB, JACKET_MODEL_URL, DRACO_DECODER_PATH } from './JacketModel';
export type { JacketModelProps } from './JacketModel';
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
