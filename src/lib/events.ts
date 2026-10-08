import { EventEmitter } from "events";

// Singleton event bus for SSE broadcast.
// Mutation endpoints call emit() after DB writes;
// the SSE stream endpoint listens and pushes to connected clients.
const globalForEvents = globalThis as unknown as { __eventBus?: EventEmitter };

if (!globalForEvents.__eventBus) {
  globalForEvents.__eventBus = new EventEmitter();
  globalForEvents.__eventBus.setMaxListeners(100);
}

export const eventBus = globalForEvents.__eventBus;

export type AppEvent = "timers:changed" | "orders:changed";

export function emitEvent(event: AppEvent) {
  eventBus.emit(event);
}
