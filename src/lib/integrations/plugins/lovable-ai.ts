import type { IntegrationPlugin } from "../types";

export const lovableAiPlugin: IntegrationPlugin = {
  id: "lovable-ai",
  name: "Lovable AI Gateway",
  vendor: "Lovable",
  category: "code-generation",
  capabilities: ["plan", "generate-code", "chat"],
  status: "stable",
  description: "Gateway i menaxhuar për Claude, GPT, Gemini dhe modele të tjera. E integruar për Planner.",
  docsUrl: "https://docs.lovable.dev/features/ai",
  defaultEnabled: true,
  accent: "oklch(0.75 0.20 340)",
};