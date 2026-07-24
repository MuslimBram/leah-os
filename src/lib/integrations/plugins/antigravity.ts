import type { IntegrationPlugin } from "../types";

export const antigravityPlugin: IntegrationPlugin = {
  id: "antigravity",
  name: "Antigravity",
  vendor: "Google",
  category: "code-generation",
  capabilities: ["generate-code", "refactor", "plan"],
  status: "experimental",
  description: "IDE agjentike nga Google për gjenerim kodi dhe browser tasks. Adapter BYOK me endpoint të konfigurueshëm.",
  docsUrl: "https://antigravity.google",
  configSchema: [
    { key: "endpoint", label: "Endpoint URL", type: "url", placeholder: "https://api.antigravity.google/v1", required: true },
    { key: "apiKey", label: "API Key", type: "password", required: true },
  ],
  accent: "oklch(0.72 0.20 260)",
  invoke: async ({ capability, payload }, { config }) => {
    if (!config.apiKey) return { ok: false, message: "Mungon API Key" };
    return { ok: true, data: { echoed: payload, capability, note: "Antigravity adapter (stub)" } };
  },
};