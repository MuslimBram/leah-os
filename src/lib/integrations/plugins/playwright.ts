import type { IntegrationPlugin } from "../types";

export const playwrightPlugin: IntegrationPlugin = {
  id: "playwright",
  name: "Playwright",
  vendor: "Microsoft",
  category: "other",
  capabilities: ["test"],
  status: "stable",
  description: "E2E tests në browser. Worker node për smoke tests pas deploy-it.",
  docsUrl: "https://playwright.dev",
  accent: "oklch(0.70 0.20 20)",
};