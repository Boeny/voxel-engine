import { TextureLoader, Vector3 } from 'three';

import { shaderParam } from './decorators';
import { SelectableObject } from './selectableObject';
import { arrayToVector, mapObjectReverse, mapObjectValues } from './utils';

type PlanetParams = {
  position: number[];
  rotation: number[];
  radius: number;
  rotationSpeed: number;
  angle: number;
  useAtmosphere: boolean;
  atmosphereHeight: number;
  atmosphereRayleighScaleHeight: number;
  atmosphereMieScaleHeight: number;
  atmosphereMiePreferredScatteringDirection: number;
  atmosphereMieAbsorption: number;
  atmosphereRaymarchStepsCount: number;
  secondAtmSteps: number;
  atmosphereUseMie: boolean;
  useTransmittance: boolean;
  textureUrl: string;
};
const SHADER_PLANET: Record<string, keyof Omit<PlanetParams, 'textureUrl'> | 'texture'> = {
  uRayleighScaleHeight: 'atmosphereRayleighScaleHeight',
  uMieScaleHeight: 'atmosphereMieScaleHeight',
  uMiePreferredScatteringDirection: 'atmosphereMiePreferredScatteringDirection',
  uMieBetaAbsorption: 'atmosphereMieAbsorption',
  atmSteps: 'atmosphereRaymarchStepsCount',
  secondAtmSteps: 'secondAtmSteps',
  uPlanetRadius: 'radius',
  uPlanetAxis: 'rotation',
  uPlanetAngle: 'angle',
  uAtmosphereHeight: 'atmosphereHeight',
  useAtmosphere: 'useAtmosphere',
  uUseMie: 'atmosphereUseMie',
  useTransmittance: 'useTransmittance',
  uEarthTexture: 'texture',
} as const;
const PLANET_SHADER = mapObjectReverse(SHADER_PLANET);

export class Planet extends SelectableObject {
  rotationSpeed!: number;

  static shaderParams = mapObjectValues(SHADER_PLANET, (key) => {
    if (key === PLANET_SHADER.rotation) {
      return new Vector3();
    }
    if (key === PLANET_SHADER.texture) {
      return null;
    }
    if ([PLANET_SHADER.useAtmosphere, PLANET_SHADER.atmosphereUseMie, PLANET_SHADER.useTransmittance].includes(key)) {
      return false;
    }

    return 0;
  });

  // Simple 1:1 shader param mappings
  @shaderParam(PLANET_SHADER) angle!: number;
  @shaderParam(PLANET_SHADER) rotation!: Vector3;
  @shaderParam(PLANET_SHADER) radius!: number;
  @shaderParam(PLANET_SHADER) atmosphereHeight!: number;
  @shaderParam(PLANET_SHADER) atmosphereRayleighScaleHeight!: number;
  @shaderParam(PLANET_SHADER) atmosphereMieScaleHeight!: number;
  @shaderParam(PLANET_SHADER) atmosphereMiePreferredScatteringDirection!: number;
  @shaderParam(PLANET_SHADER) atmosphereMieAbsorption!: number;
  @shaderParam(PLANET_SHADER) atmosphereRaymarchStepsCount!: number;
  @shaderParam(PLANET_SHADER) secondAtmSteps!: number;
  @shaderParam(PLANET_SHADER) useAtmosphere!: number;
  @shaderParam(PLANET_SHADER) atmosphereUseMie!: boolean;
  @shaderParam(PLANET_SHADER) useTransmittance!: boolean;

  constructor(
    { position, rotation, textureUrl, ...other }: PlanetParams,
    private setShaderParams: (params: Record<string, any>) => void,
  ) {
    super('planet');
    this.position = arrayToVector(position);
    this.rotation = arrayToVector(rotation);

    Object.entries(other).forEach(([key, value]) => ((this as any)[key] = value));

    new TextureLoader().load(textureUrl, (texture) => {
      this.setShaderParams({ uEarthTexture: texture });
    });
  }

  rotate(angle: number) {
    this.angle += angle;
  }
}
