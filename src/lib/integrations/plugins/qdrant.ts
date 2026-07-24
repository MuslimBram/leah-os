import type { IntegrationPlugin } from "../types";

export const qdrantPlugin: IntegrationPlugin = {
  id: "qdrant",
  name: "Qdrant",
  vendor: "Qdrant",
  category: "memory",
  capabilities: ["embed"],
  status: "stable",
  description: "Vector DB alternative ndaj Supabase pgvector. BYO cluster.",
  configSchema: [
    { key: "url", label: "Cluster URL", type: "url", required: true },
    { key: "apiKey", label: "API Key", type: "password" },
  ],
  accent: "oklch(0.72 0.20 130)",
};