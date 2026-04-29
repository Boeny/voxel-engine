import { shaderParam } from './decorators';
import { SelectableObject } from './selectableObject';
import { arrayToVector } from './utils';

type StarParams = {
  intensity: number;
  radius: number;
  position: number[];
};

export class Star extends SelectableObject {
  @shaderParam('uSunIntensity') intensity!: number;

  constructor(
    { position, ...other }: StarParams,
    private setShaderParams: (params: any) => void,
  ) {
    super('star');
    this.position = arrayToVector(position);

    Object.entries(other).forEach(([key, value]) => ((this as any)[key] = value));
  }
}
