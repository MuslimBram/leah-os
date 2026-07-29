// Agent Registry — add or remove an agent with one register call.
// Nothing in the core imports a concrete agent module.

import { emit } from "@/lib/core/event-bus";
import type { Agent, AgentCapability } from "./types";

const agents = new Map<string, Agent>();
const listeners = new Set<() => void>();

export function subscribeAgents(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  for (const l of listeners) { try { l(); } catch { /* isolate */ } }
}

export function registerAgent(agent: Agent) {
  agents.set(agent.id, agent);
  emit({ type: "pipeline.stage", stage: `agent:${agent.id}`, status: "ok" });
  notify();
}

export function unregisterAgent(id: string) {
  agents.delete(id);
  notify();
}

export function listAgents(): Agent[] {
  return Array.from(agents.values());
}

export function getAgent(id: string): Agent | undefined {
  return agents.get(id);
}

/** Best agent for a capability; falls back to the first registered agent. */
export function selectAgent(capability: AgentCapability | string): Agent | undefined {
  const all = listAgents();
  return (
    all.find((a) => a.capabilities.includes(capability as AgentCapability)) ?? all[0]
  );
}