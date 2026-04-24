import { Vector3 } from 'three';

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

  _radius: number;
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

  rotationSpeed: number;

  _angle: number;
  get angle(): number {
    return this._angle;
  }
  set angle(v: number) {
    this._angle = v;
    this.setShaderParams({
      uPlanetAngle: v,
    });
  }

  _atmosphereHeight = 0;
  _atmosphereRayleighScaleHeight = 0;
  _atmosphereMieScaleHeight = 0;
  _atmosphereMiePreferredScatteringDirection = 0;
  _atmosphereRaymarchStepsCount = 0;
  _atmosphereRaymarchDistance = 0;
  _skyBrightness = 0;
  _ozoneIntensity = 0;
  _ozoneCenterHeight = 0;
  _ozoneThickness = 0;

  get atmosphereHeight(): number {
    return this._atmosphereHeight;
  }
  get atmosphereRayleighScaleHeight(): number {
    return this._atmosphereRayleighScaleHeight;
  }
  get atmosphereMieScaleHeight(): number {
    return this._atmosphereMieScaleHeight;
  }
  get atmosphereMiePreferredScatteringDirection(): number {
    return this._atmosphereMiePreferredScatteringDirection;
  }
  get atmosphereRaymarchStepsCount(): number {
    return this._atmosphereRaymarchStepsCount;
  }
  get atmosphereRaymarchDistance(): number {
    return this._atmosphereRaymarchDistance;
  }
  get skyBrightness(): number {
    return this._skyBrightness;
  }
  get ozoneIntensity(): number {
    return this._ozoneIntensity;
  }
  get ozoneCenterHeight(): number {
    return this._ozoneCenterHeight;
  }
  get ozoneThickness(): number {
    return this._ozoneThickness;
  }

  set atmosphereHeight(v: number) {
    this._atmosphereHeight = v;
    this.setShaderParams({
      uAtmosphereRadius: this.radius + v,
    });
  }
  set atmosphereRayleighScaleHeight(v: number) {
    this._atmosphereRayleighScaleHeight = v;
    this.setShaderParams({
      uRayleighScaleHeight: v,
    });
  }
  set atmosphereMieScaleHeight(v: number) {
    this._atmosphereMieScaleHeight = v;
    this.setShaderParams({
      uMieScaleHeight: v,
    });
  }
  set atmosphereMiePreferredScatteringDirection(v: number) {
    this._atmosphereMiePreferredScatteringDirection = v;
    this.setShaderParams({
      uMiePreferredScatteringDirection: v,
    });
  }
  set atmosphereRaymarchStepsCount(v: number) {
    this._atmosphereRaymarchStepsCount = v;
    this.setShaderParams({
      atmSteps: v,
    });
  }
  set atmosphereRaymarchDistance(v: number) {
    this._atmosphereRaymarchDistance = v;
    this.setShaderParams({
      uAtmosphereRaymarchDistance: v,
    });
  }
  set skyBrightness(v: number) {
    this._skyBrightness = v;
    this.setShaderParams({
      uSkyBrightness: v,
    });
  }
  set ozoneIntensity(v: number) {
    this.setShaderParams({
      uOzoneIntensity: v,
    });
    this._ozoneIntensity = v;
  }
  set ozoneCenterHeight(v: number) {
    this._ozoneCenterHeight = v;
    this.setShaderParams({
      uOzoneCenterHeight: v,
    });
  }
  set ozoneThickness(v: number) {
    this._ozoneThickness = v;
    this.setShaderParams({
      uOzoneThickness: v,
    });
  }

  constructor(
    { position, rotation, radius, rotationSpeed, angle, atmosphere }: PlanetParams,
    private setShaderParams: (params: any) => void,
  ) {
    super('planet');
    this.position = position;
    this.rotation = rotation;
    this._radius = radius;
    this.rotationSpeed = rotationSpeed;
    this._angle = angle;

    this._atmosphereHeight = atmosphere.height;
    this._atmosphereRayleighScaleHeight = atmosphere.rayleighScaleHeight;
    this._atmosphereMieScaleHeight = atmosphere.mieScaleHeight;
    this._atmosphereMiePreferredScatteringDirection = atmosphere.miePreferredScatteringDirection;
    this._atmosphereRaymarchStepsCount = atmosphere.raymarchStepsCount;
    this._atmosphereRaymarchDistance = atmosphere.raymarchDistance;
    this._skyBrightness = atmosphere.skyBrightness;
    this._ozoneIntensity = atmosphere.ozoneIntensity;
    this._ozoneCenterHeight = atmosphere.ozoneCenterHeight;
    this._ozoneThickness = atmosphere.ozoneThickness;
  }

  rotate(angle: number) {
    this.angle += angle;
  }
}
