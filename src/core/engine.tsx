/* eslint-disable @typescript-eslint/no-unused-vars */
import { memo } from 'react';

import { Canvas } from '@react-three/fiber';
import { EffectComposer } from '@react-three/postprocessing';

import { FAR_CULLING, NEAR_CULLING } from '@/const';
import { getState } from '@/store';
import { HUD } from '@/ui/hud';

import { BackgroundPointsField } from './components/BackgroundPointsField';
import { EditorController } from './controllers/editorController';
import { PlayerController } from './controllers/playerController';
import { BloomControls } from './effects/bloom';
import { HDRControls } from './effects/hdr';

export const Engine = memo(() => {
  const Controller = getState().controlType === 'editor' ? EditorController : PlayerController;

  return (
    <div className="w-full h-full relative bg-black">
      <HUD />

      <Canvas
        camera={{ position: [0, 0, 0], fov: 50, near: NEAR_CULLING, far: FAR_CULLING }}
        gl={{ logarithmicDepthBuffer: true }}
      >
        <Controller />

        <BackgroundPointsField />

        <EffectComposer>
          <BloomControls />
          {/* <HDRControls /> */}
        </EffectComposer>
      </Canvas>
    </div>
  );
});
