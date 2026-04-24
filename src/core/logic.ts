import { Camera, Matrix4, Mesh, PlaneGeometry, Scene, ShaderMaterial, TextureLoader, Vector3 } from 'three';

import earthTextureUrl from '@/assets/earth.jpg';

import { raycastFrag, raycastVert } from '../shaders/raycast';

import { Planet } from './planet';
import { Star } from './star';
import { getSunDirection, sub } from './utils';

export class GameLogic {
  private raycastMaterial: ShaderMaterial;
  private mesh: Mesh;
  public planet: Planet;
  public star: Star;

  constructor(
    private camera: Camera,
    private scene: Scene,
  ) {
    this.star = new Star({ intensity: 5, position: new Vector3(), radius: 0, angle: 0 }, this.setShaderParams); // TODO: apply real position and radius
    this.planet = new Planet(
      {
        position: new Vector3(0, -6_371_000, 0),
        radius: 6_371_000,
        rotation: new Vector3(Math.sin(0.41), Math.cos(0.41), 0), // TODO: make real angle
        rotationSpeed: 0.05,
        angle: 0.0,
        atmosphere: {
          height: 100_000,
          rayleighScaleHeight: 1400,
          mieScaleHeight: 1400,
          miePreferredScatteringDirection: 1.0,
          raymarchStepsCount: 16,
          raymarchDistance: 10,
          skyBrightness: 50.0,
          ozoneIntensity: 0.5,
          ozoneCenterHeight: 25000,
          ozoneThickness: 15000,
        },
      },
      this.setShaderParams,
    );

    this.raycastMaterial = new ShaderMaterial({
      vertexShader: raycastVert,
      fragmentShader: raycastFrag,
      uniforms: {
        projectionMatrixInverse: { value: new Matrix4() },
        viewMatrixInverse: { value: new Matrix4() },

        uSunIntensity: { value: this.star.intensity },
        uSunDirection: { value: getSunDirection(this.star.angle) },

        uPlanetCenter: { value: this.planet.position },
        uPlanetRadius: { value: this.planet.radius },
        uPlanetAxis: { value: this.planet.rotation },

        uAtmosphereRadius: { value: this.planet.radius + this.planet.atmosphereHeight },
        uRayleighBeta: { value: new Vector3(5.5e-6, 13.0e-6, 22.4e-6) },
        uMieBeta: { value: new Vector3(21e-6, 21e-6, 21e-6) },
        uRayleighScaleHeight: { value: this.planet.atmosphereRayleighScaleHeight }, // Density falloff for blue sky: 25% of atmosphere thickness (standart)
        uMieScaleHeight: { value: this.planet.atmosphereMieScaleHeight }, // Density falloff for sun halo: 5% of atmosphere thickness
        uMiePreferredScatteringDirection: { value: this.planet.atmosphereMiePreferredScatteringDirection },
        uSkyBrightness: { value: this.planet.skyBrightness },
        atmSteps: { value: this.planet.atmosphereRaymarchStepsCount },
        uPlanetAngle: { value: this.planet.angle },
        uAtmosphereRaymarchDistance: { value: this.planet.atmosphereRaymarchDistance },

        uOzoneBeta: { value: new Vector3(3.426e-6, 8.298e-6, 0.356e-6) }, // High green absorption
        uOzoneIntensity: { value: this.planet.ozoneIntensity },
        uOzoneCenterHeight: { value: this.planet.ozoneCenterHeight }, // Peaks
        uOzoneThickness: { value: this.planet.ozoneThickness }, // Spans

        uEarthTexture: { value: null },
      },
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    const geometry = new PlaneGeometry(2, 2);
    this.mesh = new Mesh(geometry, this.raycastMaterial);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1000;
    this.scene.add(this.mesh);

    new TextureLoader().load(earthTextureUrl, (texture) => {
      this.raycastMaterial.uniforms.uEarthTexture.value = texture;
    });
  }

  setShaderParams = (params: Record<string, any>) => {
    if (!this.raycastMaterial) {
      return;
    }
    for (const field in params) {
      if (Object.hasOwn(params, field)) {
        this.raycastMaterial.uniforms[field].value = params[field];
      }
    }
  };

  update(delta: number) {
    if (this.planet.rotationSpeed > 0) {
      const angleDelta = this.planet.rotationSpeed * delta;
      this.planet.rotate(angleDelta);

      // Determine how much the planet "drags" the camera along with it.
      const altitude = Math.max(0, this.camera.position.distanceTo(this.planet.position) - this.planet.radius);

      let dragFactor = 0;
      if (altitude < 10_000) {
        // Ground friction: 100% synchronization with planet rotation
        dragFactor = 1.0;
      } else if (altitude < this.planet.atmosphereHeight) {
        // Atmospheric drag: exponentially decreases with altitude (thinner air)
        const scaleHeight = Math.max(1, this.planet.atmosphereHeight * 0.2);
        dragFactor = Math.exp(-altitude / scaleHeight);
      } else {
        // Outer space: no drag, you are stationary in the cosmic frame
        dragFactor = 0.0;
      }

      const cameraAngleDelta = angleDelta * dragFactor;
      if (cameraAngleDelta !== 0) {
        // Rotate camera position around Y axis relative to pivot
        const pivot = this.planet.position; // TODO: rotate camera WITH the planet
        const pos = sub(this.camera.position, pivot);
        pos.applyAxisAngle(this.planet.rotation, cameraAngleDelta);
        this.camera.position.copy(pivot).add(pos);

        // Rotate camera yaw to turn WITH the planet (subtract: planet rotates CCW → texture moves CW → camera turns right)
        this.camera.rotation.y -= cameraAngleDelta;
      }
    }

    this.camera.updateMatrixWorld();

    this.setShaderParams({
      projectionMatrixInverse: this.camera.projectionMatrixInverse,
      viewMatrixInverse: this.camera.matrixWorld,
    });
  }

  dispose() {
    this.raycastMaterial.dispose();
    this.mesh.geometry.dispose();
    this.scene.remove(this.mesh);
  }
}
