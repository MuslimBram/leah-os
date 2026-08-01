// @ts-ignore -- bun's built-in test runner
import { describe, expect, it, beforeEach } from "bun:test";
import { resolveWaves, runWorkflow, listWorkflowRuns, clearWorkflowRuns } from "./engine";
import { clearWorkflows, listWorkflows, setWorkflowEnabled, upsertWorkflow } from "./store";
import { schedulerTick } from "./scheduler";
import { orchestrator } from "@/lib/core/orchestrator";
import type { Workflow } from "./types";

function wf(partial: Partial<Workflow> = {}): Workflow {
  return {
    id: "wf_test",
    name: "Test",
    description: "test workflow",
    trigger: { type: "manual" },
    enabled: true,
    createdAt: Date.now(),
    steps: [
      { id: "a", kind: "plan", title: "A", description: "a" },
      { id: "b", kind: "backend", title: "B", description: "b", dependsOn: ["a"] },
      { id: "c", kind: "frontend", title: "C", description: "c", dependsOn: ["a"] },
      { id: "d", kind: "testing", title: "D", description: "d", dependsOn: ["b", "c"] },
    ],
    ...partial,
  };
}

describe("workflow engine", () => {
  beforeEach(() => {
    clearWorkflows();
    clearWorkflowRuns();
    orchestrator.reset();
    orchestrator.setTaskExecutor(async () => ({ ok: true }));
  });

  it("resolves a DAG into dependency waves", () => {
    const waves = resolveWaves(wf().steps).map((w) => w.map((s) => s.id));
    expect(waves).toEqual([["a"], ["b", "c"], ["d"]]);
  });

  it("throws on cycles", () => {
    expect(() =>
      resolveWaves([
        { id: "a", kind: "plan", title: "A", description: "", dependsOn: ["b"] },
        { id: "b", kind: "plan", title: "B", description: "", dependsOn: ["a"] },
      ]),
    ).toThrow(/cycle/);
  });

  it("throws on unknown dependencies", () => {
    expect(() =>
      resolveWaves([{ id: "a", kind: "plan", title: "A", description: "", dependsOn: ["zz"] }]),
    ).toThrow(/unknown dependency/);
  });

  it("runs every wave in order and completes", async () => {
    const run = await runWorkflow(wf(), { trigger: "manual" });
    expect(run.status).toBe("completed");
    expect(run.waves).toHaveLength(3);
    expect(run.waves.every((w) => w.status === "completed")).toBe(true);
    expect(listWorkflowRuns("wf_test")).toHaveLength(1);
  });

  it("stops after a failing wave", async () => {
    orchestrator.setTaskExecutor(async () => { throw new Error("boom"); });
    const run = await runWorkflow(wf({ steps: [{ id: "a", kind: "plan", title: "A", description: "" }] }));
    expect(run.status).toBe("failed");
    expect(run.waves[0]?.status).toBe("failed");
  });

  it("stores and toggles workflows", () => {
    upsertWorkflow(wf({ id: "wf_x", enabled: false }));
    expect(listWorkflows()).toHaveLength(1);
    setWorkflowEnabled("wf_x", true);
    expect(listWorkflows()[0]?.enabled).toBe(true);
  });

  it("schedules interval workflows when due", async () => {
    upsertWorkflow(wf({ id: "wf_i", trigger: { type: "interval", everyMs: 1000 }, enabled: true, steps: [{ id: "a", kind: "plan", title: "A", description: "" }] }));
    schedulerTick(Date.now() + 5000);
    await new Promise((r) => setTimeout(r, 300));
    expect(listWorkflowRuns("wf_i").length).toBeGreaterThan(0);
  });
});