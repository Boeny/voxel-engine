import { Camera, WebGLRenderer } from 'three';

export class Controller {
  constructor(protected camera: Camera) {}

  onGameStateChange(_gameState: 'playing' | 'paused', _renderer: WebGLRenderer) {}
}
