import type { IntegrationPlugin } from "../types";

export const aiSdkPlugin: IntegrationPlugin = {
  id: "ai-sdk",
  name: "Vercel AI SDK",
  vendor: "Vercel",
  category: "sdk",
  capabilities: ["chat", "generate-code", "tool-calling"],
  status: "stable",
  description: "AI SDK i unifikuar për streaming, tool calling dhe structured output. Baza për Planner dhe Router.",
  docsUrl: "https://ai-sdk.dev",
  defaultEnabled: true,
  accent: "oklch(0.78 0.02 260)",
};