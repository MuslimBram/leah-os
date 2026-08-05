// Keeps deployment records in sync with their orchestrator execution.

import { orchestrator } from "@/lib/core/orchestrator";
import { deploymentForExecution, listDeployments, setDeploymentStatus } from "./store";

let installed = false;
const seen = new Set<string>();

export function installDeployBootstrap() {
  if (installed) return;
  installed = true;

  orchestrator.subscribe(() => {
    if (listDeployments().length === 0) return;
    for (const exec of orchestrator.listExecutions()) {
      if (exec.status !== "completed" && exec.status !== "failed") continue;
      const deployment = deploymentForExecution(exec.id);
      if (!deployment) continue;
      const key = `${exec.id}:${exec.status}`;
      if (seen.has(key)) continue;
      seen.add(key);
      setDeploymentStatus(deployment.id, exec.status === "failed" ? "failed" : "succeeded");
    }
  });
}