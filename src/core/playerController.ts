import * as THREE from 'three';

import { keys, setupKeyboardEvents } from '@/events';

import { Controller } from './controller';
import { PointerLock } from './pointerLock';
import { getDistanceText } from './utils';

export class PlayerController extends Controller {
  // components
  pointerLock = new PointerLock();

  // state
  velocity = new THREE.Vector3();
  isGrounded = true;
  uiParams = { speed: 0 };

  // config
  speed = 5; // m/s
  gravity = 10; // m/s2
  jumpForce = 5;
  playerHeight = 2; // m

  switchMenu() {
    if (this.state.gameState === 'paused') {
      this.state.setGameState('playing');
    }
  }

  onMouseUnlock() {
    this.state.setGameState('paused');
  }

  onGameStateChange(renderer: THREE.WebGLRenderer): void {
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

  update(camera: THREE.Camera, delta: number) {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    right.y = 0;
    right.normalize();

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
    // jump
    if (keys['Space'] && this.isGrounded) {
      this.isGrounded = false;
      this.velocity.y += this.jumpForce;
    }
    if (keys['KeyC']) {
      this.velocity.y -= this.jumpForce;
    }

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      camera.position.x += moveDir.x * this.speed * delta;
      camera.position.z += moveDir.z * this.speed * delta;
    }

    // Apply gravity
    this.velocity.y -= this.gravity * delta;
    camera.position.y += this.velocity.y * delta;

    // stop falling
    // there should be a function calculating terrain height at given x,z coordinates, but for now we just stop at y=0
    const terrainHeight = 0;

    if (camera.position.y <= terrainHeight + this.playerHeight) {
      this.isGrounded = true;
      camera.position.y = terrainHeight + this.playerHeight;
      this.velocity.y = 0;
    } else {
      this.isGrounded = false;
    }

    // mouse looking
    this.pointerLock.update(camera);

    this.uiParams = { speed: moveDir.lengthSq() * this.speed };
  }

  updateUI(camera: THREE.Camera) {
    const currentSpeed = this.uiParams.speed;
    const verticalSpeed = this.velocity.y;
    const totalSpeed = Math.sqrt(currentSpeed * currentSpeed + verticalSpeed * verticalSpeed);

    // The camera's local Y position is exactly its altitude above the spherical planet surface
    // because the planet sphere is centered at (x, -R, z) relative to the camera.
    const altitude = camera.position.y - this.playerHeight;

    const altEl = document.getElementById('hud-altitude');
    const speedEl = document.getElementById('hud-speed');

    if (altEl) {
      altEl.innerText = `Altitude: ${getDistanceText(altitude)}`;
    }
    if (speedEl) {
      speedEl.innerText = `Speed: ${getDistanceText(totalSpeed)}/s`;
    }
  }
}
