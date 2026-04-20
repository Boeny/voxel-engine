import { Camera, WebGLRenderer } from 'three';

export class PointerLock {
  lockIsRequesting = false;
  xAngleLimit = Math.PI / 2;
  mouseDelta = { x: 0, y: 0 };

  // eslint-disable-next-line no-useless-constructor
  constructor(private sensitivity: number) {}

  setupMouseEvents({ onPointerLockChange }: { onPointerLockChange: (isLocked: boolean) => void }) {
    const previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      previousMousePosition.x = e.clientX;
      previousMousePosition.y = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      let movementX = e.movementX || 0;
      let movementY = e.movementY || 0;

      if (document.pointerLockElement) {
        this.mouseDelta.x += movementX;
        this.mouseDelta.y += movementY;
      } else {
        movementX = e.clientX - previousMousePosition.x;
        movementY = e.clientY - previousMousePosition.y;
        onMouseDown(e);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        previousMousePosition.x = e.touches[0].clientX;
        previousMousePosition.y = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const movementX = e.touches[0].clientX - previousMousePosition.x;
        const movementY = e.touches[0].clientY - previousMousePosition.y;
        onTouchStart(e);

        this.mouseDelta.x += movementX * 2.0;
        this.mouseDelta.y += movementY * 2.0;
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    const onPointerLockChangeHandler = () => {
      onPointerLockChange(!!document.pointerLockElement);
    };
    document.addEventListener('pointerlockchange', onPointerLockChangeHandler);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('pointerlockchange', onPointerLockChangeHandler);
    };
  }

  update(camera: Camera) {
    if (this.lockIsRequesting) {
      return;
    }

    // Camera rotation (6DOF local rotation)
    if (this.mouseDelta.x !== 0 || this.mouseDelta.y !== 0) {
      camera.rotation.y -= this.mouseDelta.x * this.sensitivity;
      camera.rotation.x -= this.mouseDelta.y * this.sensitivity;
      camera.rotation.x = Math.max(-this.xAngleLimit, Math.min(this.xAngleLimit, camera.rotation.x));
      this.mouseDelta.x = 0;
      this.mouseDelta.y = 0;
    }
  }

  async requestPointerLock(renderer: WebGLRenderer) {
    this.lockIsRequesting = true;

    try {
      await renderer.domElement.requestPointerLock();
      this.lockIsRequesting = false;
    } catch (e) {
      setTimeout(() => this.requestPointerLock(renderer), 100);
    }
  }
}
