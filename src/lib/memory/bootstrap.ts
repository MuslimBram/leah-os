// Wires the orchestrator to the memory subsystem: every completed / failed
// task is captured as an execution-scoped memory record. Imported once from
// the router bootstrap so consumers don't need to know about it.

import { orchestrator } from "@/lib/core/orchestrator";
import { memoryService } from "./memory-service";

let installed = false;
const seenFinished = new Set<string>();

export function installMemoryBootstrap() {
  if (installed) return;
  installed = true;

  orchestrator.subscribe(() => {
    for (const exec of orchestrator.listExecutions()) {
      for (const task of orchestrator.getTasks(exec.id)) {
        if (task.status !== "completed" && task.status !== "failed") continue;
        if (seenFinished.has(task.id)) continue;
        seenFinished.add(task.id);
        void memoryService.store({
          scope: "execution",
          kind: task.status === "failed" ? "log" : "response",
          content: `[${task.kind}] ${task.title}\n${task.description}\nstatus=${task.status}${task.error ? `\nerror=${task.error}` : ""}`,
          executionId: exec.id,
          agentId: task.assignedAi,
          metadata: {
            taskId: task.id,
            attempts: task.attempts,
            durationMs: (task.finishedAt ?? Date.now()) - (task.startedAt ?? task.queuedAt),
          },
        });
      }
    }
  });
}