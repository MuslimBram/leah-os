// Project service — the only place that connects a Project to the rest of the
// OS (orchestrator, shared context, memory). UI calls this, never the core.

import { orchestrator } from "@/lib/core/orchestrator";
import { selectAgent } from "@/lib/agents/registry";
import { contextService } from "@/lib/memory/context-service";
import { memoryService } from "@/lib/memory/memory-service";
import { buildStepsFor } from "./blueprint";
import { attachExecution, createProject, getProject, setProjectStatus } from "./store";
import type { BuildStep, Project } from "./types";

export type NewProjectInput = {
  name: string;
  description: string;
  goal?: string;
  stack?: string[];
  repo?: string;
};

export const projectService = {
  create(input: NewProjectInput): Project {
    const project = createProject({
      name: input.name,
      description: input.description,
      goal: input.goal ?? input.description,
      stack: input.stack ?? [],
      repo: input.repo,
    });
    contextService.set({ layer: "project", ownerId: project.id, key: "goal", value: project.goal });
    contextService.set({ layer: "project", ownerId: project.id, key: "stack", value: project.stack });
    void memoryService.store({
      scope: "project",
      kind: "note",
      content: `Projekt: ${project.name}\n${project.description}\nQëllimi: ${project.goal}`,
      projectId: project.id,
      metadata: { repo: project.repo ?? null },
    });
    return project;
  },

  /** Queue a full build for the project and link the execution back to it. */
  build(projectId: string, steps?: BuildStep[]) {
    const project = getProject(projectId);
    if (!project) throw new Error(`Project '${projectId}' not found`);
    const plan = buildStepsFor(project.goal, steps).map((s) => ({
      kind: s.kind,
      title: `${project.name} — ${s.title}`,
      description: s.description,
      assignedAi: selectAgent(s.kind)?.id ?? "architect",
      priority: s.priority ?? 0,
    }));
    const execution = orchestrator.createExecution({
      request: project.goal,
      summary: `Build i plotë për ${project.name}`,
      tasks: plan,
    });
    attachExecution(project.id, execution.id);
    setProjectStatus(project.id, "building");
    contextService.set({ layer: "execution", ownerId: execution.id, key: "projectId", value: project.id });
    return execution;
  },
};