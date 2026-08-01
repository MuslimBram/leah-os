// Sprint 4 — Workflow Engine + Scheduler types.
// A workflow is a declarative DAG of steps. The engine resolves dependencies
// into waves and hands each wave to the Orchestrator (which routes to agents).

export type WorkflowStep = {
  id: string;
  kind: string;
  title: string;
  description: string;
  /** Optional explicit agent id; otherwise capability routing picks one. */
  assignedAi?: string;
  priority?: number;
  /** Step ids that must complete before this one starts. */
  dependsOn?: string[];
};

export type WorkflowTrigger =
  | { type: "manual" }
  | { type: "interval"; everyMs: number }
  | { type: "event"; event: string };

export type Workflow = {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  enabled: boolean;
  steps: WorkflowStep[];
  createdAt: number;
  lastRunAt?: number;
  nextRunAt?: number;
};

export type WorkflowRunStatus = "running" | "completed" | "failed";

export type WorkflowRun = {
  id: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowRunStatus;
  trigger: string;
  waves: { index: number; stepIds: string[]; executionId: string; status: WorkflowRunStatus }[];
  startedAt: number;
  finishedAt?: number;
  error?: string;
};