import { Vector3 } from 'three';

import { keys, setupKeyboardEvents } from '@/events';

import { SelectableObject } from '../types';

import { Controller } from './controller';
import { add, getDistanceText, norm, setDOMContent, sub } from './utils';

export class EditorController extends Controller {
  // config
  sensitivity = 0.005;
  maxSpeed = 1e15;

  // state
  mouseDelta = { x: 0, y: 0 };
  isRightDragging = false;
  isLeftDragging = false;
  wheelDelta = 0;
  previousMousePosition = { x: 0, y: 0 };

  setupEvents(getGameState: () => 'playing' | 'paused', setGameState: (getGameState: 'playing' | 'paused') => void) {
    const cleanupKeyboardEvents = setupKeyboardEvents({
      keydown: (e) => {
        if (e.code === 'Escape') {
          if (getGameState() === 'paused') {
            setGameState('playing');
          }
          if (getGameState() === 'playing') {
            setGameState('paused');
          }
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

  update(delta: number, selectedObject: SelectableObject | null) {
    if (!selectedObject) {
      return;
    }

    let vectorFromObject = sub(this.camera.position, selectedObject.position);
    let distanceToObject = vectorFromObject.length();

    // Effective distance used for scaling
    // If focus is planet center, scale with altitude
    const effectiveDist = Math.max(1, distanceToObject - selectedObject.radius);

    // Logarithmic-like scale for speed.
    // In close range it's small, in far range it's large.
    let speedScale = Math.max(5.0, effectiveDist * 2.0);

    if (this.maxSpeed) {
      speedScale = Math.min(this.maxSpeed, speedScale);
    }

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

    const camUp = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);

    if (keys['Space']) {
      moveDir.add(camUp);
    }
    if (keys['KeyC']) {
      moveDir.sub(camUp);
    }

    // Camera roll
    if (keys['KeyQ']) {
      this.camera.rotateZ(1.5 * delta);
    }
    if (keys['KeyE']) {
      this.camera.rotateZ(-1.5 * delta);
    }

    if (moveDir.lengthSq() > 0) {
      this.setVelocity(norm(moveDir).multiplyScalar(moveSpeed));
      vectorFromObject = sub(this.camera.position, selectedObject.position);
      distanceToObject = vectorFromObject.length();
    } else {
      this.setVelocity();
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
    // Оси вращения берутся из экранного пространства камеры — нет дёрганий у полюсов
    if (this.isRightDragging && (this.mouseDelta.x !== 0 || this.mouseDelta.y !== 0)) {
      const angleH = -this.mouseDelta.x * this.sensitivity;
      const angleV = -this.mouseDelta.y * this.sensitivity;

      const orbitUp = new Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
      const orbitRight = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);

      const newOffset = vectorFromObject.clone().applyAxisAngle(orbitUp, angleH).applyAxisAngle(orbitRight, angleV);
      this.setNewPosition(add(selectedObject.position, newOffset));

      this.camera.up.copy(orbitUp);
      this.camera.lookAt(selectedObject.position);

      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;

      return;
    }

    // Zooming to focus point (Mouse Wheel)
    if (this.wheelDelta !== 0) {
      const zoomAmount = this.wheelDelta > 0 ? 1 : -1;

      let newDist = distanceToObject + moveSpeed * zoomAmount;
      if (newDist < 0.1) {
        newDist = 0.1;
      }

      const newOffset = norm(vectorFromObject).multiplyScalar(newDist);
      // Only apply if it doesn't push us into the planet (checked below)
      this.setNewPosition(add(selectedObject.position, newOffset));

      this.wheelDelta = 0;

      return;
    }
  }

  setVelocity(v?: Vector3) {
    this.velocity.copy(v || new Vector3());
  }
  setNewPosition(pos: Vector3) {
    this.setVelocity(sub(pos, this.camera.position));
  }

  updateHUD(_delta: number, _selectedObject: SelectableObject | null) {
    const { x, y, z } = this.camera.position;
    setDOMContent('hud-position', `Position: (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
    setDOMContent('hud-speed', `Speed: ${getDistanceText(this.velocity.length() * 1000)}/s`);
  }
}
