import { Vector3 } from 'three';

export type SelectableObject = {
  position: Vector3;
  radius: number;
  type: 'planet' | 'star';
};
