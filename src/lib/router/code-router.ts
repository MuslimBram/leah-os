export type RouterMode = "economy" | "balanced" | "quality";
export type RouterCapability = "code" | "reasoning" | "chat";

export type RouterCandidate<T> = {
  providerId: string;
  model: string;
  capabilities: RouterCapability[];
  /** 0 = no LEAH-managed cost, higher values mean more expensive managed usage. */
  costRank: number;
  /** Relative model suitability for the requested capability, 0-100. */
  qualityRank: number;
  run: () => Promise<T>;
  validate: (value: T) => boolean;
};

export type RouterAttempt = {
  providerId: string;
  model: string;
  ok: boolean;
  latencyMs: number;
  error?: string;
};

export type RouterResult<T> = {
  value: T;
  providerId: string;
  model: string;
  attempts: RouterAttempt[];
};

function score(candidate: RouterCandidate<unknown>, mode: RouterMode): number {
  if (mode === "economy") return candidate.qualityRank - candidate.costRank * 100;
  if (mode === "quality") return candidate.qualityRank * 100 - candidate.costRank;
  return candidate.qualityRank - candidate.costRank * 10;
}

function publicFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : "Provider failed";
  return message.replace(/Bearer\s+\S+/gi, "Bearer [redacted]").slice(0, 240);
}

export async function routeProvider<T>(input: {
  capability: RouterCapability;
  mode?: RouterMode;
  candidates: RouterCandidate<T>[];
}): Promise<RouterResult<T>> {
  const mode = input.mode ?? "balanced";
  const eligible = input.candidates
    .filter((candidate) => candidate.capabilities.includes(input.capability))
    .sort((a, b) => score(b as RouterCandidate<unknown>, mode) - score(a as RouterCandidate<unknown>, mode));

  if (eligible.length < 1) throw new Error(`No provider supports capability '${input.capability}'`);

  const attempts: RouterAttempt[] = [];
  for (const candidate of eligible) {
    const startedAt = Date.now();
    try {
      const value = await candidate.run();
      if (!candidate.validate(value)) throw new Error("Provider returned an invalid or empty result");
      attempts.push({ providerId: candidate.providerId, model: candidate.model, ok: true, latencyMs: Date.now() - startedAt });
      return { value, providerId: candidate.providerId, model: candidate.model, attempts };
    } catch (error) {
      attempts.push({
        providerId: candidate.providerId,
        model: candidate.model,
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: publicFailure(error),
      });
    }
  }

  const summary = attempts.map((a) => `${a.providerId}/${a.model}: ${a.error ?? "failed"}`).join("; ");
  throw new Error(`All routed providers failed: ${summary}`);
}
