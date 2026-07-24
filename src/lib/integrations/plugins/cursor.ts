import type { IntegrationPlugin } from "../types";

export const cursorPlugin: IntegrationPlugin = {
  id: "cursor",
  name: "Cursor",
  vendor: "Anysphere",
  category: "worker-node",
  capabilities: ["refactor", "generate-code"],
  status: "stable",
  description: "Worker node për refactor në-repo.",
  configSchema: [{ key: "apiKey", label: "API Key", type: "password" }],
  accent: "oklch(0.70 0.15 300)",
};