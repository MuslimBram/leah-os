// Global cost policy — read by the swarm when routing tasks.
import type { CostPolicy } from "./optimizer";

let policy: CostPolicy = "balanced";
const listeners = new Set<() => void>();

export function subscribePolicy(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getCostPolicy(): CostPolicy {
  return policy;
}

export function setCostPolicy(next: CostPolicy) {
  policy = next;
  for (const l of listeners) { try { l(); } catch { /* isolate */ } }
}