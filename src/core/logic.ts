import * as THREE from 'three';

import { raycastFrag, raycastVert } from '../shaders/raycast';

const planetRadius = 6371000;
const atmosphereHeight = 100000;
const PLANET_ROTATION_SPEED = 0.05;
const axialTilt = 0.3;

function getCosmicMatrix(time: number, playerLon: number, playerLat: number) {
  // Create rotation matrices to perfectly track the cosmic background
  const rotZ = new THREE.Matrix4().makeRotationZ(time * PLANET_ROTATION_SPEED + playerLon);
  const rotX = new THREE.Matrix4().makeRotationX(-playerLat);
  const rotY = new THREE.Matrix4().makeRotationY(axialTilt);

  // Combine rotations: Z then X then Y
  const cosmicMatrix = new THREE.Matrix4().multiply(rotY).multiply(rotX).multiply(rotZ);

  return cosmicMatrix;
}

export class GameLogic {
  private raycastMaterial: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;

  constructor(private scene: THREE.Scene) {
    this.raycastMaterial = new THREE.ShaderMaterial({
      vertexShader: raycastVert,
      fragmentShader: raycastFrag,
      uniforms: {
        projectionMatrixInverse: { value: new THREE.Matrix4() },
        viewMatrixInverse: { value: new THREE.Matrix4() },
        uSunDirection: { value: new THREE.Vector3(1, 1, 0.5).normalize() },
        uPlanetCenter: { value: new THREE.Vector3(0, -planetRadius, 0) },
        uPlanetRadius: { value: planetRadius },
        uAtmosphereRadius: { value: planetRadius + atmosphereHeight },
        uRayleighBeta: { value: new THREE.Vector3(5.5e-6, 13.0e-6, 22.4e-6) },
        uMieBeta: { value: new THREE.Vector3(21e-6, 21e-6, 21e-6) },
        uRayleighScaleHeight: { value: 8000 }, // Density falloff for blue sky: 25% of atmosphere thickness (standart)
        uMieScaleHeight: { value: 5000 }, // Density falloff for sun halo: 5% of atmosphere thickness
        uMiePreferredScatteringDirection: { value: 0.8 },
        uSunIntensity: { value: 5.0 },
        uSkyBrightness: { value: 10.0 },
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

  public update(camera: THREE.Camera, time: number) {
    camera.updateMatrixWorld();
    this.raycastMaterial.uniforms.projectionMatrixInverse.value.copy(camera.projectionMatrixInverse);
    this.raycastMaterial.uniforms.viewMatrixInverse.value.copy(camera.matrixWorld);

    // Make the atmosphere sphere follow the camera horizontally
    // This prevents distortion and keeps the horizon perfectly flat
    this.raycastMaterial.uniforms.uPlanetCenter.value.set(camera.position.x, -planetRadius, camera.position.z);

    // Player's position on the planet (longitude and latitude in radians)
    // Moving 1 unit = 1/planetRadius radians
    const playerLon = camera.position.x / planetRadius;
    const playerLat = camera.position.z / planetRadius;

    // Get the cosmic rotation that represents the movement of the universe relative to the planet
    const cosmicMatrix4 = getCosmicMatrix(time, playerLon, playerLat);
    const cosmicMatrix3 = new THREE.Matrix3().setFromMatrix4(cosmicMatrix4).transpose();

    // The sun is fixed at the X axis in cosmic space
    const sunDir = new THREE.Vector3(1, 0, 0).applyMatrix4(cosmicMatrix4).normalize();

    this.raycastMaterial.uniforms.uSunDirection.value.copy(sunDir);
    this.raycastMaterial.uniforms.uCosmicMatrix.value.copy(cosmicMatrix3);
  }

  public dispose() {
    this.raycastMaterial.dispose();
    this.mesh.geometry.dispose();
    this.scene.remove(this.mesh);
  }
}
