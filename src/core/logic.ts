import { Matrix4, Mesh, PerspectiveCamera, PlaneGeometry, Scene, ShaderMaterial, Vector3 } from 'three';

import earthTextureUrl from '@/assets/earth.jpg';
import mapData from '@/data/map.json';

import { raycastFrag, raycastVert } from '../shaders/raycast';

import { Planet } from './planet';
import { SelectableObject } from './selectableObject';
import { Star } from './star';
import { StarMap } from './starField';
import { add, angleToRad, getDistanceText, mapObjectValues, mul, norm, setDOMContent, sub } from './utils';

const playerHeight = 2 / 1000; // km
const STAR_MAP_WIDTH = 4096;
const STAR_MAP_HEIGHT = 2048;

export class GameLogic {
  private raycastMaterial: ShaderMaterial;
  private mesh: Mesh;
  public planet: Planet;
  public star: Star | null = null;
  private readonly relativePlanetCenter = new Vector3();
  private isGrounded = true;
  velocity = new Vector3();
  starMap: StarMap;

  constructor(
    private camera: PerspectiveCamera,
    private scene: Scene,
    setObjects: (objects: SelectableObject[]) => void,
  ) {
    this.raycastMaterial = new ShaderMaterial({
      vertexShader: raycastVert,
      fragmentShader: raycastFrag,
      uniforms: {
        ...mapObjectValues(Planet.shaderParams, (key, value) => ({ value })),
        ...mapObjectValues(Star.shaderParams, (key, value) => ({ value })),

        projectionMatrixInverse: { value: new Matrix4() },
        viewMatrixInverse: { value: new Matrix4() },

        uMinDiskAngularSize: { value: 0 },
        uSunDirection: { value: new Vector3() },
        uSunDirFromCamera: { value: new Vector3() },
        uSunAngularRadius: { value: 0 },

        uRayleighBeta: { value: new Vector3(5.5e-3, 13.0e-3, 22.4e-3) },
        uMieBetaScattering: { value: 21e-3 },

        uUseStars: { value: true },
        uStarBrightness: { value: 0.1 },
        uStarMap: { value: null },
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

    this.starMap = new StarMap(STAR_MAP_WIDTH, STAR_MAP_HEIGHT, this.setShaderParams);
    this.star = new Star(this.starMap.parsedStars[mapData.starIndex], this.setShaderParams);
    this.planet = new Planet({ textureUrl: earthTextureUrl, ...mapData.planet }, this.setShaderParams);
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

  update(delta: number, selectedObject: SelectableObject | null) {
    const angleDeltaDegree = this.planet.rotationSpeed * delta; // degrees
    this.planet.rotate(angleDeltaDegree);

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

    const cameraAngleDelta = angleToRad(angleDeltaDegree) * dragFactor; // radians
    if (cameraAngleDelta !== 0) {
      // Rotate camera position around planet's rotation axis
      const pivot = this.planet.position;
      const pos = sub(this.camera.position, pivot);
      pos.applyAxisAngle(this.planet.rotation, cameraAngleDelta);
      this.camera.position.copy(pivot).add(pos);

      // Rotate camera orientation around the same axis (for editor mode; player overrides via lookAt)
      this.camera.rotateOnWorldAxis(this.planet.rotation, cameraAngleDelta);
      // Prevent roll accumulation — keep camera aligned with gravity
      //this.camera.rotation.z = 0;
    }

    if (selectedObject) {
      const distanceToCameraOnGround = selectedObject.radius + playerHeight / 1000;
      const vectorFromObject = sub(this.camera.position, selectedObject.position);
      const distanceToObject = vectorFromObject.length();
      const normal = norm(vectorFromObject);

      this.isGrounded = distanceToObject <= distanceToCameraOnGround;
      if (this.isGrounded) {
        this.camera.position.copy(add(selectedObject.position, mul(normal, distanceToCameraOnGround)));
      }
      // if (this.isGrounded) {
      //   this.camera.position.copy(add(selectedObject.position, mul(newNormal, distanceToCameraOnGround)));
      //   const verticalVelocity = mul(newNormal, this.velocity.dot(newNormal));
      //   this.velocity.sub(verticalVelocity);
      // }
    }

    this.camera.updateMatrixWorld();
    this.starMap.rebuild(this.camera.position, this.camera.fov, window.innerHeight);

    this.relativePlanetCenter.copy(this.planet.position).sub(this.camera.position);

    this.setShaderParams({
      projectionMatrixInverse: this.camera.projectionMatrixInverse,
      viewMatrixInverse: this.camera.matrixWorld,
    });

    if (this.star) {
      this.setShaderParams({
        uSunDirection: sub(this.star.position, this.planet.position).normalize(),
        uSunDirFromCamera: sub(this.star.position, this.camera.position).normalize(),
        uSunAngularRadius: Math.atan(this.star.radius / this.star.position.distanceTo(this.camera.position)),
      });
    }
  }

  updateHUD(delta: number, selectedObject: SelectableObject | null) {
    setDOMContent('hud-fps', `FPS: ${(1 / delta).toFixed(1)}`);
    setDOMContent('hud-altitude', `Altitude: ${getDistanceText(this.getDistanceToObject(selectedObject) - playerHeight)}`);
    setDOMContent('hud-grounded', `Is Grounded: ${this.isGrounded}`);
  }

  getDistanceToObject(object: { position: Vector3; radius: number } | null): number {
    if (!object) {
      return 0;
    }

    return this.camera.position.distanceTo(object.position) - object.radius;
  }

  dispose() {
    this.raycastMaterial.dispose();
    this.mesh.geometry.dispose();
    this.scene.remove(this.mesh);
  }
}
