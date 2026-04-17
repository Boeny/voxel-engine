import React, { useEffect, useRef } from 'react';

import { PointerLockControls } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';

import { useStore } from '../store';

import { GameLogic } from './logic';
import { PlayerController } from './playerController';

const SceneSetup = () => {
  const { camera, scene } = useThree();
  const gameLogic = useRef<GameLogic | null>(null);

  useEffect(() => {
    // Make sure camera looks forward by default
    camera.rotation.set(0, 0, 0);
    gameLogic.current = new GameLogic(scene);

    return () => {
      gameLogic.current?.dispose();
    };
  }, [camera.rotation, scene]);

  useFrame((state) => {
    if (useStore.getState().gameState === 'playing' && gameLogic.current) {
      gameLogic.current.update(camera, state.clock.elapsedTime);
    }
  });

  return null;
};

export const Engine: React.FC = () => {
  const setGameState = useStore((state) => state.setGameState);
  const gameState = useStore((state) => state.gameState);

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
        {gameState === 'playing' && <PlayerController />}
        <PointerLockControls
          isLocked={gameState === 'playing'}
          onUnlock={() => setGameState('paused')}
          onLock={() => setGameState('playing')}
        />
      </Canvas>
    </div>
  );
};
