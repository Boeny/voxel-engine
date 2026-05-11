import { Vector3 } from 'three';

import { shaderParam } from './decorators';
import { SelectableObject } from './selectableObject';
import { mapObjectReverse, mapObjectValues } from './utils';

type StarParams = {
  intensity: number;
  radius: number;
  position: Vector3;
  color: Vector3;
  coronaIntensity: number;
  coronaRadius: number;
};
const SHADER_STAR: Record<string, keyof StarParams> = {
  uSunIntensity: 'intensity',
  coronaIntensity: 'coronaIntensity',
  coronaRadius: 'coronaRadius',
} as const;
const STAR_SHADER = mapObjectReverse(SHADER_STAR);

export class Star extends SelectableObject {
  static shaderParams = mapObjectValues(SHADER_STAR, () => 0);

  @shaderParam(STAR_SHADER) intensity!: number;
  @shaderParam(STAR_SHADER) coronaRadius!: number;
  @shaderParam(STAR_SHADER) coronaIntensity!: number;

  constructor(
    params: StarParams,
    private setShaderParams: (params: any) => void,
  ) {
    super('star');

    Object.entries(params).forEach(([key, value]) => ((this as any)[key] = value));
  }
}
