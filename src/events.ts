/* eslint-disable import/no-unused-modules */
import { Vector2 } from 'three';

import { mul, sub } from './utils/vector';

enum MouseButtons {
  left = 0,
  middle = 1,
  right = 2,
}

const NOT_PASSIVE: (keyof WindowEventMap)[] = ['touchstart', 'touchmove', 'wheel'];

export const keys: Record<string, boolean> = {};
export const mouse = {
  sensitivity: 0.005,
  touchSensitivity: 2,
  left: false, // on mouse down
  right: false, // on mouse down
  middle: false, // on mouse down
  leftClick: false, // on mouse up
  rightClick: false, // on mouse up
  middleClick: false, // on mouse up
  move: false,
  wheel: 0,
  position: new Vector2(),
  delta: new Vector2(),

  clearDelta() {
    this.delta.set(0, 0);
  },
};

export function setupEvents<E extends keyof WindowEventMap>(events: Record<E, (e: WindowEventMap[E]) => void>) {
  (Object.entries(events) as [E, (e: WindowEventMap[E]) => void][]).forEach(([eventName, callback]) => {
    window.addEventListener(eventName, callback);
  });

  return () => {
    (Object.entries(events) as [E, (e: WindowEventMap[E]) => void][]).forEach(([eventName, callback]) => {
      window.removeEventListener(
        eventName,
        callback,
        NOT_PASSIVE.includes(eventName) ? ({ passive: false } as EventListenerOptions) : undefined,
      );
    });
  };
}

function setupDocumentEvents<E extends keyof DocumentEventMap>(events: Record<E, (e: DocumentEventMap[E]) => void>) {
  (Object.entries(events) as [E, (e: DocumentEventMap[E]) => void][]).forEach(([eventName, callback]) => {
    document.addEventListener(eventName, callback);
  });

  return () => {
    (Object.entries(events) as [E, (e: DocumentEventMap[E]) => void][]).forEach(([eventName, callback]) => {
      document.removeEventListener(eventName, callback);
    });
  };
}

function applyMouseDown(isLeft: boolean, isRight: boolean, isMiddle: boolean, position: Vector2) {
  mouse.position.copy(position);
  mouse.clearDelta();
  mouse.move = false;

  if (isLeft) {
    mouse.left = true;
    mouse.leftClick = false;
  }
  if (isMiddle) {
    mouse.middle = true;
    mouse.middleClick = false;
  }
  if (isRight) {
    mouse.right = true;
    mouse.rightClick = false;
  }
}

function applyMouseUp(isLeft: boolean, isRight: boolean, isMiddle: boolean, position: Vector2) {
  mouse.position.copy(position);
  mouse.clearDelta();
  mouse.move = false;

  if (isLeft) {
    mouse.left = false;
    mouse.leftClick = true;
  }
  if (isMiddle) {
    mouse.middle = false;
    mouse.middleClick = true;
  }
  if (isRight) {
    mouse.right = false;
    mouse.rightClick = true;
  }
}

function applyMouseMove(position: Vector2, sensitivity: number) {
  const movement = sub(position, mouse.position);
  mouse.position.copy(position);
  mouse.delta.add(mul(movement, sensitivity));
  mouse.move = true;
}

export function setupMouseEvents() {
  const onMouseDown = (e: Event) => {
    if (!(e instanceof MouseEvent)) {
      return;
    }

    applyMouseDown(
      e.button === MouseButtons.left,
      e.button === MouseButtons.right,
      e.button === MouseButtons.middle,
      new Vector2(e.clientX, e.clientY),
    );
  };

  const onMouseUp = (e: Event) => {
    if (!(e instanceof MouseEvent)) {
      return;
    }

    applyMouseUp(
      e.button === MouseButtons.left,
      e.button === MouseButtons.right,
      e.button === MouseButtons.middle,
      new Vector2(e.clientX, e.clientY),
    );
  };

  const onMouseMove = (e: Event) => {
    if (!(e instanceof MouseEvent)) {
      return;
    }

    if (document.pointerLockElement) {
      mouse.delta.add(new Vector2(e.movementX || 0, e.movementY || 0));
    } else {
      applyMouseMove(new Vector2(e.clientX, e.clientY), mouse.sensitivity);
    }
  };

  const onWheel = (e: Event) => {
    if (!(e instanceof WheelEvent)) {
      return;
    }

    mouse.wheel += e.deltaY;
  };

  const onTouchStart = (e: Event) => {
    if (!(e instanceof TouchEvent)) {
      return;
    }

    if (e.touches.length > 0) {
      const touch = e.touches[0];
      applyMouseDown(e.touches.length === 1, e.touches.length === 2, false, new Vector2(touch.clientX, touch.clientY));
    }
  };

  const onTouchEnd = (e: Event) => {
    if (!(e instanceof TouchEvent)) {
      return;
    }

    if (e.touches.length > 0) {
      const touch = e.touches[0];
      applyMouseUp(e.touches.length === 1, e.touches.length === 2, false, new Vector2(touch.clientX, touch.clientY));
    }
  };

  const onTouchMove = (e: Event) => {
    if (!(e instanceof TouchEvent)) {
      return;
    }

    if (e.touches.length > 0) {
      const touch = e.touches[0];
      applyMouseMove(new Vector2(touch.clientX, touch.clientY), mouse.touchSensitivity);
    }
  };

  return setupEvents({
    mousedown: onMouseDown,
    mouseup: onMouseUp,
    mousemove: onMouseMove,
    wheel: onWheel,
    touchstart: onTouchStart,
    touchend: onTouchEnd,
    touchmove: onTouchMove,
  });
}

export function setupKeyboardEvents(events: Record<string, (e: KeyboardEvent) => void>) {
  const handleKeyDown = (e: KeyboardEvent) => {
    keys[e.code] = true;
    events['keydown']?.(e);
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
    events['keyup']?.(e);
  };

  return setupEvents({
    keydown: handleKeyDown,
    keyup: handleKeyUp,
  });
}

export function setupPointerLockEvent(onPointerLockChange: (isLocked: boolean) => void) {
  const onPointerLockChangeHandler = () => {
    onPointerLockChange(!!document.pointerLockElement);
  };

  return setupDocumentEvents({
    pointerlockchange: onPointerLockChangeHandler,
  });
}

export const preventDefault = (e: Event) => e.preventDefault();
