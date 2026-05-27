/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

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

export function EditorController() {
  const { camera } = useThree();

  useEffect(() => {
    camera.rotation.order = 'YXZ'; // Allows proper FPS-like rotation without gimbal lock at poles
    getState().selectedObject = getState().backgroundData[0];

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
    const { selectedObject, position, velocity, backgroundPosition, backgroundVelocityScale, backgroundShaderParams } = getState();

    const moveSpeed = selectedObject
      ? getCurrentMoveSpeed(sub(position, selectedObject.position).length())
      : backgroundVelocityScale * backgroundShaderParams.uBackgroundToLocalScale;

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
    selectedObject &&
      setDOMContent(
        'hud-altitude',
        `Altitude: ${getDistanceText(getDistanceToObject(position, backgroundPosition, selectedObject, backgroundShaderParams.uBackgroundToLocalScale))}`,
      );
  });

  return null;
}
