import * as THREE from 'three';

import { keys } from '@/events';

const SPEED = 5; // m/s
const GRAVITY = 10; // m/s2
const JUMP_FORCE = 10;
const PLAYER_HEIGHT = 2; // m

export class PlayerController {
  velocity = new THREE.Vector3();
  isGrounded = true;

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

    const speed = moveDir.length();

    if (speed > 0) {
      moveDir.normalize();
      camera.position.x += moveDir.x * SPEED * delta;
      camera.position.z += moveDir.z * SPEED * delta;
    }

    // Apply gravity
    this.velocity.y -= GRAVITY * delta;
    camera.position.y += this.velocity.y * delta;

    // stop falling
    // there should be a function calculating terrain height at given x,z coordinates, but for now we just stop at y=0
    const terrainHeight = 0;

    if (camera.position.y <= terrainHeight + PLAYER_HEIGHT) {
      this.isGrounded = true;
      camera.position.y = terrainHeight + PLAYER_HEIGHT;
      this.velocity.y = 0;
    } else {
      this.isGrounded = false;
    }

    // jump
    if (keys['Space'] && this.isGrounded) {
      this.isGrounded = false;
      this.velocity.y += JUMP_FORCE;
    }
  }
}
