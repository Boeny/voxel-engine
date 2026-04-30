import { useEffect, useMemo, useRef } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useControls } from 'leva';

import { AutoExposureEffect } from '@/shaders/autoExposure';
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

  useFrame((_, delta) => {
    const state = getState();

    if (state.gameState === 'playing') {
      gameLogic.current?.update(delta);
      controller.current?.update(delta, state.selectedObject);
      updateHUD.current(controller.current?.getHUDParams(state.selectedObject));
    }
  });

  return null;
};

const PostProcessing = () => {
  const bloom = useControls('Bloom', {
    enabled: true,
    intensity: { value: 3, min: 0, max: 5, step: 0.01 },
    threshold: { value: 0, min: 0, max: 10, step: 0.1 },
    smoothing: { value: 1, min: 0, max: 1, step: 0.01 },
  });

  const exposure = useControls('Eye Adaptation', {
    targetLuminance: { value: 0.18, min: 0.01, max: 1.0, step: 0.01 },
    tauLight: { value: 0.5, min: 0.1, max: 3.0, step: 0.1 },
    tauDark: { value: 2.0, min: 0.5, max: 5.0, step: 0.1 },
    minAdaptLuminance: { value: 0.001, min: 0.0001, max: 0.1, step: 0.001 },
    maxAdaptLuminance: { value: 100.0, min: 10.0, max: 500.0, step: 10.0 },
  });

  const autoExposureEffect = useMemo(() => new AutoExposureEffect(), []);

  useMemo(() => {
    autoExposureEffect.targetLuminance = exposure.targetLuminance;
    autoExposureEffect.tauLight = exposure.tauLight;
    autoExposureEffect.tauDark = exposure.tauDark;
    autoExposureEffect.minAdaptLuminance = exposure.minAdaptLuminance;
    autoExposureEffect.maxAdaptLuminance = exposure.maxAdaptLuminance;
  }, [
    autoExposureEffect,
    exposure.targetLuminance,
    exposure.tauLight,
    exposure.tauDark,
    exposure.minAdaptLuminance,
    exposure.maxAdaptLuminance,
  ]);

  const effects = useMemo(() => {
    return [
      bloom.enabled ? (
        <Bloom
          key="bloom"
          luminanceThreshold={bloom.threshold}
          luminanceSmoothing={bloom.smoothing}
          intensity={bloom.intensity}
          mipmapBlur
        />
      ) : null,
      <primitive
        key="exposure"
        object={autoExposureEffect}
      />,
    ].filter(Boolean);
  }, [autoExposureEffect, bloom.enabled, bloom.threshold, bloom.smoothing, bloom.intensity]);

  return <EffectComposer>{effects as any}</EffectComposer>;
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
        <PostProcessing />
      </Canvas>
    </div>
  );
};
