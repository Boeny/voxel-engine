import { useMemo } from 'react';

import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';

import { LY_TO_KM } from '@/const';
import { getState } from '@/store';
import { toArray } from '@/utils';
import { mul } from '@/utils/vector';

import { PointsCloud } from '../PointsCloud';

import starFrag from './shaders/frag.glsl?raw';
import starVert from './shaders/vert.glsl?raw';
import { Star } from './types';

const ATTRIBUTES = [
  { name: 'position', length: 3 },
  { name: 'color', length: 3 },
  { name: 'luminosity', length: 1 },
  { name: 'radius', length: 1 },
] as const;

type Props = {
  data: Star[];
};

export const StarField = ({ data }: Props) => {
  const shaderParams = getState().starShaderParams;

  // Build per-vertex attribute buffers from the catalog
  const attributes = useMemo(() => {
    const result: { name: string; data: Float32Array<ArrayBufferLike>; length: number }[] = ATTRIBUTES.map((attr) => ({
      ...attr,
      data: new Float32Array(data.length * attr.length),
    }));

    data.forEach((star, starIndex) => {
      ATTRIBUTES.forEach((attr, attrIndex) => {
        result[attrIndex].data.set(toArray(star[attr.name]), starIndex * attr.length);
      });
    });

    return result;
  }, [data]);

  useFrame((state) => {
    const { backgroundPosition, position, velocity } = getState();
    shaderParams.uCameraPositionLy.copy(backgroundPosition);

    const fov = (state.camera as PerspectiveCamera).fov;
    const fovRadians = (fov * Math.PI) / 180;
    shaderParams.uPixelAngularSize = (2 * Math.tan(fovRadians / 2)) / window.innerHeight;

    backgroundPosition.add(mul(velocity, 1 / LY_TO_KM));
    position.add(velocity);
  });

  return (
    <PointsCloud
      vertexShader={starVert}
      fragmentShader={starFrag}
      uniforms={shaderParams}
      attributes={attributes}
    />
  );
};
