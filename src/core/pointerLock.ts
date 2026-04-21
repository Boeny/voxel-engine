import { Camera } from 'three';

export class PointerLock {
  lockIsRequesting = false;
  mouseDelta = { x: 0, y: 0 };
  mouse = { left: false, right: false };

  xAngleLimit = Math.PI / 2;
  touchSensivity = 2.0;
  sensitivity = 0.002;

  setupEvents({ onPointerLockChange }: { onPointerLockChange: (isLocked: boolean) => void }) {
    const previousMousePosition = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      previousMousePosition.x = e.clientX;
      previousMousePosition.y = e.clientY;

      if (e.button === 0) {
        this.mouse.left = true;
      }
      if (e.button === 1) {
        this.mouse.right = true;
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        this.mouse.left = false;
      }
      if (e.button === 1) {
        this.mouse.right = false;
      }
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
        previousMousePosition.x = e.clientX;
        previousMousePosition.y = e.clientY;
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        previousMousePosition.x = e.touches[0].clientX;
        previousMousePosition.y = e.touches[0].clientY;

        if (e.touches.length === 1) {
          this.mouse.left = true;
        }
        if (e.touches.length === 2) {
          this.mouse.right = true;
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        this.mouse.left = false;
      }
      if (e.touches.length === 2) {
        this.mouse.right = false;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const movementX = e.touches[0].clientX - previousMousePosition.x;
        const movementY = e.touches[0].clientY - previousMousePosition.y;
        previousMousePosition.x = e.touches[0].clientX;
        previousMousePosition.y = e.touches[0].clientY;

        this.mouseDelta.x += movementX * this.touchSensivity;
        this.mouseDelta.y += movementY * this.touchSensivity;
      }
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchmove', onTouchMove, { passive: false });

    const onPointerLockChangeHandler = () => {
      onPointerLockChange(!!document.pointerLockElement);
    };
    document.addEventListener('pointerlockchange', onPointerLockChangeHandler);

    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mouseup', onMouseUp);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
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
