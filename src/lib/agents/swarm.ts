// Swarm Runtime — turns the orchestrator's generic tasks into agent work.
// Responsibilities:
//  - route a task to the best agent (capability match)
//  - enforce per-agent concurrency slots
//  - build a memory/context-enriched prompt via the Retrieval Engine
//  - allow agents to delegate subtasks (swarm) and await results
//  - broadcast progress on the agent message bus

import { retrievalService } from "@/lib/memory/retrieval";
import { memoryService } from "@/lib/memory/memory-service";
import { augmentPrompt } from "@/lib/skills/engine";
import { estimateTokens } from "@/lib/cost/pricing";
import { optimizeRoute } from "@/lib/cost/optimizer";
import { getCostPolicy } from "@/lib/cost/policy";
import { recordUsage } from "@/lib/cost/telemetry";
import type { Task, TaskExecutor } from "@/lib/core/orchestrator";
import { sendAgentMessage } from "./bus";
import { getAgent, selectAgent } from "./registry";
import type { Agent, AgentContext, AgentResult } from "./types";

export type SubtaskRecord = {
  id: string;
  parentTaskId: string;
  executionId: string;
  agentId: string;
  kind: string;
  title: string;
  status: "running" | "completed" | "failed";
  startedAt: number;
  finishedAt?: number;
  output?: string;
  error?: string;
};

const subtasks: SubtaskRecord[] = [];
const listeners = new Set<() => void>();
const busy = new Map<string, number>();

export function subscribeSwarm(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() {
  for (const l of listeners) { try { l(); } catch { /* isolate */ } }
}

export function listSubtasks(executionId?: string): SubtaskRecord[] {
  const rows = executionId ? subtasks.filter((s) => s.executionId === executionId) : subtasks;
  return [...rows].sort((a, b) => b.startedAt - a.startedAt);
}

export function agentLoad(agentId: string): number {
  return busy.get(agentId) ?? 0;
}

export function clearSwarm() {
  subtasks.length = 0;
  busy.clear();
  notify();
}

async function acquire(agent: Agent) {
  // Wait for a free slot on this agent.
  while ((busy.get(agent.id) ?? 0) >= agent.concurrency) {
    await new Promise((r) => setTimeout(r, 60));
  }
  busy.set(agent.id, (busy.get(agent.id) ?? 0) + 1);
  notify();
}
function release(agent: Agent) {
  busy.set(agent.id, Math.max(0, (busy.get(agent.id) ?? 1) - 1));
  notify();
}

function uid() {
  return `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** Pick the agent for a task: explicit assignment wins, else capability match. */
export function resolveAgent(task: Pick<Task, "kind" | "assignedAi">): Agent | undefined {
  return getAgent(task.assignedAi) ?? selectAgent(task.kind);
}

async function runWithAgent(
  agent: Agent,
  ctx: Omit<AgentContext, "delegate" | "log"> & {
    log: (m: string) => void;
    depth: number;
  },
): Promise<AgentResult> {
  await acquire(agent);
  try {
    const delegate: AgentContext["delegate"] = async (input) => {
      if (ctx.depth >= 2) throw new Error("swarm depth limit reached");
      const child = selectAgent(input.kind);
      if (!child) throw new Error(`no agent for ${input.kind}`);
      const rec: SubtaskRecord = {
        id: uid(),
        parentTaskId: ctx.taskId,
        executionId: ctx.executionId,
        agentId: child.id,
        kind: input.kind,
        title: input.title,
        status: "running",
        startedAt: Date.now(),
      };
      subtasks.push(rec);
      notify();
      sendAgentMessage({
        from: agent.id,
        to: child.id,
        executionId: ctx.executionId,
        content: `Delegim: ${input.title}`,
      });
      try {
        const res = await runWithAgent(child, {
          ...ctx,
          kind: input.kind,
          title: input.title,
          description: input.description,
          prompt: `${ctx.prompt}\n\nSUBTASK: ${input.title}\n${input.description}`,
          depth: ctx.depth + 1,
        });
        rec.status = "completed";
        rec.output = res.output;
        rec.finishedAt = Date.now();
        notify();
        return res;
      } catch (err) {
        rec.status = "failed";
        rec.error = err instanceof Error ? err.message : String(err);
        rec.finishedAt = Date.now();
        notify();
        throw err;
      }
    };

    return await agent.run({ ...ctx, delegate });
  } finally {
    release(agent);
  }
}

/**
 * Orchestrator executor backed by the multi-agent runtime.
 * Install with `orchestrator.setTaskExecutor(agentTaskExecutor)`.
 */
export const agentTaskExecutor: TaskExecutor = async (task) => {
  const agent = resolveAgent(task);
  if (!agent) throw new Error(`no agent available for kind "${task.kind}"`);

  const built = await retrievalService.buildPrompt({
    query: `${task.title}\n${task.description}`,
    executionId: task.executionId,
    agentId: agent.id,
    limit: 5,
  });

  const enrichedPrompt = augmentPrompt(task.kind, built.finalPrompt);

  sendAgentMessage({
    from: "orchestrator",
    to: agent.id,
    executionId: task.executionId,
    content: `Detyrë e re: ${task.title}`,
  });

  const result = await runWithAgent(agent, {
    taskId: task.id,
    executionId: task.executionId,
    kind: task.kind,
    title: task.title,
    description: task.description,
    prompt: enrichedPrompt,
    depth: 0,
    log: (m) => task.logs.push({ ts: Date.now(), level: "info", message: `[${agent.id}] ${m}` }),
  });

  // Cost telemetry: what the optimizer would pick vs. the quality baseline.
  const inputTokens = estimateTokens(enrichedPrompt);
  const outputTokens = estimateTokens(result.output);
  const decision = optimizeRoute({ kind: task.kind, inputTokens, outputTokens, policy: getCostPolicy() });
  recordUsage({
    providerId: decision.provider.id,
    agentId: agent.id,
    executionId: task.executionId,
    taskId: task.id,
    kind: task.kind,
    inputTokens,
    outputTokens,
    cost: decision.estCost,
    baselineCost: decision.baselineCost,
  });

  sendAgentMessage({
    from: agent.id,
    to: "broadcast",
    executionId: task.executionId,
    content: result.output,
  });

  void memoryService.store({
    scope: "agent",
    kind: "response",
    content: `[${agent.name}] ${task.title}\n${result.output}`,
    executionId: task.executionId,
    agentId: agent.id,
    metadata: { taskId: task.id, kind: task.kind },
  });

  return { agent: agent.id, ...result };
};