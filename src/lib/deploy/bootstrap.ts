// Keeps local release-shell failures visible. A local execution is not authoritative
// evidence that a cloud provider deployed anything, so it can never mark succeeded.

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
      if (exec.status !== "failed") continue;
      const deployment = deploymentForExecution(exec.id);
      if (!deployment) continue;
      const key = `${exec.id}:failed`;
      if (seen.has(key)) continue;
      seen.add(key);
      setDeploymentStatus(deployment.id, "failed", "Local release preparation failed before provider success");
    }
  });
}
