import { Vector3, WebGLRenderer } from 'three';

import { keys, setupKeyboardEvents } from '@/events';

import { SelectableObject } from '../types';

import { Controller } from './controller';
import { PointerLock } from './pointerLock';
import { getDistanceText, mul, norm, setDOMContent, sub } from './utils';

export class PlayerController extends Controller {
  // components
  pointerLock = new PointerLock();

  // state
  velocity = new Vector3();
  private pitch = 0;
  private lastForward = new Vector3(0, 0, 1); // forward on tangent plane, persists between frames

  // config
  speed = 5; // m/s
  gravity = 10; // m/s2
  jumpForce = 0.005;

  onGameStateChange(gameState: 'playing' | 'paused', renderer: WebGLRenderer): void {
    if (gameState === 'playing') {
      this.pointerLock.requestPointerLock(renderer.domElement);
    }
  }

  setupEvents(getGameState: () => 'playing' | 'paused', setGameState: (gameState: 'playing' | 'paused') => void) {
    const cleanupKeyboardEvents = setupKeyboardEvents({
      keydown: (e) => {
        if (e.code === 'Escape' && getGameState() === 'paused') {
          setGameState('playing');
        }
      },
    });
    const cleanupMouseEvents = this.pointerLock.setupEvents({
      onPointerLockChange: (isLocked) => {
        if (!isLocked) {
          setGameState('paused');
        }
      },
    });

    return () => {
      cleanupKeyboardEvents();
      cleanupMouseEvents();
    };
  }

  getTerrainHeight() {
    return 0;
  }

  update(delta: number, selectedObject: SelectableObject | null) {
    if (!selectedObject) {
      this.camera.position.add(this.velocity);

      return;
    }

    // Local surface frame
    const up = norm(sub(this.camera.position, selectedObject.position));

    // ── Mouse look in local frame ───────────────────────────────
    const yawDelta = -this.pointerLock.mouseDelta.x * this.pointerLock.sensitivity;
    const pitchDelta = -this.pointerLock.mouseDelta.y * this.pointerLock.sensitivity;
    this.pointerLock.mouseDelta.x = 0;
    this.pointerLock.mouseDelta.y = 0;

    // Project stored forward onto current tangent plane (handles planet rotation)
    let forward = this.lastForward.clone().addScaledVector(up, -this.lastForward.dot(up));
    if (forward.lengthSq() < 0.001) {
      const ref = Math.abs(up.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 0, 1);
      forward = ref.clone().addScaledVector(up, -ref.dot(up));
    }
    forward.normalize();

    // Apply yaw (rotate forward around local up)
    forward.applyAxisAngle(up, yawDelta);
    this.lastForward.copy(forward);

    // Apply pitch with clamping
    const limit = Math.PI / 2 - 0.01;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch + pitchDelta));

    // Build look direction from stored forward + pitch
    const newLookDir = forward.clone().multiplyScalar(Math.cos(this.pitch)).addScaledVector(up, Math.sin(this.pitch));

    // Set camera orientation
    this.camera.up.copy(up);
    this.camera.lookAt(this.camera.position.clone().add(newLookDir));

    // ── Movement in tangent plane ───────────────────────────────
    const right = new Vector3().crossVectors(forward, up).normalize();

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

    // Friction
    const tangentVel = this.velocity.clone().addScaledVector(up, -this.velocity.dot(up));
    const radialVel = up.clone().multiplyScalar(this.velocity.dot(up));
    tangentVel.multiplyScalar(Math.pow(0.5, delta * 60));
    this.velocity.copy(tangentVel).add(radialVel);

    // Acceleration
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar((this.speed / 1000) * delta);
      this.velocity.add(moveDir);
    }

    // Gravity
    const gravityVector = mul(up, -(this.gravity / 1000) * delta);
    this.velocity.add(gravityVector);

    // Jump
    // if (keys['Space'] && this.isGrounded) {
    //   this.isGrounded = false;
    //   this.velocity.add(mul(newNormal, this.jumpForce));
    // }
  }

  updateHUD(_delta: number, _selectedObject: SelectableObject | null) {
    setDOMContent('hud-speed', `Speed: ${getDistanceText(this.velocity.length() * 1000)}/s`);
  }
}
