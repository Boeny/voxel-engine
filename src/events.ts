//type EventCallback = (e: Event) => void;

export const keys: Record<string, boolean> = {};

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
