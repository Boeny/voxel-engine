/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

import { preventDefault, setupEvents, setupKeyboardEvents, setupMouseEvents } from '@/events';
import { getState } from '@/store';
import { setDOMContent, getDistanceText } from '@/utils/ui';
import { getDistanceToObject, sub, vectorToString } from '@/utils/vector';

import { BACKGROUND_POSITION_SCALE } from '../components/BackgroundPointsField/const';

import {
  applyAcceleration,
  changeRotation,
  rotateOnLeftDrag,
  changeVelocityOnRightDrag,
  changeVelocityOnWheel,
  horMovement,
  vertMovement,
} from './utils';

export function EditorController() {
  const { camera } = useThree();

  useEffect(() => {
    const { rotation } = getState();
    camera.rotation.copy(rotation);
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
    const {
      selectedObject,
      rotation,
      position,
      velocity,
      backgroundPosition,
      backgroundVelocity,
      backgroundSpeed,
      backgroundShaderParams,
    } = getState();

    const moveSpeed = selectedObject
      ? Math.max(1, sub(backgroundPosition, selectedObject.position).length())
      : backgroundSpeed * BACKGROUND_POSITION_SCALE;

    const moveDir = new Vector3();
    horMovement(camera.quaternion, moveDir);
    vertMovement(moveDir, new Vector3(0, 1, 0).applyQuaternion(camera.quaternion));

    applyAcceleration(delta, moveDir, backgroundVelocity, moveSpeed, true);
    changeRotation(delta, camera);

    selectedObject && changeVelocityOnRightDrag(camera, backgroundPosition, backgroundVelocity, selectedObject);
    selectedObject && changeVelocityOnWheel(delta, backgroundPosition, moveSpeed, backgroundVelocity, selectedObject);

    rotateOnLeftDrag(camera);

    rotation.copy(camera.rotation);

    // HUD

    setDOMContent('hud-selected-name', selectedObject ? `Selected: ${selectedObject.name}` : 'Selected: None');
    setDOMContent('hud-bkposition', `Background Position: ${vectorToString(backgroundPosition, 10)}`);
    setDOMContent('hud-position', `Local Position: ${vectorToString(position)}`);
    setDOMContent('hud-rotation', `Rotation: ${vectorToString(rotation)}`);
    setDOMContent(
      'hud-bkspeed',
      `Background Speed: ${getDistanceText(backgroundVelocity.length() * backgroundShaderParams.uBackgroundToLocalScale)}/s`,
    );
    setDOMContent('hud-speed', `Local Speed: ${getDistanceText(velocity.length())}/s`);
    setDOMContent('hud-fps', `FPS: ${(1 / delta).toFixed(1)}`);

    setDOMContent(
      'hud-altitude',
      selectedObject
        ? `Altitude: ${getDistanceText(getDistanceToObject(position, backgroundPosition, selectedObject, backgroundShaderParams.uBackgroundToLocalScale))}`
        : 'Altitude: None',
    );
  });

  return null;
}
