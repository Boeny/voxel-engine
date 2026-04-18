import { useEffect } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import { WebGLRenderer } from 'three';

import { keys, mouseDelta, setupKeyboardEvents, setupMouseEvents } from '@/events';
import { useStore } from '@/store';

const lockIsRequesting = { value: false };
const xAngleLimit = Math.PI / 2;

async function requestPointerLock(renderer: WebGLRenderer) {
  lockIsRequesting.value = true;

  try {
    await renderer.domElement.requestPointerLock();
    lockIsRequesting.value = false;
  } catch (e) {
    setTimeout(() => requestPointerLock(renderer), 100);
  }
}

export function PointerLock({ sensitivity }: { sensitivity: number }) {
  const { gl, camera } = useThree();
  const gameState = useStore((state) => state.gameState);

  useFrame(() => {
    if (lockIsRequesting.value) {
      return;
    }
    // Camera rotation (6DOF local rotation)
    if (mouseDelta.x !== 0 || mouseDelta.y !== 0) {
      camera.rotation.y -= mouseDelta.x * sensitivity;
      camera.rotation.x -= mouseDelta.y * sensitivity;
      camera.rotation.x = Math.max(-xAngleLimit, Math.min(xAngleLimit, camera.rotation.x));
      mouseDelta.x = 0;
      mouseDelta.y = 0;
    }
  });

  useEffect(() => {
    // Setup global keyboard events, fill keys
    const cleanupKeyboardEvents = setupKeyboardEvents({
      keydown: () => {
        const state = useStore.getState();

        if (keys['Escape'] && state.gameState === 'paused') {
          state.setGameState('playing');
        }
      },
    });

    return () => {
      cleanupKeyboardEvents();
    };
  }, []);

  useEffect(() => {
    if (lockIsRequesting.value) {
      return;
    }
    if (gameState === 'playing') {
      requestPointerLock(gl);
    }
  }, [gameState, gl]);

  useEffect(() => {
    const cleanupMouseEvents = setupMouseEvents({
      onPointerLockChange: (isLocked) => {
        if (!isLocked) {
          useStore.getState().setGameState('paused');
        }
      },
    });

    return () => {
      cleanupMouseEvents();
    };
  });

  return null;
}
