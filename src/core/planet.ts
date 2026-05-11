import { Matrix4, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, Texture, TextureLoader, Vector3 } from 'three';

import { raycastFrag, raycastVert } from '../shaders/raycast';

import { LY_TO_KM } from './const';
import { shaderUniforms } from './decorators';
import { Star } from './starField';
import { angleToRad, arrayToVector, mapObjectValues, mul, norm, rotateXY, sub } from './utils';

const PLANET_UNIFORMS = {
  position: new Vector3(),
  angle: 0,
  axis: new Vector3(),
  radius: 0,
  sunDirection: new Vector3(),
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
  projectionMatrixInverse: new Matrix4(),
  viewMatrixInverse: new Matrix4(),
  sunLuminosity: 0,
};

type PlanetUniforms = typeof PLANET_UNIFORMS;

// JSON-friendly param types: Vector3 fields come as number[] from JSON, converted in constructor.
type PlanetParams = Omit<
  Partial<PlanetUniforms>,
  'uEarthTexture' | 'axis' | 'projectionMatrixInverse' | 'viewMatrixInverse' | 'sunLuminosity' | 'position'
> & {
  axis: number[];
  distanceFromStar: number;
  orbitalPhase: number;
  rotationSpeed: number;
  textureUrl: string;
};

@shaderUniforms<Planet>(PLANET_UNIFORMS, (instance, field, value) => {
  if (instance.material) {
    instance.material.uniforms[field].value = value;
  }
})
export class Planet {
  orbitalPhase!: number;
  rotationSpeed!: number;
  distanceFromStar!: number;
  star: Star;

  private material: ShaderMaterial;
  private mesh: Mesh;

  constructor({ textureUrl, ...params }: PlanetParams, star: Star) {
    this.star = star;

    Object.entries(params).forEach(([key, value]) => {
      (this as any)[key] = Array.isArray(value) ? arrayToVector(value) : value;
    });

    this.calcPosition();

    this.material = new ShaderMaterial({
      vertexShader: raycastVert,
      fragmentShader: raycastFrag,
      uniforms: {
        ...mapObjectValues(PLANET_UNIFORMS, ({ value }) => ({ value })),

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

  // World position in LY (star LY + km offset converted to LY)
  get positionLy(): Vector3 {
    return mul(this.position, 1 / LY_TO_KM);
  }
  calcPosition() {
    this.position = rotateXY(new Vector3(this.distanceFromStar, 0, 0), angleToRad(this.orbitalPhase));
  }

  addToScene(scene: Scene) {
    scene.add(this.mesh);
  }

  removeFromScene(scene: Scene) {
    scene.remove(this.mesh);
  }

  rotate(angleDegrees: number) {
    this.angle += angleDegrees;
  }

  update(delta: number, camera: PerspectiveCamera) {
    this.rotate(this.rotationSpeed * delta);

    this.projectionMatrixInverse = camera.projectionMatrixInverse;
    this.viewMatrixInverse = camera.matrixWorld;

    // NOTE: assumes camera is in the same local-km frame as distanceFromStar.
    // Will be properly resolved when the local-km system (step 3) is built.
    this.calcPosition();
    this.sunDirection = norm(sub(mul(this.star.position, LY_TO_KM), this.position));
    this.sunLuminosity = this.star.luminosity;
  }

  dispose() {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}

// Type augmentation: tell TypeScript about the fields the decorator installs at runtime
// eslint-disable-next-line no-redeclare
export interface Planet extends PlanetUniforms {}
