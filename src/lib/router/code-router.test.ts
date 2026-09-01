// @ts-ignore -- bun's built-in test runner; types not installed in the project.
import { describe, expect, it } from "bun:test";
import {
  ProviderOutcomeUnknownError,
  RouterTerminalError,
  routeProvider,
  type BillingMode,
  type RouterCandidate,
} from "./code-router";

function candidate(
  input: Partial<RouterCandidate<string>> & Pick<RouterCandidate<string>, "providerId" | "model" | "run">,
): RouterCandidate<string> {
  return {
    providerId: input.providerId,
    model: input.model,
    billingMode: input.billingMode ?? "managed",
    run: input.run,
    capabilities: input.capabilities ?? ["code"],
    costRank: input.costRank ?? 0,
    qualityRank: input.qualityRank ?? 50,
    maxInputTokens: input.maxInputTokens,
    validate: input.validate ?? ((value) => value.trim().length > 0),
  };
}

async function routed(mode: BillingMode, candidates: RouterCandidate<string>[]) {
  return routeProvider({ capability: "code", billingMode: mode, candidates });
}

describe("AI provider router", () => {
  it("passes the exact canonical logical/attempt IDs into provider dispatch", async () => {
    let dispatchLogical = "";
    let dispatchAttempt = "";
    let beforeLogical = "";
    let beforeAttempt = "";
    let afterAttempt = "";

    const result = await routeProvider({
      capability: "code",
      billingMode: "byok",
      logicalRequestId: "11111111-1111-4111-8111-111111111111",
      candidates: [candidate({
        providerId: "openai",
        model: "test",
        billingMode: "byok",
        run: async (context) => {
          dispatchLogical = context.logicalRequestId;
          dispatchAttempt = context.attemptId;
          return "generated";
        },
      })],
      lifecycle: {
        beforeAttempt: async (context) => {
          beforeLogical = context.logicalRequestId;
          beforeAttempt = context.attemptId;
        },
        afterAttempt: async (context) => {
          afterAttempt = context.attemptId;
        },
      },
    });

    expect(dispatchLogical).toBe(result.logicalRequestId);
    expect(beforeLogical).toBe(result.logicalRequestId);
    expect(dispatchAttempt).toBe(result.canonicalAttemptId);
    expect(beforeAttempt).toBe(result.canonicalAttemptId);
    expect(afterAttempt).toBe(result.canonicalAttemptId);
  });

  it("filters providers that do not support the requested capability", async () => {
    const result = await routed("managed", [
      candidate({ providerId: "chat-only", model: "chat", capabilities: ["chat"], qualityRank: 100, run: async () => "wrong" }),
      candidate({ providerId: "coder", model: "code", qualityRank: 10, run: async () => "ok" }),
    ]);
    expect(result.providerId).toBe("coder");
  });

  it("never crosses BYOK into managed fallback", async () => {
    let managedCalls = 0;
    await expect(routed("byok", [
      candidate({ providerId: "tenant-key", model: "m1", billingMode: "byok", run: async () => { throw new Error("401"); } }),
      candidate({ providerId: "pulse-managed", model: "m2", billingMode: "managed", run: async () => { managedCalls++; return "must-not-run"; } }),
    ])).rejects.toThrow("All routed providers failed");
    expect(managedCalls).toBe(0);
  });

  it("economy mode favors lower managed cost", async () => {
    const result = await routeProvider({
      capability: "code",
      billingMode: "managed",
      mode: "economy",
      candidates: [
        candidate({ providerId: "managed", model: "best", costRank: 2, qualityRank: 100, run: async () => "managed" }),
        candidate({ providerId: "free", model: "good", costRank: 0, qualityRank: 60, run: async () => "free" }),
      ],
    });
    expect(result.providerId).toBe("free");
  });

  it("quality mode favors model suitability", async () => {
    const result = await routeProvider({
      capability: "code",
      billingMode: "managed",
      mode: "quality",
      candidates: [
        candidate({ providerId: "free", model: "good", costRank: 0, qualityRank: 60, run: async () => "free" }),
        candidate({ providerId: "managed", model: "best", costRank: 2, qualityRank: 100, run: async () => "managed" }),
      ],
    });
    expect(result.providerId).toBe("managed");
  });

  it("marks a failed request and falls back within the same mode", async () => {
    const result = await routeProvider({
      capability: "code",
      billingMode: "managed",
      mode: "quality",
      candidates: [
        candidate({ providerId: "primary", model: "p1", qualityRank: 100, run: async () => { throw new Error("503 unavailable"); } }),
        candidate({ providerId: "fallback", model: "p2", qualityRank: 80, run: async () => "generated" }),
      ],
    });
    expect(result.providerId).toBe("fallback");
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]?.status).toBe("failed");
    expect(result.attempts[1]?.status).toBe("succeeded");
  });

  it("stops immediately on unknown outcome instead of double-spending via fallback", async () => {
    let fallbackCalls = 0;
    try {
      await routed("managed", [
        candidate({ providerId: "primary", model: "p1", qualityRank: 100, run: async () => { throw new ProviderOutcomeUnknownError("timeout after send"); } }),
        candidate({ providerId: "fallback", model: "p2", qualityRank: 80, run: async () => { fallbackCalls++; return "generated"; } }),
      ]);
      throw new Error("expected router failure");
    } catch (error) {
      expect(error).toBeInstanceOf(RouterTerminalError);
      expect((error as RouterTerminalError).attempts[0]?.status).toBe("unknown");
    }
    expect(fallbackCalls).toBe(0);
  });

  it("skips a fallback whose context window is too small before making a request", async () => {
    let smallCalls = 0;
    const result = await routeProvider({
      capability: "code",
      billingMode: "managed",
      estimatedInputTokens: 50_000,
      candidates: [
        candidate({ providerId: "small", model: "32k", maxInputTokens: 32_000, qualityRank: 100, run: async () => { smallCalls++; return "truncated"; } }),
        candidate({ providerId: "large", model: "128k", maxInputTokens: 128_000, qualityRank: 90, run: async () => "ok" }),
      ],
    });
    expect(result.providerId).toBe("large");
    expect(smallCalls).toBe(0);
  });

  it("uses one global attempt budget across the whole chain", async () => {
    const calls: string[] = [];
    await expect(routeProvider({
      capability: "code",
      billingMode: "managed",
      maxAttempts: 2,
      candidates: [
        candidate({ providerId: "one", model: "m1", qualityRank: 100, run: async () => { calls.push("one"); throw new Error("500"); } }),
        candidate({ providerId: "two", model: "m2", qualityRank: 90, run: async () => { calls.push("two"); throw new Error("500"); } }),
        candidate({ providerId: "three", model: "m3", qualityRank: 80, run: async () => { calls.push("three"); return "would-pass"; } }),
      ],
    })).rejects.toThrow("global attempt budget");
    expect(calls).toEqual(["one", "two"]);
  });

  it("does not visit the same provider twice in one logical request", async () => {
    const calls: string[] = [];
    const result = await routed("managed", [
      candidate({ providerId: "same", model: "m1", qualityRank: 100, run: async () => { calls.push("m1"); throw new Error("500"); } }),
      candidate({ providerId: "same", model: "m2", qualityRank: 90, run: async () => { calls.push("m2"); return "cycle"; } }),
      candidate({ providerId: "other", model: "m3", qualityRank: 80, run: async () => { calls.push("m3"); return "ok"; } }),
    ]);
    expect(result.providerId).toBe("other");
    expect(calls).toEqual(["m1", "m3"]);
  });

  it("fails instead of inventing success when every provider fails", async () => {
    await expect(routed("managed", [
      candidate({ providerId: "one", model: "m1", run: async () => "" }),
      candidate({ providerId: "two", model: "m2", run: async () => { throw new Error("offline"); } }),
    ])).rejects.toThrow("All routed providers failed");
  });
});
