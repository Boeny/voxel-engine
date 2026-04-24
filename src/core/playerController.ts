import { Camera, Vector3, WebGLRenderer } from 'three';

import { keys, setupKeyboardEvents } from '@/events';
import { AppState } from '@/store';
import { PlayerHUDParams } from '@/types';

import { Controller } from './controller';
import { PointerLock } from './pointerLock';
import { add, mul, norm, sub } from './utils';

export class PlayerController extends Controller<AppState> {
  // components
  pointerLock = new PointerLock();

  // state
  velocity = new Vector3();
  isGrounded = true;
  uiParams = { speed: 0 };

  // config
  speed = 5; // m/s
  gravity = 1; // m/s2
  jumpForce = 0.25;
  playerHeight = 2; // m

  constructor(camera: Camera, getState: () => AppState) {
    super(camera, getState);
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0); // Camera looks forward by default
  }

  switchMenu() {
    if (this.state.gameState === 'paused') {
      this.state.setGameState('playing');
    }
  }

  onMouseUnlock() {
    this.state.setGameState('paused');
  }

  onGameStateChange(renderer: WebGLRenderer): void {
    if (this.state.gameState === 'playing') {
      this.pointerLock.requestPointerLock(renderer.domElement);
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
    const cleanupMouseEvents = this.pointerLock.setupEvents({
      onPointerLockChange: (isLocked) => {
        if (!isLocked) {
          // in the menu mode
          this.onMouseUnlock();
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

  update(delta: number, selectedObject: { position: Vector3; radius: number } | null) {
    const forward = new Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    right.y = 0;
    right.normalize();

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

    // Friction (constantForce) — always terminal velocity
    this.velocity.x *= Math.pow(0.5, delta * 60);
    this.velocity.z *= Math.pow(0.5, delta * 60);

    // Acceleration (constantForce)
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize().multiplyScalar(this.speed * delta);
      this.velocity.x += moveDir.x;
      this.velocity.z += moveDir.z;
    }

    if (selectedObject) {
      let vectorFromObject = sub(this.camera.position, selectedObject.position);
      let normal = norm(vectorFromObject);

      const gravityVector = mul(normal, -this.gravity * delta);
      this.velocity.add(gravityVector);

      this.camera.position.add(this.velocity);
      vectorFromObject = sub(this.camera.position, selectedObject.position);
      normal = norm(vectorFromObject);

      const distanceToCameraOnGround = selectedObject.radius + this.playerHeight;
      this.isGrounded = vectorFromObject.length() <= distanceToCameraOnGround;
      if (this.isGrounded) {
        this.camera.position.copy(add(selectedObject.position, mul(normal, distanceToCameraOnGround)));
        const verticalVelocity = mul(normal, this.velocity.dot(normal));
        this.velocity.sub(verticalVelocity); // horizontal velocity
      }

      // Jump (instantForce) — only if grounded, without delta
      if (keys['Space'] && this.isGrounded) {
        this.isGrounded = false;
        this.velocity.add(mul(normal, this.jumpForce));
      }
    } else {
      this.isGrounded = false;
      this.camera.position.add(this.velocity);
    }

    // mouse looking
    this.pointerLock.update(this.camera);
  }

  getHUDParams(selectedObject: { position: Vector3; radius: number } | null): PlayerHUDParams {
    return {
      speed: this.velocity.length(),
      distanceToFocusPoint: this.getDistanceToObject(selectedObject) - this.playerHeight,
      isGrounded: this.isGrounded,
    };
  }
}
