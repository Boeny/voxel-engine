import { Vector3 } from 'three';

function getDistanceForUnits(value: number, units: string): string | undefined {
  if (value < 10) {
    return `${value.toFixed(1)} ${units}`;
  }
  if (value < 1000) {
    return `${value.toFixed(0)}${units}`;
  }

  return undefined;
}

export function getDistanceText(meters: number): string {
  const sm = meters * 100;

  if (meters < 1) {
    return `${sm.toFixed(1)} sm`;
  }

  return (
    getDistanceForUnits(meters, ' m') ||
    getDistanceForUnits(meters / 1000, ' km') ||
    getDistanceForUnits(meters / 1_000_000, 'k km') ||
    `${(meters / 1_000_000_000).toFixed(0)} mln km`
  );
}

export function getControlParams<T extends string, U extends string>(
  object: Record<U, number>,
  params: Record<T, [U, number, number, number]>,
) {
  const result: Record<string, {} | { value: number; min: number; max: number; transient: boolean; onChange: (value: number) => void }> =
    {};

  for (const rawField in params) {
    if (Object.hasOwn(params, rawField)) {
      const value = params[rawField];

      if (value instanceof Array) {
        const [field, min, max, step] = value;

        result[rawField] = {
          value: object[field],
          min,
          max,
          step: step || 0.1,
          onChange: (newValue) => {
            object[field] = newValue;
          },
          transient: true,
        };

        continue;
      }

      result[rawField] = value;
    }
  }

  return result;
}

export function angleToRad(angle: number): number {
  return (angle * Math.PI) / 180;
}

export function getSunDirection(rad: number): Vector3 {
  return new Vector3(Math.cos(rad), Math.sin(rad), 0).normalize();
}

// clean functions with vectors

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

export function arrayToVector(array: number[]): Vector3 {
  if (array.length !== 3) {
    throw new Error('the array is not a vector');
  }

  return new Vector3(array[0], array[1], array[2]);
}
