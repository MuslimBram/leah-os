// Deployment planning service. This creates the local release execution/audit shell only.
// Provider success is authoritative only through a real server adapter.

import { orchestrator } from "@/lib/core/orchestrator";
import { selectAgent } from "@/lib/agents/registry";
import { contextService } from "@/lib/memory/context-service";
import { memoryService } from "@/lib/memory/memory-service";
import { getProject } from "@/lib/projects/store";
import { getTarget, stagesFor } from "./targets";
import { addDeployment } from "./store";
import type { Deployment, DeployEnv } from "./types";

export type DeployRequest = {
  projectId?: string;
  projectName?: string;
  targetId: string;
  env?: DeployEnv;
  region?: string;
  withDatabase?: boolean;
};

export const deployService = {
  deploy(req: DeployRequest): Deployment {
    const target = getTarget(req.targetId);
    if (!target) throw new Error(`Deploy target '${req.targetId}' not found`);
    if (target.readiness !== "server-adapter") {
      throw new Error(`Deploy target '${target.name}' is planned and has no certified server adapter`);
    }

    const project = req.projectId ? getProject(req.projectId) : undefined;
    const projectName = project?.name ?? req.projectName ?? "Leah App";
    const env: DeployEnv = req.env ?? "production";
    const region = req.region ?? target.regions[0];
    const withDatabase = (req.withDatabase ?? true) && target.database;

    const tasks = stagesFor(withDatabase).map((stage, i) => ({
      kind: stage.kind,
      title: `${projectName} — ${stage.title} @ ${target.name}`,
      description: `${stage.description} (env: ${env}, region: ${region})`,
      assignedAi: selectAgent(stage.kind)?.id ?? "operator",
      priority: 100 - i,
    }));

    const execution = orchestrator.createExecution({
      request: `Prepare release ${projectName} → ${target.name} (${env})`,
      summary: `Release shell me ${tasks.length} faza; provider adapter remains authoritative for deploy success.`,
      tasks,
    });

    const deployment = addDeployment({
      projectId: project?.id,
      projectName,
      targetId: target.id,
      env,
      region,
      withDatabase,
      status: "queued",
      executionId: execution.id,
      url: null,
    });

    contextService.set({ layer: "execution", ownerId: execution.id, key: "deploymentId", value: deployment.id });
    if (project) contextService.set({ layer: "execution", ownerId: execution.id, key: "projectId", value: project.id });
    void memoryService.store({
      scope: "project",
      kind: "note",
      content: `Release shell created: ${projectName} → ${target.name} (${env}/${region}), database=${withDatabase}. No provider success recorded yet.`,
      projectId: project?.id,
      executionId: execution.id,
      metadata: { targetId: target.id, env, providerSuccess: false },
    });

    return deployment;
  },
};
