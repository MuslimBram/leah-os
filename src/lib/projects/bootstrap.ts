// Wires the orchestrator to the project workspace: every finished task that
// belongs to a project execution becomes an artifact, and the project status
// follows the execution outcome.

import { orchestrator } from "@/lib/core/orchestrator";
import { artifactForKind } from "./blueprint";
import { addArtifact, listProjects, projectForExecution, setProjectStatus } from "./store";

let installed = false;
const seenTasks = new Set<string>();
const seenExecutions = new Set<string>();

export function installProjectBootstrap() {
  if (installed) return;
  installed = true;

  orchestrator.subscribe(() => {
    if (listProjects().length === 0) return;
    for (const exec of orchestrator.listExecutions()) {
      const project = projectForExecution(exec.id);
      if (!project) continue;

      for (const task of orchestrator.getTasks(exec.id)) {
        if (task.status !== "completed") continue;
        if (seenTasks.has(task.id)) continue;
        seenTasks.add(task.id);
        const mapped = artifactForKind(task.kind);
        addArtifact({
          projectId: project.id,
          executionId: exec.id,
          taskId: task.id,
          kind: mapped.kind,
          path: mapped.path,
          summary: task.title,
          agentId: task.assignedAi,
        });
      }

      if (exec.status === "completed" || exec.status === "failed") {
        const key = `${exec.id}:${exec.status}`;
        if (seenExecutions.has(key)) continue;
        seenExecutions.add(key);
        setProjectStatus(project.id, exec.status === "failed" ? "failed" : "deployed");
      }
    }
  });
}