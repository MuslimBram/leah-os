export type CertifiedProviderId = "openai" | "anthropic" | "gemini" | "deepseek" | "kimi" | "zai";
export type ProviderProtocol = "openai-compatible" | "anthropic" | "gemini";

export type ProviderRegistryEntry = {
  id: CertifiedProviderId;
  protocol: ProviderProtocol;
  /** Exact server-owned API base. Never accept an override from a browser/workspace. */
  baseUrl: string;
  apiKeyEnv: string;
  modelEnv: string;
  contextTokensEnv: string;
};

const REGISTRY: Record<CertifiedProviderId, ProviderRegistryEntry> = {
  openai: {
    id: "openai",
    protocol: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "LEAH_OPENAI_API_KEY",
    modelEnv: "LEAH_OPENAI_MODEL",
    contextTokensEnv: "LEAH_OPENAI_CONTEXT_TOKENS",
  },
  anthropic: {
    id: "anthropic",
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKeyEnv: "LEAH_ANTHROPIC_API_KEY",
    modelEnv: "LEAH_ANTHROPIC_MODEL",
    contextTokensEnv: "LEAH_ANTHROPIC_CONTEXT_TOKENS",
  },
  gemini: {
    id: "gemini",
    protocol: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyEnv: "LEAH_GEMINI_API_KEY",
    modelEnv: "LEAH_GEMINI_MODEL",
    contextTokensEnv: "LEAH_GEMINI_CONTEXT_TOKENS",
  },
  deepseek: {
    id: "deepseek",
    protocol: "openai-compatible",
    baseUrl: "https://api.deepseek.com",
    apiKeyEnv: "LEAH_DEEPSEEK_API_KEY",
    modelEnv: "LEAH_DEEPSEEK_MODEL",
    contextTokensEnv: "LEAH_DEEPSEEK_CONTEXT_TOKENS",
  },
  kimi: {
    id: "kimi",
    protocol: "openai-compatible",
    baseUrl: "https://api.kimi.com/coding/v1",
    apiKeyEnv: "LEAH_KIMI_API_KEY",
    modelEnv: "LEAH_KIMI_MODEL",
    contextTokensEnv: "LEAH_KIMI_CONTEXT_TOKENS",
  },
  zai: {
    id: "zai",
    protocol: "openai-compatible",
    baseUrl: "https://api.z.ai/api/paas/v4",
    apiKeyEnv: "LEAH_ZAI_API_KEY",
    modelEnv: "LEAH_ZAI_MODEL",
    contextTokensEnv: "LEAH_ZAI_CONTEXT_TOKENS",
  },
};

export function isCertifiedProviderId(value: string): value is CertifiedProviderId {
  return Object.prototype.hasOwnProperty.call(REGISTRY, value);
}

export function getProviderRegistryEntry(providerId: string): ProviderRegistryEntry {
  if (!isCertifiedProviderId(providerId)) {
    throw new Error(`Provider '${providerId}' is not in the MR7A server allowlist`);
  }
  return REGISTRY[providerId];
}

/**
 * Rejects all endpoint overrides. This is intentionally stricter than a generic
 * SSRF URL validator: MR7A providers have one exact server-owned endpoint.
 */
export function assertProviderEndpoint(providerId: string, url: string): void {
  const expected = new URL(getProviderRegistryEntry(providerId).baseUrl);
  const actual = new URL(url);
  if (actual.protocol !== "https:" || actual.origin !== expected.origin || actual.pathname.replace(/\/$/, "") !== expected.pathname.replace(/\/$/, "")) {
    throw new Error(`Endpoint override is forbidden for provider '${providerId}'`);
  }
}

function optionalPositiveInteger(envName: string): number | undefined {
  const raw = process.env[envName]?.trim();
  if (!raw) return undefined;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`${envName} must be a positive integer`);
  }
  return value;
}

export function configuredManagedProvider(providerId: string): {
  entry: ProviderRegistryEntry;
  apiKey: string;
  model: string;
  maxInputTokens?: number;
} | null {
  const entry = getProviderRegistryEntry(providerId);
  const apiKey = process.env[entry.apiKeyEnv]?.trim() ?? "";
  const model = process.env[entry.modelEnv]?.trim() ?? "";
  if (!apiKey || !model) return null;
  return {
    entry,
    apiKey,
    model,
    maxInputTokens: optionalPositiveInteger(entry.contextTokensEnv),
  };
}

export function listConfiguredManagedProviders(): Array<{
  entry: ProviderRegistryEntry;
  apiKey: string;
  model: string;
  maxInputTokens?: number;
}> {
  return (Object.keys(REGISTRY) as CertifiedProviderId[])
    .map((id) => configuredManagedProvider(id))
    .filter((value): value is NonNullable<typeof value> => value !== null);
}
