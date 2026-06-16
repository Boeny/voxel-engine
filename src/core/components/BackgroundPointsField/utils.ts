import { Camera, Vector3 } from 'three';

import { sub } from '@/utils/vector';

import { ATTRIBUTES, SELECTION_MIN_BRIGHTNESS } from './const';
import { Attribute, BackgroundPoint, BackgroundShaderParams } from './types';

export function getAttributes(
  count: number,
  getValue: (attr: (typeof ATTRIBUTES)[number], itemIndex: number, valueIndex: number, offset: number) => number,
): Attribute[] {
  const result: Attribute[] = ATTRIBUTES.map((attr) => ({
    ...attr,
    data: new Float32Array(count * attr.length),
  }));

  for (let itemIndex = 0; itemIndex < count; itemIndex += 1) {
    let offset = 0;

    ATTRIBUTES.forEach((attr, attrIndex) => {
      for (let valueIndex = 0; valueIndex < attr.length; valueIndex += 1) {
        result[attrIndex].data[itemIndex * attr.length + valueIndex] = getValue(attr, itemIndex, valueIndex, offset);
      }

      offset += attr.length;
    });
  }

  return result;
}

export function setSelectionRing(camera: Camera, selectedObject: BackgroundPoint | null, backgroundPosition: Vector3) {
  const el = document.getElementById('selection-ring');
  if (!el) {
    return;
  }

  if (!selectedObject) {
    el.style.display = 'none';

    return;
  }

  const dir = sub(selectedObject.position, backgroundPosition).normalize();
  const ringCamDir = new Vector3();
  camera.getWorldDirection(ringCamDir);

  if (dir.dot(ringCamDir) > 0) {
    dir.multiplyScalar(1000).project(camera);
    el.style.display = 'block';
    el.style.left = `${((dir.x + 1) / 2) * window.innerWidth}px`;
    el.style.top = `${((-dir.y + 1) / 2) * window.innerHeight}px`;
  } else {
    el.style.display = 'none';
  }
}

export function getPosition(posData: Float32Array, index: number) {
  return new Vector3(posData[index * 3], posData[index * 3 + 1], posData[index * 3 + 2]);
}

export function applyCustomRaycast(
  posData: Float32Array,
  luminosityData: Float32Array,
  radiusData: Float32Array,
  rayDir: Vector3,
  backgroundPosition: Vector3,
  params: BackgroundShaderParams,
) {
  const count = posData.length / 3;

  const angularThreshold = params.uPixelAngularSize * params.uMinRadius * 2;
  const dotThreshold = Math.cos(angularThreshold);

  let bestDot = dotThreshold;
  let bestIndex = -1;

  for (let i = 0; i < count; i++) {
    const dir = sub(getPosition(posData, i), backgroundPosition);
    const distance = dir.length();
    dir.normalize();

    const localDistance = distance * params.uBackgroundToLocalScale;
    const pixelRadius = (Math.atan(radiusData[i] / localDistance) / params.uPixelAngularSize) * params.uRadiusMultiplier;
    const pointSize = Math.max(pixelRadius, params.uMinRadius);
    const fillRatio = Math.min(1, (4 * pixelRadius * pixelRadius) / (pointSize * pointSize));
    const brightness = Math.max(luminosityData[i] * fillRatio * params.uBrightnessMultiplier, params.uMinBrightness);

    if (brightness < SELECTION_MIN_BRIGHTNESS) {
      continue;
    }

    const dot = dir.dot(rayDir);
    if (dot > bestDot) {
      bestDot = dot;
      bestIndex = i;
    }
  }

  return bestIndex;
}
