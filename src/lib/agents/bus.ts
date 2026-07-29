// Inter-agent message bus — lightweight, in-memory, subscribable.
import type { AgentMessage } from "./types";

const messages: AgentMessage[] = [];
const listeners = new Set<() => void>();
const MAX = 300;

export function subscribeAgentBus(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  for (const l of listeners) { try { l(); } catch { /* isolate */ } }
}

export function sendAgentMessage(
  input: Omit<AgentMessage, "id" | "ts">,
): AgentMessage {
  const msg: AgentMessage = {
    ...input,
    id: `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
  };
  messages.push(msg);
  if (messages.length > MAX) messages.splice(0, messages.length - MAX);
  notify();
  return msg;
}

export function listAgentMessages(executionId?: string): AgentMessage[] {
  const rows = executionId
    ? messages.filter((m) => m.executionId === executionId)
    : messages;
  return [...rows].sort((a, b) => b.ts - a.ts);
}

export function clearAgentMessages() {
  messages.length = 0;
  notify();
}