import { extractGeneratedFiles } from "./generated-files";
import {
  ProviderHttpError,
  callConfiguredManagedProvider,
  validateProviderText,
  type ProviderTextResult,
  type ProviderUsage,
} from "../providers/client.server";
import {
  beginProviderAttempt,
  finishProviderAttempt,
  type AttemptAuthority,
} from "../providers/attempt-ledger.server";
import {
  finalizeManagedUsage,
  releaseManagedReservation,
  reserveManagedTokens,
  type ManagedReservation,
} from "../providers/usage-meter.server";
import { listConfiguredManagedProviders } from "../providers/registry.server";
import {
  ProviderOutcomeUnknownError,
  routeProvider,
  type BillingMode,
  type RouterCandidate,
  type RouterCapability,
  type RouterMode,
} from "../router/code-router";

export type RoutedCodeRequest = {
  kind: string;
  title: string;
  description?: string;
  prompt?: string;
  role?: string;
  routerMode?: RouterMode;
  billingMode?: BillingMode;
  logicalRequestId?: string;
  /** Server-derived worker authority. Never accept these values from a browser. */
  authority?: AttemptAuthority;
  /** Conservative output reservation; provider-reported usage replaces it on settlement. */
  estimatedOutputTokens?: number;
};

const SYSTEM = `Ti je një inxhinier softuerësh brenda LEAH AI OS.
Prodho GJITHMONË kod real dhe të plotë, jo përshkrime abstrakte.
Rregullat:
- Kthe 1-3 file konkretë, secili në një bllok kodi me tri backtick.
- Përpara çdo blloku shkruaj rrugën e file-it, p.sh. **src/routes/api/users.ts**.
- Kodi duhet të jetë i ekzekutueshëm, pa "TODO" të zbrazëta.
- Në fund shto 2-4 rreshta shënime të shkurtra në shqip.`;

const UNAVAILABLE_USAGE: ProviderUsage = {
  inputTokens: null,
  outputTokens: null,
  totalTokens: null,
  usageSource: "unavailable",
};

function userPrompt(input: RoutedCodeRequest): string {
  return `Roli: ${input.role ?? "engineer"}
Kategoria e detyrës: ${input.kind}
Detyra: ${input.title}
Detaje: ${input.description ?? ""}

Kontekst i projektit:
${(input.prompt ?? "").slice(0, 12000)}

Prodho implementimin real tani.`;
}

function roughTokenEstimate(text: string): number {
  return Math.max(1, Math.ceil(text.length / 3));
}

function outputReservation(input: RoutedCodeRequest): number {
  const value = input.estimatedOutputTokens ?? Number(process.env["LEAH_CODEGEN_ESTIMATED_OUTPUT_TOKENS"] ?? 8192);
  if (!Number.isSafeInteger(value) || value < 256 || value > 200_000) {
    throw new Error("Invalid LEAH code-generation output reservation");
  }
  return value;
}

function providerOrder(): string[] {
  return (process.env["LEAH_MANAGED_PROVIDER_ORDER"] ?? "openai,anthropic,gemini,deepseek,kimi,zai")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function managedCandidates(messages: { system: string; user: string }): RouterCandidate<ProviderTextResult>[] {
  const configured = listConfiguredManagedProviders();
  const order = providerOrder();
  return configured.map(({ entry, model, maxInputTokens }) => {
    const index = order.indexOf(entry.id);
    const orderRank = index < 0 ? order.length : index;
    return {
      providerId: entry.id,
      model,
      billingMode: "managed" as const,
      capabilities: ["code", "reasoning", "chat"] as RouterCapability[],
      costRank: 1,
      qualityRank: Math.max(1, 100 - orderRank * 5),
      maxInputTokens,
      run: () => callConfiguredManagedProvider(entry.id, messages),
      validate: (value: ProviderTextResult) => {
        if (!validateProviderText(value)) return false;
        try {
          extractGeneratedFiles(value.text);
          return true;
        } catch {
          return false;
        }
      },
    };
  });
}

function errorCode(error: unknown): string {
  if (error instanceof ProviderHttpError) return error.code;
  if (error instanceof ProviderOutcomeUnknownError) return "outcome_unknown";
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("invalid or empty result")) return "invalid_generated_output";
  return "provider_failure";
}

