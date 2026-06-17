import { Vector2, Vector3 } from 'three';

import { LY_TO_KM } from '@/const';

import { BackgroundShaderParams } from './types';

export const STAR_BIN_PATH = '/assets/stars.dat';
export const STAR_JSON_PATH = '/assets/stars.json';

export const BINARY_ITEM_LENGTH = 8;
export const SELECTION_MIN_BRIGHTNESS = 0.1;
export const BACKGROUND_POSITION_SCALE = 10000;

export const BACKGROUND_SHADER_PARAMS: BackgroundShaderParams = {
  uBrightnessMultiplier: 1e13,
  uRadiusMultiplier: 1,
  uMinRadius: 3,
  uMinBrightness: 0,
  uMaxBrightness: 3,
  uCameraBackgroundPosition: new Vector3(),
  uPixelAngularSize: 0,
  uBackgroundToLocalScale: LY_TO_KM / BACKGROUND_POSITION_SCALE,
  uClickPoint: new Vector2(-1, -1),
};

export const ATTRIBUTES = [
  { name: 'position', length: 3, scale: BACKGROUND_POSITION_SCALE },
  { name: 'color', length: 3 },
  { name: 'luminosity', length: 1 },
  { name: 'radius', length: 1 },
];

export const ATTR_INDEX = {
  position: 0,
  color: 1,
  luminosity: 2,
  radius: 3,
} as const;
