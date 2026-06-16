import { useRef } from 'react';

import { useFrame } from '@react-three/fiber';
import { Bloom } from '@react-three/postprocessing';
import { useControls } from 'leva';
import { BloomEffect } from 'postprocessing';

import { getControlParams } from '@/utils/ui';

const BLOOM_PARAMS = {
  intensity: 100,
  smoothing: 0,
  threshold: 0,
};

export function BloomControls() {
  const bloomParamsRef = useRef({ ...BLOOM_PARAMS });

  useControls('Bloom', () =>
    getControlParams(bloomParamsRef.current, {
      intensity: [0, 100, 0.01], // 40 for realistic
      smoothing: [0, 1, 0.01],
      threshold: [0, 10, 0.01],
    }),
  );

  const bloomRef = useRef<BloomEffect | null>(null);

  useFrame(() => {
    if (!bloomRef.current) {
      return;
    }
    bloomRef.current.intensity = bloomParamsRef.current.intensity;
    bloomRef.current.luminanceMaterial.smoothing = bloomParamsRef.current.smoothing;
    bloomRef.current.luminanceMaterial.threshold = bloomParamsRef.current.threshold;
  });

  return (
    <Bloom
      ref={bloomRef}
      mipmapBlur
      levels={9}
      radius={0.95}
    />
  );
}
