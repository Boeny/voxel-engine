import { Vector2, Vector3 } from 'three';

import { SelectableObject } from '@/types';

/**
 * - position in light years,
 * - radius in km
 * - luminosity - (T / T_sun)^4
 */
export interface BackgroundPoint extends SelectableObject {
  // color: Vector3;
  // luminosity: number;
}

// Tunable shader params (driven from Leva). Defaults overwritten before first render.
export type BackgroundShaderParams = {
  uBrightnessMultiplier: number;
  uRadiusMultiplier: number;
  uMinRadius: number;
  uMinBrightness: number;
  uMaxBrightness: number;
  uCameraBackgroundPosition: Vector3;
  uPixelAngularSize: number;
  uBackgroundToLocalScale: number;
  uClickPoint: Vector2;
};

export type Attribute = {
  name: string;
  length: number;
  data: Float32Array<ArrayBufferLike>;
};
