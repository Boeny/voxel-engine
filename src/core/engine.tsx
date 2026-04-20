import React, { useEffect, useRef } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

import { setupKeyboardEvents } from '@/events';

import { useStore } from '../store';

import { GameLogic } from './logic';
import { PlayerController } from './playerController';
import { PointerLock } from './pointerLock';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const GRAVITY_VECTOR = new Vector3(0, 1, 0);
const MOUSE_SENSITIVITY = 0.002;

const SceneSetup = () => {
  const { camera, scene, gl } = useThree();
  const gameState = useStore((state) => state.gameState);
  const controlType = useStore((state) => state.controlType);

  const gameLogic = useRef<GameLogic | null>(null);
  const playerController = useRef<PlayerController | null>(null);
  const pointerLock = useRef<PointerLock | null>(null);

  useEffect(() => {
    camera.rotation.order = 'YXZ'; // Allows proper FPS-like rotation without gimbal lock at poles
    camera.rotation.set(0, 0, 0); // Camera looks forward by default

    gameLogic.current = new GameLogic(scene);
    playerController.current = new PlayerController();
    pointerLock.current = new PointerLock(MOUSE_SENSITIVITY);

    const cleanupKeyboardEvents = setupKeyboardEvents({
      keydown: (e) => {
        const state = useStore.getState();

        if (e.code === 'Escape') {
          if (state.gameState === 'paused') {
            state.setGameState('playing');
          }
          if (state.gameState === 'playing' && state.controlType === 'editor') {
            state.setGameState('paused');
          }
        }
      },
    });
    const cleanupMouseEvents = pointerLock.current.setupMouseEvents({
      onPointerLockChange: (isLocked) => {
        const state = useStore.getState();

        if (!isLocked && state.controlType === 'fpv') {
          state.setGameState('paused');
        }
      },
    });

    return () => {
      gameLogic.current?.dispose();
      cleanupKeyboardEvents();
      cleanupMouseEvents();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!pointerLock?.current || pointerLock.current.lockIsRequesting) {
      return;
    }
    if (gameState === 'playing' && controlType === 'fpv') {
      pointerLock.current.requestPointerLock(gl);
    }
  }, [controlType, gameState, gl]);

  useFrame((frameState, delta) => {
    const state = useStore.getState();

    if (state.gameState === 'playing') {
      playerController.current?.update(camera, delta);
      pointerLock.current?.update(camera);
      gameLogic.current?.update(camera, frameState.clock.elapsedTime);
    }
  });

  return null;
};

export const Engine: React.FC = () => {
  return (
    <div className="w-full h-full relative bg-black">
      <div className="absolute top-4 left-4 z-10 text-white font-mono text-sm pointer-events-none drop-shadow-md bg-black/30 p-2 rounded">
        <div id="hud-altitude">Altitude: 0 m</div>
        <div id="hud-speed">Speed: 0 m/s</div>
      </div>
      <Canvas
        camera={{ position: [0, 2, 0], fov: 75, far: 1e10, near: 0.1 }}
        gl={{ logarithmicDepthBuffer: true, antialias: true }}
      >
        <SceneSetup />
      </Canvas>
    </div>
  );
};
