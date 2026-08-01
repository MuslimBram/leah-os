// Workflow definitions store — client-side, persisted, subscribable.
import type { Workflow } from "./types";

const STORAGE_KEY = "leah:workflows:v1";

function uid() {
  return `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

let workflows: Workflow[] = [];
const listeners = new Set<() => void>();

function persist() {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows)); } catch { /* ignore */ }
}
function notify() {
  for (const l of listeners) { try { l(); } catch { /* isolate */ } }
  persist();
}

export function subscribeWorkflows(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function loadWorkflows() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) workflows = JSON.parse(raw) as Workflow[];
  } catch { /* ignore */ }
}

export function listWorkflows(): Workflow[] {
  return [...workflows].sort((a, b) => b.createdAt - a.createdAt);
}

export function getWorkflow(id: string): Workflow | undefined {
  return workflows.find((w) => w.id === id);
}

export function upsertWorkflow(
  input: Omit<Workflow, "id" | "createdAt"> & { id?: string; createdAt?: number },
): Workflow {
  const existing = input.id ? workflows.find((w) => w.id === input.id) : undefined;
  if (existing) {
    Object.assign(existing, input);
    notify();
    return existing;
  }
  const wf: Workflow = { ...input, id: input.id ?? uid(), createdAt: input.createdAt ?? Date.now() };
  workflows.push(wf);
  notify();
  return wf;
}

export function removeWorkflow(id: string) {
  workflows = workflows.filter((w) => w.id !== id);
  notify();
}

export function setWorkflowEnabled(id: string, enabled: boolean) {
  const wf = getWorkflow(id);
  if (!wf) return;
  wf.enabled = enabled;
  wf.nextRunAt = enabled && wf.trigger.type === "interval" ? Date.now() + wf.trigger.everyMs : undefined;
  notify();
}

export function markWorkflowRun(id: string) {
  const wf = getWorkflow(id);
  if (!wf) return;
  wf.lastRunAt = Date.now();
  wf.nextRunAt = wf.trigger.type === "interval" ? Date.now() + wf.trigger.everyMs : undefined;
  notify();
}

export function clearWorkflows() {
  workflows = [];
  notify();
}