import { Vector3 } from 'three';

// clean functions with vectors

// eslint-disable-next-line import/no-unused-modules
export function add(a: Vector3, b: Vector3): Vector3 {
  return a.clone().add(b);
}

export function sub(a: Vector3, b: Vector3): Vector3 {
  return a.clone().sub(b);
}

export function mul(a: Vector3, s: number): Vector3 {
  return a.clone().multiplyScalar(s);
}

export function norm(a: Vector3): Vector3 {
  return a.clone().normalize();
}

// ----

export function arrayToVector(array: number[]): Vector3 {
  if (array.length !== 3) {
    throw new Error('the array is not a vector');
  }

  return new Vector3(array[0], array[1], array[2]);
}

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
