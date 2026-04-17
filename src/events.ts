type EventCallback = (e: Event) => void;

let activeEvents: Record<string, EventCallback> = {};

export function setupEvents(events: Record<string, EventCallback>) {
  cleanupEvents();
  activeEvents = events;
  Object.entries(events).forEach(([eventName, callback]) => {
    window.addEventListener(eventName, callback);
  });
}

export function cleanupEvents() {
  Object.entries(activeEvents).forEach(([eventName, callback]) => {
    window.removeEventListener(eventName, callback);
  });
  activeEvents = {};
}
