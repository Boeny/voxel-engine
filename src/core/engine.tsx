import { memo, useEffect, useRef } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useControls } from 'leva';
import { BloomEffect } from 'postprocessing';
import { PerspectiveCamera, Vector3 } from 'three';

import { AutoExposureEffect } from '@/shaders/autoExposure';
import { HUD } from '@/ui/hud';

import { AppState, useStore } from '../store';

import { EditorController } from './editorController';
import { GameLogic } from './logic';
import { PlayerController } from './playerController';
import { add } from './utils';
//import { getControlParams } from './utils';

const autoExposureEffect = new AutoExposureEffect();

function getState(): AppState {
  return useStore.getState();
}

const initialParams = {
  uBrightnessMultiplier: 1e13,
  uRadiusMultiplier: 1,
  uMinRadius: 4,
  uMaxRadius: 1000,
  uMinBrightness: 0,
  uMaxBrightness: 10,
};

const SceneSetup = memo(() => {
  const { camera, scene, gl } = useThree();
  const gameState = useStore((state) => state.gameState);

  const gameLogic = useRef<GameLogic | null>(null);
  const controller = useRef<PlayerController | EditorController | null>(null);

  useControls('Stars', {
    brightness: {
      value: initialParams.uBrightnessMultiplier,
      min: 10,
      max: 1e13,
      step: 1000,
      onChange: (v: number) => gameLogic.current?.starField.setShaderParam('uBrightnessMultiplier', v),
      transient: true,
    },
    radiusMultiplier: {
      value: initialParams.uRadiusMultiplier,
      min: 1,
      max: 10,
      step: 0.5,
      onChange: (v: number) => gameLogic.current?.starField.setShaderParam('uRadiusMultiplier', v),
      transient: true,
    },
    minRadius: {
      value: initialParams.uMinRadius,
      min: 1,
      max: 10,
      step: 0.5,
      onChange: (v: number) => gameLogic.current?.starField.setShaderParam('uMinRadius', v),
      transient: true,
    },
    maxRadius: {
      value: initialParams.uMaxRadius,
      min: 1,
      max: 1000,
      step: 0.5,
      onChange: (v: number) => gameLogic.current?.starField.setShaderParam('uMaxRadius', v),
      transient: true,
    },
    minBrightness: {
      value: initialParams.uMinBrightness,
      min: 0,
      max: 10,
      step: 0.01,
      onChange: (v: number) => gameLogic.current?.starField.setShaderParam('uMinBrightness', v),
      transient: true,
    },
    maxBrightness: {
      value: initialParams.uMaxBrightness,
      min: 1,
      max: 10,
      step: 0.5,
      onChange: (v: number) => gameLogic.current?.starField.setShaderParam('uMaxBrightness', v),
      transient: true,
    },
  });

  // Initialize Game Logic and Controller only once per map session
  useEffect(() => {
    const state = getState();
    const isEditor = state.controlType === 'editor';

    camera.rotation.order = 'YXZ'; // Allows proper FPS-like rotation without gimbal lock at poles

    gameLogic.current = new GameLogic(camera as PerspectiveCamera, scene);
    (Object.keys(initialParams) as (keyof typeof initialParams)[]).forEach((starShaderParam) => {
      gameLogic.current?.starField.setShaderParam(starShaderParam, initialParams[starShaderParam]);
    });
    const star = gameLogic.current.starField.parsedStars[0];
    state.select({ ...star, type: 'star' });

    camera.position.copy(add(star.position, new Vector3(star.radius + 40_000_000, 0, 0)));
    controller.current = isEditor ? new EditorController(camera) : new PlayerController(camera);
    camera.lookAt(star.position);

    const cleanupEvents = controller.current.setupEvents(() => state.gameState, state.setGameState);

    return () => {
      gameLogic.current?.dispose();
      cleanupEvents();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    controller.current?.onGameStateChange(gameState, gl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  useFrame((_, delta) => {
    const state = getState();

    if (state.gameState === 'playing' && gameLogic.current && controller.current) {
      controller.current.velocity = gameLogic.current.velocity;
      controller.current.update(delta, state.selectedObject);

      gameLogic.current.velocity = controller.current.velocity;
      gameLogic.current.update(delta);

      camera.position.add(gameLogic.current.velocity);

      controller.current.updateHUD(delta, state.selectedObject);
      gameLogic.current.updateHUD(delta, state.selectedObject);

      if (state.controlType === 'editor') {
        autoExposureEffect.updateHUD();
      }
    }
  });

  return null;
});

const PostProcessing = memo(() => {
  const bloomRef = useRef<BloomEffect>(null);

  useEffect(() => {
    autoExposureEffect.linkBloom(bloomRef.current);

    return () => autoExposureEffect.linkBloom(null);
  }, []);

  useControls('Bloom', {
    intensity: {
      value: 100,
      min: 0,
      max: 100,
      step: 0.01,
      onChange: (v: number) => {
        if (bloomRef.current) {
          bloomRef.current.intensity = v;
        }
      },
      transient: true,
    },
    smoothing: {
      value: 0,
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
    threshold: {
      value: 0,
      min: 0,
      max: 10,
      step: 0.01,
      onChange: (v: number) => {
        if (bloomRef.current) {
          bloomRef.current.luminanceMaterial.threshold = v;
        }
      },
      transient: true,
    },
  });

  // useControls('Eye Adaptation', () => {
  //   return getControlParams(autoExposureEffect, {
  //     targetNight: [0.01, 1.0, 0.01],
  //     targetDay: [0.01, 2.0, 0.01],
  //     targetGlare: [0.001, 0.5, 0.001],
  //     minLum: [0.0001, 1.0, 0.001],
  //     midLum: [0.1, 10.0, 0.1],
  //     maxLum: [10.0, 500.0, 10.0],
  //     bloomThreshold: [0.01, 50.0, 0.1],
  //   });
  // });

  return (
    <EffectComposer>
      <Bloom
        ref={bloomRef}
        mipmapBlur
        levels={9}
        radius={0.95}
      />
      {/* <primitive object={autoExposureEffect} /> */}
    </EffectComposer>
  );
});

export const Engine = () => {
  return (
    <div className="w-full h-full relative bg-black">
      <HUD />

      <Canvas
        camera={{ position: [0, 2, 0], fov: 50, near: 0.1 }}
        gl={{ logarithmicDepthBuffer: true, antialias: true, toneMapping: 0 }}
      >
        <SceneSetup />
        <PostProcessing />
      </Canvas>
    </div>
  );
};
