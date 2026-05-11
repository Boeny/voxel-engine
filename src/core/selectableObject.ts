import { Vector3 } from 'three';

export class SelectableObject {
  position!: Vector3;
  radius!: number;
  static shaderParams: Record<string, any> = {};

  constructor(public type: 'planet' | 'star') {}
}
