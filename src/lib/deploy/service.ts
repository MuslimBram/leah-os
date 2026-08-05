// Deployment service — turns a release request into an orchestrator execution
// and keeps the deployment record in sync with the task results.

import { orchestrator } from "@/lib/core/orchestrator";
import { selectAgent } from "@/lib/agents/registry";
import { contextService } from "@/lib/memory/context-service";
import { memoryService } from "@/lib/memory/memory-service";
import { getProject } from "@/lib/projects/store";
import { getTarget, previewUrl, stagesFor } from "./targets";
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
      request: `Deploy ${projectName} → ${target.name} (${env})`,
      summary: `Release pipeline me ${tasks.length} faza për ${target.name}.`,
      tasks,
    });

    const deployment = addDeployment({
      projectId: project?.id,
      projectName,
      targetId: target.id,
      env,
      region,
      withDatabase,
      status: "running",
      executionId: execution.id,
      url: previewUrl(projectName, target.id, env),
    });

    contextService.set({ layer: "execution", ownerId: execution.id, key: "deploymentId", value: deployment.id });
    if (project) {
      contextService.set({ layer: "execution", ownerId: execution.id, key: "projectId", value: project.id });
    }
    void memoryService.store({
      scope: "project",
      kind: "note",
      content: `Deploy i nisur: ${projectName} → ${target.name} (${env}/${region}), database=${withDatabase}.`,
      projectId: project?.id,
      executionId: execution.id,
      metadata: { targetId: target.id, env },
    });

    return deployment;
  },
};