// Workflow Engine — resolves a step DAG into waves and executes each wave
// through the Orchestrator. Depends only on the orchestrator contract, so
// agents/executors stay swappable.

import { orchestrator } from "@/lib/core/orchestrator";
import { emit } from "@/lib/core/event-bus";
import { markWorkflowRun } from "./store";
import type { Workflow, WorkflowRun, WorkflowStep } from "./types";

const runs: WorkflowRun[] = [];
const listeners = new Set<() => void>();
const active = new Set<string>();

export function subscribeWorkflowRuns(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() { for (const l of listeners) { try { l(); } catch { /* isolate */ } } }

export function listWorkflowRuns(workflowId?: string): WorkflowRun[] {
  const rows = workflowId ? runs.filter((r) => r.workflowId === workflowId) : runs;
  return [...rows].sort((a, b) => b.startedAt - a.startedAt);
}

export function clearWorkflowRuns() {
  runs.length = 0;
  active.clear();
  notify();
}

export function isWorkflowRunning(workflowId: string) {
  return active.has(workflowId);
}

/** Topological wave resolution. Throws on cycles or unknown dependencies. */
export function resolveWaves(steps: WorkflowStep[]): WorkflowStep[][] {
  const ids = new Set(steps.map((s) => s.id));
  for (const s of steps) {
    for (const dep of s.dependsOn ?? []) {
      if (!ids.has(dep)) throw new Error(`unknown dependency "${dep}" in step "${s.id}"`);
    }
  }
  const done = new Set<string>();
  const waves: WorkflowStep[][] = [];
  let remaining = [...steps];
  while (remaining.length > 0) {
    const wave = remaining.filter((s) => (s.dependsOn ?? []).every((d) => done.has(d)));
    if (wave.length === 0) throw new Error("cycle detected in workflow steps");
    waves.push(wave);
    for (const s of wave) done.add(s.id);
    remaining = remaining.filter((s) => !done.has(s.id));
  }
  return waves;
}

function waitForExecution(executionId: string, pollMs = 80): Promise<"completed" | "failed"> {
  return new Promise((resolve) => {
    const check = () => {
      const exec = orchestrator.getExecution(executionId);
      if (!exec) return resolve("failed");
      if (exec.status === "completed" || exec.status === "failed") return resolve(exec.status);
      setTimeout(check, pollMs);
    };
    check();
  });
}

function uid() {
  return `wfr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Execute a workflow wave-by-wave. Later waves are skipped if one fails. */
export async function runWorkflow(
  wf: Workflow,
  opts: { trigger?: string } = {},
): Promise<WorkflowRun> {
  const run: WorkflowRun = {
    id: uid(),
    workflowId: wf.id,
    workflowName: wf.name,
    status: "running",
    trigger: opts.trigger ?? wf.trigger.type,
    waves: [],
    startedAt: Date.now(),
  };
  runs.unshift(run);
  active.add(wf.id);
  markWorkflowRun(wf.id);
  emit({ type: "pipeline.stage", stage: `workflow:${wf.id}`, status: "start" });
  notify();

  try {
    const waves = resolveWaves(wf.steps);
    for (let i = 0; i < waves.length; i += 1) {
      const wave = waves[i]!;
      const exec = orchestrator.createExecution({
        request: `${wf.name} · wave ${i + 1}/${waves.length}`,
        summary: wf.description,
        tasks: wave.map((s) => ({
          kind: s.kind,
          title: s.title,
          description: s.description,
          assignedAi: s.assignedAi ?? s.kind,
          priority: s.priority ?? waves.length - i,
        })),
      });
      const record = { index: i, stepIds: wave.map((s) => s.id), executionId: exec.id, status: "running" as const };
      run.waves.push(record);
      notify();
      const status = await waitForExecution(exec.id);
      run.waves[i]!.status = status;
      notify();
      if (status === "failed") throw new Error(`wave ${i + 1} failed`);
    }
    run.status = "completed";
  } catch (err) {
    run.status = "failed";
    run.error = err instanceof Error ? err.message : String(err);
  } finally {
    run.finishedAt = Date.now();
    active.delete(wf.id);
    emit({
      type: "pipeline.stage",
      stage: `workflow:${wf.id}`,
      status: run.status === "completed" ? "ok" : "fail",
    });
    notify();
  }
  return run;
}