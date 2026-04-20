import React, { useEffect, useRef } from 'react';

import { Canvas, useFrame, useThree } from '@react-three/fiber';

import { setupKeyboardEvents } from '@/events';

import { useStore } from '../store';

import { GameLogic } from './logic';
import { PlayerController } from './playerController';
import { PointerLock } from './PointerLock';

const MOUSE_SENSITIVITY = 0.002;

const SceneSetup = () => {
  const { camera, scene, gl } = useThree();
  const gameState = useStore((state) => state.gameState);

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
        const { gameState, setGameState } = useStore.getState();
        if (e.code === 'Escape' && gameState === 'paused') {
          setGameState('playing');
        }
      },
    });
    const cleanupMouseEvents = pointerLock.current.setupMouseEvents({
      onPointerLockChange: (isLocked) => {
        if (!isLocked) {
          useStore.getState().setGameState('paused');
        }
      },
    });

    return () => {
      gameLogic.current?.dispose();
      cleanupKeyboardEvents();
      cleanupMouseEvents();
    };
  }, [scene]);

  useEffect(() => {
    if (!pointerLock?.current || pointerLock.current.lockIsRequesting) {
      return;
    }
    if (gameState === 'playing') {
      pointerLock.current.requestPointerLock(gl);
    }
  }, [gameState, gl]);

  useFrame((state, delta) => {
    if (useStore.getState().gameState === 'playing') {
      playerController.current?.update(camera, delta);
      pointerLock.current?.update(camera);
      gameLogic.current?.update(camera, state.clock.elapsedTime);
    }
  });

  return null;
};

export const Engine: React.FC = () => {
  return (
    <div className="w-full h-full relative bg-black">
      <div className="absolute top-4 left-4 z-10 text-white font-mono text-sm pointer-events-none drop-shadow-md bg-black/30 p-2 rounded">
        UI
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
