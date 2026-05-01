import { useEffect, useRef } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useControls } from 'leva';
import { BloomEffect } from 'postprocessing';

import { AutoExposureEffect } from '@/shaders/autoExposure';
import { HUD } from '@/ui/hud';

import { AppState, useStore } from '../store';

import { EditorController } from './editorController';
import { GameLogic } from './logic';
import { PlayerController } from './playerController';

const autoExposureEffect = new AutoExposureEffect();

function getState(): AppState {
  return useStore.getState();
}

const SceneSetup = () => {
  const { camera, scene, gl } = useThree();
  const gameState = useStore((state) => state.gameState);

  const gameLogic = useRef<GameLogic | null>(null);
  const controller = useRef<PlayerController | EditorController | null>(null);

  useControls('Stars', {
    brightness: {
      value: 0.1,
      min: 0.001,
      max: 10,
      step: 0.001,
      onChange: (v: number) => gameLogic.current?.setShaderParams({ uStarBrightness: v }),
      transient: true,
    },
  });

  // Initialize Game Logic and Controller only once per map session
  useEffect(() => {
    const state = getState();
    const isEditor = state.controlType === 'editor';

    camera.rotation.order = 'YXZ'; // Allows proper FPS-like rotation without gimbal lock at poles

    gameLogic.current = new GameLogic(camera, scene, (objects) => state.setObjects(objects));
    controller.current = isEditor ? new EditorController(camera, getState) : new PlayerController(camera, getState);

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

  useFrame((_, delta) => {
    const state = getState();

    if (state.gameState === 'playing') {
      gameLogic.current?.update(delta);
      controller.current?.update(delta, state.selectedObject);
      controller.current?.updateHUD(state.selectedObject);

      if (state.controlType === 'editor') {
        autoExposureEffect.updateHUD();
      }
    }
  });

  return null;
};

const PostProcessing = () => {
  const bloomRef = useRef<BloomEffect>(null);

  useEffect(() => {
    autoExposureEffect.linkBloom(bloomRef.current);

    return () => autoExposureEffect.linkBloom(null);
  }, []);

  useControls('Bloom', {
    intensity: {
      value: 0.01,
      min: 0.01,
      max: 10,
      step: 0.01,
      onChange: (v: number) => {
        if (bloomRef.current) {
          bloomRef.current.intensity = v;
        }
      },
      transient: true,
    },
    smoothing: {
      value: 1,
      min: 0,
      max: 1,
      step: 0.01,
      onChange: (v: number) => {
        if (bloomRef.current) {
          bloomRef.current.luminanceMaterial.smoothing = v;
        }
      },
      transient: true,
    },
  });

  return (
    <EffectComposer>
      <Bloom
        ref={bloomRef}
        mipmapBlur
      />
      <primitive object={autoExposureEffect} />
    </EffectComposer>
  );
};

export const Engine = () => {
  return (
    <div className="w-full h-full relative bg-black">
      <HUD autoExposure={autoExposureEffect} />

      <Canvas
        camera={{ position: [0, 2, 0], fov: 50, far: 1, near: 0.1 }}
        gl={{ logarithmicDepthBuffer: true, antialias: true, toneMapping: 0 }}
      >
        <SceneSetup />
        <PostProcessing />
      </Canvas>
    </div>
  );
};
