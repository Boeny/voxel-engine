import { useEffect } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

import { mouse, preventDefault, setupEvents, setupKeyboardEvents, setupMouseEvents, setupPointerLockEvent } from '@/events';
import { getState } from '@/store';
import { getDistanceText, setDOMContent } from '@/utils';
import { getDistanceToObject, norm, sub } from '@/utils/vector';

import { PointerLock } from './pointerLock';
import { applyAcceleration, changeVelocityIfJump, horMovement } from './utils';

const pointerLock = new PointerLock();

const moveSpeed = 5 / 1000; // km/s
//const gravity = 10 / 1000; // km/s2
const jumpForce = 0.005;
const playerHeight = 2 / 1000;

export function PlayerController() {
  let pitch = 0;
  let isGrounded = true;

  const { camera, gl: renderer } = useThree();

  useEffect(() => {
    const cleanupKeyboardEvents = setupKeyboardEvents({
      keydown: (e) => {
        const { gameState, setGameState } = getState();

        if (e.code === 'Escape' && gameState === 'paused') {
          setGameState('playing');
        }
      },
    });
    const cleanupMouseEvents = setupMouseEvents();
    const cleanupPointerLockEvent = setupPointerLockEvent((isLocked) => {
      if (!isLocked) {
        getState().setGameState('paused');
      }
    });
    const cleanupOtherEvents = setupEvents({
      contextmenu: preventDefault,
    });

    return () => {
      cleanupKeyboardEvents();
      cleanupMouseEvents();
      cleanupPointerLockEvent();
      cleanupOtherEvents();
    };
  }, []);

  useFrame((_, delta) => {
    const { gameState, selectedObject: nearestGravityObject, position, velocity } = getState();

    if (gameState === 'playing' && renderer.domElement) {
      pointerLock.requestPointerLock(renderer.domElement);
    }

    if (nearestGravityObject) {
      // ── Mouse look in local frame ───────────────────────────────
      const pitchDelta = -mouse.delta.y;
      mouse.delta.set(0, 0);

      // Apply pitch with clamping
      const limit = Math.PI / 2 - 0.01;
      pitch = Math.max(-limit, Math.min(limit, pitch + pitchDelta));

      // Set camera orientation
      const up = norm(sub(position, nearestGravityObject.position));
      camera.up.copy(up);

      // ── Movement in tangent plane ───────────────────────────────
      const moveDir = new Vector3();
      horMovement(camera.quaternion, moveDir);
      applyAcceleration(delta, moveDir, velocity, moveSpeed);
      isGrounded = changeVelocityIfJump(up, isGrounded, velocity, jumpForce);
    }

    setDOMContent('hud-speed', `Speed: ${getDistanceText(velocity.length())}/s`);
    setDOMContent('hud-fps', `FPS: ${(1 / delta).toFixed(1)}`);
    setDOMContent('hud-altitude', `Altitude: ${getDistanceText(getDistanceToObject(camera, nearestGravityObject) - playerHeight)}`);
  });

  return null;
}
