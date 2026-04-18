import { useRef } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { keys } from '@/events';

const SPEED = 5; // m/s
const GRAVITY = 10; // m/s2
const JUMP_FORCE = 10;
const PLAYER_HEIGHT = 2;

export const PlayerController = () => {
  const { camera } = useThree();
  const velocity = useRef(new THREE.Vector3());
  const isGrounded = useRef(true);

  useFrame((_, delta) => {
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
    velocity.current.y -= GRAVITY * delta;
    camera.position.y += velocity.current.y * delta;

    // stop falling
    // there should be a function calculating terrain height at given x,z coordinates, but for now we just stop at y=0
    const terrainHeight = 0;

    if (camera.position.y <= terrainHeight + PLAYER_HEIGHT) {
      isGrounded.current = true;
      camera.position.y = terrainHeight + PLAYER_HEIGHT;
      velocity.current.y = 0;
    } else {
      isGrounded.current = false;
    }

    // jump
    if (keys['Space'] && isGrounded.current) {
      isGrounded.current = false;
      velocity.current.y += JUMP_FORCE;
    }
  });

  return null;
};
