/* eslint-disable import/no-unused-modules */
/* eslint-disable camelcase */
import { Vector3 } from 'three';

function getDistanceForUnits(value: number, units: string): string | undefined {
  if (value < 10) {
    return `${value.toFixed(1)}${units}`;
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
  // meters >= 1

  let distance = getDistanceForUnits(meters, ' m');
  if (distance) {
    return distance;
  }
  // meters >= 1000

  const km = meters / 1000;
  distance = getDistanceForUnits(km, ' km');
  if (distance) {
    return distance;
  }
  // km >= 1000

  const k_km = km / 1000;
  distance = getDistanceForUnits(k_km, 'k km');
  if (distance) {
    return distance;
  }
  // k_km >= 1000

  const mln_km = k_km / 1000;
  distance = getDistanceForUnits(mln_km, ' mln km');
  if (mln_km < 150) {
    return distance!; // < 1000
  }
  // mln_km >= 150

  const au = mln_km / 150;
  distance = getDistanceForUnits(au, ' AU');
  if (distance) {
    return distance;
  }
  // au >= 1000

  distance = getDistanceForUnits(au / 1000, 'k AU');
  if (au < 63241) {
    return distance!;
  }
  // au >= 63241

  const ly = au / 63241;
  distance = getDistanceForUnits(ly, ' l.y.');
  if (distance) {
    return distance;
  }
  // ly >= 1000

  const k_ly = ly / 1000;
  distance = getDistanceForUnits(k_ly, 'k l.y.');
  if (distance) {
    return distance;
  }
  // k_ly >= 1000

  const mln_ly = k_ly / 1000;

  return getDistanceForUnits(mln_ly, ' mln l.y.') || 'too much';
}

export function getControlParams<T extends string>(
  object: Record<T, any>,
  params: Partial<Record<T, any[]>>,
  convert?: (v: any) => any,
): Record<string, any> {
  return mapObjectValues(params as Record<T, [number, number, number]>, ({ key: field, value }) => {
    return {
      value: object[field],
      min: value[0],
      max: value[1],
      step: value[2],
      onChange: (newValue: any) => {
        object[field] = convert ? convert(newValue) : newValue;
      },
      transient: true,
    };
  });
}

// eslint-disable-next-line import/no-unused-modules
export function angleToRad(angle: number): number {
  return (angle * Math.PI) / 180;
}

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

function mapObject<K1 extends keyof any, K2 extends keyof any, V1, V2>(
  obj: Record<K1, V1>,
  fn: (params: { key: K1; value: V1 }) => [K2, V2],
): Record<K2, V2> {
  return Object.fromEntries(Object.entries<V1>(obj).map(([key, value]) => fn({ key: key as K1, value }))) as Record<K2, V2>;
}

export function mapObjectValues<K extends keyof any, V1, V2>(obj: Record<K, V1>, fn: (params: { key: K; value: V1 }) => V2): Record<K, V2> {
  return mapObject(obj, (params) => [params.key, fn(params)]);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function mapObjectReverse<K extends string, V extends string>(obj: Record<K, V>): Record<V, K> {
  return mapObject(obj, ({ key, value }) => [value, key]);
}

// ----

export function setDOMContent(id: string, content: string | number) {
  const el = document.getElementById(id);
  if (el) {
    el.innerText = String(content);
  }
}

export function pow4(x: number) {
  const y = x * x;

  return y * y;
}
