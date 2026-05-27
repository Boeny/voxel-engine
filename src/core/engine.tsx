import { memo } from 'react';

import { Canvas } from '@react-three/fiber';
import { EffectComposer } from '@react-three/postprocessing';
import { Vector3 } from 'three';

import { FAR_CULLING, NEAR_CULLING } from '@/const';
import { getState } from '@/store';
import { HUD } from '@/ui/hud';

import { StarField } from './components/StarField/StarField';
import { parseStarCatalog } from './components/StarField/utils';
import { EditorController } from './controllers/editorController';
import { PlayerController } from './controllers/playerController';
import { BloomControls } from './effects/bloom';
//import { HDRControls } from './effects/hdr';

const stars = parseStarCatalog(new Vector3(0, 0, 1));

const SceneSetup = ({ Controller }: { Controller: React.ComponentType }) => {
  return (
    <>
      <Controller />
      <StarField data={stars} />
    </>
  );
};

export const Engine = memo(() => {
  const Controller = getState().controlType === 'editor' ? EditorController : PlayerController;

  return (
    <div className="w-full h-full relative bg-black">
      <HUD />

      <Canvas
        camera={{ position: [0, 0, 0], fov: 50, near: NEAR_CULLING, far: FAR_CULLING }}
        gl={{ logarithmicDepthBuffer: true }}
      >
        <SceneSetup Controller={Controller} />

        <EffectComposer>
          <BloomControls />
          {/* <HDRControls /> */}
        </EffectComposer>
      </Canvas>
    </div>
  );
});
