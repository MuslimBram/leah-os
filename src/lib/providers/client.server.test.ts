// @ts-ignore -- bun's built-in test runner; types are not installed in the project.
import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { ProviderOutcomeUnknownError } from "../router/code-router";
import { callConfiguredManagedProvider, validateProviderText } from "./client.server";
import { assertProviderEndpoint } from "./registry.server";

const originalFetch = globalThis.fetch;
const originalEnv = { ...process.env };

function responseJson(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
    ...init,
  });
}

beforeEach(() => {
  process.env["LEAH_OPENAI_API_KEY"] = "test-only-key";
  process.env["LEAH_OPENAI_MODEL"] = "test-model";
  process.env["LEAH_GEMINI_API_KEY"] = "test-only-key";
  process.env["LEAH_GEMINI_MODEL"] = "test-gemini";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("MR7A provider client safety contracts", () => {
  it("rejects link-local and internal endpoint overrides before any request", () => {
    expect(() => assertProviderEndpoint("openai", "http://169.254.169.254/latest/meta-data")).toThrow("Endpoint override is forbidden");
    expect(() => assertProviderEndpoint("openai", "https://wlvlgghqwwhhqaqqopml.supabase.co/rest/v1")).toThrow("Endpoint override is forbidden");
    expect(() => assertProviderEndpoint("openai", "https://api.openai.com/v1")).not.toThrow();
  });

  it("does not call an HTTP 200 empty OpenAI-compatible response a success and preserves usage", async () => {
    globalThis.fetch = (async () => responseJson({
      choices: [{ message: { content: "" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 12, completion_tokens: 3, total_tokens: 15 },
    }, { headers: { "x-request-id": "req-empty" } })) as typeof fetch;

    const result = await callConfiguredManagedProvider("openai", { system: "sys", user: "ping" });
    expect(result.providerRequestId).toBe("req-empty");
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 3, totalTokens: 15, usageSource: "provider" });
    expect(validateProviderText(result)).toBe(false);
  });

  it("treats Gemini SAFETY as an invalid provider result rather than empty success", async () => {
    globalThis.fetch = (async () => responseJson({
      candidates: [{ finishReason: "SAFETY", content: { parts: [] } }],
      usageMetadata: { promptTokenCount: 9, candidatesTokenCount: 0, totalTokenCount: 9 },
    })) as typeof fetch;

    const result = await callConfiguredManagedProvider("gemini", { system: "sys", user: "ping" });
    expect(result.finishReason).toBe("SAFETY");
    expect(result.usage.totalTokens).toBe(9);
    expect(validateProviderText(result)).toBe(false);
  });

  it("marks malformed HTTP-success response as unknown so fallback cannot double-spend", async () => {
    globalThis.fetch = (async () => new Response("{broken", { status: 200, headers: { "Content-Type": "application/json" } })) as typeof fetch;

    try {
      await callConfiguredManagedProvider("openai", { system: "sys", user: "ping" });
      throw new Error("expected unknown outcome");
    } catch (error) {
      expect(error).toBeInstanceOf(ProviderOutcomeUnknownError);
    }
  });

  it("marks transport rejection as unknown rather than known failure", async () => {
    globalThis.fetch = (async () => { throw new TypeError("socket reset"); }) as typeof fetch;
    await expect(callConfiguredManagedProvider("openai", { system: "sys", user: "ping" }))
      .rejects.toBeInstanceOf(ProviderOutcomeUnknownError);
  });
});
