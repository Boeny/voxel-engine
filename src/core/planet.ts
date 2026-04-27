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
  atmosphere: {
    height: number;
    rayleighScaleHeight: number;
    mieScaleHeight: number;
    miePreferredScatteringDirection: number;
    mieAbsorption: number;
    raymarchStepsCount: number;
    raymarchDistance: number;
    skyBrightness: number;
    ozoneIntensity: number;
    ozoneCenterHeight: number;
    ozoneThickness: number;
  };
};

export class Planet extends SelectableObject {
  position = new Vector3();
  rotation = new Vector3();
  rotationSpeed: number;

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
  @shaderParam('uMieScaleHeight') atmosphereMieScaleHeight!: number;
  @shaderParam('uMiePreferredScatteringDirection') atmosphereMiePreferredScatteringDirection!: number;
  @shaderParam('uMieBetaAbsorption') atmosphereMieAbsorption!: number;
  @shaderParam('atmSteps') atmosphereRaymarchStepsCount!: number;
  @shaderParam('uAtmosphereRaymarchDistance') atmosphereRaymarchDistance!: number;
  @shaderParam('uSkyBrightness') skyBrightness!: number;
  @shaderParam('uOzoneIntensity') ozoneIntensity!: number;
  @shaderParam('uOzoneCenterHeight') ozoneCenterHeight!: number;
  @shaderParam('uOzoneThickness') ozoneThickness!: number;

  constructor(
    { position, rotation, radius, rotationSpeed, angle, atmosphere }: PlanetParams,
    private setShaderParams: (params: Record<string, any>) => void,
  ) {
    super('planet');
    this.position = arrayToVector(position);
    this.rotation = arrayToVector(rotation);
    this.rotationSpeed = rotationSpeed;

    this.radius = radius;
    this.angle = angle;
    this.atmosphereHeight = atmosphere.height;
    this.atmosphereRayleighScaleHeight = atmosphere.rayleighScaleHeight;
    this.atmosphereMieScaleHeight = atmosphere.mieScaleHeight;
    this.atmosphereMiePreferredScatteringDirection = atmosphere.miePreferredScatteringDirection;
    this.atmosphereMieAbsorption = atmosphere.mieAbsorption;
    this.atmosphereRaymarchStepsCount = atmosphere.raymarchStepsCount;
    this.atmosphereRaymarchDistance = atmosphere.raymarchDistance;
    this.skyBrightness = atmosphere.skyBrightness;
    this.ozoneIntensity = atmosphere.ozoneIntensity;
    this.ozoneCenterHeight = atmosphere.ozoneCenterHeight;
    this.ozoneThickness = atmosphere.ozoneThickness;
  }

  rotate(angle: number) {
    this.angle += angle;
  }
}
