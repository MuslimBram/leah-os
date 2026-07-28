// Shared Context Manager — layered, versioned, isolated per owner.
// Layers merge in precedence order: execution > project > agent > global.
// State is client-side (localStorage) so it survives reloads without a backend.

import type { ContextEntry, ContextLayer, MergedContext } from "./types";

const STORAGE_KEY = "leah:context:v1";

function uid() {
  return `ctx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function read(): ContextEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ContextEntry[]) : [];
  } catch {
    return [];
  }
}
function write(rows: ContextEntry[]) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows)); } catch { /* ignore */ }
}

let entries: ContextEntry[] = read();
const listeners = new Set<() => void>();

export function subscribeContext(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() { for (const l of listeners) { try { l(); } catch { /* ignore */ } } write(entries); }

export type SetContextInput = {
  layer: ContextLayer;
  ownerId?: string;
  key: string;
  value: unknown;
};

export const contextService = {
  /** Insert or update — bumps version, timestamps updatedAt. */
  set(input: SetContextInput): ContextEntry {
    const existing = entries.find(
      (e) => e.layer === input.layer && (e.ownerId ?? "") === (input.ownerId ?? "") && e.key === input.key,
    );
    if (existing) {
      existing.value = input.value;
      existing.version += 1;
      existing.updatedAt = Date.now();
      notify();
      return existing;
    }
    const entry: ContextEntry = {
      id: uid(),
      layer: input.layer,
      ownerId: input.ownerId,
      key: input.key,
      value: input.value,
      version: 1,
      updatedAt: Date.now(),
    };
    entries.push(entry);
    notify();
    return entry;
  },

  get(layer: ContextLayer, key: string, ownerId?: string): ContextEntry | undefined {
    return entries.find(
      (e) => e.layer === layer && (e.ownerId ?? "") === (ownerId ?? "") && e.key === key,
    );
  },

  list(layer?: ContextLayer, ownerId?: string): ContextEntry[] {
    return entries.filter((e) => {
      if (layer && e.layer !== layer) return false;
      if (ownerId !== undefined && (e.ownerId ?? "") !== ownerId) return false;
      return true;
    });
  },

  remove(id: string) {
    entries = entries.filter((e) => e.id !== id);
    notify();
  },

  clear() {
    entries = [];
    notify();
  },

  /** Merge layers with precedence exec > project > agent > global. */
  merge(opts: { executionId?: string; projectId?: string; agentId?: string }): MergedContext {
    const execution = this.list("execution", opts.executionId ?? "");
    const project = this.list("project", opts.projectId ?? "");
    const agent = this.list("agent", opts.agentId ?? "");
    const global = this.list("global", "");

    const flat: Record<string, unknown> = {};
    // Lowest precedence first, so higher layers overwrite.
    for (const e of global) flat[e.key] = e.value;
    for (const e of agent) flat[e.key] = e.value;
    for (const e of project) flat[e.key] = e.value;
    for (const e of execution) flat[e.key] = e.value;

    return { execution, project, agent, global, flat };
  },

  /** Copy execution-level entries into project layer — "sync up". */
  syncExecutionToProject(executionId: string, projectId: string) {
    for (const e of this.list("execution", executionId)) {
      this.set({ layer: "project", ownerId: projectId, key: e.key, value: e.value });
    }
  },
};

export type ContextService = typeof contextService;