import type { IntegrationPlugin } from "../types";

export const ollamaPlugin: IntegrationPlugin = {
  id: "ollama",
  name: "Ollama",
  vendor: "Ollama",
  category: "local-model",
  capabilities: ["chat", "generate-code", "embed"],
  status: "stable",
  description: "Modele lokale (Llama, Qwen, Mistral) përmes Ollama runtime. Offline & pa kosto.",
  docsUrl: "https://ollama.com",
  configSchema: [
    { key: "baseUrl", label: "Base URL", type: "url", placeholder: "http://localhost:11434", required: true },
    { key: "model", label: "Default model", type: "text", placeholder: "llama3.1:8b" },
  ],
  accent: "oklch(0.70 0.15 100)",
};