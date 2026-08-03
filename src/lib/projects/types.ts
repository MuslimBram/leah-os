// Sprint 7 — Project Workspace types.
// A Project is the Single Source of Truth container: it owns executions,
// artifacts and its own context layer. Nothing in core imports this module.

export type ProjectStatus = "planning" | "building" | "testing" | "deployed" | "failed";

export type ArtifactKind = "code" | "test" | "doc" | "config" | "deploy" | "note";

export type Project = {
  id: string;
  name: string;
  description: string;
  goal: string;
  stack: string[];
  repo?: string;
  status: ProjectStatus;
  createdAt: number;
  updatedAt: number;
  executionIds: string[];
};

export type Artifact = {
  id: string;
  projectId: string;
  executionId?: string;
  taskId?: string;
  kind: ArtifactKind;
  path: string;
  summary: string;
  agentId?: string;
  createdAt: number;
};

export type BuildStep = {
  kind: string;
  title: string;
  description: string;
  priority?: number;
};