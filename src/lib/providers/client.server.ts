import { ProviderOutcomeUnknownError } from "../router/code-router";
import {
  configuredManagedProvider,
  getProviderRegistryEntry,
  type CertifiedProviderId,
  type ProviderRegistryEntry,
} from "./registry.server";

export type UsageSource = "provider" | "estimated" | "unavailable";

export type ProviderUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  usageSource: UsageSource;
};

export type ProviderTextResult = {
  providerId: CertifiedProviderId;
  model: string;
  text: string;
  providerRequestId: string | null;
  usage: ProviderUsage;
  finishReason: string | null;
};

export type ProviderMessages = {
  system: string;
  user: string;
};

export class ProviderHttpError extends Error {
  readonly providerId: string;
  readonly status: number;
  readonly code: string;

  constructor(providerId: string, status: number, code: string) {
    super(`${providerId} request failed (${code}, HTTP ${status})`);
    this.name = "ProviderHttpError";
    this.providerId = providerId;
    this.status = status;
    this.code = code;
  }
}

function requestId(headers: Headers): string | null {
  return headers.get("x-request-id") ?? headers.get("request-id") ?? headers.get("x-goog-request-id") ?? null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function providerUsage(input: unknown, output: unknown, total: unknown): ProviderUsage {
  const inputTokens = numberOrNull(input);
  const outputTokens = numberOrNull(output);
  const totalTokens = numberOrNull(total) ?? (inputTokens !== null && outputTokens !== null ? inputTokens + outputTokens : null);
  const usageSource: UsageSource = inputTokens !== null || outputTokens !== null || totalTokens !== null ? "provider" : "unavailable";
  return { inputTokens, outputTokens, totalTokens, usageSource };
}

function safeCode(status: number): string {
  if (status === 400) return "bad_request";
  if (status === 401) return "invalid_credential";
  if (status === 402) return "payment_required";
  if (status === 403) return "forbidden";
  if (status === 404) return "model_or_endpoint_not_found";
  if (status === 408) return "provider_timeout";
  if (status === 409) return "provider_conflict";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_5xx";
  return "provider_http_error";
}

async function fetchKnownOutcome(
  providerId: string,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    const name = error instanceof Error ? error.name : "transport_error";
    // Once fetch() has been dispatched, a local timeout/socket failure cannot prove
    // that the provider did not receive/complete/bill the request. Fail closed as
    // unknown so the router cannot double-spend via retry/fallback.
    throw new ProviderOutcomeUnknownError(`${providerId} transport outcome unknown (${name})`);
  }
}

async function checkedJson(providerId: string, response: Response): Promise<Record<string, unknown>> {
  if (!response.ok) throw new ProviderHttpError(providerId, response.status, safeCode(response.status));
  try {
    const value = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("invalid JSON object");
    return value as Record<string, unknown>;
  } catch {
    // HTTP success means the provider may already have processed and billed the call.
    // A broken/truncated response is not safe to retry or fall back automatically.
    throw new ProviderOutcomeUnknownError(`${providerId} returned an unreadable successful response`);
  }
}

function contentText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function callOpenAiCompatible(
  entry: ProviderRegistryEntry,
  apiKey: string,
  model: string,
  messages: ProviderMessages,
  timeoutMs: number,
): Promise<ProviderTextResult> {
  const response = await fetchKnownOutcome(entry.id, `${entry.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: false,
      messages: [
        { role: "system", content: messages.system },
        { role: "user", content: messages.user },
      ],
    }),
  }, timeoutMs);
  const json = await checkedJson(entry.id, response);
  const choices = Array.isArray(json.choices) ? json.choices : [];
  const first = choices[0] as Record<string, unknown> | undefined;
  const message = first?.message as Record<string, unknown> | undefined;
  const text = contentText(message?.content);
  const finishReason = typeof first?.finish_reason === "string" ? first.finish_reason : null;
  const usage = (json.usage && typeof json.usage === "object" ? json.usage : {}) as Record<string, unknown>;
  return {
    providerId: entry.id,
    model,
    text,
    providerRequestId: requestId(response.headers),
    usage: providerUsage(usage.prompt_tokens, usage.completion_tokens, usage.total_tokens),
    finishReason,
  };
}

async function callAnthropic(
  entry: ProviderRegistryEntry,
  apiKey: string,
  model: string,
  messages: ProviderMessages,
  timeoutMs: number,
): Promise<ProviderTextResult> {
  const response = await fetchKnownOutcome(entry.id, `${entry.baseUrl}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: messages.system,
      messages: [{ role: "user", content: messages.user }],
    }),
  }, timeoutMs);
  const json = await checkedJson(entry.id, response);
  const blocks = Array.isArray(json.content) ? json.content : [];
  const text = blocks
    .map((block) => block && typeof block === "object" && (block as Record<string, unknown>).type === "text"
      ? contentText((block as Record<string, unknown>).text)
      : "")
    .filter(Boolean)
    .join("\n")
    .trim();
  const usage = (json.usage && typeof json.usage === "object" ? json.usage : {}) as Record<string, unknown>;
  return {
    providerId: entry.id,
    model,
    text,
    providerRequestId: requestId(response.headers),
    usage: providerUsage(usage.input_tokens, usage.output_tokens, undefined),
    finishReason: typeof json.stop_reason === "string" ? json.stop_reason : null,
  };
}

