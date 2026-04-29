import { Vector3 } from 'three';

export class SelectableObject {
  position!: Vector3;
  radius!: number;

  constructor(public type: 'planet' | 'star') {}
}
