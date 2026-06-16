import { Vector3 } from 'three';

function mapObject<K1 extends keyof any, K2 extends keyof any, V1, V2>(
  obj: Record<K1, V1>,
  fn: (params: { key: K1; value: V1 }) => [K2, V2],
): Record<K2, V2> {
  return Object.fromEntries(Object.entries<V1>(obj).map(([key, value]) => fn({ key: key as K1, value }))) as Record<K2, V2>;
}

export function mapObjectValues<K extends keyof any, V1, V2>(obj: Record<K, V1>, fn: (params: { key: K; value: V1 }) => V2): Record<K, V2> {
  return mapObject(obj, (params) => [params.key, fn(params)]);
}

// eslint-disable-next-line import/no-unused-modules
export function mapObjectReverse<K extends string, V extends string>(obj: Record<K, V>): Record<V, K> {
  return mapObject(obj, ({ key, value }) => [value, key]);
}

// eslint-disable-next-line import/no-unused-modules
export function toArray<T>(obj: T): T extends Vector3 ? number[] : T[] {
  if (obj instanceof Vector3) {
    return [obj.x, obj.y, obj.z] as T extends Vector3 ? number[] : T[];
  }
  if (obj instanceof Array) {
    return obj as T extends Vector3 ? number[] : T[];
  }

  return [obj] as T extends Vector3 ? number[] : T[];
}

export async function loadBinaryFile(url: string): Promise<Float32Array> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const floatArray = new Float32Array(buffer);

  return floatArray;
}

export async function loadJSON(url: string): Promise<any> {
  const response = await fetch(url);

  return response.json();
}