async function callGemini(
  entry: ProviderRegistryEntry,
  apiKey: string,
  model: string,
  messages: ProviderMessages,
  timeoutMs: number,
): Promise<ProviderTextResult> {
  const encodedModel = encodeURIComponent(model);
  const response = await fetchKnownOutcome(entry.id, `${entry.baseUrl}/models/${encodedModel}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: messages.system }] },
      contents: [{ role: "user", parts: [{ text: messages.user }] }],
    }),
  }, timeoutMs);
  const json = await checkedJson(entry.id, response);
  const candidates = Array.isArray(json.candidates) ? json.candidates : [];
  const first = candidates[0] as Record<string, unknown> | undefined;
  const content = first?.content as Record<string, unknown> | undefined;
  const parts = Array.isArray(content?.parts) ? content.parts : [];
  const text = parts
    .map((part) => part && typeof part === "object" ? contentText((part as Record<string, unknown>).text) : "")
    .filter(Boolean)
    .join("\n")
    .trim();
  const finishReason = typeof first?.finishReason === "string" ? first.finishReason : null;
  const usage = (json.usageMetadata && typeof json.usageMetadata === "object" ? json.usageMetadata : {}) as Record<string, unknown>;
  return {
    providerId: entry.id,
    model,
    text,
    providerRequestId: requestId(response.headers),
    usage: providerUsage(usage.promptTokenCount, usage.candidatesTokenCount, usage.totalTokenCount),
    finishReason,
  };
}

export function validateProviderText(result: ProviderTextResult): boolean {
  if (!result.text.trim()) return false;
  const finish = result.finishReason?.toUpperCase() ?? "";
  if (finish.includes("SAFETY") || finish.includes("BLOCK")) return false;
  return true;
}

export async function callConfiguredManagedProvider(
  providerId: string,
  messages: ProviderMessages,
  options: { timeoutMs?: number } = {},
): Promise<ProviderTextResult> {
  const configured = configuredManagedProvider(providerId);
  if (!configured) throw new Error(`Managed provider '${providerId}' is not configured server-side`);
  const { entry, apiKey, model } = configured;
  const timeoutMs = options.timeoutMs ?? 60_000;

  if (entry.protocol === "anthropic") return callAnthropic(entry, apiKey, model, messages, timeoutMs);
  if (entry.protocol === "gemini") return callGemini(entry, apiKey, model, messages, timeoutMs);
  return callOpenAiCompatible(entry, apiKey, model, messages, timeoutMs);
}

export async function testConfiguredManagedProvider(providerId: string): Promise<{
  ok: true;
  providerId: CertifiedProviderId;
  model: string;
  providerRequestId: string | null;
  latencyMs: number;
  usage: ProviderUsage;
}> {
  const entry = getProviderRegistryEntry(providerId);
  const startedAt = Date.now();
  const result = await callConfiguredManagedProvider(entry.id, {
    system: "Connection test. Return exactly LEAH_OK.",
    user: "ping",
  }, { timeoutMs: 20_000 });
  if (!validateProviderText(result) || result.text.trim() !== "LEAH_OK") {
    throw new Error(`${entry.id} connection test returned an invalid response`);
  }
  return {
    ok: true,
    providerId: entry.id,
    model: result.model,
    providerRequestId: result.providerRequestId,
    latencyMs: Date.now() - startedAt,
    usage: result.usage,
  };
}
