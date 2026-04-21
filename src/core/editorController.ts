import * as THREE from 'three';

import { keys, setupKeyboardEvents } from '@/events';

import { Controller } from './controller';
import { getDistanceText } from './utils';

export class EditorController extends Controller {
  // config
  sensitivity = 0.003;
  planetRadius = 6371000;
  focusPoint = new THREE.Vector3(0, -this.planetRadius, 0);

  // state
  mouseDelta = { x: 0, y: 0 };
  isRightDragging = false;
  isLeftDragging = false;
  wheelDelta = 0;

  previousMousePosition = { x: 0, y: 0 };

  switchMenu() {
    if (this.state.gameState === 'paused') {
      this.state.setGameState('playing');
    }
    if (this.state.gameState === 'playing') {
      this.state.setGameState('paused');
    }
  }

  setupEvents() {
    const cleanupKeyboardEvents = setupKeyboardEvents({
      keydown: (e) => {
        if (e.code === 'Escape') {
          this.switchMenu();
        }
      },
    });
    const onMouseDown = (e: MouseEvent) => {
      this.previousMousePosition.x = e.clientX;
      this.previousMousePosition.y = e.clientY;

      if (e.button === 0 && e.altKey) {
        this.isLeftDragging = true;
      }
      if (e.button === 2) {
        this.isRightDragging = true;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        this.isLeftDragging = false;
      }
      if (e.button === 2) {
        this.isRightDragging = false;
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (this.isRightDragging || this.isLeftDragging) {
        this.mouseDelta.x += e.clientX - this.previousMousePosition.x;
        this.mouseDelta.y += e.clientY - this.previousMousePosition.y;
      }
      this.previousMousePosition.x = e.clientX;
      this.previousMousePosition.y = e.clientY;
    };

    const onWheel = (e: WheelEvent) => {
      this.wheelDelta += e.deltaY;
    };

    // We shouldn't prevent default on ALL mouse down, it might block Leva UI!
    // We should only track. But context menu shouldn't trigger if dragging.
    const preventContext = (e: Event) => e.preventDefault();

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('contextmenu', preventContext);

    return () => {
      cleanupKeyboardEvents();
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('contextmenu', preventContext);
    };
  }

  update(camera: THREE.Camera, delta: number) {
    const dt = Math.min(delta, 0.1);

    const planetCenter = new THREE.Vector3(0, -this.planetRadius, 0);
    const isFocusPlanetCenter = this.focusPoint.distanceTo(planetCenter) < 1.0;

    // Effective distance used for scaling
    // If focus is planet center, scale with altitude
    const rawDistToFocus = camera.position.distanceTo(this.focusPoint);
    const effectiveDist = isFocusPlanetCenter ? Math.max(1, rawDistToFocus - this.planetRadius) : Math.max(1, rawDistToFocus);

    // Logarithmic-like scale for speed.
    // In close range it's small, in far range it's large.
    const speedScale = Math.max(5.0, effectiveDist * 2.0);
    const moveSpeed = speedScale * dt;

    // Local Movement (WASD)
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    const moveDir = new THREE.Vector3();
    if (keys['KeyW']) {
      moveDir.add(forward);
    }
    if (keys['KeyS']) {
      moveDir.sub(forward);
    }
    if (keys['KeyD']) {
      moveDir.add(right);
    }
    if (keys['KeyA']) {
      moveDir.sub(right);
    }
    if (keys['Space']) {
      moveDir.add(up);
    }
    if (keys['KeyC']) {
      moveDir.sub(up);
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      camera.position.addScaledVector(moveDir, moveSpeed);
    }

    // Left Drag -> Look around freely
    if (this.isLeftDragging && (this.mouseDelta.x !== 0 || this.mouseDelta.y !== 0)) {
      camera.rotation.y -= this.mouseDelta.x * this.sensitivity;
      camera.rotation.x -= this.mouseDelta.y * this.sensitivity;
      camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
    }

    // Right Drag -> Orbit around focus point
    if (this.isRightDragging && (this.mouseDelta.x !== 0 || this.mouseDelta.y !== 0)) {
      const offset = camera.position.clone().sub(this.focusPoint);
      const angleY = -this.mouseDelta.x * this.sensitivity;
      const angleX = -this.mouseDelta.y * this.sensitivity;

      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), angleY);

      const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      offset.applyAxisAngle(camRight, angleX);

      camera.position.copy(this.focusPoint).add(offset);
      camera.lookAt(this.focusPoint);
    }

    this.mouseDelta.x = 0;
    this.mouseDelta.y = 0;

    // Zooming to focus point (Mouse Wheel)
    if (this.wheelDelta !== 0) {
      const offset = camera.position.clone().sub(this.focusPoint);
      const dist = offset.length();

      const zoomAmount = (this.wheelDelta > 0 ? 1 : -1) * effectiveDist * 0.2;
      let newDist = dist + zoomAmount;
      if (newDist < 0.1) {
        newDist = 0.1;
      }

      offset.normalize().multiplyScalar(newDist);
      // Only apply if it doesn't push us into the planet (checked below)
      camera.position.copy(this.focusPoint).add(offset);
      this.wheelDelta = 0;
    }

    // Constraint: Can't go below planet surface
    const distToCenter = camera.position.distanceTo(planetCenter);
    const minRadius = this.planetRadius + 0.1; // 0.1m above ground

    if (distToCenter < minRadius) {
      const upDir = camera.position.clone().sub(planetCenter).normalize();
      camera.position.copy(planetCenter).add(upDir.multiplyScalar(minRadius));
    }
  }

  updateUI(camera: THREE.Camera) {
    // The camera's local Y position is exactly its altitude above the spherical planet surface
    // because the planet sphere is centered at (x, -R, z) relative to the camera.
    const altitude = camera.position.y;

    const altEl = document.getElementById('hud-altitude');

    if (altEl) {
      altEl.innerText = `Altitude: ${getDistanceText(altitude)}`;
    }
  }
}
