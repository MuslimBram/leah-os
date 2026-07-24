import type { IntegrationPlugin } from "../types";

export const windsurfPlugin: IntegrationPlugin = {
  id: "windsurf",
  name: "Windsurf",
  vendor: "Codeium",
  category: "worker-node",
  capabilities: ["debug", "refactor"],
  status: "stable",
  description: "Debug worker — traces, log-analysis, patches.",
  configSchema: [{ key: "apiKey", label: "API Key", type: "password" }],
  accent: "oklch(0.70 0.18 200)",
};