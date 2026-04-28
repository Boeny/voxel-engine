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
  atmosphereRayleighOpticalDepthDistance: number;
  atmosphereMieScaleHeight: number;
  atmosphereMiePreferredScatteringDirection: number;
  atmosphereMieAbsorption: number;
  atmosphereRaymarchStepsCount: number;
  skyBrightness: number;
  atmosphereUseMie: boolean;
  atmosphereUseStars: boolean;
};

export class Planet extends SelectableObject {
  position = new Vector3();
  rotation = new Vector3();
  rotationSpeed!: number;

  private _radius!: number;
  get radius(): number {
    return this._radius;
  }
  set radius(v: number) {
    this._radius = v;
    this.setShaderParams({
      uPlanetRadius: v,
      uAtmosphereRadius: v + this.atmosphereHeight,
    });
  }

  private _atmosphereHeight!: number;
  get atmosphereHeight(): number {
    return this._atmosphereHeight;
  }
  set atmosphereHeight(v: number) {
    this._atmosphereHeight = v;
    this.setShaderParams({
      uAtmosphereRadius: this.radius + v,
    });
  }

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
  @shaderParam('uRayleighScaleHeight') atmosphereRayleighScaleHeight!: number;
  @shaderParam('uRayleighOpticalDepthDistance') atmosphereRayleighOpticalDepthDistance!: number;
  @shaderParam('uMieScaleHeight') atmosphereMieScaleHeight!: number;
  @shaderParam('uMiePreferredScatteringDirection') atmosphereMiePreferredScatteringDirection!: number;
  @shaderParam('uMieBetaAbsorption') atmosphereMieAbsorption!: number;
  @shaderParam('atmSteps') atmosphereRaymarchStepsCount!: number;
  @shaderParam('uSkyBrightness') skyBrightness!: number;
  @shaderParam('uUseMie') atmosphereUseMie!: boolean;
  @shaderParam('uUseStars') atmosphereUseStars!: boolean;

  constructor(
    { position, rotation, ...other }: PlanetParams,
    private setShaderParams: (params: Record<string, any>) => void,
  ) {
    super('planet');
    this.position = arrayToVector(position);
    this.rotation = arrayToVector(rotation);
    this.setShaderParams({ uPlanetAxis: this.rotation });

    Object.entries(other).forEach(([key, value]) => ((this as any)[key] = value));
  }

  rotate(angle: number) {
    this.angle += angle;
  }
}
