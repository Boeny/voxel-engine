//type EventCallback = (e: Event) => void;

export const keys: Record<string, boolean> = {};
export const mouseDelta = { x: 0, y: 0 };

// export function setupEvents(events: Record<string, EventCallback>) {
//   Object.entries(events).forEach(([eventName, callback]) => {
//     window.addEventListener(eventName, callback);
//   });

//   return () => {
//     Object.entries(events).forEach(([eventName, callback]) => {
//       window.removeEventListener(eventName, callback);
//     });
//   };
// }

export function setupKeyboardEvents(events: Record<string, (e: KeyboardEvent) => void>) {
  const handleKeyDown = (e: KeyboardEvent) => {
    keys[e.code] = true;
    events['keydown']?.(e);
  };
  const handleKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
    events['keyup']?.(e);
  };

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
  };
}

export function setupMouseEvents({ onPointerLockChange }: { onPointerLockChange: (isLocked: boolean) => void }) {
  let previousMousePosition = { x: 0, y: 0 };

  const onMouseDown = (e: MouseEvent) => {
    previousMousePosition = { x: e.clientX, y: e.clientY };
  };

  const onMouseUp = () => {};

  const onMouseMove = (e: MouseEvent) => {
    let movementX = e.movementX || 0;
    let movementY = e.movementY || 0;

    if (document.pointerLockElement) {
      mouseDelta.x += movementX;
      mouseDelta.y += movementY;
    } else {
      movementX = e.clientX - previousMousePosition.x;
      movementY = e.clientY - previousMousePosition.y;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  };

  const onTouchStart = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  };

  const onTouchEnd = () => {};

  const onTouchMove = (e: TouchEvent) => {
    if (e.touches.length > 0) {
      const movementX = e.touches[0].clientX - previousMousePosition.x;
      const movementY = e.touches[0].clientY - previousMousePosition.y;
      previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      mouseDelta.x += movementX * 2.0;
      mouseDelta.y += movementY * 2.0;
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
