import { Camera, Vector3, WebGLRenderer } from 'three';

export class Controller<State> {
  velocity = new Vector3();

  constructor(
    protected camera: Camera,
    private getState: () => State,
  ) {}

  get state(): State {
    return this.getState();
  }

  setupEvents(): () => void {
    return () => {};
  }
  onGameStateChange(_: WebGLRenderer) {}
}
