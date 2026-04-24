import { Camera, Vector3 } from 'three';

import { keys, setupKeyboardEvents } from '@/events';
import { AppState } from '@/store';
import { EditorHUDParams } from '@/types';

import { Controller } from './controller';
import { add, mul, norm, sub } from './utils';

export class EditorController extends Controller<AppState> {
  // config
  sensitivity = 0.003;

  // state
  mouseDelta = { x: 0, y: 0 };
  isRightDragging = false;
  isLeftDragging = false;
  wheelDelta = 0;
  previousMousePosition = { x: 0, y: 0 };
  isGrounded = true;

  constructor(camera: Camera, getState: () => AppState, planetCenter: Vector3) {
    super(camera, getState);
    camera.position.set(7_800_000, -5_500_000, 14_500_000);
    camera.lookAt(planetCenter);
  }

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

      if (e.button === 0) {
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

  update(delta: number, selectedObject: { position: Vector3; radius: number } | null) {
    if (!selectedObject) {
      return;
    }

    let vectorFromObject = sub(this.camera.position, selectedObject.position);
    let distanceToObject = vectorFromObject.length();
    let normal = norm(vectorFromObject);

    // Effective distance used for scaling
    // If focus is planet center, scale with altitude
    const effectiveDist = Math.max(1, distanceToObject - selectedObject.radius);

    // Logarithmic-like scale for speed.
    // In close range it's small, in far range it's large.
    const speedScale = Math.max(5.0, effectiveDist * 2.0);
    const moveSpeed = speedScale * delta;

    // Local Movement (WASD)
    const forward = new Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

    const moveDir = new Vector3();

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

    const up = this.camera.rotation;

    if (keys['Space']) {
      moveDir.add(up);
    }
    if (keys['KeyC']) {
      moveDir.sub(up);
    }

    // Camera roll
    if (keys['KeyQ']) {
      this.camera.rotateZ(1.5 * delta);
    }
    if (keys['KeyE']) {
      this.camera.rotateZ(-1.5 * delta);
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar(moveSpeed);
      this.camera.position.add(moveDir);
      vectorFromObject = sub(this.camera.position, selectedObject.position);
      distanceToObject = vectorFromObject.length();
      normal = norm(vectorFromObject);
    }

    // Left Drag -> Look around freely
    // Use quaternion rotation to preserve roll (camera.rotation.z from Q/E)
    if (this.isLeftDragging && (this.mouseDelta.x !== 0 || this.mouseDelta.y !== 0)) {
      this.camera.rotateY(-this.mouseDelta.x * this.sensitivity);
      this.camera.rotateX(-this.mouseDelta.y * this.sensitivity);

      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;

      return;
    }

    // Right Drag -> Orbit around focus point
    if (this.isRightDragging && (this.mouseDelta.x !== 0 || this.mouseDelta.y !== 0)) {
      const angleY = -this.mouseDelta.x * this.sensitivity;
      const angleX = -this.mouseDelta.y * this.sensitivity;

      // Rotate the existing offset vector by the per-frame delta (not absolute angles)
      const newVector = vectorFromObject.clone().applyAxisAngle(new Vector3(0, 1, 0), angleY);
      const camRight = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
      const candidate = newVector.clone().applyAxisAngle(camRight, angleX);

      // Clamp vertical: don't let camera go within ~5° of poles (world Y) to avoid lookAt flip
      const elevationFromPole = Math.acos(Math.min(1, Math.abs(candidate.clone().normalize().y)));
      if (elevationFromPole > 0.09) {
        newVector.copy(candidate);
      }

      this.camera.position.copy(selectedObject.position).add(newVector);
      this.camera.lookAt(selectedObject.position);

      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;

      return;
    }

    // Zooming to focus point (Mouse Wheel)
    if (this.wheelDelta !== 0) {
      const zoomAmount = (this.wheelDelta > 0 ? 1 : -1) * distanceToObject * 0.2;

      let newDist = distanceToObject + zoomAmount;
      if (newDist < 0.1) {
        newDist = 0.1;
      }

      const newVector = vectorFromObject.clone().normalize().multiplyScalar(newDist);
      // Only apply if it doesn't push us into the planet (checked below)
      this.camera.position.copy(selectedObject.position).add(newVector);
      vectorFromObject = sub(this.camera.position, selectedObject.position);
      distanceToObject = vectorFromObject.length();
      normal = norm(vectorFromObject);

      this.wheelDelta = 0;
    }

    const distanceToCameraOnGround = selectedObject.radius + 2;
    this.isGrounded = distanceToObject <= distanceToCameraOnGround;
    if (this.isGrounded) {
      this.camera.position.copy(add(selectedObject.position, mul(normal, distanceToCameraOnGround)));
    }
  }

  getHUDParams(selectedObject: { position: Vector3; radius: number } | null): EditorHUDParams {
    return {
      distanceToFocusPoint: this.getDistanceToObject(selectedObject),
      isGrounded: this.isGrounded,
      cameraPosition: this.camera.position,
    };
  }
}
