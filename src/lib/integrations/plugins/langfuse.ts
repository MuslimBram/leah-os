import type { IntegrationPlugin } from "../types";

export const langfusePlugin: IntegrationPlugin = {
  id: "langfuse",
  name: "LangFuse",
  vendor: "LangFuse",
  category: "observability",
  capabilities: ["trace", "monitor"],
  status: "stable",
  description: "LLM tracing & evals — çdo call i Planner/Router-it logohet për analizë kostoje dhe cilësie.",
  docsUrl: "https://langfuse.com/docs",
  configSchema: [
    { key: "host", label: "Host", type: "url", placeholder: "https://cloud.langfuse.com", required: true },
    { key: "publicKey", label: "Public Key", type: "text", required: true },
    { key: "secretKey", label: "Secret Key", type: "password", required: true },
  ],
  accent: "oklch(0.72 0.18 320)",
};