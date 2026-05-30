/* eslint-disable import/no-unused-modules */
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

export function getDistanceText(km: number): string {
  const meters = km * 1000;
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

  distance = getDistanceForUnits(km, ' km');
  if (distance) {
    return distance;
  }
  // km >= 1000

  const kKm = km / 1000;
  distance = getDistanceForUnits(kKm, 'k km');
  if (distance) {
    return distance;
  }
  // k_km >= 1000

  const mlnKm = kKm / 1000;
  distance = getDistanceForUnits(mlnKm, ' mln km');
  if (mlnKm < 150) {
    return distance!; // < 1000
  }
  // mln_km >= 150

  const au = mlnKm / 150;
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

  const kLy = ly / 1000;
  distance = getDistanceForUnits(kLy, 'k l.y.');
  if (distance) {
    return distance;
  }
  // k_ly >= 1000

  const mlnLy = kLy / 1000;

  return getDistanceForUnits(mlnLy, ' mln l.y.') || 'too much';
}

export function getControlParams<T extends string>(
  object: Record<T, any>,
  params: Partial<Record<T, any[]>>,
  convert?: (field: T, v: any) => any,
): Record<string, any> {
  return mapObjectValues(params as Record<T, [number, number, number]>, ({ key: field, value }) => {
    return {
      value: object[field],
      min: value[0],
      max: value[1],
      step: value[2],
      onChange: (newValue: any) => {
        object[field] = convert ? convert(field, newValue) : newValue;
      },
      transient: true,
    };
  });
}

export function mapObject<K1 extends keyof any, K2 extends keyof any, V1, V2>(
  obj: Record<K1, V1>,
  fn: (params: { key: K1; value: V1 }) => [K2, V2],
): Record<K2, V2> {
  return Object.fromEntries(Object.entries<V1>(obj).map(([key, value]) => fn({ key: key as K1, value }))) as Record<K2, V2>;
}

export function mapObjectValues<K extends keyof any, V1, V2>(obj: Record<K, V1>, fn: (params: { key: K; value: V1 }) => V2): Record<K, V2> {
  return mapObject(obj, (params) => [params.key, fn(params)]);
}

export function mapObjectReverse<K extends string, V extends string>(obj: Record<K, V>): Record<V, K> {
  return mapObject(obj, ({ key, value }) => [value, key]);
}

export function setDOMContent(id: string, content: string | number) {
  const el = document.getElementById(id);
  if (el) {
    el.innerText = String(content);
  }
}

export function vectorToString({ x, y, z }: { x: number; y: number; z: number }, precision = 2): string {
  return `(${x.toFixed(precision)}, ${y.toFixed(precision)}, ${z.toFixed(precision)})`;
}

export function toArray<T>(obj: T): T extends Vector3 ? number[] : T[] {
  if (obj instanceof Vector3) {
    return [obj.x, obj.y, obj.z] as T extends Vector3 ? number[] : T[];
  }
  if (obj instanceof Array) {
    return obj as T extends Vector3 ? number[] : T[];
  }

  return [obj] as T extends Vector3 ? number[] : T[];
}
