import { Vector3 } from 'three';

export type SelectableObject = {
  id: number | string;
  position: Vector3;
  radius: number;
  type: 'planet' | 'star';
};
