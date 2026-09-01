import { ProviderOutcomeUnknownError } from "../router/code-router";
import type { AttemptAuthority } from "./attempt-ledger.server";
import type { ProviderTextResult, ProviderUsage } from "./client.server";
import { isCertifiedProviderId, type CertifiedProviderId } from "./registry.server";

export type PulseByokProvider = {
  providerId: CertifiedProviderId;
  model: string;
};

export class PulseByokProviderError extends Error {
  constructor(
    public readonly providerId: CertifiedProviderId,
    public readonly status: number,
    public readonly code: string,
  ) {
    super(`${providerId} BYOK request failed (${code}, HTTP ${status})`);
    this.name = "PulseByokProviderError";
  }
}

function proxyUrl(): string {
  const value = process.env["LEAH_PULSE_PROVIDER_PROXY_URL"]?.trim() ?? "";
  if (!value) throw new Error("LEAH_PULSE_PROVIDER_PROXY_URL is not configured");
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.pathname.endsWith("/leah-provider-proxy")) {
    throw new Error("LEAH_PULSE_PROVIDER_PROXY_URL must be an HTTPS leah-provider-proxy endpoint");
  }
  return url.toString();
}

function workerSecret(): string {
  const value = process.env["LEAH_WORKER_SECRET"]?.trim() ?? "";
  if (value.length < 32) throw new Error("LEAH_WORKER_SECRET is not configured");
  return value;
}

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid Pulse LEAH provider proxy response");
  }
  return value as Record<string, unknown>;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;
}

function usageValue(value: unknown): ProviderUsage {
  const row = objectValue(value);
  const usageSource = row.usageSource;
  if (usageSource !== "provider" && usageSource !== "estimated" && usageSource !== "unavailable") {
    throw new Error("Invalid provider usage source from Pulse");
  }
  return {
    inputTokens: numberOrNull(row.inputTokens),
    outputTokens: numberOrNull(row.outputTokens),
    totalTokens: numberOrNull(row.totalTokens),
    usageSource,
  };
}

async function pulseProxy(
  body: Record<string, unknown>,
  options: { providerMayHaveDispatched?: boolean } = {},
): Promise<{ response: Response; data: Record<string, unknown> }> {
  for (const forbidden of ["workspace_id", "workspaceId", "api_key", "apiKey", "base_url", "baseUrl", "secret_id", "secretId"]) {
    if (Object.prototype.hasOwnProperty.call(body, forbidden)) {
      throw new Error(`${forbidden} must never be supplied to the Pulse provider proxy`);
    }
  }

  let response: Response;
  try {
    response = await fetch(proxyUrl(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Leah-Worker-Secret": workerSecret(),
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    if (options.providerMayHaveDispatched) {
      throw new ProviderOutcomeUnknownError("Pulse BYOK proxy transport outcome unknown after dispatch");
    }
    throw error;
  }

  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  return { response, data };
}

export async function listPulseByokProviders(authority: AttemptAuthority): Promise<PulseByokProvider[]> {
  const { response, data } = await pulseProxy({
    action: "catalog",
    task_id: authority.taskId,
    lease_token: authority.leaseToken,
  });
  if (!response.ok) {
    const code = typeof data.error === "string" ? data.error : `proxy_http_${response.status}`;
    throw new Error(code.slice(0, 240));
  }
  const rows = Array.isArray(data.providers) ? data.providers : [];
  const seen = new Set<string>();
  const result: PulseByokProvider[] = [];
  for (const value of rows) {
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const row = value as Record<string, unknown>;
    const provider = typeof row.provider === "string" ? row.provider.trim().toLowerCase() : "";
    const model = typeof row.model === "string" ? row.model.trim() : "";
    if (!isCertifiedProviderId(provider) || !model || model.length > 200 || seen.has(provider)) continue;
    seen.add(provider);
    result.push({ providerId: provider, model });
  }
  return result;
}

export async function callPulseByokProvider(input: AttemptAuthority & {
  logicalRequestId: string;
  attemptId: string;
  providerId: CertifiedProviderId;
  expectedModel: string;
  system: string;
  user: string;
}): Promise<ProviderTextResult> {
  const { response, data } = await pulseProxy({
    action: "generate",
    task_id: input.taskId,
    lease_token: input.leaseToken,
    logical_request_id: input.logicalRequestId,
    attempt_id: input.attemptId,
    provider: input.providerId,
    system: input.system,
    user: input.user,
  }, { providerMayHaveDispatched: true });

  const errorCode = typeof data.error === "string" ? data.error : `proxy_http_${response.status}`;
  if (!response.ok) {
    if (response.status === 409 && (errorCode === "provider_outcome_unknown" || errorCode === "provider_attempt_reconciliation_required")) {
      throw new ProviderOutcomeUnknownError(`${input.providerId} BYOK outcome requires reconciliation`);
    }
    throw new PulseByokProviderError(input.providerId, response.status, errorCode.slice(0, 120));
  }

  const provider = typeof data.provider === "string" ? data.provider.trim().toLowerCase() : "";
  const model = typeof data.model === "string" ? data.model.trim() : "";
  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (provider !== input.providerId || model !== input.expectedModel) {
    throw new ProviderOutcomeUnknownError(`${input.providerId} BYOK catalog changed after dispatch`);
  }
  if (!text) throw new ProviderOutcomeUnknownError(`${input.providerId} successful BYOK response was unreadable`);

  return {
    providerId: input.providerId,
    model,
    text,
    providerRequestId: typeof data.provider_request_id === "string" ? data.provider_request_id : null,
    usage: usageValue(data.usage),
    finishReason: typeof data.finish_reason === "string" ? data.finish_reason : null,
  };
}

export async function settlePulseByokAttempt(input: AttemptAuthority & {
  attemptId: string;
  outcome: "succeeded" | "failed";
  value: ProviderTextResult;
  latencyMs: number;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  errorCode?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const providerUsage = input.value.usage;
  const hasProviderUsage = providerUsage.usageSource === "provider" &&
    providerUsage.inputTokens !== null && providerUsage.outputTokens !== null;
  const inputTokens = hasProviderUsage ? providerUsage.inputTokens! : input.estimatedInputTokens;
  const outputTokens = hasProviderUsage ? providerUsage.outputTokens! : input.estimatedOutputTokens;
  const usageSource = hasProviderUsage ? "provider" : "estimated";

  const { response, data } = await pulseProxy({
    action: "settle",
    task_id: input.taskId,
    lease_token: input.leaseToken,
    attempt_id: input.attemptId,
    outcome: input.outcome,
    provider_request_id: input.value.providerRequestId,
    usage_source: usageSource,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    error_code: input.errorCode ?? null,
    latency_ms: input.latencyMs,
    canonical_result: input.outcome === "succeeded",
    metadata: {
      ...(input.metadata ?? {}),
      finish_reason: input.value.finishReason,
      application_validation: input.outcome === "succeeded" ? "accepted" : "rejected",
      provider_usage_source: providerUsage.usageSource,
    },
  });

  if (!response.ok) {
    const code = typeof data.error === "string" ? data.error : `proxy_http_${response.status}`;
    throw new Error(`BYOK settlement failed: ${code.slice(0, 160)}`);
  }
  return objectValue(data.settlement);
}
