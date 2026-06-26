/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';

import { preventDefault, setupEvents, setupKeyboardEvents, setupMouseEvents } from '@/events';
import { getState } from '@/store';
import { setDOMContent, getDistanceText } from '@/utils/ui';
import { getDistanceToObject, sub, vectorToString } from '@/utils/vector';

import { BACKGROUND_POSITION_SCALE, LOCAL_MODE_THRESHOLD } from '../components/BackgroundPointsField/const';

import {
  applyAcceleration,
  rotateOnKeys,
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

    const { uBackgroundToLocalScale } = backgroundShaderParams;
    const localOffset = selectedObject && sub(backgroundPosition, selectedObject.position);
    const isLocalMode = localOffset && localOffset.length() < LOCAL_MODE_THRESHOLD;

    // Transition: global → local
    if (isLocalMode && backgroundVelocity.lengthSq() > 0) {
      velocity.copy(backgroundVelocity).multiplyScalar(uBackgroundToLocalScale);
      position.copy(localOffset).multiplyScalar(uBackgroundToLocalScale);

      backgroundPosition.copy(selectedObject.position);
      backgroundVelocity.set(0, 0, 0);
    }

    // Transition: local → global
    if (!isLocalMode && velocity.lengthSq() > 0) {
      backgroundPosition.addScaledVector(position, 1 / uBackgroundToLocalScale);
      backgroundVelocity.copy(velocity).multiplyScalar(1 / uBackgroundToLocalScale);

      velocity.set(0, 0, 0);
      position.set(0, 0, 0);
    }

    const moveDir = new Vector3();
    horMovement(camera.quaternion, moveDir);
    vertMovement(moveDir, new Vector3(0, 1, 0).applyQuaternion(camera.quaternion));

    if (isLocalMode) {
      const localMoveSpeed = Math.max(1, position.length());
      applyAcceleration(delta, moveDir, velocity, localMoveSpeed, true);

      // if (mouse.right && mouse.move) {
      //   const angleH = -mouse.delta.x;
      //   const angleV = -mouse.delta.y;
      //   const orbitUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      //   const orbitRight = new Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
      //   const newOffset = position.clone().applyAxisAngle(orbitUp, angleH).applyAxisAngle(orbitRight, angleV);
      //   velocity.add(sub(newOffset, position));
      //   camera.up.copy(orbitUp);
      //   const starDir = position.clone().negate();
      //   if (starDir.lengthSq() > 0) {
      //     camera.lookAt(starDir.normalize());
      //   }
      //   mouse.clearDelta();
      // }

      // if (mouse.wheel !== 0) {
      //   const zoomDir = mouse.wheel > 0 ? 1 : -1;
      //   const newDist = position.length() + localMoveSpeed * delta * zoomDir;
      //   const radial = position.clone().normalize();
      //   if (radial.lengthSq() > 0) {
      //     velocity.add(sub(radial.multiplyScalar(newDist), position));
      //   }
      //   mouse.wheel = 0;
      // }

      position.add(velocity);
    } else {
      const moveSpeed = selectedObject
        ? Math.max(1, sub(backgroundPosition, selectedObject.position).length())
        : backgroundSpeed * BACKGROUND_POSITION_SCALE;
      applyAcceleration(delta, moveDir, backgroundVelocity, moveSpeed, true);
      selectedObject && changeVelocityOnRightDrag(camera, backgroundPosition, backgroundVelocity, selectedObject);
      selectedObject && changeVelocityOnWheel(delta, backgroundPosition, moveSpeed, backgroundVelocity, selectedObject);
    }

    rotateOnKeys(delta, camera);
    rotateOnLeftDrag(camera);
    rotation.copy(camera.rotation);

    // HUD

    setDOMContent('hud-selected-name', selectedObject ? `Selected: ${selectedObject.name}` : 'Selected: None');
    setDOMContent('hud-bkposition', `Background Position: ${vectorToString(backgroundPosition, 10)}`);
    setDOMContent('hud-position', `Local Position: ${vectorToString(position)}`);
    setDOMContent('hud-rotation', `Rotation: ${vectorToString(rotation)}`);
    setDOMContent('hud-bkspeed', `Background Speed: ${getDistanceText(backgroundVelocity.length() * uBackgroundToLocalScale)}/s`);
    setDOMContent('hud-speed', `Local Speed: ${getDistanceText(velocity.length())}/s`);
    setDOMContent('hud-fps', `FPS: ${(1 / delta).toFixed(1)}`);

    setDOMContent(
      'hud-altitude',
      selectedObject
        ? `Altitude: ${getDistanceText(getDistanceToObject(position, backgroundPosition, selectedObject, uBackgroundToLocalScale))}`
        : 'Altitude: None',
    );
  });

  return null;
}
