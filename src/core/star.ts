import { Vector3 } from 'three';

import { shaderParam } from './decorators';
import { SelectableObject } from './selectableObject';
import { arrayToVector } from './utils';

type StarParams = {
  intensity: number;
  radius: number;
  position: number[];
};

export class Star extends SelectableObject {
  radius!: number;
  position: Vector3;

  @shaderParam('uSunIntensity') intensity!: boolean;

  constructor(
    { position, ...other }: StarParams,
    private setShaderParams: (params: any) => void,
  ) {
    super('star');
    this.position = arrayToVector(position);

    Object.entries(other).forEach(([key, value]) => ((this as any)[key] = value));
  }
}
