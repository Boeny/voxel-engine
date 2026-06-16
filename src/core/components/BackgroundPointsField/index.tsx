import { useCallback, useEffect, useRef, useState } from 'react';

import { useFrame } from '@react-three/fiber';
import { Intersection, PerspectiveCamera, Points, Raycaster, Vector3 } from 'three';

import { getState } from '@/store';
import { sub } from '@/utils/vector';

import { PointsCloud } from '../PointsCloud';

import frag from './shaders/frag.glsl?raw';
import vert from './shaders/vert.glsl?raw';

const STAR_BIN_PATH = '/assets/stars.dat';
const STAR_JSON_PATH = '/assets/stars.json';

const BINARY_ITEM_LENGTH = 8;
const SELECTION_MIN_BRIGHTNESS = 0.1;

const ATTRIBUTES = [
  { name: 'position', length: 3 },
  { name: 'color', length: 3 },
  { name: 'luminosity', length: 1 },
  { name: 'radius', length: 1 },
] as const;
const ATTR_INDEX = {
  position: 0,
  color: 1,
  luminosity: 2,
  radius: 3,
} as const;

async function loadBinaryFile(url: string): Promise<Float32Array> {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const floatArray = new Float32Array(buffer);

  return floatArray;
}

async function loadJSON(url: string): Promise<any> {
  const response = await fetch(url);

  return response.json();
}

type Attribute = {
  name: string;
  length: number;
  data: Float32Array<ArrayBufferLike>;
};

function getAttributes(
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

function getPosition(posData: Float32Array, index: number) {
  return new Vector3(posData[index * 3], posData[index * 3 + 1], posData[index * 3 + 2]);
}

export const BackgroundPointsField = () => {
  const { backgroundShaderParams: shaderParams } = getState();
  const [attributes, setAttributes] = useState<Attribute[] | null>(null);
  const metaRef = useRef<Record<number, { name: string; spectral_type: string }>>({});

  const getAttributeData = useCallback(
    (index: number) => {
      if (!attributes) {
        return null;
      }

      return attributes[index].data;
    },
    [attributes],
  );

  const customRaycast = useCallback(
    function (object: Points, raycaster: Raycaster, intersects: Intersection[]) {
      //object.raycaster.params.Points.threshold = 0.2;
      const posData = getAttributeData(ATTR_INDEX.position);
      const luminosityData = getAttributeData(ATTR_INDEX.luminosity);
      const radiusData = getAttributeData(ATTR_INDEX.radius);
      if (!posData || !luminosityData || !radiusData) {
        return;
      }

      const count = posData.length / 3;
      const { backgroundPosition, backgroundShaderParams: params } = getState();
      const ray = raycaster.ray;

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

        const dot = dir.dot(ray.direction);
        if (dot > bestDot) {
          bestDot = dot;
          bestIndex = i;
        }
      }

      if (bestIndex >= 0) {
        intersects.push({ distance: 1e30, point: new Vector3(), index: bestIndex, object, face: null });
      }
    },
    [getAttributeData],
  );

  useEffect(() => {
    loadBinaryFile(STAR_BIN_PATH).then((floatArray) => {
      setAttributes(
        getAttributes(
          floatArray.length / BINARY_ITEM_LENGTH,
          (_attr, itemIndex, valueIndex, offset) => floatArray[itemIndex * BINARY_ITEM_LENGTH + valueIndex + offset],
        ),
      );
    });
    loadJSON(STAR_JSON_PATH).then((meta) => {
      metaRef.current = meta;
    });
  }, []);

  useFrame((state) => {
    const { backgroundPosition, backgroundVelocity, selectedObject, selectionRingEl } = getState();
    shaderParams.uCameraBackgroundPosition.copy(backgroundPosition);

    const fov = (state.camera as PerspectiveCamera).fov;
    const fovRadians = (fov * Math.PI) / 180;
    shaderParams.uPixelAngularSize = (2 * Math.tan(fovRadians / 2)) / window.innerHeight;

    if (selectionRingEl && selectedObject?.type === 'background') {
      const dir = sub(selectedObject.position, backgroundPosition).normalize();
      const ringCamDir = new Vector3();
      state.camera.getWorldDirection(ringCamDir);

      if (dir.dot(ringCamDir) > 0) {
        dir.multiplyScalar(1000).project(state.camera);
        selectionRingEl.style.display = 'block';
        selectionRingEl.style.left = `${((dir.x + 1) / 2) * window.innerWidth}px`;
        selectionRingEl.style.top = `${((-dir.y + 1) / 2) * window.innerHeight}px`;
      } else {
        selectionRingEl.style.display = 'none';
      }
    }

    backgroundPosition.add(backgroundVelocity);
  });

  if (!attributes) {
    return null;
  }

  return (
    <PointsCloud
      vertexShader={vert}
      fragmentShader={frag}
      uniforms={shaderParams}
      attributes={attributes}
      raycast={customRaycast}
      onPointerMissed={() => {
        getState().select(null);
      }}
      onClick={(event, _point) => {
        const { select } = getState();

        if (event.index === undefined) {
          select(null);

          return;
        }

        const meta = metaRef.current[event.index as keyof typeof metaRef.current];

        const posData = getAttributeData(ATTR_INDEX.position);
        const radData = getAttributeData(ATTR_INDEX.radius);
        if (!posData || !radData) {
          return;
        }
        const position = getPosition(posData, event.index);

        select({
          name: meta?.name || 'Unknown',
          position,
          radius: radData[event.index],
          type: 'background',
        });
      }}
    />
  );
};
