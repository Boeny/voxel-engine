import { useCallback, useEffect, useRef, useState } from 'react';

import { useFrame } from '@react-three/fiber';
import { Intersection, PerspectiveCamera, Points, Raycaster, Vector3 } from 'three';

import { getState } from '@/store';
import { loadBinaryFile, loadJSON } from '@/utils';

import { PointsCloud } from '../PointsCloud';

import { ATTR_INDEX, STAR_BIN_PATH, BINARY_ITEM_LENGTH, STAR_JSON_PATH } from './const';
import frag from './shaders/frag.glsl?raw';
import vert from './shaders/vert.glsl?raw';
import { Attribute } from './types';
import { applyCustomRaycast, getAttributes, getPosition, setSelectionRing } from './utils';

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
    function (this: Points, raycaster: Raycaster, intersects: Intersection[]) {
      const posData = getAttributeData(ATTR_INDEX.position);
      const luminosityData = getAttributeData(ATTR_INDEX.luminosity);
      const radiusData = getAttributeData(ATTR_INDEX.radius);

      if (!posData || !luminosityData || !radiusData) {
        return;
      }

      const { backgroundPosition, backgroundShaderParams: params } = getState();

      const index = applyCustomRaycast(posData, luminosityData, radiusData, raycaster.ray.direction, backgroundPosition, params);

      if (index >= 0) {
        intersects.push({ distance: 1e30, point: new Vector3(), index, object: this, face: null });
      }
    },
    [getAttributeData],
  );

  useEffect(() => {
    loadBinaryFile(STAR_BIN_PATH).then((floatArray) => {
      setAttributes(
        getAttributes(
          floatArray.length / BINARY_ITEM_LENGTH,
          (attr, itemIndex, valueIndex, offset) => floatArray[itemIndex * BINARY_ITEM_LENGTH + valueIndex + offset] * (attr.scale || 1),
        ),
      );
    });
    loadJSON(STAR_JSON_PATH).then((meta) => {
      metaRef.current = meta;
    });
  }, []);

  useFrame((state) => {
    const { backgroundPosition, backgroundVelocity, selectedObject } = getState();
    shaderParams.uCameraBackgroundPosition.copy(backgroundPosition);

    const fov = (state.camera as PerspectiveCamera).fov;
    const fovRadians = (fov * Math.PI) / 180;
    shaderParams.uPixelAngularSize = (2 * Math.tan(fovRadians / 2)) / window.innerHeight;

    setSelectionRing(state.camera, selectedObject, backgroundPosition);

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
        console.log(position);

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
