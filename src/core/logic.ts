import { PerspectiveCamera, Scene, Vector3 } from 'three';

import planetsData from '@/data/planets.json';
import { SelectableObject } from '@/types';

import { LY_TO_KM } from './const';
import { Planet } from './planet';
import { PlanetField } from './planetField';
import { Star, StarField } from './starField';
import { StarSphere } from './starSphere';
import { add, getDistanceText, mul, norm, setDOMContent, sub } from './utils';

const playerHeight = 2 / 1000; // km

// Camera-to-star distance under which we switch to the local-km rendering pass for that star.
// Beyond this, the star is only visible as a point in the LY cloud.
const CURRENT_STAR_THRESHOLD_LY = 0.1;

export class GameLogic {
  public planets: Planet[] = [];
  private isGrounded = true;

  starField: StarField;
  planetField: PlanetField;
  // Local-km sphere billboard for the "current" star. The current star is the nearest one
  // within CURRENT_STAR_THRESHOLD_LY; null means no local-km pass (camera in deep space).
  starSphere: StarSphere;
  currentStar: Star | null = null;
  private readonly currentStarPositionKm = new Vector3();
  private readonly cameraPositionLyTmp = new Vector3();

  constructor(
    private camera: PerspectiveCamera,
    private scene: Scene,
  ) {
    this.starField = new StarField();
    this.scene.add(this.starField.object);

    for (const planetData of planetsData) {
      const { starIndex, ...params } = planetData;
      const star = this.starField.parsedStars[starIndex];
      this.planets.push(new Planet(params, star));
    }

    this.planetField = new PlanetField(this.planets);
    this.scene.add(this.planetField.object);

    // StarSphere is created upfront; setStar() in updateCurrentStar will retarget it as needed.
    // Initial star is sun so the material has sane data even before first updateCurrentStar runs.
    this.starSphere = new StarSphere(this.starField.parsedStars[0]);
    this.updateCurrentStar();
  }

  // Find nearest star in LY units within CURRENT_STAR_THRESHOLD_LY. Switch scene membership
  // of the StarSphere billboard and that star's planet billboards on transition.
  private updateCurrentStar() {
    this.cameraPositionLyTmp.copy(this.camera.position).divideScalar(LY_TO_KM);

    let nearest: Star | null = null;
    let minDistance = CURRENT_STAR_THRESHOLD_LY;
    for (const star of this.starField.parsedStars) {
      const distance = this.cameraPositionLyTmp.distanceTo(star.position);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = star;
      }
    }

    if (nearest === this.currentStar) {
      return;
    }

    // Remove the previous current star's local-km objects from the scene
    if (this.currentStar) {
      this.starSphere.removeFromScene(this.scene);
      for (const planet of this.planets) {
        if (planet.star === this.currentStar) {
          planet.removeFromScene(this.scene);
        }
      }
    }

    this.currentStar = nearest;

    // Add the new current star's local-km objects
    if (nearest) {
      this.starSphere.setStar(nearest);
      this.currentStarPositionKm.copy(nearest.position).multiplyScalar(LY_TO_KM);
      this.starSphere.addToScene(this.scene);
      for (const planet of this.planets) {
        if (planet.star === nearest) {
          planet.addToScene(this.scene);
        }
      }
    }
  }

  update(delta: number, selectedObject: SelectableObject | null, velocity: Vector3) {
    // Camera drag from active planet's rotation (atmosphere + ground friction)
    //const altitude = Math.max(0, this.camera.position.distanceTo(activePlanet.position) - activePlanet.uPlanetRadius);

    // let dragFactor = 0;
    // if (altitude < 10) {
    //   dragFactor = 1.0;
    // } else if (altitude < activePlanet.uAtmosphereHeight) {
    //   const scaleHeight = Math.max(1, activePlanet.uAtmosphereHeight * 0.2);
    //   dragFactor = Math.exp(-altitude / scaleHeight);
    // }

    // const angleDeltaDegree = activePlanet.rotationSpeed * delta;
    // const cameraAngleDelta = angleToRad(angleDeltaDegree) * dragFactor;
    // if (cameraAngleDelta !== 0) {
    //   const pivot = activePlanet.position;
    //   const pos = sub(this.camera.position, pivot);
    //   pos.applyAxisAngle(activePlanet.uPlanetAxis, cameraAngleDelta);
    //   this.camera.position.copy(pivot).add(pos);
    //   this.camera.rotateOnWorldAxis(activePlanet.uPlanetAxis, cameraAngleDelta);
    // }

    if (selectedObject) {
      const distanceToCameraOnGround = selectedObject.radius + playerHeight;
      const nextPosition = add(this.camera.position, velocity);

      const vectorFromObject = sub(nextPosition, selectedObject.position);
      const distanceToObjectNextFrame = vectorFromObject.length();
      const normal = norm(vectorFromObject);

      this.isGrounded = distanceToObjectNextFrame <= distanceToCameraOnGround;
      if (this.isGrounded) {
        const targetVectorFromObject = mul(normal, distanceToCameraOnGround);
        const targetPosition = add(selectedObject.position, targetVectorFromObject);
        velocity = sub(targetPosition, this.camera.position);
      }
    }

    //this.camera.updateMatrixWorld();
    this.updateCurrentStar();
    this.starField.update(this.camera.position, this.camera.fov, window.innerHeight);

    for (const planet of this.planets) {
      planet.update(delta, this.camera);
    }

    // PlanetField re-reads planet.positionLy each frame so orbital motion shows in the LY-cloud
    this.planetField.update(this.camera.position);

    if (this.currentStar) {
      this.starSphere.update(this.camera, this.currentStarPositionKm);
    }

    return velocity;
  }

  updateHUD(delta: number, selectedObject: SelectableObject | null) {
    setDOMContent('hud-fps', `FPS: ${(1 / delta).toFixed(1)}`);
    setDOMContent('hud-altitude', `Altitude: ${getDistanceText(this.getDistanceToObject(selectedObject) - playerHeight)}`);
    setDOMContent('hud-grounded', `Is Grounded: ${this.isGrounded}`);
  }

  getDistanceToObject(object: SelectableObject | null): number {
    if (!object) {
      return 0;
    }

    // Stars store position in LY; planets store position in km. Camera is in km.
    const positionKm = object.type === 'star' ? mul(object.position, LY_TO_KM) : object.position;

    return this.camera.position.distanceTo(positionKm) - object.radius;
  }

  dispose() {
    for (const planet of this.planets) {
      planet.removeFromScene(this.scene);
      planet.dispose();
    }
    this.scene.remove(this.starField.object);
    this.starField.dispose();
    this.scene.remove(this.planetField.object);
    this.planetField.dispose();
    if (this.currentStar) {
      this.starSphere.removeFromScene(this.scene);
    }
    this.starSphere.dispose();
  }
}
