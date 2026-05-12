import { PerspectiveCamera, Scene, Vector3 } from 'three';

import planetsData from '@/data/planets.json';
import { SelectableObject } from '@/types';

import { LY_TO_KM } from './const';
import { Planet } from './planet';
import { PlanetField } from './planetField';
import { StarField } from './starField';
import { getDistanceText, mul, setDOMContent } from './utils';

const playerHeight = 2 / 1000; // km

export class GameLogic {
  public planets: Planet[] = [];
  private isGrounded = true;
  velocity = new Vector3();
  starField: StarField;
  planetField: PlanetField;

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
  }

  update(delta: number) {
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

    // if (selectedObject) {
    //   const distanceToCameraOnGround = selectedObject.uPlanetRadius + playerHeight / 1000;
    //   const vectorFromObject = sub(this.camera.position, selectedObject.position);
    //   const distanceToObject = vectorFromObject.length();
    //   const normal = norm(vectorFromObject);

    //   this.isGrounded = distanceToObject <= distanceToCameraOnGround;
    //   if (this.isGrounded) {
    //     this.camera.position.copy(add(selectedObject.position, mul(normal, distanceToCameraOnGround)));
    //   }
    // }

    this.camera.updateMatrixWorld();
    this.starField.update(this.camera.position, this.camera.fov, window.innerHeight);

    for (const planet of this.planets) {
      planet.update(delta, this.camera);
    }

    // PlanetField re-reads planet.positionLy each frame so orbital motion shows in the LY-cloud
    this.planetField.update(this.camera.position);
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
  }
}
