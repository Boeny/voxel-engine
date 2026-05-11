import { Camera, Vector3, WebGLRenderer } from 'three';

export class Controller {
  velocity = new Vector3();
  defaultCameraPosition!: Vector3;

  constructor(protected camera: Camera) {}

  setupEvents(_getGameState: () => 'playing' | 'paused', _setGameState: (gameState: 'playing' | 'paused') => void): () => void {
    return () => {};
  }
  onGameStateChange(_gameState: 'playing' | 'paused', _renderer: WebGLRenderer) {}
}
