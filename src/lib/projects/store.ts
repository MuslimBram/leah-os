// Project + artifact store — client-side, persisted, subscribable.
// Swap localStorage for Lovable Cloud later without touching callers.

import type { Artifact, Project, ProjectStatus } from "./types";

const PROJECT_KEY = "leah:projects:v1";
const ARTIFACT_KEY = "leah:artifacts:v1";

function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function read<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}
function write(key: string, rows: unknown) {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(key, JSON.stringify(rows)); } catch { /* ignore */ }
}

let projects: Project[] = read<Project>(PROJECT_KEY);
let artifacts: Artifact[] = read<Artifact>(ARTIFACT_KEY);
const listeners = new Set<() => void>();

export function subscribeProjects(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const l of listeners) { try { l(); } catch { /* isolate */ } }
  write(PROJECT_KEY, projects);
  write(ARTIFACT_KEY, artifacts);
}

export function listProjects(): Project[] {
  return [...projects].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProject(id: string): Project | undefined {
  return projects.find((p) => p.id === id);
}

export function createProject(
  input: Pick<Project, "name" | "description"> & Partial<Project>,
): Project {
  const now = Date.now();
  const project: Project = {
    id: input.id ?? uid("prj"),
    name: input.name,
    description: input.description,
    goal: input.goal ?? input.description,
    stack: input.stack ?? [],
    repo: input.repo,
    status: input.status ?? "planning",
    createdAt: now,
    updatedAt: now,
    executionIds: input.executionIds ?? [],
  };
  projects.push(project);
  notify();
  return project;
}

export function updateProject(id: string, patch: Partial<Project>): Project | undefined {
  const project = getProject(id);
  if (!project) return undefined;
  Object.assign(project, patch, { updatedAt: Date.now() });
  notify();
  return project;
}

export function setProjectStatus(id: string, status: ProjectStatus) {
  updateProject(id, { status });
}

export function attachExecution(projectId: string, executionId: string) {
  const project = getProject(projectId);
  if (!project || project.executionIds.includes(executionId)) return;
  project.executionIds.push(executionId);
  project.updatedAt = Date.now();
  notify();
}

export function removeProject(id: string) {
  projects = projects.filter((p) => p.id !== id);
  artifacts = artifacts.filter((a) => a.projectId !== id);
  notify();
}

/** Reverse lookup used by the bootstrap to route task results to a project. */
export function projectForExecution(executionId: string): Project | undefined {
  return projects.find((p) => p.executionIds.includes(executionId));
}

export function addArtifact(input: Omit<Artifact, "id" | "createdAt">): Artifact {
  const artifact: Artifact = { ...input, id: uid("art"), createdAt: Date.now() };
  artifacts.push(artifact);
  const project = getProject(input.projectId);
  if (project) project.updatedAt = artifact.createdAt;
  notify();
  return artifact;
}

export function listArtifacts(projectId?: string): Artifact[] {
  const rows = projectId ? artifacts.filter((a) => a.projectId === projectId) : artifacts;
  return [...rows].sort((a, b) => b.createdAt - a.createdAt);
}

export function clearProjects() {
  projects = [];
  artifacts = [];
  notify();
}