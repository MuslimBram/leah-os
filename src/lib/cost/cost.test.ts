// @ts-ignore -- bun's built-in test runner
import { describe, expect, it, beforeEach } from "bun:test";
import { estimateCost, estimateTokens, getPricing, setPricing } from "./pricing";
import { optimizeRoute } from "./optimizer";
import { clearUsage, recordUsage, usageSummary } from "./telemetry";
import { getCostPolicy, setCostPolicy } from "./policy";

describe("cost optimizer", () => {
  beforeEach(() => { clearUsage(); setCostPolicy("balanced"); });

  it("estimates tokens and cost", () => {
    expect(estimateTokens("a".repeat(400))).toBe(100);
    expect(estimateCost("gemini", 1_000_000, 0)).toBeCloseTo(getPricing("gemini").input, 5);
  });

  it("cheapest policy never costs more than quality policy", () => {
    const cheap = optimizeRoute({ kind: "backend", inputTokens: 5000, policy: "cheapest" });
    const best = optimizeRoute({ kind: "backend", inputTokens: 5000, policy: "quality" });
    expect(cheap.estCost).toBeLessThanOrEqual(best.estCost);
    expect(best.provider.scores.backend).toBeGreaterThanOrEqual(cheap.provider.scores.backend);
  });

  it("respects the context window", () => {
    const d = optimizeRoute({ kind: "backend", inputTokens: 900_000, outputTokens: 10_000, policy: "cheapest" });
    expect(getPricing(d.provider.id).contextTokens).toBeGreaterThanOrEqual(910_000);
  });

  it("reports savings against the quality baseline", () => {
    const d = optimizeRoute({ kind: "documentation", inputTokens: 20_000, policy: "cheapest" });
    expect(d.savings).toBeGreaterThanOrEqual(0);
    expect(d.savingsPct).toBeLessThanOrEqual(100);
  });

  it("honours pricing overrides (BYOK)", () => {
    setPricing("llama", { input: 0, output: 0, contextTokens: 1_000_000 });
    expect(estimateCost("llama", 100_000, 100_000)).toBe(0);
  });

  it("aggregates telemetry per provider", () => {
    recordUsage({ providerId: "gemini", kind: "backend", inputTokens: 1000, outputTokens: 500, baselineCost: 0.02 });
    recordUsage({ providerId: "gemini", kind: "frontend", inputTokens: 2000, outputTokens: 500, baselineCost: 0.03 });
    recordUsage({ providerId: "deepseek", kind: "testing", inputTokens: 1000, outputTokens: 100, baselineCost: 0.01 });
    const s = usageSummary();
    expect(s.calls).toBe(3);
    expect(s.byProvider[0]?.providerId).toBeDefined();
    expect(s.byProvider.find((p) => p.providerId === "gemini")?.calls).toBe(2);
    expect(s.saved).toBeGreaterThan(0);
  });

  it("stores the active policy globally", () => {
    setCostPolicy("quality");
    expect(getCostPolicy()).toBe("quality");
  });
});