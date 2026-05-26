import { Camera } from 'three';

import { mouse } from '@/events';

export class PointerLock {
  lockIsRequesting = false;
  xAngleLimit = Math.PI / 2;

  update(camera: Camera) {
    if (this.lockIsRequesting) {
      return;
    }

    // Camera rotation (6DOF local rotation)
    if (mouse.move) {
      camera.rotation.y -= mouse.delta.x;
      camera.rotation.x -= mouse.delta.y;
      camera.rotation.x = Math.max(-this.xAngleLimit, Math.min(this.xAngleLimit, camera.rotation.x));

      mouse.delta.set(0, 0);
    }
  }

  async requestPointerLock(domElement: HTMLCanvasElement) {
    this.lockIsRequesting = true;

    try {
      await domElement.requestPointerLock();
      this.lockIsRequesting = false;
    } catch (e) {
      setTimeout(() => this.requestPointerLock(domElement), 100);
    }
  }
}
