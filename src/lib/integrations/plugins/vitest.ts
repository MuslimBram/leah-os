import type { IntegrationPlugin } from "../types";

export const vitestPlugin: IntegrationPlugin = {
  id: "vitest",
  name: "Vitest",
  vendor: "Vitest",
  category: "other",
  capabilities: ["test"],
  status: "stable",
  description: "Unit & integration tests. Worker node për ekzekutim automatik.",
  docsUrl: "https://vitest.dev",
  accent: "oklch(0.75 0.18 130)",
};