import type { IntegrationPlugin } from "../types";

export const n8nPlugin: IntegrationPlugin = {
  id: "n8n",
  name: "n8n",
  vendor: "n8n.io",
  category: "automation",
  capabilities: ["run-workflow", "deploy"],
  status: "stable",
  description: "Duart e Leah — ekzekuton workflow-e (email, CRM, ETL). BYO instance ose cloud.",
  docsUrl: "https://docs.n8n.io",
  configSchema: [
    { key: "baseUrl", label: "Base URL", type: "url", placeholder: "https://n8n.example.com", required: true },
    { key: "apiKey", label: "API Key", type: "password", required: true },
  ],
  accent: "oklch(0.72 0.18 20)",
};