import * as THREE from 'three';

import { raycastFrag, raycastVert } from '../shaders/raycast';

export const DEFAULT_SHADER = {
  uSunIntensity: 5, // 5
  uSkyBrightness: 50.0, // 10
  uRayleighScaleHeight: 1440, // 8000
  uMieScaleHeight: 1400, // 5000
  uMiePreferredScatteringDirection: 1, // 0.8
};
export const DEFAULT_PLANET = {
  planetRadius: 6_371_000,
  atmosphereHeight: 100_000,
  planetRotationSpeed: 0.05,
  axialTilt: 0.3,
};

export class GameLogic {
  private raycastMaterial: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;

  shaderParams = DEFAULT_SHADER;
  planetParams = DEFAULT_PLANET;

  constructor(private scene: THREE.Scene) {
    this.raycastMaterial = new THREE.ShaderMaterial({
      vertexShader: raycastVert,
      fragmentShader: raycastFrag,
      uniforms: {
        projectionMatrixInverse: { value: new THREE.Matrix4() },
        viewMatrixInverse: { value: new THREE.Matrix4() },
        uSunDirection: { value: new THREE.Vector3(1, 1, 0.5).normalize() },
        uPlanetCenter: { value: new THREE.Vector3(0, -this.planetParams.planetRadius, 0) },
        uPlanetRadius: { value: this.planetParams.planetRadius },
        uAtmosphereRadius: { value: this.planetParams.planetRadius + this.planetParams.atmosphereHeight },
        uRayleighBeta: { value: new THREE.Vector3(5.5e-6, 13.0e-6, 22.4e-6) },
        uMieBeta: { value: new THREE.Vector3(21e-6, 21e-6, 21e-6) },
        uRayleighScaleHeight: { value: this.shaderParams.uRayleighScaleHeight }, // Density falloff for blue sky: 25% of atmosphere thickness (standart)
        uMieScaleHeight: { value: this.shaderParams.uMieScaleHeight }, // Density falloff for sun halo: 5% of atmosphere thickness
        uMiePreferredScatteringDirection: { value: this.shaderParams.uMiePreferredScatteringDirection },
        uSunIntensity: { value: this.shaderParams.uSunIntensity },
        uSkyBrightness: { value: this.shaderParams.uSkyBrightness },
        uCosmicMatrix: { value: new THREE.Matrix3() },
      },
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.raycastMaterial);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1000;
    this.scene.add(this.mesh);
  }

  setShaderParams = (params: Record<string, any>) => {
    for (const field in params) {
      if (Object.hasOwn(params, field)) {
        this.raycastMaterial.uniforms[field].value = params[field];
      }
    }
  };

  setPlanetParams = (params: Record<string, number>) => {
    for (const field in params) {
      if (Object.hasOwn(params, field)) {
        this.planetParams[field as keyof typeof DEFAULT_PLANET] = params[field];
      }
    }
    this.setShaderParams({
      uPlanetCenter: new THREE.Vector3(0, -this.planetParams.planetRadius, 0),
      uPlanetRadius: this.planetParams.planetRadius,
      uAtmosphereRadius: this.planetParams.planetRadius + this.planetParams.atmosphereHeight,
    });
  };

  update(camera: THREE.Camera, _time: number) {
    camera.updateMatrixWorld();
    this.raycastMaterial.uniforms.projectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
    this.raycastMaterial.uniforms.viewMatrixInverse.value.copy(camera.matrixWorld);
  }

  dispose() {
    this.raycastMaterial.dispose();
    this.mesh.geometry.dispose();
    this.scene.remove(this.mesh);
  }
}