export async function generateCodeRouted(input: RoutedCodeRequest) {
  const billingMode = input.billingMode ?? "managed";
  if (billingMode === "byok") {
    throw new Error("BYOK generation requires a Pulse Vault-bound workspace credential");
  }
  if (!input.authority?.taskId || !input.authority.leaseToken) {
    throw new Error("Managed generation requires server-derived task lease authority");
  }

  const authority = input.authority;
  const messages = { system: SYSTEM, user: userPrompt(input) };
  const candidates = managedCandidates(messages);
  if (candidates.length === 0) throw new Error("No MR7A managed provider is configured server-side");

  const estimatedInputTokens = roughTokenEstimate(`${SYSTEM}\n${messages.user}`);
  const estimatedOutputTokens = outputReservation(input);
  const requestedTokens = estimatedInputTokens + estimatedOutputTokens;
  const reservations = new Map<string, ManagedReservation>();

  const routed = await routeProvider({
    capability: "code",
    billingMode,
    mode: input.routerMode ?? "balanced",
    logicalRequestId: input.logicalRequestId,
    estimatedInputTokens,
    candidates,
    lifecycle: {
      beforeAttempt: async ({ logicalRequestId, attemptId, candidate }) => {
        const reservation = await reserveManagedTokens({
          ...authority,
          eventKey: `provider:${logicalRequestId}:${attemptId}`,
          requestedTokens,
          ttlSeconds: 300,
        });
        reservations.set(attemptId, reservation);
        try {
          await beginProviderAttempt({
            ...authority,
            logicalRequestId,
            attemptId,
            billingMode: "managed",
            provider: candidate.providerId,
            model: candidate.model,
            reservationId: reservation.id,
            metadata: { estimated_input_tokens: estimatedInputTokens, estimated_output_tokens: estimatedOutputTokens },
          });
        } catch (error) {
          await releaseManagedReservation({ ...authority, reservationId: reservation.id }).catch(() => undefined);
          reservations.delete(attemptId);
          throw error;
        }
      },
      afterAttempt: async (settlement) => {
        const reservation = reservations.get(settlement.attemptId);
        if (!reservation) throw new Error("Provider attempt reservation missing");
        const value = settlement.value;
        const usage = value?.usage ?? UNAVAILABLE_USAGE;

        await finishProviderAttempt({
          ...authority,
          attemptId: settlement.attemptId,
          outcome: settlement.status,
          providerRequestId: value?.providerRequestId ?? null,
          usage,
          costMicros: null,
          errorCode: settlement.status === "succeeded" ? null : errorCode(settlement.error),
          latencyMs: settlement.latencyMs,
          canonicalResult: settlement.status === "succeeded",
          metadata: {
            finish_reason: value?.finishReason ?? null,
            generated_output_valid: settlement.status === "succeeded",
          },
        });

        if (settlement.status === "unknown") return;

        if (value) {
          await finalizeManagedUsage({
            ...authority,
            reservation,
            provider: settlement.candidate.providerId,
            model: settlement.candidate.model,
            usage,
            estimatedInputTokens,
            estimatedOutputTokens,
            costMicros: null,
            metadata: {
              logical_request_id: settlement.logicalRequestId,
              attempt_id: settlement.attemptId,
              provider_request_id: value.providerRequestId,
              attempt_outcome: settlement.status,
            },
          });
        } else {
          await releaseManagedReservation({ ...authority, reservationId: reservation.id });
        }
      },
    },
  });

  const value = routed.value as ProviderTextResult;
  return {
    text: value.text,
    provider: routed.providerId,
    model: routed.model,
    billingMode: routed.billingMode,
    logicalRequestId: routed.logicalRequestId,
    canonicalAttemptId: routed.canonicalAttemptId,
    providerRequestId: value.providerRequestId,
    usage: value.usage,
    mock: false as const,
    routerMode: input.routerMode ?? "balanced",
    attempts: routed.attempts,
  };
}
