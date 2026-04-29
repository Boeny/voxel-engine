import { useEffect, useRef } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';

import { HUD } from '@/ui/hud';
import { updateEditorHUD } from '@/ui/hud/editor';
import { updatePlayerHUD } from '@/ui/hud/player';

import { AppState, useStore } from '../store';

import { EditorController } from './editorController';
import { GameLogic } from './logic';
import { PlayerController } from './playerController';

function getState(): AppState {
  return useStore.getState();
}

const SceneSetup = () => {
  const { camera, scene, gl } = useThree();
  const gameState = useStore((state) => state.gameState);

  const gameLogic = useRef<GameLogic | null>(null);
  const controller = useRef<PlayerController | EditorController | null>(null);
  const updateHUD = useRef<(params: any) => void>(() => {});

  // Initialize Game Logic and Controller only once per map session
  useEffect(() => {
    const state = getState();
    const isEditor = state.controlType === 'editor';

    camera.rotation.order = 'YXZ'; // Allows proper FPS-like rotation without gimbal lock at poles

    gameLogic.current = new GameLogic(camera, scene, (objects) => state.setObjects(objects));
    controller.current = isEditor ? new EditorController(camera, getState) : new PlayerController(camera, getState);
    updateHUD.current = isEditor ? updateEditorHUD : updatePlayerHUD;

    state.select(gameLogic.current.planet);

    const cleanupEvents = controller.current.setupEvents();

    return () => {
      gameLogic.current?.dispose();
      cleanupEvents();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controller.current?.onGameStateChange(gl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  useFrame((frameState, delta) => {
    const state = getState();

    if (state.gameState === 'playing') {
      controller.current?.update(delta, state.selectedObject);
      gameLogic.current?.update(delta);
      updateHUD.current(controller.current?.getHUDParams(state.selectedObject));
    }
  });

  return null;
};

export const Engine = () => {
  return (
    <div className="w-full h-full relative bg-black">
      <HUD />

      <Canvas
        camera={{ position: [0, 2, 0], fov: 50, far: 1, near: 0.1 }}
        gl={{ logarithmicDepthBuffer: true, antialias: true, toneMapping: 0 }}
      >
        <SceneSetup />
        <EffectComposer>
          <Bloom
            luminanceThreshold={1.0}
            luminanceSmoothing={0.3}
            intensity={0.8}
            mipmapBlur
          />
          <ToneMapping mode={ToneMappingMode.AGX} />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
