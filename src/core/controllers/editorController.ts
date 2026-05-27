/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

import { LY_TO_KM } from '@/const';
import { preventDefault, setupEvents, setupKeyboardEvents, setupMouseEvents } from '@/events';
import { getState } from '@/store';
import { getDistanceToObject, sub } from '@/utils/vector';

import { getDistanceText, positionToString, setDOMContent } from '../../utils';

import {
  applyAcceleration,
  changeRotation,
  rotateOnLeftDrag,
  changeVelocityOnRightDrag,
  changeVelocityOnWheel,
  getCurrentMoveSpeed,
  horMovement,
  vertMovement,
} from './utils';

const playerHeight = 2 / 1000; // km
const MAX_SPEED = 2 * LY_TO_KM;

export function EditorController() {
  const { camera } = useThree();

  useEffect(() => {
    camera.rotation.order = 'YXZ'; // Allows proper FPS-like rotation without gimbal lock at poles

    const cleanupKeyboardEvents = setupKeyboardEvents({
      keydown: (e) => {
        if (e.code === 'Escape') {
          const { gameState, setGameState } = getState();

          if (gameState === 'paused') {
            setGameState('playing');
          }
          if (gameState === 'playing') {
            setGameState('paused');
          }
        }
      },
    });

    const cleanupMouseEvents = setupMouseEvents();
    const cleanupOtherEvents = setupEvents({
      contextmenu: preventDefault,
    });

    return () => {
      cleanupKeyboardEvents();
      cleanupMouseEvents();
      cleanupOtherEvents();
    };
  }, []);

  useFrame((_, delta) => {
    const { selectedObject, position, velocity } = getState();

    const moveSpeed = selectedObject ? getCurrentMoveSpeed(sub(position, selectedObject.position).length()) : MAX_SPEED;

    const moveDir = new Vector3();
    horMovement(camera.quaternion, moveDir);
    vertMovement(moveDir, new Vector3(0, 1, 0).applyQuaternion(camera.quaternion));

    applyAcceleration(delta, moveDir, velocity, moveSpeed, true);
    changeRotation(delta, camera);

    selectedObject && changeVelocityOnRightDrag(camera, position, velocity, selectedObject);
    selectedObject && changeVelocityOnWheel(delta, position, moveSpeed, velocity, selectedObject);

    rotateOnLeftDrag(camera);

    selectedObject && setDOMContent('hud-selected-name', `Selected: ${selectedObject.name}`);
    setDOMContent('hud-position', `Position: ${positionToString(position)}`);
    setDOMContent('hud-speed', `Speed: ${getDistanceText(velocity.length())}/s`);
    setDOMContent('hud-fps', `FPS: ${(1 / delta).toFixed(1)}`);
    setDOMContent('hud-altitude', `Altitude: ${getDistanceText(getDistanceToObject(camera, selectedObject) - playerHeight)}`);
  });

  return null;
}
