import { useEffect, useRef } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { button, Leva, useControls } from 'leva';

import { AppState, useStore } from '../store';

import { EditorController } from './editorController';
import { DEFAULT_PLANET, DEFAULT_SHADER, GameLogic } from './logic';
import { PlayerController } from './playerController';
import { getControlParams } from './utils';

function HUD() {
  const controlType = useStore((state) => state.controlType);

  return (
    <>
      <Leva
        //theme={myTheme} // you can pass a custom theme (see the styling section)
        fill={false} // default = false, true makes the pane fill the parent dom node it's rendered in
        flat={false} // default = false, true removes border radius and shadow
        oneLineLabels // default = false, alternative layout for labels, with labels and fields on separate rows
        //hideTitleBar // default = false, hides the GUI header
        collapsed={false} // default = false, when true the GUI is collapsed
        hidden={controlType === 'fpv'} // default = false, when true the GUI is hidden
        neverHide // default = false, when true the GUI stays visible even when no controls are mounted
        hideCopyButton // default = false, hides the copy button in the title bar
        titleBar={{
          // Configure title bar options
          title: 'My Controls', // Custom title
          drag: false, // Enable dragging
          filter: false, // Enable filter/search
          position: { x: 0, y: 0 }, // Initial position (when drag is enabled)
          onDrag: (_position) => {}, // Callback when dragged
        }}
      />
      <div className="absolute top-4 left-4 z-10 text-white font-mono text-sm pointer-events-none drop-shadow-md bg-black/30 p-2 rounded">
        <div id="hud-altitude">Altitude: 0 m</div>
        {controlType === 'fpv' && <div id="hud-speed">Speed: 0 m/s</div>}
      </div>
    </>
  );
}

function getState(): AppState {
  return useStore.getState();
}

const SceneSetup = () => {
  const { camera, scene, gl } = useThree();
  const gameState = useStore((state) => state.gameState);

  const gameLogic = useRef<GameLogic | null>(null);
  const controller = useRef<PlayerController | EditorController | null>(null);

  useEffect(() => {
    const currentSceneState = getState();

    camera.rotation.order = 'YXZ'; // Allows proper FPS-like rotation without gimbal lock at poles
    camera.rotation.set(0, 0, 0); // Camera looks forward by default

    gameLogic.current = new GameLogic(scene);
    controller.current = currentSceneState.controlType === 'editor' ? new EditorController(getState) : new PlayerController(getState);

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

  const [, setShaderParams] = useControls(
    'Shader Settings',
    () =>
      getControlParams(
        DEFAULT_SHADER,
        {
          uSunIntensity: [0, 20],
          uSkyBrightness: [0, 50],
          uRayleighScaleHeight: [1000, 20000],
          uMieScaleHeight: [1000, 20000],
          uMiePreferredScatteringDirection: [0, 0.99],
          atmSteps: [1, 32, 1],
          reset: button(() => setShaderParams(DEFAULT_SHADER)),
        },
        (params) => gameLogic.current?.setShaderParams(params),
      ) as any,
  );
  const [, setPlanetParams] = useControls(
    'Planet Settings',
    () =>
      getControlParams(
        DEFAULT_PLANET,
        {
          planetRadius: [1_000_000, 6_371_000, 1000],
          atmosphereHeight: [0, 100_000, 1],
          planetRotationSpeed: [0, 1],
          axialTilt: [0, 1],
          reset: button(() => setPlanetParams(DEFAULT_PLANET)),
        },
        (params) => gameLogic.current?.setPlanetParams(params),
      ) as any,
  );

  useFrame((frameState, delta) => {
    const state = getState();

    if (state.gameState === 'playing') {
      controller.current?.update(camera, delta);
      controller.current?.updateUI(camera);
      gameLogic.current?.update(camera, frameState.clock.elapsedTime);
    }
  });

  return null;
};

export const Engine = () => {
  return (
    <div className="w-full h-full relative bg-black">
      <HUD />

      <Canvas
        camera={{ position: [0, 2, 0], fov: 75, far: 1e10, near: 0.1 }}
        gl={{ logarithmicDepthBuffer: true, antialias: true }}
      >
        <SceneSetup />
      </Canvas>
    </div>
  );
};
