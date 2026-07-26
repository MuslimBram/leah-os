// Unit tests for the Master Orchestrator. Runnable with `bun test`.

import { describe, expect, it } from "bun:test";
import { Orchestrator, type Task } from "./orchestrator";

function samplePlan(count = 3) {
  return {
    request: "test",
    summary: "sample",
    tasks: Array.from({ length: count }, (_, i) => ({
      kind: "backend",
      title: `Task ${i}`,
      description: "desc",
      assignedAi: "claude",
    })),
  };
}

async function waitFor(fn: () => boolean, timeoutMs = 2000) {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error("timeout");
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("Orchestrator", () => {
  it("enqueues tasks from a plan and marks them pending", () => {
    const orch = new Orchestrator({ concurrency: 0, maxRetries: 0 });
    const exec = orch.createExecution(samplePlan(2));
    expect(exec.taskIds).toHaveLength(2);
    const tasks = orch.getTasks(exec.id);
    expect(tasks.every((t) => t.status === "pending")).toBe(true);
    expect(exec.status).toBe("queued");
  });

  it("runs tasks to completion when the executor succeeds", async () => {
    const orch = new Orchestrator({ concurrency: 2, maxRetries: 0 });
    orch.setTaskExecutor(async () => ({ ok: true }));
    const exec = orch.createExecution(samplePlan(3));
    await waitFor(() => orch.getExecution(exec.id)?.status === "completed");
    const tasks = orch.getTasks(exec.id);
    expect(tasks.every((t) => t.status === "completed")).toBe(true);
  });

  it("retries failing tasks up to maxRetries and then marks failed", async () => {
    const orch = new Orchestrator({ concurrency: 1, maxRetries: 2 });
    let attempts = 0;
    orch.setTaskExecutor(async () => {
      attempts += 1;
      throw new Error("boom");
    });
    const exec = orch.createExecution(samplePlan(1));
    await waitFor(() => orch.getExecution(exec.id)?.status === "failed");
    const [task] = orch.getTasks(exec.id) as [Task];
    expect(task.status).toBe("failed");
    // 1 initial attempt + 2 retries = 3 total
    expect(attempts).toBe(3);
    expect(task.attempts).toBe(3);
    expect(task.logs.some((l) => l.level === "error")).toBe(true);
  });

  it("recovers a task that fails once then succeeds", async () => {
    const orch = new Orchestrator({ concurrency: 1, maxRetries: 3 });
    let n = 0;
    orch.setTaskExecutor(async () => {
      n += 1;
      if (n === 1) throw new Error("flaky");
      return { ok: true };
    });
    const exec = orch.createExecution(samplePlan(1));
    await waitFor(() => orch.getExecution(exec.id)?.status === "completed");
    const [task] = orch.getTasks(exec.id) as [Task];
    expect(task.status).toBe("completed");
    expect(task.attempts).toBe(2);
  });

  it("notifies subscribers on state changes", async () => {
    const orch = new Orchestrator({ concurrency: 1, maxRetries: 0 });
    orch.setTaskExecutor(async () => "ok");
    let calls = 0;
    orch.subscribe(() => { calls += 1; });
    orch.createExecution(samplePlan(1));
    await waitFor(() => calls > 2);
    expect(calls).toBeGreaterThan(2);
  });
});