import { Matrix4, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, TextureLoader, Vector3 } from 'three';

import { raycastFrag, raycastVert } from '../shaders/raycast';

import { shaderParam } from './decorators';
import { mapObjectValues, sub } from './utils';

type ShaderParams = {
  uPlanetAngle: number;
  uPlanetAxis: Vector3;
  uPlanetRadius: number;
  uAtmosphereHeight: number;
  uRayleighScaleHeight: number;
  uMieScaleHeight: number;
  uMiePreferredScatteringDirection: number;
  uMieBetaAbsorption: number;
  atmSteps: number;
  secondAtmSteps: number;
  useAtmosphere: boolean;
  uUseMie: boolean;
  useTransmittance: boolean;
  uEarthTexture: string | null;
};

const SHADER_PARAMS: ShaderParams = {
  uRayleighScaleHeight: 0,
  uMieScaleHeight: 0,
  uMiePreferredScatteringDirection: 0,
  uMieBetaAbsorption: 0,
  atmSteps: 0,
  secondAtmSteps: 0,
  uPlanetRadius: 0,
  uPlanetAxis: new Vector3(),
  uPlanetAngle: 0,
  uAtmosphereHeight: 0,
  useAtmosphere: false,
  uUseMie: true,
  useTransmittance: true,
  uEarthTexture: null,
};

type PlanetParams = ShaderParams & {
  position: number[];
  rotationSpeed: number;
  textureUrl: string;
};

export class Planet {
  rotationSpeed!: number;
  position!: Vector3;

  @shaderParam() uPlanetAngle!: number;
  @shaderParam() uPlanetAxis!: Vector3;
  @shaderParam() uPlanetRadius!: number;
  @shaderParam() uAtmosphereHeight!: number;
  @shaderParam() uRayleighScaleHeight!: number;
  @shaderParam() uMieScaleHeight!: number;
  @shaderParam() uMiePreferredScatteringDirection!: number;
  @shaderParam() uMieBetaAbsorption!: number;
  @shaderParam() atmSteps!: number;
  @shaderParam() secondAtmSteps!: number;
  @shaderParam() useAtmosphere!: boolean;
  @shaderParam() uUseMie!: boolean;
  @shaderParam() useTransmittance!: boolean;

  private material: ShaderMaterial;
  private mesh: Mesh;

  constructor({ textureUrl, ...params }: PlanetParams) {
    Object.entries(params).forEach(([key, value]) => ((this as any)[key] = value));

    this.material = new ShaderMaterial({
      vertexShader: raycastVert,
      fragmentShader: raycastFrag,
      uniforms: {
        ...mapObjectValues(SHADER_PARAMS, ({ value }) => ({ value })),

        projectionMatrixInverse: { value: new Matrix4() },
        viewMatrixInverse: { value: new Matrix4() },
        uPlanetCenter: { value: new Vector3() },
        uSunDirection: { value: new Vector3() },
        uSunIntensity: { value: 0 },

        uRayleighBeta: { value: new Vector3(5.5e-3, 13.0e-3, 22.4e-3) },
        uMieBetaScattering: { value: 21e-3 },
      },
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    const geometry = new PlaneGeometry(2, 2);
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1000;

    new TextureLoader().load(textureUrl, (texture) => {
      this.setShaderParams({ uEarthTexture: texture });
    });
  }

  setShaderParams = (params: Record<string, any>) => {
    if (!this.material) {
      return;
    }
    for (const field in params) {
      if (Object.hasOwn(params, field)) {
        this.material.uniforms[field].value = params[field];
      }
    }
  };

  addToScene(scene: Scene) {
    scene.add(this.mesh);
  }

  removeFromScene(scene: Scene) {
    scene.remove(this.mesh);
  }

  rotate(angleDegrees: number) {
    this.uPlanetAngle += angleDegrees;
  }

  update(delta: number, camera: PerspectiveCamera, starPosition: Vector3, starIntensity: number) {
    this.rotate(this.rotationSpeed * delta);

    this.setShaderParams({
      projectionMatrixInverse: camera.projectionMatrixInverse,
      viewMatrixInverse: camera.matrixWorld,
      uPlanetCenter: sub(this.position, camera.position),
      uSunDirection: sub(starPosition, this.position).normalize(),
      uSunIntensity: starIntensity,
    });
  }

  dispose() {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}
