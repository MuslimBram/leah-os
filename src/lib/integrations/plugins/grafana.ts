import type { IntegrationPlugin } from "../types";

export const grafanaPlugin: IntegrationPlugin = {
  id: "grafana",
  name: "Grafana",
  vendor: "Grafana Labs",
  category: "observability",
  capabilities: ["monitor"],
  status: "stable",
  description: "Dashboarde metrikash për infra dhe app. Grafana Cloud ose self-hosted.",
  docsUrl: "https://grafana.com/docs",
  configSchema: [
    { key: "url", label: "Grafana URL", type: "url", required: true },
    { key: "apiKey", label: "API Key", type: "password", required: true },
  ],
  accent: "oklch(0.72 0.20 60)",
};