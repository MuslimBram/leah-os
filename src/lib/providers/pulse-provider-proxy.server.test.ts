// @ts-ignore -- bun's built-in test runner; types not installed in the project.
import { afterEach, describe, expect, it } from "bun:test";
import { ProviderOutcomeUnknownError } from "../router/code-router";
import {
  callPulseByokProvider,
  listPulseByokProviders,
  settlePulseByokAttempt,
} from "./pulse-provider-proxy.server";

const originalFetch = globalThis.fetch;
const originalUrl = process.env.LEAH_PULSE_PROVIDER_PROXY_URL;
const originalSecret = process.env.LEAH_WORKER_SECRET;
const authority = {
  taskId: "11111111-1111-4111-8111-111111111111",
  leaseToken: "22222222-2222-4222-8222-222222222222",
};

function env() {
  process.env.LEAH_PULSE_PROVIDER_PROXY_URL = "https://example.supabase.co/functions/v1/leah-provider-proxy";
  process.env.LEAH_WORKER_SECRET = "x".repeat(40);
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalUrl === undefined) delete process.env.LEAH_PULSE_PROVIDER_PROXY_URL;
  else process.env.LEAH_PULSE_PROVIDER_PROXY_URL = originalUrl;
  if (originalSecret === undefined) delete process.env.LEAH_WORKER_SECRET;
  else process.env.LEAH_WORKER_SECRET = originalSecret;
});

describe("Pulse Vault BYOK proxy client", () => {
  it("returns only certified task-bound provider/model catalog entries", async () => {
    env();
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? "{}"));
      expect(body).toEqual({ action: "catalog", task_id: authority.taskId, lease_token: authority.leaseToken });
      expect(JSON.stringify(body)).not.toContain("workspace");
      expect(JSON.stringify(body)).not.toContain("api_key");
      return new Response(JSON.stringify({ providers: [
        { provider: "openai", model: "gpt-test" },
        { provider: "evil", model: "x" },
        { provider: "openai", model: "duplicate" },
      ] }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;

    expect(await listPulseByokProviders(authority)).toEqual([{ providerId: "openai", model: "gpt-test" }]);
  });

  it("sends exact router attempt authority without workspace, model, endpoint or key", async () => {
    env();
    let observed: Record<string, unknown> = {};
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      observed = JSON.parse(String(init?.body ?? "{}"));
      return new Response(JSON.stringify({
        ok: true,
        provider: "openai",
        model: "gpt-test",
        text: "**src/x.ts**\n```ts\nexport const x=1\n```",
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15, usageSource: "provider" },
        provider_request_id: "req-1",
        finish_reason: "stop",
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;

    const result = await callPulseByokProvider({
      ...authority,
      logicalRequestId: "33333333-3333-4333-8333-333333333333",
      attemptId: "44444444-4444-4444-8444-444444444444",
      providerId: "openai",
      expectedModel: "gpt-test",
      system: "system",
      user: "user",
    });

    expect(observed.logical_request_id).toBe("33333333-3333-4333-8333-333333333333");
    expect(observed.attempt_id).toBe("44444444-4444-4444-8444-444444444444");
    for (const forbidden of ["workspace_id", "api_key", "base_url", "secret_id", "model"]) {
      expect(Object.prototype.hasOwnProperty.call(observed, forbidden)).toBe(false);
    }
    expect(result.providerRequestId).toBe("req-1");
  });

  it("treats proxy transport loss after generate dispatch as unknown and never as a known failure", async () => {
    env();
    globalThis.fetch = (async () => { throw new TypeError("socket lost"); }) as typeof fetch;
    await expect(callPulseByokProvider({
      ...authority,
      logicalRequestId: "33333333-3333-4333-8333-333333333333",
      attemptId: "44444444-4444-4444-8444-444444444444",
      providerId: "openai",
      expectedModel: "gpt-test",
      system: "system",
      user: "user",
    })).rejects.toBeInstanceOf(ProviderOutcomeUnknownError);
  });

  it("settles unavailable provider usage conservatively as estimated, not provider-reported or zero", async () => {
    env();
    let observed: Record<string, unknown> = {};
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      observed = JSON.parse(String(init?.body ?? "{}"));
      return new Response(JSON.stringify({ settlement: { ok: true } }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;

    await settlePulseByokAttempt({
      ...authority,
      attemptId: "44444444-4444-4444-8444-444444444444",
      outcome: "succeeded",
      value: {
        providerId: "openai",
        model: "gpt-test",
        text: "code",
        providerRequestId: "req-1",
        usage: { inputTokens: null, outputTokens: null, totalTokens: null, usageSource: "unavailable" },
        finishReason: "stop",
      },
      latencyMs: 123,
      estimatedInputTokens: 111,
      estimatedOutputTokens: 222,
    });

    expect(observed.usage_source).toBe("estimated");
    expect(observed.input_tokens).toBe(111);
    expect(observed.output_tokens).toBe(222);
    expect(observed.canonical_result).toBe(true);
  });
});
