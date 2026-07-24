import type { IntegrationPlugin } from "../types";

export const sentryPlugin: IntegrationPlugin = {
  id: "sentry",
  name: "Sentry",
  vendor: "Sentry",
  category: "observability",
  capabilities: ["monitor", "debug"],
  status: "stable",
  description: "Error tracking për projekte të gjeneruara. Traces + source maps.",
  docsUrl: "https://docs.sentry.io",
  configSchema: [
    { key: "dsn", label: "DSN", type: "url", required: true },
    { key: "org", label: "Org slug", type: "text" },
    { key: "authToken", label: "Auth Token", type: "password" },
  ],
  accent: "oklch(0.70 0.20 30)",
};