import type { ProviderUsage } from "./client.server";
import type { AttemptAuthority } from "./attempt-ledger.server";
import { pulseMeter } from "./pulse-meter.server";

export type ManagedReservation = {
  id: string;
  requestedTokens: number;
};

function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid LEAH meter response");
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`Missing ${label}`);
  return value.trim();
}

export async function reserveManagedTokens(input: AttemptAuthority & {
  eventKey: string;
  requestedTokens: number;
  ttlSeconds?: number;
}): Promise<ManagedReservation> {
  const result = await pulseMeter("managed.reserve", {
    task_id: input.taskId,
    lease_token: input.leaseToken,
    event_key: input.eventKey,
    requested_tokens: input.requestedTokens,
    ttl_seconds: input.ttlSeconds ?? 300,
  });
  const reservation = objectValue(result.reservation);
  return {
    id: requiredString(reservation.id, "managed reservation id"),
    requestedTokens: Number(reservation.requested_tokens ?? input.requestedTokens),
  };
}

export async function releaseManagedReservation(input: AttemptAuthority & {
  reservationId: string;
}): Promise<void> {
  await pulseMeter("managed.release", {
    task_id: input.taskId,
    lease_token: input.leaseToken,
    reservation_id: input.reservationId,
  });
}

export async function finalizeManagedUsage(input: AttemptAuthority & {
  reservation: ManagedReservation;
  provider: string;
  model: string;
  usage: ProviderUsage;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  costMicros?: number | null;
  metadata?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const hasProviderUsage = input.usage.usageSource === "provider" &&
    input.usage.inputTokens !== null && input.usage.outputTokens !== null;

  const inputTokens = hasProviderUsage ? input.usage.inputTokens! : input.estimatedInputTokens;
  const outputTokens = hasProviderUsage ? input.usage.outputTokens! : input.estimatedOutputTokens;
  const source = hasProviderUsage ? "provider" : "estimated";

  // Cost is not invented. The legacy MR5 usage table requires a numeric field,
  // so an unavailable monetary cost is accompanied by cost_source=unavailable
  // and must never be presented as "free" by reporting code.
  const costMicros = input.costMicros ?? 0;
  const costSource = input.costMicros === null || input.costMicros === undefined ? "unavailable" : "provider";

  return pulseMeter("managed.finalize", {
    task_id: input.taskId,
    lease_token: input.leaseToken,
    reservation_id: input.reservation.id,
    provider: input.provider,
    model: input.model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_micros: costMicros,
    metadata: {
      ...(input.metadata ?? {}),
      usage_source: source,
      provider_usage_source: input.usage.usageSource,
      cost_source: costSource,
      reserved_tokens: input.reservation.requestedTokens,
    },
  });
}

export async function recordByokUsage(input: AttemptAuthority & {
  eventKey: string;
  provider: string;
  model: string;
  usage: ProviderUsage;
  estimatedInputTokens: number;
  estimatedOutputTokens: number;
  metadata?: Record<string, unknown>;
}): Promise<Record<string, unknown>> {
  const hasProviderUsage = input.usage.usageSource === "provider" &&
    input.usage.inputTokens !== null && input.usage.outputTokens !== null;
  const inputTokens = hasProviderUsage ? input.usage.inputTokens! : input.estimatedInputTokens;
  const outputTokens = hasProviderUsage ? input.usage.outputTokens! : input.estimatedOutputTokens;

  return pulseMeter("byok.record", {
    task_id: input.taskId,
    lease_token: input.leaseToken,
    event_key: input.eventKey,
    provider: input.provider,
    model: input.model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_micros: 0,
    metadata: {
      ...(input.metadata ?? {}),
      usage_source: hasProviderUsage ? "provider" : "estimated",
      provider_usage_source: input.usage.usageSource,
      cost_source: "tenant_byok_not_billed_by_pulse",
    },
  });
}
