import { useControls } from 'leva';
import { Effect, BlendFunction } from 'postprocessing';
import { Uniform } from 'three';

import { getControlParams } from '@/utils/ui';

import { shaderUniforms } from '../decorators/shaderUniforms';

import hdrFrag from './hdrFrag.glsl?raw';

const HDR_PARAMS = {
  targetNight: 0.18, // dark scenes (stars, night surface)
  targetDay: 0.5, // well-lit scenes (daytime surface)
  targetGlare: 0.01, // extreme brightness (looking at sun)
  minLum: 0.001, // starlight level
  midLum: 1, // normal lighting
  maxLum: 100.0, // sun glare
};

// eslint-disable-next-line import/no-unused-modules
export function HDRControls() {
  const hdrRef = new HDREffect();

  useControls('Eye Adaptation', () => {
    return getControlParams(hdrRef as any, {
      targetNight: [0.01, 1, 0.01],
      targetDay: [0.01, 2, 0.01],
      targetGlare: [0.001, 0.5, 0.001],
      minLum: [0.0001, 1, 0.001],
      midLum: [0.1, 10, 0.1],
      maxLum: [10, 500, 10],
      bloomThreshold: [0.01, 50, 0.1],
    });
  });

  return <primitive object={hdrRef} />;
}

@shaderUniforms<HDREffect>(HDR_PARAMS, (instance, field, value) => {
  const uniform = instance.uniforms.get(field);
  if (uniform) {
    uniform.value = value;
  }
})
class HDREffect extends Effect {
  constructor() {
    const uniforms: [string, Uniform][] = Object.entries(HDR_PARAMS).map(([field, value]) => [field, new Uniform(value)]);

    super('HDREffect', hdrFrag, {
      blendFunction: BlendFunction.SET,
      uniforms: new Map<string, Uniform>(uniforms),
    });
  }
}
