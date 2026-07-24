import type { IntegrationPlugin } from "../types";

export const weaviatePlugin: IntegrationPlugin = {
  id: "weaviate",
  name: "Weaviate",
  vendor: "Weaviate",
  category: "memory",
  capabilities: ["embed"],
  status: "stable",
  description: "Vector DB me hybrid search. Alternative ndaj Qdrant / pgvector.",
  docsUrl: "https://weaviate.io/developers/weaviate",
  configSchema: [
    { key: "url", label: "Cluster URL", type: "url", required: true },
    { key: "apiKey", label: "API Key", type: "password" },
  ],
  accent: "oklch(0.72 0.18 140)",
};