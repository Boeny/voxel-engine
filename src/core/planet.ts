import { Matrix4, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, Texture, TextureLoader, Vector3 } from 'three';

import { raycastFrag, raycastVert } from '../shaders/raycast';

import { shaderUniforms } from './decorators';
import { mapObjectValues } from './utils';

const PLANET_UNIFORMS = {
  uPlanetAngle: 0,
  uPlanetAxis: new Vector3(),
  uPlanetRadius: 0,
  uAtmosphereHeight: 0,
  uRayleighScaleHeight: 0,
  uMieScaleHeight: 0,
  uMiePreferredScatteringDirection: 0,
  uMieBetaAbsorption: 0,
  atmSteps: 0,
  secondAtmSteps: 0,
  useAtmosphere: false,
  uUseMie: true,
  useTransmittance: true,
  uEarthTexture: null as Texture | null,
};

type PlanetUniforms = typeof PLANET_UNIFORMS;

// JSON-friendly param types: Vector3 fields come as number[] from JSON, converted in constructor.
type PlanetParams = Omit<PlanetUniforms, 'uEarthTexture'> & {
  position: Vector3;
  rotationSpeed: number;
  textureUrl: string;
};

@shaderUniforms(PLANET_UNIFORMS)
export class Planet {
  rotationSpeed!: number;
  position!: Vector3;

  private material: ShaderMaterial;
  private mesh: Mesh;

  constructor({ textureUrl, ...params }: PlanetParams) {
    Object.entries(params).forEach(([key, value]) => ((this as any)[key] = value));

    this.material = new ShaderMaterial({
      vertexShader: raycastVert,
      fragmentShader: raycastFrag,
      uniforms: {
        ...mapObjectValues(PLANET_UNIFORMS, ({ value }) => ({ value })),

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
      this.uEarthTexture = texture;
    });
  }

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

    const uniforms = this.material.uniforms;
    uniforms.projectionMatrixInverse.value = camera.projectionMatrixInverse;
    uniforms.viewMatrixInverse.value = camera.matrixWorld;
    uniforms.uPlanetCenter.value.copy(this.position).sub(camera.position);
    uniforms.uSunDirection.value.copy(starPosition).sub(this.position).normalize();
    uniforms.uSunIntensity.value = starIntensity;
  }

  dispose() {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}

// Type augmentation: tell TypeScript about the fields the decorator installs at runtime
// eslint-disable-next-line no-redeclare
export interface Planet extends PlanetUniforms {}
