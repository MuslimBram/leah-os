import type { BillingMode, RouterAttemptStatus } from "../router/code-router";
import type { ProviderUsage } from "./client.server";
import { pulseMeter } from "./pulse-meter.server";

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
  outcome: RouterAttemptStatus;
  providerRequestId?: string | null;
  usage: ProviderUsage;
  costMicros?: number | null;
  errorCode?: string | null;
  latencyMs?: number | null;
  canonicalResult?: boolean;
  metadata?: Record<string, unknown>;
};

export async function beginProviderAttempt(input: ProviderAttemptBegin): Promise<Record<string, unknown>> {
  return pulseMeter("provider.begin", {
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
  return pulseMeter("provider.finish", {
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
  return pulseMeter("provider.materialization.claim", {
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
  return pulseMeter("provider.materialization.finalize", {
    task_id: input.taskId,
    lease_token: input.leaseToken,
    attempt_id: input.attemptId,
    materialization_key: input.materializationKey,
    materialized_ref: input.materializedRef,
  });
}
