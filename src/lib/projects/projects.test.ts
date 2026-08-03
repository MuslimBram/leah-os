import { describe, it, expect, beforeEach } from "vitest";
import { orchestrator } from "@/lib/core/orchestrator";
import { seedAgents } from "@/lib/agents/agents.seed";
import { artifactForKind, buildStepsFor, DEFAULT_BLUEPRINT } from "./blueprint";
import { clearProjects, listArtifacts, listProjects, projectForExecution, addArtifact } from "./store";
import { projectService } from "./service";
import { installProjectBootstrap } from "./bootstrap";

describe("project workspace", () => {
  beforeEach(() => {
    clearProjects();
    orchestrator.reset();
    seedAgents();
  });

  it("creates a project with defaults", () => {
    const p = projectService.create({ name: "AirVibe", description: "Klon Airbnb" });
    expect(p.status).toBe("planning");
    expect(p.goal).toBe("Klon Airbnb");
    expect(listProjects()).toHaveLength(1);
  });

  it("queues one task per blueprint step and links the execution", () => {
    const p = projectService.create({ name: "InvoicePilot", description: "SaaS faturimi" });
    const exec = projectService.build(p.id);
    expect(exec.taskIds).toHaveLength(DEFAULT_BLUEPRINT.length);
    expect(projectForExecution(exec.id)?.id).toBe(p.id);
    expect(listProjects()[0].status).toBe("building");
  });

  it("injects the goal into every step description", () => {
    const steps = buildStepsFor("Ndërto një marketplace");
    expect(steps.every((s) => s.description.includes("Ndërto një marketplace"))).toBe(true);
  });

  it("maps task kinds to artifact kinds", () => {
    expect(artifactForKind("testing").kind).toBe("test");
    expect(artifactForKind("documentation").kind).toBe("doc");
    expect(artifactForKind("unknown").kind).toBe("note");
  });

  it("records artifacts scoped to the project", () => {
    const p = projectService.create({ name: "MailAgent", description: "Email agent" });
    addArtifact({ projectId: p.id, kind: "code", path: "src/x.ts", summary: "handler" });
    expect(listArtifacts(p.id)).toHaveLength(1);
    expect(listArtifacts("other")).toHaveLength(0);
  });

  it("collects artifacts from completed tasks and finishes the project", async () => {
    installProjectBootstrap();
    orchestrator.setTaskExecutor(async () => ({ ok: true }));
    const p = projectService.create({ name: "Auto", description: "Auto build" });
    const exec = projectService.build(p.id, [
      { kind: "frontend", title: "UI", description: "faqet" },
      { kind: "testing", title: "Teste", description: "unit" },
    ]);
    await new Promise((r) => setTimeout(r, 300));
    expect(orchestrator.getExecution(exec.id)?.status).toBe("completed");
    expect(listArtifacts(p.id)).toHaveLength(2);
    expect(listProjects()[0].status).toBe("deployed");
  });

  it("removes artifacts when the workspace is cleared", () => {
    const p = projectService.create({ name: "Tmp", description: "tmp" });
    addArtifact({ projectId: p.id, kind: "doc", path: "README.md", summary: "docs" });
    clearProjects();
    expect(listArtifacts()).toHaveLength(0);
  });
});