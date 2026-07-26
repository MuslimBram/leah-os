// Master Orchestrator — Sprint 1 of Leah AI OS.
//
// Owns the end-to-end lifecycle of an execution:
//   Planner → Orchestrator.createExecution → Task Queue → Worker Pool
//   → per-task runner → status/log updates → subscribers (UI, event bus).
//
// The runtime lives client-side for now (in-memory singleton). Persistence
// and remote workers slot in later without changing this contract.

import { emit } from "./event-bus";

export type TaskStatus =
  | "pending"
  | "running"
  | "retrying"
  | "completed"
  | "failed"
  | "cancelled";

export type ExecutionStatus = "queued" | "running" | "completed" | "failed";

export type TaskLog = {
  ts: number;
  level: "info" | "warn" | "error";
  message: string;
};

export type Task = {
  id: string;
  executionId: string;
  kind: string;
  title: string;
  description: string;
  assignedAi: string;
  status: TaskStatus;
  attempts: number;
  maxRetries: number;
  logs: TaskLog[];
  result?: unknown;
  error?: string;
  queuedAt: number;
  startedAt?: number;
  finishedAt?: number;
};

export type Execution = {
  id: string;
  request: string;
  summary: string;
  status: ExecutionStatus;
  createdAt: number;
  finishedAt?: number;
  taskIds: string[];
};

export type ExecutionPlanInput = {
  request: string;
  summary: string;
  tasks: {
    kind: string;
    title: string;
    description: string;
    assignedAi: string;
  }[];
};

export type TaskExecutor = (task: Task) => Promise<unknown>;

type Subscriber = () => void;

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Default executor. Simulates real work so the UI can be exercised end-to-end
 * without a live provider. Fails ~15% of the time so retries are observable.
 * Replaced at runtime via `setTaskExecutor` once real workers land.
 */
const defaultExecutor: TaskExecutor = async (task) => {
  const delay = 400 + Math.floor(Math.random() * 900);
  await new Promise((r) => setTimeout(r, delay));
  if (Math.random() < 0.15) {
    throw new Error(`transient failure while executing ${task.kind}`);
  }
  return { kind: task.kind, ai: task.assignedAi, durationMs: delay };
};

export class Orchestrator {
  private executions = new Map<string, Execution>();
  private tasks = new Map<string, Task>();
  private queue: string[] = [];
  private inFlight = 0;
  private concurrency: number;
  private maxRetries: number;
  private executor: TaskExecutor = defaultExecutor;
  private subs = new Set<Subscriber>();

  constructor(options: { concurrency?: number; maxRetries?: number } = {}) {
    this.concurrency = options.concurrency ?? 2;
    this.maxRetries = options.maxRetries ?? 2;
  }

  setTaskExecutor(executor: TaskExecutor) {
    this.executor = executor;
  }

  subscribe(fn: Subscriber): () => void {
    this.subs.add(fn);
    return () => this.subs.delete(fn);
  }

  private notify() {
    for (const fn of this.subs) {
      try { fn(); } catch { /* isolate subscribers */ }
    }
  }

  listExecutions(): Execution[] {
    return Array.from(this.executions.values()).sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  }

  getExecution(id: string): Execution | undefined {
    return this.executions.get(id);
  }

  getTasks(executionId: string): Task[] {
    const exec = this.executions.get(executionId);
    if (!exec) return [];
    return exec.taskIds
      .map((tid) => this.tasks.get(tid))
      .filter((t): t is Task => Boolean(t));
  }

  createExecution(plan: ExecutionPlanInput): Execution {
    const execId = uid("exec");
    const now = Date.now();
    const taskIds: string[] = [];
    for (const t of plan.tasks) {
      const id = uid("task");
      const task: Task = {
        id,
        executionId: execId,
        kind: t.kind,
        title: t.title,
        description: t.description,
        assignedAi: t.assignedAi,
        status: "pending",
        attempts: 0,
        maxRetries: this.maxRetries,
        logs: [
          { ts: now, level: "info", message: `queued for ${t.assignedAi}` },
        ],
        queuedAt: now,
      };
      this.tasks.set(id, task);
      taskIds.push(id);
      this.queue.push(id);
    }
    const execution: Execution = {
      id: execId,
      request: plan.request,
      summary: plan.summary,
      status: taskIds.length > 0 ? "queued" : "completed",
      createdAt: now,
      taskIds,
    };
    this.executions.set(execId, execution);
    emit({ type: "pipeline.stage", stage: `execution:${execId}`, status: "start" });
    this.notify();
    // Kick the pool without awaiting; work happens in the background.
    void this.pump();
    return execution;
  }

  /** Fill available worker slots from the queue. */
  private async pump() {
    while (this.inFlight < this.concurrency && this.queue.length > 0) {
      const taskId = this.queue.shift();
      if (!taskId) break;
      this.inFlight += 1;
      void this.runTask(taskId).finally(() => {
        this.inFlight -= 1;
        void this.pump();
      });
    }
  }

  private log(task: Task, level: TaskLog["level"], message: string) {
    task.logs.push({ ts: Date.now(), level, message });
  }

  private updateExecutionStatus(executionId: string) {
    const exec = this.executions.get(executionId);
    if (!exec) return;
    const tasks = this.getTasks(executionId);
    const anyRunning = tasks.some((t) => t.status === "running" || t.status === "retrying" || t.status === "pending");
    const anyFailed = tasks.some((t) => t.status === "failed");
    if (anyRunning) {
      exec.status = "running";
    } else {
      exec.status = anyFailed ? "failed" : "completed";
      exec.finishedAt = Date.now();
      emit({
        type: "pipeline.stage",
        stage: `execution:${exec.id}`,
        status: anyFailed ? "fail" : "ok",
      });
    }
  }

  private async runTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;
    task.status = "running";
    task.startedAt = task.startedAt ?? Date.now();
    task.attempts += 1;
    this.log(task, "info", `attempt ${task.attempts} starting`);
    this.updateExecutionStatus(task.executionId);
    this.notify();

    try {
      const result = await this.executor(task);
      task.result = result;
      task.status = "completed";
      task.finishedAt = Date.now();
      this.log(task, "info", "completed");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.log(task, "error", message);
      if (task.attempts <= task.maxRetries) {
        task.status = "retrying";
        this.log(task, "warn", `retry ${task.attempts}/${task.maxRetries}`);
        this.notify();
        // Backoff then requeue.
        const backoff = 200 * task.attempts;
        await new Promise((r) => setTimeout(r, backoff));
        this.queue.push(task.id);
      } else {
        task.status = "failed";
        task.error = message;
        task.finishedAt = Date.now();
      }
    } finally {
      this.updateExecutionStatus(task.executionId);
      this.notify();
    }
  }

  /** For tests / admin: reset all state. */
  reset() {
    this.executions.clear();
    this.tasks.clear();
    this.queue = [];
    this.inFlight = 0;
    this.notify();
  }
}

// Global singleton used by the UI. Tests instantiate their own.
export const orchestrator = new Orchestrator({ concurrency: 2, maxRetries: 2 });