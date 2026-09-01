export type CertifiedProviderId = "openai" | "anthropic" | "gemini" | "deepseek" | "kimi" | "zai";
export type ProviderProtocol = "openai-compatible" | "anthropic" | "gemini";

export type ProviderRegistryEntry = {
  id: CertifiedProviderId;
  protocol: ProviderProtocol;
  /** Exact server-owned API base. Never accept an override from a browser/workspace. */
  baseUrl: string;
  apiKeyEnv: string;
  modelEnv: string;
};

const REGISTRY: Record<CertifiedProviderId, ProviderRegistryEntry> = {
  openai: {
    id: "openai",
    protocol: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnv: "LEAH_OPENAI_API_KEY",
    modelEnv: "LEAH_OPENAI_MODEL",
  },
  anthropic: {
    id: "anthropic",
    protocol: "anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    apiKeyEnv: "LEAH_ANTHROPIC_API_KEY",
    modelEnv: "LEAH_ANTHROPIC_MODEL",
  },
  gemini: {
    id: "gemini",
    protocol: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    apiKeyEnv: "LEAH_GEMINI_API_KEY",
    modelEnv: "LEAH_GEMINI_MODEL",
  },
  deepseek: {
    id: "deepseek",
    protocol: "openai-compatible",
    baseUrl: "https://api.deepseek.com",
    apiKeyEnv: "LEAH_DEEPSEEK_API_KEY",
    modelEnv: "LEAH_DEEPSEEK_MODEL",
  },
  kimi: {
    id: "kimi",
    protocol: "openai-compatible",
    baseUrl: "https://api.kimi.com/coding/v1",
    apiKeyEnv: "LEAH_KIMI_API_KEY",
    modelEnv: "LEAH_KIMI_MODEL",
  },
  zai: {
    id: "zai",
    protocol: "openai-compatible",
    baseUrl: "https://api.z.ai/api/paas/v4",
    apiKeyEnv: "LEAH_ZAI_API_KEY",
    modelEnv: "LEAH_ZAI_MODEL",
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

export function configuredManagedProvider(providerId: string): {
  entry: ProviderRegistryEntry;
  apiKey: string;
  model: string;
} | null {
  const entry = getProviderRegistryEntry(providerId);
  const apiKey = process.env[entry.apiKeyEnv]?.trim() ?? "";
  const model = process.env[entry.modelEnv]?.trim() ?? "";
  if (!apiKey || !model) return null;
  return { entry, apiKey, model };
}

export function listConfiguredManagedProviders(): Array<{
  entry: ProviderRegistryEntry;
  apiKey: string;
  model: string;
}> {
  return (Object.keys(REGISTRY) as CertifiedProviderId[])
    .map((id) => configuredManagedProvider(id))
    .filter((value): value is NonNullable<typeof value> => value !== null);
}
