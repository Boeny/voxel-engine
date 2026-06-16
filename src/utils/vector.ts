/* eslint-disable import/no-unused-modules */
import { Vector2, Vector3 } from 'three';

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

export function getDistanceToObject(
  position: Vector3,
  backgroundPosition: Vector3,
  selectedObject: SelectableObject,
  backgroundToLocalScale: number,
): number {
  if (selectedObject.type === 'background') {
    return backgroundPosition.distanceTo(selectedObject.position) * backgroundToLocalScale;
  }

  const localObjectPosition = mul(selectedObject.position, backgroundToLocalScale);

  return position.distanceTo(localObjectPosition) - selectedObject.radius;
}

export function vectorToString({ x, y, z }: { x: number; y: number; z: number }, precision = 2): string {
  return `(${x.toFixed(precision)}, ${y.toFixed(precision)}, ${z.toFixed(precision)})`;
}
