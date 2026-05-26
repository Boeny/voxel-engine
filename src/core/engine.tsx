import { memo, useEffect } from 'react';

import { Canvas, useThree } from '@react-three/fiber';
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

const SceneSetup = memo(() => {
  const { camera } = useThree();

  useEffect(() => {
    camera.rotation.order = 'YXZ'; // Allows proper FPS-like rotation without gimbal lock at poles
    camera.position.set(0, 0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Controller = getState().controlType === 'editor' ? EditorController : PlayerController;

  return (
    <>
      <Controller />
      <StarField data={stars} />
    </>
  );
});

export const Engine = memo(() => {
  return (
    <div className="w-full h-full relative bg-black">
      <HUD />

      <Canvas
        camera={{ position: [0, 2, 0], fov: 50, near: NEAR_CULLING, far: FAR_CULLING }}
        gl={{ logarithmicDepthBuffer: true }}
      >
        <SceneSetup />

        <EffectComposer>
          <BloomControls />
          {/* <HDRControls /> */}
        </EffectComposer>
      </Canvas>
    </div>
  );
});
