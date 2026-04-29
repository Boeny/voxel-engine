import { Vector3 } from 'three';

import { shaderParam } from './decorators';
import { SelectableObject } from './selectableObject';
import { angleToRad, arrayToVector } from './utils';

type PlanetParams = {
  position: number[];
  rotation: number[];
  radius: number;
  rotationSpeed: number;
  angle: number;
  atmosphereHeight: number;
  atmosphereRayleighScaleHeight: number;
  atmosphereMieScaleHeight: number;
  atmosphereMiePreferredScatteringDirection: number;
  atmosphereMieAbsorption: number;
  atmosphereRaymarchStepsCount: number;
  secondAtmSteps: number;
  atmosphereUseMie: boolean;
  useTransmittance: boolean;
};

export class Planet extends SelectableObject {
  rotationSpeed!: number;

  private _angle!: number;
  get angle(): number {
    return this._angle;
  }
  set angle(v: number) {
    this._angle = v;
    this.setShaderParams({
      uPlanetAngle: angleToRad(v),
    });
  }

  // Simple 1:1 shader param mappings
  @shaderParam('uPlanetAxis') rotation!: Vector3;
  @shaderParam('uPlanetRadius') radius!: number;
  @shaderParam('uAtmosphereHeight') atmosphereHeight!: number;
  @shaderParam('uRayleighScaleHeight') atmosphereRayleighScaleHeight!: number;
  @shaderParam('uMieScaleHeight') atmosphereMieScaleHeight!: number;
  @shaderParam('uMiePreferredScatteringDirection') atmosphereMiePreferredScatteringDirection!: number;
  @shaderParam('uMieBetaAbsorption') atmosphereMieAbsorption!: number;
  @shaderParam('atmSteps') atmosphereRaymarchStepsCount!: number;
  @shaderParam('secondAtmSteps') secondAtmSteps!: number;
  @shaderParam('uUseMie') atmosphereUseMie!: boolean;
  @shaderParam('useTransmittance') useTransmittance!: boolean;

  constructor(
    { position, rotation, ...other }: PlanetParams,
    private setShaderParams: (params: Record<string, any>) => void,
  ) {
    super('planet');
    this.position = arrayToVector(position);
    this.rotation = arrayToVector(rotation);

    Object.entries(other).forEach(([key, value]) => ((this as any)[key] = value));
  }

  rotate(angle: number) {
    this.angle += angle;
  }
}
