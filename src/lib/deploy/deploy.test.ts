import { describe, it, expect, beforeEach } from "vitest";
import { orchestrator } from "@/lib/core/orchestrator";
import { seedAgents } from "@/lib/agents/agents.seed";
import { deployService } from "./service";
import { clearDeployments, listDeployments, deploymentForExecution, setDeploymentStatus } from "./store";
import { stagesFor, getTarget, previewUrl } from "./targets";

describe("deployment layer", () => {
  beforeEach(() => {
    clearDeployments();
    seedAgents();
  });

  it("skips the database stage when the app has none", () => {
    expect(stagesFor(true).map((s) => s.id)).toContain("database");
    expect(stagesFor(false).map((s) => s.id)).not.toContain("database");
  });

  it("forces database off for targets without a managed DB", () => {
    const dep = deployService.deploy({ projectName: "Shop", targetId: "vercel", withDatabase: true });
    expect(getTarget("vercel")?.database).toBe(false);
    expect(dep.withDatabase).toBe(false);
  });

  it("creates an execution with one task per stage", () => {
    const dep = deployService.deploy({ projectName: "Shop", targetId: "railway" });
    const tasks = orchestrator.getTasks(dep.executionId);
    expect(tasks.length).toBe(stagesFor(true).length);
    expect(tasks[0].priority).toBeGreaterThan(tasks[tasks.length - 1].priority);
  });

  it("records the deployment and links it to the execution", () => {
    const dep = deployService.deploy({ projectName: "Shop", targetId: "flyio", env: "staging" });
    expect(listDeployments()).toHaveLength(1);
    expect(deploymentForExecution(dep.executionId)?.id).toBe(dep.id);
    expect(dep.region).toBe("ams");
    expect(dep.env).toBe("staging");
  });

  it("builds a slugged url per environment", () => {
    expect(previewUrl("My Shop!", "vercel", "production")).toBe("https://my-shop.vercel.app");
    expect(previewUrl("My Shop!", "vercel", "preview")).toBe("https://my-shop-preview.vercel.app");
  });

  it("marks status transitions", () => {
    const dep = deployService.deploy({ projectName: "Shop", targetId: "render" });
    setDeploymentStatus(dep.id, "succeeded");
    expect(listDeployments()[0].status).toBe("succeeded");
    expect(listDeployments()[0].finishedAt).toBeTypeOf("number");
  });

  it("rejects unknown targets", () => {
    expect(() => deployService.deploy({ projectName: "X", targetId: "nope" })).toThrow();
  });
});