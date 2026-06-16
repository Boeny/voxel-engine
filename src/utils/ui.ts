import { mapObjectValues } from '.';

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

export function setDOMContent(id: string, content: string | number) {
  const el = document.getElementById(id);
  if (el) {
    el.innerText = String(content);
  }
}
