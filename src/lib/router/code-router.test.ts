// @ts-ignore -- bun's built-in test runner; types not installed in the project.
import { describe, expect, it } from "bun:test";
import { routeProvider, type RouterCandidate } from "./code-router";

function candidate(input: Partial<RouterCandidate<string>> & Pick<RouterCandidate<string>, "providerId" | "model" | "run">): RouterCandidate<string> {
  return {
    providerId: input.providerId,
    model: input.model,
    run: input.run,
    capabilities: input.capabilities ?? ["code"],
    costRank: input.costRank ?? 0,
    qualityRank: input.qualityRank ?? 50,
    validate: input.validate ?? ((value) => value.trim().length > 0),
  };
}

describe("AI provider router", () => {
  it("filters providers that do not support the requested capability", async () => {
    const result = await routeProvider({
      capability: "code",
      candidates: [
        candidate({ providerId: "chat-only", model: "chat", capabilities: ["chat"], qualityRank: 100, run: async () => "wrong" }),
        candidate({ providerId: "coder", model: "code", qualityRank: 10, run: async () => "ok" }),
      ],
    });
    expect(result.providerId).toBe("coder");
  });

  it("economy mode favors lower managed cost", async () => {
    const result = await routeProvider({
      capability: "code",
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
      mode: "quality",
      candidates: [
        candidate({ providerId: "free", model: "good", costRank: 0, qualityRank: 60, run: async () => "free" }),
        candidate({ providerId: "managed", model: "best", costRank: 2, qualityRank: 100, run: async () => "managed" }),
      ],
    });
    expect(result.providerId).toBe("managed");
  });

  it("marks a real failed attempt unhealthy for the request and falls back", async () => {
    const result = await routeProvider({
      capability: "code",
      mode: "quality",
      candidates: [
        candidate({ providerId: "primary", model: "p1", qualityRank: 100, run: async () => { throw new Error("503 unavailable"); } }),
        candidate({ providerId: "fallback", model: "p2", qualityRank: 80, run: async () => "generated" }),
      ],
    });
    expect(result.providerId).toBe("fallback");
    expect(result.attempts).toHaveLength(2);
    expect(result.attempts[0]?.ok).toBe(false);
    expect(result.attempts[1]?.ok).toBe(true);
  });

  it("fails instead of inventing success when every provider fails", async () => {
    await expect(routeProvider({
      capability: "code",
      candidates: [
        candidate({ providerId: "one", model: "m1", run: async () => "" }),
        candidate({ providerId: "two", model: "m2", run: async () => { throw new Error("offline"); } }),
      ],
    })).rejects.toThrow("All routed providers failed");
  });
});
