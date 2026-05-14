import { Matrix4, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, Vector3 } from 'three';

import { starFrag, starVert } from '../shaders/star';

import { shaderUniforms } from './decorators';
import { Star } from './starField';
import { mapObjectValues } from './utils';
import { sub } from './utils/vector';

const STAR_SPHERE_UNIFORMS = {
  center: new Vector3(),
  radius: 0,
  color: new Vector3(),
  luminosity: 0,
  brightnessMultiplier: 1,
  projectionMatrixInverse: new Matrix4(),
  viewMatrixInverse: new Matrix4(),
};

type StarSphereUniforms = typeof STAR_SPHERE_UNIFORMS;

@shaderUniforms<StarSphere>(STAR_SPHERE_UNIFORMS, (instance, field, value) => {
  if (instance.material) {
    instance.material.uniforms[field].value = value;
  }
})
export class StarSphere {
  star!: Star;

  private material: ShaderMaterial;
  private mesh: Mesh;

  constructor(star: Star) {
    this.star = star;

    this.material = new ShaderMaterial({
      vertexShader: starVert,
      fragmentShader: starFrag,
      uniforms: {
        ...mapObjectValues(STAR_SPHERE_UNIFORMS, ({ value }) => ({ value })),
      },
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });

    const geometry = new PlaneGeometry(2, 2);
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
    // Render below planet billboards (renderOrder 1000) so planets occlude their star, but above star point cloud (renderOrder 0)
    this.mesh.renderOrder = 999;

    this.setStar(star);
  }

  // Swap which star this billboard represents (used when "current star" changes in GameLogic)
  setStar(star: Star) {
    this.star = star;
    // Copy static star data into uniforms via decorator setters
    this.color = star.color;
    this.radius = star.radius;
    this.luminosity = star.luminosity;
  }

  addToScene(scene: Scene) {
    scene.add(this.mesh);
  }

  removeFromScene(scene: Scene) {
    scene.remove(this.mesh);
  }

  // starPositionKm: star's absolute position in the same frame as camera.position
  update(camera: PerspectiveCamera, starPositionKm: Vector3) {
    this.projectionMatrixInverse = camera.projectionMatrixInverse;
    this.viewMatrixInverse = camera.matrixWorld;
    this.center = sub(starPositionKm, camera.position);
  }

  dispose() {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}

// Type augmentation: tell TypeScript about the fields the decorator installs at runtime
// eslint-disable-next-line no-redeclare
export interface StarSphere extends StarSphereUniforms {}
