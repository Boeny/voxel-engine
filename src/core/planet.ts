import { Vector3 } from 'three';

import { shaderParam } from './decorators';
import { SelectableObject } from './selectableObject';

type PlanetParams = {
  position: Vector3;
  rotation: Vector3;
  radius: number;
  rotationSpeed: number;
  angle: number;
  atmosphere: {
    height: number;
    rayleighScaleHeight: number;
    mieScaleHeight: number;
    miePreferredScatteringDirection: number;
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

  // Simple 1:1 shader param mappings
  @shaderParam('uPlanetAngle') angle!: number;
  @shaderParam('uRayleighScaleHeight') atmosphereRayleighScaleHeight!: number;
  @shaderParam('uMieScaleHeight') atmosphereMieScaleHeight!: number;
  @shaderParam('uMiePreferredScatteringDirection') atmosphereMiePreferredScatteringDirection!: number;
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
    this.position = position;
    this.rotation = rotation;
    this.rotationSpeed = rotationSpeed;

    this.radius = radius;
    this.angle = angle;
    this.atmosphereHeight = atmosphere.height;
    this.atmosphereRayleighScaleHeight = atmosphere.rayleighScaleHeight;
    this.atmosphereMieScaleHeight = atmosphere.mieScaleHeight;
    this.atmosphereMiePreferredScatteringDirection = atmosphere.miePreferredScatteringDirection;
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
