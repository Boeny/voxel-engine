import { Camera, Vector3, WebGLRenderer } from 'three';

export class Controller<State> {
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

  getDistanceToObject(object: { position: Vector3; radius: number } | null) {
    if (!object) {
      return 0;
    }

    return this.camera.position.distanceTo(object.position) - object.radius;
  }
}
