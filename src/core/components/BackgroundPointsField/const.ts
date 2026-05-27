import { Vector3 } from 'three';

import { LY_TO_KM } from '@/const';

import { BackgroundShaderParams } from './types';

export const BACKGROUND_SHADER_PARAMS: BackgroundShaderParams = {
  uBrightnessMultiplier: 1e13,
  uRadiusMultiplier: 1,
  uMinRadius: 3,
  uMinBrightness: 0,
  uMaxBrightness: 3,
  uCameraBackgroundPosition: new Vector3(),
  uPixelAngularSize: 0,
  uBackgroundToLocalScale: LY_TO_KM,
};
