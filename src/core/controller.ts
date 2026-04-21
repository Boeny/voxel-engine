import * as THREE from 'three';

import { AppState } from '@/store';

type State = AppState;

export class Controller {
  constructor(private getState: () => State) {}

  get state() {
    return this.getState();
  }

  setupEvents(): () => void {
    return () => {};
  }
  onGameStateChange(_: THREE.WebGLRenderer) {}
  update(_: THREE.Camera, _delta: number) {}
  updateUI(_: THREE.Camera) {}
}
