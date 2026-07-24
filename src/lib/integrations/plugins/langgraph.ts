import type { IntegrationPlugin } from "../types";

export const langgraphPlugin: IntegrationPlugin = {
  id: "langgraph",
  name: "LangGraph",
  vendor: "LangChain",
  category: "automation",
  capabilities: ["plan", "run-workflow"],
  status: "beta",
  description: "Truri i Leah — graf state-machines për agjentë.",
  configSchema: [
    { key: "endpoint", label: "Endpoint URL", type: "url", required: true },
    { key: "apiKey", label: "API Key", type: "password" },
  ],
  accent: "oklch(0.72 0.17 160)",
};