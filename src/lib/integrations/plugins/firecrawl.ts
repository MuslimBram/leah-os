import type { IntegrationPlugin } from "../types";

export const firecrawlPlugin: IntegrationPlugin = {
  id: "firecrawl",
  name: "Firecrawl",
  vendor: "Firecrawl",
  category: "research",
  capabilities: ["scrape"],
  status: "stable",
  description: "Scrape docs & sites, kthen markdown të pastër për Memory.",
  docsUrl: "https://firecrawl.dev",
  configSchema: [{ key: "apiKey", label: "API Key", type: "password", required: true }],
  accent: "oklch(0.72 0.18 60)",
};