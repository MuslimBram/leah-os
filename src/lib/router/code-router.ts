export type RouterMode = "economy" | "balanced" | "quality";
export type RouterCapability = "code" | "reasoning" | "chat";
export type BillingMode = "byok" | "managed";
export type RouterAttemptStatus = "succeeded" | "failed" | "unknown";

export type RouterCandidate<T> = {
  providerId: string;
  model: string;
  billingMode: BillingMode;
  capabilities: RouterCapability[];
  /** 0 = no LEAH-managed cost, higher values mean more expensive managed usage. */
  costRank: number;
  /** Relative model suitability for the requested capability, 0-100. */
  qualityRank: number;
  /** Optional hard input ceiling used to skip an unsafe fallback before any request. */
  maxInputTokens?: number;
  run: () => Promise<T>;
  validate: (value: T) => boolean;
};

export type RouterAttempt = {
  attemptId: string;
  providerId: string;
  model: string;
  billingMode: BillingMode;
  status: RouterAttemptStatus;
  /** Compatibility field for existing UI; true only for status=succeeded. */
  ok: boolean;
  latencyMs: number;
  error?: string;
};

export type RouterResult<T> = {
  logicalRequestId: string;
  value: T;
  providerId: string;
  model: string;
  billingMode: BillingMode;
  attempts: RouterAttempt[];
};

/**
 * Use when the client timed out / lost the response and the provider may still
 * have completed and billed the request. Unknown outcomes MUST NOT fall back.
 */
export class ProviderOutcomeUnknownError extends Error {
  constructor(message = "Provider outcome is unknown") {
    super(message);
    this.name = "ProviderOutcomeUnknownError";
  }
}

export class RouterTerminalError extends Error {
  readonly attempts: RouterAttempt[];
  readonly logicalRequestId: string;

  constructor(message: string, logicalRequestId: string, attempts: RouterAttempt[]) {
    super(message);
    this.name = "RouterTerminalError";
    this.logicalRequestId = logicalRequestId;
    this.attempts = attempts;
  }
}

function score(candidate: RouterCandidate<unknown>, mode: RouterMode): number {
  if (mode === "economy") return candidate.qualityRank - candidate.costRank * 100;
  if (mode === "quality") return candidate.qualityRank * 100 - candidate.costRank;
  return candidate.qualityRank - candidate.costRank * 10;
}

function publicFailure(error: unknown): string {
  const message = error instanceof Error ? error.message : "Provider failed";
  return message
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(?:api[_-]?key|token|secret)\s*[=:]\s*\S+/gi, "$1=[redacted]")
    .slice(0, 240);
}

function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `leah-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export async function routeProvider<T>(input: {
  capability: RouterCapability;
  billingMode: BillingMode;
  mode?: RouterMode;
  logicalRequestId?: string;
  maxAttempts?: number;
  estimatedInputTokens?: number;
  candidates: RouterCandidate<T>[];
}): Promise<RouterResult<T>> {
  const mode = input.mode ?? "balanced";
  const logicalRequestId = input.logicalRequestId ?? newId();
  const seenProviders = new Set<string>();

  const eligible = input.candidates
    .filter((candidate) => candidate.billingMode === input.billingMode)
    .filter((candidate) => candidate.capabilities.includes(input.capability))
    .filter((candidate) => {
      if (seenProviders.has(candidate.providerId)) return false;
      seenProviders.add(candidate.providerId);
      return true;
    })
    .filter((candidate) => {
      if (input.estimatedInputTokens === undefined || candidate.maxInputTokens === undefined) return true;
      return input.estimatedInputTokens <= candidate.maxInputTokens;
    })
    .sort((a, b) => score(b as RouterCandidate<unknown>, mode) - score(a as RouterCandidate<unknown>, mode));

  if (eligible.length < 1) {
    throw new RouterTerminalError(
      `No provider supports capability '${input.capability}' in billing mode '${input.billingMode}'`,
      logicalRequestId,
      [],
    );
  }

  const maxAttempts = Math.max(1, Math.min(input.maxAttempts ?? 4, eligible.length));
  const attempts: RouterAttempt[] = [];

  for (const candidate of eligible) {
    if (attempts.length >= maxAttempts) break;

    const startedAt = Date.now();
    const attemptId = newId();
    try {
      const value = await candidate.run();
      if (!candidate.validate(value)) throw new Error("Provider returned an invalid or empty result");
      attempts.push({
        attemptId,
        providerId: candidate.providerId,
        model: candidate.model,
        billingMode: candidate.billingMode,
        status: "succeeded",
        ok: true,
        latencyMs: Date.now() - startedAt,
      });
      return {
        logicalRequestId,
        value,
        providerId: candidate.providerId,
        model: candidate.model,
        billingMode: candidate.billingMode,
        attempts,
      };
    } catch (error) {
      const unknown = error instanceof ProviderOutcomeUnknownError;
      attempts.push({
        attemptId,
        providerId: candidate.providerId,
        model: candidate.model,
        billingMode: candidate.billingMode,
        status: unknown ? "unknown" : "failed",
        ok: false,
        latencyMs: Date.now() - startedAt,
        error: publicFailure(error),
      });

      // A timeout/connection-loss can still mean the provider completed and billed.
      // Falling back here could double-spend and later double-materialize output.
      if (unknown) {
        throw new RouterTerminalError(
          `Provider outcome unknown for ${candidate.providerId}/${candidate.model}; reconciliation required before retry or fallback`,
          logicalRequestId,
          attempts,
        );
      }
    }
  }

  const summary = attempts.map((a) => `${a.providerId}/${a.model}: ${a.error ?? a.status}`).join("; ");
  throw new RouterTerminalError(
    `All routed providers failed within the global attempt budget: ${summary}`,
    logicalRequestId,
    attempts,
  );
}
