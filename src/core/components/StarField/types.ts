import { Vector3 } from 'three';

import { SelectableObject } from '@/types';

/**
 * - position in light years,
 * - radius in km
 * - luminosity - (T / T_sun)^4
 */
export interface Star extends SelectableObject {
  color: Vector3;
  luminosity: number;
}

// Tunable shader params (driven from Leva). Defaults overwritten before first render.
export type StarShaderParams = {
  uBrightnessMultiplier: number;
  uRadiusMultiplier: number;
  uMinRadius: number;
  uMinBrightness: number;
  uMaxBrightness: number;
  uCameraPositionLy: Vector3;
  uPixelAngularSize: number;
  LY_TO_KM: number;
};
