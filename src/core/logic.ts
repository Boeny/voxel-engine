import { Camera, Matrix4, Mesh, PlaneGeometry, Scene, ShaderMaterial, TextureLoader, Vector3 } from 'three';

import earthTextureUrl from '@/assets/earth.jpg';
import mapData from '@/data/map.json';

import { raycastFrag, raycastVert } from '../shaders/raycast';

import { Planet } from './planet';
import { SelectableObject } from './selectableObject';
import { Star } from './star';
import { angleToRad, mapObjectValues, sub } from './utils';

const SHADER_PLANET = {
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
};
const STAR_SHADER = {
  uSunIntensity: 'intensity',
  uSunDirection: '',
  uSunAngularRadius: '',
};

export class GameLogic {
  private raycastMaterial: ShaderMaterial;
  private mesh: Mesh;
  public planet: Planet;
  public star: Star;
  private readonly relativePlanetCenter = new Vector3();
  private readonly sunDirection = new Vector3();

  constructor(
    private camera: Camera,
    private scene: Scene,
    setObjects: (objects: SelectableObject[]) => void,
  ) {
    this.raycastMaterial = new ShaderMaterial({
      vertexShader: raycastVert,
      fragmentShader: raycastFrag,
      uniforms: {
        ...mapObjectValues(SHADER_PLANET, () => ({ value: 0 })),
        ...mapObjectValues(STAR_SHADER, () => ({ value: 0 })),

        projectionMatrixInverse: { value: new Matrix4() },
        viewMatrixInverse: { value: new Matrix4() },

        uPlanetCenter: { value: this.relativePlanetCenter },
        uUseMie: { value: true },
        useTransmittance: { value: true },
        uRayleighBeta: { value: new Vector3(5.5e-3, 13.0e-3, 22.4e-3) },
        uMieBetaScattering: { value: 21e-3 },

        uEarthTexture: { value: null },

        uUseStars: { value: true },
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
      this.setShaderParams({ uEarthTexture: texture });
    });

    this.star = new Star(mapData.star, this.setShaderParams); // TODO: apply real position and radius
    this.planet = new Planet(mapData.planet, this.setShaderParams);

    setObjects([this.star, this.planet]);
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
      const angleDelta = angleToRad(this.planet.rotationSpeed) * delta;
      this.planet.rotate(angleDelta);

      // Determine how much the planet "drags" the camera along with it.
      const altitude = Math.max(0, this.camera.position.distanceTo(this.planet.position) - this.planet.radius);

      let dragFactor = 0;
      if (altitude < 10) {
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

    this.relativePlanetCenter.copy(this.planet.position).sub(this.camera.position);

    this.setShaderParams({
      projectionMatrixInverse: this.camera.projectionMatrixInverse,
      viewMatrixInverse: this.camera.matrixWorld,
      uSunDirection: this.sunDirection.subVectors(this.star.position, this.planet.position).normalize(),
      uSunAngularRadius: Math.atan(this.star.radius / this.star.position.distanceTo(this.planet.position)),
      uPlanetCenter: this.relativePlanetCenter,
    });
  }

  dispose() {
    this.raycastMaterial.dispose();
    this.mesh.geometry.dispose();
    this.scene.remove(this.mesh);
  }
}
