/* eslint-disable import/no-unused-modules */
import { Camera, Quaternion, Vector3 } from 'three';

import { keys, mouse } from '@/events';
import { SelectableObject } from '@/types';
import { add, mul, norm, sub } from '@/utils/vector';

export function horMovement(quaternion: Quaternion, moveDir: Vector3) {
  // Local Movement (WASD)
  const forward = new Vector3(0, 0, -1).applyQuaternion(quaternion);
  const right = new Vector3(1, 0, 0).applyQuaternion(quaternion);

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
}

export function vertMovement(moveDir: Vector3, up: Vector3) {
  if (keys['Space']) {
    moveDir.add(up);
  }
  if (keys['KeyC']) {
    moveDir.sub(up);
  }
}

export function changeVelocityIfJump(up: Vector3, isGrounded: boolean, velocity: Vector3, jumpForce: number) {
  if (keys['Space'] && isGrounded) {
    velocity.add(mul(up, jumpForce));

    return false;
  }

  return isGrounded;
}

export function applyFriction(delta: number, velocity: Vector3, up: Vector3) {
  const tangentVel = mul(up, -velocity.dot(up)).add(velocity);
  const radialVel = mul(up, velocity.dot(up));
  tangentVel.multiplyScalar(Math.pow(0.5, delta * 60));
  velocity.add(tangentVel).add(radialVel);
}

export function applyGravity(delta: number, gravity: number, velocity: Vector3, up: Vector3) {
  velocity.add(mul(up, -gravity * delta));
}

export function applyAcceleration(delta: number, moveDir: Vector3, velocity: Vector3, speed: number, instance?: boolean) {
  if (moveDir.lengthSq() > 0) {
    velocity.copy(norm(moveDir).multiplyScalar(speed * delta));
  } else {
    if (instance) {
      velocity.set(0, 0, 0);
    }
  }
}

export function rotateOnKeys(delta: number, camera: Camera) {
  // Camera roll
  if (keys['KeyQ']) {
    camera.rotateZ(1.5 * delta);
  }
  if (keys['KeyE']) {
    camera.rotateZ(-1.5 * delta);
  }
}

/**
 * Left Drag -> Look around freely
 * Use quaternion rotation to preserve roll (camera.rotation.z from Q/E)
 */
export function rotateOnLeftDrag(camera: Camera) {
  if (mouse.left && mouse.move) {
    camera.rotateY(-mouse.delta.x);
    camera.rotateX(-mouse.delta.y);

    mouse.clearDelta();
  }
}

function applyNewPosition(position: Vector3, pos: Vector3): Vector3 {
  return sub(pos, position);
}

export function changeVelocityOnRightDrag(camera: Camera, position: Vector3, velocity: Vector3, selectedObject: SelectableObject) {
  // Right Drag -> Orbit around focus point
  // Оси вращения берутся из экранного пространства камеры — нет дёрганий у полюсов
  if (mouse.right && mouse.move) {
    const angleH = -mouse.delta.x;
    const angleV = -mouse.delta.y;
    const orbitUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const orbitRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);

    const newOffset = sub(position, selectedObject.position).applyAxisAngle(orbitUp, angleH).applyAxisAngle(orbitRight, angleV);
    velocity.add(applyNewPosition(position, add(selectedObject.position, newOffset)));

    camera.up.copy(orbitUp);
    camera.lookAt(selectedObject.position);

    mouse.clearDelta();
  }
}

export function changeVelocityOnWheel(
  delta: number,
  position: Vector3,
  moveSpeed: number,
  velocity: Vector3,
  selectedObject: SelectableObject,
) {
  // Zooming to focus point (Mouse Wheel)
  if (mouse.wheel !== 0) {
    const zoomAmount = mouse.wheel > 0 ? 1 : -1;

    const vectorFromObject = sub(position, selectedObject.position);
    const distanceToObject = vectorFromObject.length();

    const newDist = distanceToObject + moveSpeed * delta * zoomAmount;

    const newOffset = norm(vectorFromObject).multiplyScalar(newDist);
    // Only apply if it doesn't push us into the planet (checked below)
    velocity.add(applyNewPosition(position, add(selectedObject.position, newOffset)));

    mouse.wheel = 0;
  }
}
