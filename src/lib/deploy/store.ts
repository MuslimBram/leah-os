// Deployment history — persisted client-side, subscribable.

import type { Deployment, DeployStatus } from "./types";

const KEY = "leah:deployments:v1";

function read(): Deployment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Deployment[]) : [];
  } catch {
    return [];
  }
}

let deployments: Deployment[] = read();
const listeners = new Set<() => void>();

export function subscribeDeployments(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const l of listeners) { try { l(); } catch { /* isolate */ } }
  if (typeof window !== "undefined") {
    try { window.localStorage.setItem(KEY, JSON.stringify(deployments)); } catch { /* ignore */ }
  }
}

export function listDeployments(projectId?: string): Deployment[] {
  const rows = projectId ? deployments.filter((d) => d.projectId === projectId) : deployments;
  return [...rows].sort((a, b) => b.createdAt - a.createdAt);
}

export function addDeployment(input: Omit<Deployment, "id" | "createdAt">): Deployment {
  const row: Deployment = {
    ...input,
    id: `dep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  deployments.push(row);
  notify();
  return row;
}

export function deploymentForExecution(executionId: string): Deployment | undefined {
  return deployments.find((d) => d.executionId === executionId);
}

export function setDeploymentStatus(id: string, status: DeployStatus) {
  const row = deployments.find((d) => d.id === id);
  if (!row) return;
  row.status = status;
  if (status === "succeeded" || status === "failed") row.finishedAt = Date.now();
  notify();
}

export function clearDeployments() {
  deployments = [];
  notify();
}