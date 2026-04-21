export function getDistanceText(meters: number): string {
  if (meters < 1) {
    return `${(meters * 100).toFixed(1)} sm`;
  }
  if (meters < 100) {
    return `${meters.toFixed(2)} m`;
  }
  if (meters < 1000) {
    return `${meters.toFixed(1)} m`;
  }
  if (meters < 10000) {
    return `${meters.toFixed(0)} m`;
  }

  const km = meters / 1000;

  if (km < 100) {
    return `${km.toFixed(1)} km`;
  }
  if (km < 100000) {
    return `${km.toFixed(0)} km`;
  }
  if (km < 100000) {
    return `${(km / 1000).toFixed(0)}'000 km`;
  }
  if (km < 1000000) {
    return `${(km / 1000).toFixed(0)}k km`;
  }

  return `${(km / 1000).toFixed(0)}k km`;
}

export function getControlParams(
  defaulValues: Record<string, number>,
  params: Record<string, number[] | {}>,
  update: (params: Record<string, number>) => void,
) {
  const result: Record<string, {} | { value: number; min: number; max: number; transient: boolean; onChange: (value: number) => void }> =
    {};

  for (const field in params) {
    if (Object.hasOwn(params, field)) {
      const value = params[field];

      if (value instanceof Array) {
        const [min, max, step] = value;

        result[field] = {
          value: defaulValues[field],
          min,
          max,
          step: step || 0.1,
          onChange: (newValue) => update({ [field]: newValue }),
          transient: true,
        };

        continue;
      }

      result[field] = value;
    }
  }

  return result;
}
