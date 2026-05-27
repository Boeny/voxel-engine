import { useMemo } from 'react';

import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';

import { getState } from '@/store';
import { toArray } from '@/utils';
import { mul } from '@/utils/vector';

import { PointsCloud } from '../PointsCloud';

import frag from './shaders/frag.glsl?raw';
import vert from './shaders/vert.glsl?raw';

const ATTRIBUTES = [
  { name: 'position', length: 3 },
  { name: 'color', length: 3 },
  { name: 'luminosity', length: 1 },
  { name: 'radius', length: 1 },
] as const;

export const BackgroundPointsField = () => {
  const { backgroundShaderParams: shaderParams, backgroundData: data } = getState();

  // Build per-vertex attribute buffers from the catalog
  const attributes = useMemo(() => {
    const result: { name: string; data: Float32Array<ArrayBufferLike>; length: number }[] = ATTRIBUTES.map((attr) => ({
      ...attr,
      data: new Float32Array(data.length * attr.length),
    }));

    data.forEach((point, pointIndex) => {
      ATTRIBUTES.forEach((attr, attrIndex) => {
        result[attrIndex].data.set(toArray(point[attr.name]), pointIndex * attr.length);
      });
    });

    return result;
  }, [data]);

  useFrame((state) => {
    const { backgroundPosition, position, velocity } = getState();
    shaderParams.uCameraBackgroundPosition.copy(backgroundPosition);

    const fov = (state.camera as PerspectiveCamera).fov;
    const fovRadians = (fov * Math.PI) / 180;
    shaderParams.uPixelAngularSize = (2 * Math.tan(fovRadians / 2)) / window.innerHeight;

    backgroundPosition.add(mul(velocity, 1 / shaderParams.uBackgroundToLocalScale));
    position.add(velocity);
  });

  return (
    <PointsCloud
      vertexShader={vert}
      fragmentShader={frag}
      uniforms={shaderParams}
      attributes={attributes}
    />
  );
};
