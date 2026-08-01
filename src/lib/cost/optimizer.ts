// Cost Optimizer — picks the cheapest provider that still clears the quality
// bar for a task kind, respects the context window, and reports the savings
// against the highest-quality (baseline) choice.

import { AI_CATALOG, type AiProvider } from "@/lib/leah-catalog";
import { estimateCost, getPricing } from "./pricing";

export type CostPolicy = "cheapest" | "balanced" | "quality";

export type RouteInput = {
  kind: string;
  inputTokens: number;
  outputTokens?: number;
  policy?: CostPolicy;
};

export type RouteDecision = {
  provider: AiProvider;
  baseline: AiProvider;
  policy: CostPolicy;
  estCost: number;
  baselineCost: number;
  savings: number;
  savingsPct: number;
  reason: string;
  candidates: { provider: AiProvider; cost: number; quality: number; eligible: boolean }[];
};

const SCORE_KEY: Record<string, keyof AiProvider["scores"]> = {
  backend: "backend", database: "backend", api: "backend", auth: "backend",
  payments: "backend", security: "backend",
  frontend: "frontend", ui: "frontend",
  testing: "code", deployment: "code", plan: "docs", review: "code",
  documentation: "docs", docs: "docs", research: "research",
};

/** Minimum quality score a provider must hit, per policy. */
const MIN_QUALITY: Record<CostPolicy, number> = { cheapest: 60, balanced: 78, quality: 90 };

export function optimizeRoute(input: RouteInput): RouteDecision {
  const policy = input.policy ?? "balanced";
  const key = SCORE_KEY[input.kind] ?? "code";
  const outputTokens = input.outputTokens ?? Math.ceil(input.inputTokens * 0.4);

  const candidates = AI_CATALOG.map((provider) => {
    const quality = provider.scores[key];
    const fitsContext = getPricing(provider.id).contextTokens >= input.inputTokens + outputTokens;
    return {
      provider,
      quality,
      cost: estimateCost(provider.id, input.inputTokens, outputTokens),
      eligible: fitsContext && quality >= MIN_QUALITY[policy],
    };
  });

  const best = [...candidates].sort((a, b) => b.quality - a.quality)[0]!;
  let eligible = candidates.filter((c) => c.eligible);
  let relaxed = false;
  if (eligible.length === 0) {
    // Nothing clears the bar — fall back to the highest quality that fits.
    eligible = candidates.filter((c) => getPricing(c.provider.id).contextTokens >= input.inputTokens + outputTokens);
    relaxed = true;
    if (eligible.length === 0) eligible = [best];
  }

  const chosen =
    policy === "quality"
      ? [...eligible].sort((a, b) => b.quality - a.quality || a.cost - b.cost)[0]!
      : [...eligible].sort((a, b) => a.cost - b.cost || b.quality - a.quality)[0]!;

  const savings = Math.max(0, best.cost - chosen.cost);
  return {
    provider: chosen.provider,
    baseline: best.provider,
    policy,
    estCost: chosen.cost,
    baselineCost: best.cost,
    savings,
    savingsPct: best.cost > 0 ? (savings / best.cost) * 100 : 0,
    reason: relaxed
      ? `asnjë model nuk plotësoi pragun ${MIN_QUALITY[policy]} — u zgjodh më i miri që hyn në kontekst`
      : policy === "quality"
        ? `cilësi maksimale për "${input.kind}" (score ${chosen.quality})`
        : `më i liri me score ≥ ${MIN_QUALITY[policy]} për "${input.kind}"`,
    candidates: candidates.sort((a, b) => a.cost - b.cost),
  };
}