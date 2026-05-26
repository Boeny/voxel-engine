import { Vector3 } from 'three';

import { LY_TO_KM } from '@/const';

import { StarShaderParams } from './types';

export const STAR_SHADER_PARAMS: StarShaderParams = {
  uBrightnessMultiplier: 1e13,
  uRadiusMultiplier: 1,
  uMinRadius: 4,
  uMinBrightness: 0,
  uMaxBrightness: 10,
  uCameraPositionLy: new Vector3(),
  uPixelAngularSize: 0,
  LY_TO_KM,
};
