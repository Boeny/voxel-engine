import { Vector3 } from 'three';

export type PlayerHUDParams = {
  speed: number;
  distanceToFocusPoint: number;
  isGrounded: boolean;
};

export type EditorHUDParams = {
  distanceToFocusPoint: number;
  isGrounded: boolean;
  cameraPosition: Vector3;
};
