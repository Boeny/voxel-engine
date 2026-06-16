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

// getAttributes(data.length, (attr, itemIndex, valueIndex) => toArray(data[itemIndex][attr.name])[valueIndex]));

export const BackgroundPointsField = () => {
  //const { raycaster, camera, scene } = useThree();
  const { backgroundShaderParams: shaderParams } = getState();
  const [attributes, setAttributes] = useState<Attribute[] | null>(null);
  const metaRef = useRef<Record<number, { name: string; spectral_type: string }>>({});
  const starDirScratch = useRef(new Vector3());

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
    function (this: Points, raycaster: Raycaster, intersects: Intersection[]) {
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

      const dir = starDirScratch.current;

      for (let i = 0; i < count; i++) {
        dir.copy(sub(getPosition(posData, i), backgroundPosition));
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
        intersects.push({ distance: 1e30, point: new Vector3(), index: bestIndex, object: this, face: null });
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
    const { backgroundPosition, backgroundVelocity } = getState();
    shaderParams.uCameraBackgroundPosition.copy(backgroundPosition);

    const fov = (state.camera as PerspectiveCamera).fov;
    const fovRadians = (fov * Math.PI) / 180;
    shaderParams.uPixelAngularSize = (2 * Math.tan(fovRadians / 2)) / window.innerHeight;

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
        shaderParams.uHasSelected = 0;
        getState().select(null);
      }}
      onClick={(event, _point) => {
        if (event.index === undefined) {
          getState().select(null);

          return;
        }

        const meta = metaRef.current[event.index as keyof typeof metaRef.current];

        const posData = getAttributeData(ATTR_INDEX.position);
        const radData = getAttributeData(ATTR_INDEX.radius);
        if (!posData || !radData) {
          return;
        }
        const position = getPosition(posData, event.index);

        shaderParams.uSelectedPosition.copy(position);
        shaderParams.uHasSelected = 1;

        getState().select(
          event.index === undefined
            ? null
            : {
                name: meta?.name || 'Unknown',
                position,
                radius: radData[event.index],
                type: 'background',
              },
        );
      }}
    />
  );
};
