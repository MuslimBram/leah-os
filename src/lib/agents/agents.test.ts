// @ts-ignore -- bun's built-in test runner
import { describe, expect, it, beforeEach } from "bun:test";
import { Orchestrator } from "@/lib/core/orchestrator";
import { listAgents, registerAgent, selectAgent, unregisterAgent } from "./registry";
import { seedAgents } from "./agents.seed";
import { agentTaskExecutor, clearSwarm, listSubtasks } from "./swarm";
import { clearAgentMessages, listAgentMessages } from "./bus";

beforeEach(() => {
  seedAgents();
  clearSwarm();
  clearAgentMessages();
});

describe("agent registry", () => {
  it("seeds the built-in roster", () => {
    expect(listAgents().length).toBeGreaterThanOrEqual(7);
  });

  it("selects an agent by capability", () => {
    expect(selectAgent("frontend")?.id).toBe("frontend-eng");
    expect(selectAgent("testing")?.id).toBe("tester");
  });

  it("registers and unregisters without touching the core", () => {
    registerAgent({
      id: "tmp", name: "Tmp", role: "engineer", providerId: "gpt",
      capabilities: ["review"], description: "", concurrency: 1, accent: "#fff",
      run: async () => ({ output: "ok" }),
    });
    expect(listAgents().find((a) => a.id === "tmp")).toBeDefined();
    unregisterAgent("tmp");
    expect(listAgents().find((a) => a.id === "tmp")).toBeUndefined();
  });
});

describe("swarm executor", () => {
  it("runs orchestrator tasks through agents and emits messages", async () => {
    const orch = new Orchestrator({ concurrency: 2, maxRetries: 0 });
    orch.setTaskExecutor(agentTaskExecutor);
    const exec = orch.createExecution({
      request: "test", summary: "test",
      tasks: [{ kind: "frontend", title: "UI", description: "build ui", assignedAi: "frontend-eng" }],
    });
    await new Promise((r) => setTimeout(r, 2500));
    const tasks = orch.getTasks(exec.id);
    expect(tasks[0].status).toBe("completed");
    expect(listAgentMessages(exec.id).length).toBeGreaterThan(0);
  });

  it("supports delegation into subtasks", async () => {
    registerAgent({
      id: "lead", name: "Lead", role: "architect", providerId: "claude",
      capabilities: [], description: "", concurrency: 1, accent: "#fff",
      run: async (ctx) => {
        await ctx.delegate({ kind: "testing", title: "write tests", description: "" });
        return { output: "done" };
      },
    });
    const orch = new Orchestrator({ concurrency: 1, maxRetries: 0 });
    orch.setTaskExecutor(agentTaskExecutor);
    const exec = orch.createExecution({
      request: "r", summary: "s",
      tasks: [{ kind: "plan", title: "Plan", description: "", assignedAi: "lead" }],
    });
    await new Promise((r) => setTimeout(r, 3000));
    expect(orch.getTasks(exec.id)[0].status).toBe("completed");
    expect(listSubtasks(exec.id).some((s) => s.status === "completed")).toBe(true);
    unregisterAgent("lead");
  });
});

describe("priority queue", () => {
  it("runs higher priority tasks first", async () => {
    const order: string[] = [];
    const orch = new Orchestrator({ concurrency: 1, maxRetries: 0 });
    orch.setTaskExecutor(async (t) => { order.push(t.title); return null; });
    orch.createExecution({
      request: "r", summary: "s",
      tasks: [
        { kind: "docs", title: "low", description: "", assignedAi: "writer", priority: 0 },
        { kind: "backend", title: "high", description: "", assignedAi: "backend-eng", priority: 10 },
      ],
    });
    await new Promise((r) => setTimeout(r, 500));
    expect(order[0]).toBe("high");
  });
});