import type { BillingMode, RouterAttemptStatus } from "../router/code-router";
import type { ProviderUsage } from "./client.server";

export type AttemptAuthority = {
  taskId: string;
  leaseToken: string;
};

export type ProviderAttemptBegin = AttemptAuthority & {
  logicalRequestId: string;
  attemptId: string;
  billingMode: BillingMode;
  provider: string;
  model: string;
  reservationId?: string | null;
  metadata?: Record<string, unknown>;
};

export type ProviderAttemptFinish = AttemptAuthority & {
  attemptId: string;
  outcome: Exclude<RouterAttemptStatus, never>;
  providerRequestId?: string | null;
  usage: ProviderUsage;
  costMicros?: number | null;
  errorCode?: string | null;
  latencyMs?: number | null;
  canonicalResult?: boolean;
  metadata?: Record<string, unknown>;
};

function meterUrl(): string {
  const value = process.env["LEAH_PULSE_METER_URL"]?.trim() ?? "";
  if (!value) throw new Error("LEAH_PULSE_METER_URL is not configured");
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.pathname.endsWith("/leah-meter")) {
    throw new Error("LEAH_PULSE_METER_URL must be an HTTPS leah-meter endpoint");
  }
  return url.toString();
}

function workerSecret(): string {
  const value = process.env["LEAH_WORKER_SECRET"]?.trim() ?? "";
  if (value.length < 32) throw new Error("LEAH_WORKER_SECRET is not configured");
  return value;
}

async function meter(action: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (Object.prototype.hasOwnProperty.call(body, "workspace_id") || Object.prototype.hasOwnProperty.call(body, "workspaceId")) {
    throw new Error("workspace_id must never be supplied to the Pulse LEAH meter");
  }
  const response = await fetch(meterUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Leah-Worker-Secret": workerSecret(),
    },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (!response.ok) {
    const message = typeof data.error === "string" ? data.error : `LEAH meter HTTP ${response.status}`;
    throw new Error(message.slice(0, 240));
  }
  return data;
}

export async function beginProviderAttempt(input: ProviderAttemptBegin): Promise<Record<string, unknown>> {
  return meter("provider.begin", {
    task_id: input.taskId,
    lease_token: input.leaseToken,
    logical_request_id: input.logicalRequestId,
    attempt_id: input.attemptId,
    billing_mode: input.billingMode,
    provider: input.provider,
    model: input.model,
    reservation_id: input.reservationId ?? null,
    metadata: input.metadata ?? {},
  });
}

export async function finishProviderAttempt(input: ProviderAttemptFinish): Promise<Record<string, unknown>> {
  const usage = input.usage;
  return meter("provider.finish", {
    task_id: input.taskId,
    lease_token: input.leaseToken,
    attempt_id: input.attemptId,
    outcome: input.outcome,
    provider_request_id: input.providerRequestId ?? null,
    usage_source: usage.usageSource,
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    total_tokens: usage.totalTokens,
    cost_micros: input.costMicros ?? null,
    error_code: input.errorCode ?? null,
    latency_ms: input.latencyMs ?? null,
    canonical_result: input.canonicalResult ?? false,
    metadata: input.metadata ?? {},
  });
}

export async function claimProviderMaterialization(input: AttemptAuthority & {
  attemptId: string;
  materializationKey: string;
}): Promise<Record<string, unknown>> {
  return meter("provider.materialization.claim", {
    task_id: input.taskId,
    lease_token: input.leaseToken,
    attempt_id: input.attemptId,
    materialization_key: input.materializationKey,
  });
}

export async function finalizeProviderMaterialization(input: AttemptAuthority & {
  attemptId: string;
  materializationKey: string;
  materializedRef: string;
}): Promise<Record<string, unknown>> {
  return meter("provider.materialization.finalize", {
    task_id: input.taskId,
    lease_token: input.leaseToken,
    attempt_id: input.attemptId,
    materialization_key: input.materializationKey,
    materialized_ref: input.materializedRef,
  });
}
