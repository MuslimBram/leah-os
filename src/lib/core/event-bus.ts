// Minimal typed event bus. Core modules and plugins publish/subscribe here
// instead of importing each other directly. Keep the surface tiny — add event
// names as needed; do NOT turn this into a message broker.

export type LeahEvent =
  | { type: "plugin.enabled"; id: string }
  | { type: "plugin.disabled"; id: string }
  | { type: "plugin.invoked"; id: string; capability: string; ok: boolean }
  | { type: "connector.connected"; id: string }
  | { type: "connector.disconnected"; id: string }
  | { type: "ai.request"; provider: string; model: string }
  | { type: "ai.response"; provider: string; model: string; ok: boolean }
  | { type: "webhook.received"; source: string; event: string }
  | { type: "pipeline.stage"; stage: string; status: "start" | "ok" | "fail" };

type Handler = (e: LeahEvent) => void;
const handlers = new Set<Handler>();

export function emit(event: LeahEvent) {
  for (const h of handlers) {
    try { h(event); } catch { /* isolate subscribers */ }
  }
}

export function on(handler: Handler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}