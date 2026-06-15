import { Vector3 } from 'three';

export type SelectableObject = {
  name: string;
  position: Vector3;
  radius: number;
  type: 'planet' | 'background';
};
