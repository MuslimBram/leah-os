// @ts-ignore -- bun's built-in test runner
import { describe, it, expect, beforeEach } from "bun:test";
import { orchestrator } from "@/lib/core/orchestrator";
import { seedAgents } from "@/lib/agents/agents.seed";
import { deployService } from "./service";
import { clearDeployments, listDeployments, deploymentForExecution, recordProviderDeployment } from "./store";
import { stagesFor, getTarget } from "./targets";

describe("deployment layer", () => {
  beforeEach(() => {
    clearDeployments();
    seedAgents();
  });

  it("skips the database stage when the certified adapter has none", () => {
    expect(stagesFor(true).map((s) => s.id)).toContain("database");
    expect(stagesFor(false).map((s) => s.id)).not.toContain("database");
  });

  it("forces database off for Vercel", () => {
    const dep = deployService.deploy({ projectName: "Shop", targetId: "vercel", withDatabase: true });
    expect(getTarget("vercel")?.database).toBe(false);
    expect(dep.withDatabase).toBe(false);
  });

  it("creates a release shell with one task per stage but no fake provider URL", () => {
    const dep = deployService.deploy({ projectName: "Shop", targetId: "vercel" });
    const tasks = orchestrator.getTasks(dep.executionId);
    expect(tasks.length).toBe(stagesFor(false).length);
    expect(tasks[0].priority).toBeGreaterThan(tasks[tasks.length - 1].priority);
    expect(dep.status).toBe("queued");
    expect(dep.url).toBeNull();
    expect(dep.providerDeploymentId).toBeUndefined();
  });

  it("records the deployment shell and links it to the execution", () => {
    const dep = deployService.deploy({ projectName: "Shop", targetId: "vercel", env: "staging" });
    expect(listDeployments()).toHaveLength(1);
    expect(deploymentForExecution(dep.executionId)?.id).toBe(dep.id);
    expect(dep.env).toBe("staging");
  });

  it("records success only from provider-returned deployment truth", () => {
    const dep = deployService.deploy({ projectName: "Shop", targetId: "vercel" });
    recordProviderDeployment(dep.id, {
      providerDeploymentId: "dpl_real",
      sourceSha: "1111111111111111111111111111111111111111",
      providerState: "READY",
      url: "https://real.vercel.app",
      healthCheckedAt: Date.now(),
      status: "succeeded",
    });
    const stored = listDeployments()[0];
    expect(stored.status).toBe("succeeded");
    expect(stored.url).toBe("https://real.vercel.app");
    expect(stored.providerDeploymentId).toBe("dpl_real");
    expect(stored.finishedAt).toBeTypeOf("number");
  });

  it("rejects planned targets instead of pretending to deploy them", () => {
    expect(() => deployService.deploy({ projectName: "Shop", targetId: "railway" })).toThrow("planned");
  });

  it("rejects unknown targets", () => {
    expect(() => deployService.deploy({ projectName: "X", targetId: "nope" })).toThrow();
  });
});
