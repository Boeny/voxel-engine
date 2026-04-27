import { Vector3 } from 'three';

import { SelectableObject } from './selectableObject';
import { angleToRad, arrayToVector, getSunDirection } from './utils';

type StarParams = {
  intensity: number;
  radius: number;
  position: number[];
  angle: number;
};

export class Star extends SelectableObject {
  radius: number;
  position: Vector3;

  _angle: number;
  get angle(): number {
    return this._angle;
  }
  set angle(v: number) {
    this._angle = v;
    this.setShaderParams({
      uSunDirection: getSunDirection(angleToRad(v)),
    });
  }

  _intensity = 0;
  get intensity(): number {
    return this._intensity;
  }
  set intensity(v: number) {
    this._intensity = v;
    this.setShaderParams({
      uSunIntensity: v,
    });
  }

  constructor(
    { intensity, radius, position, angle }: StarParams,
    private setShaderParams: (params: any) => void,
  ) {
    super('star');
    this.radius = radius;
    this.position = arrayToVector(position);
    this._angle = angle;
    this._intensity = intensity;
  }
}
