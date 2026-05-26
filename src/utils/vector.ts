/* eslint-disable import/no-unused-modules */
import { Camera, Vector2, Vector3 } from 'three';

import { LY_TO_KM } from '@/const';
import { SelectableObject } from '@/types';

// clean functions with vectors
export function add<T extends Vector3 | Vector2>(a: T, b: T): T {
  return a.clone().add(b as any) as T;
}

export function sub<T extends Vector3 | Vector2>(a: T, b: T): T {
  return a.clone().sub(b as any) as T;
}

export function mul<T extends Vector3 | Vector2>(a: T, s: number): T {
  return a.clone().multiplyScalar(s) as T;
}

export function norm<T extends Vector3 | Vector2>(a: T): T {
  return a.clone().normalize() as T;
}

// ---

export function rotateXY(v: Vector3, angleRad: number) {
  const x = v.x * Math.cos(angleRad) - v.y * Math.sin(angleRad);
  const y = v.x * Math.sin(angleRad) + v.y * Math.cos(angleRad);

  return new Vector3(x, y, v.z);
}

export function clampVectorMax(v: Vector3, max: number): Vector3 {
  const length = v.length();

  if (length <= max) {
    return v;
  }

  return norm(v).multiplyScalar(max);
}

export function getDistanceToObject(camera: Camera, selectedObject: SelectableObject | null): number {
  if (!selectedObject) {
    return 0;
  }
  // Stars store position in LY; planets store position in km. Camera is in km.
  const positionKm = selectedObject.type === 'star' ? mul(selectedObject.position, LY_TO_KM) : selectedObject.position;

  return camera.position.distanceTo(positionKm) - selectedObject.radius;
}
