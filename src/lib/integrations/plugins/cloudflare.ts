import type { IntegrationPlugin } from "../types";

export const cloudflarePlugin: IntegrationPlugin = {
  id: "cloudflare",
  name: "Cloudflare",
  vendor: "Cloudflare",
  category: "edge-platform",
  capabilities: ["deploy", "cdn", "storage"],
  status: "stable",
  description: "Workers, R2, KV, D1, Pages. Runtime i preferuar për server functions të Leah.",
  docsUrl: "https://developers.cloudflare.com",
  configSchema: [
    { key: "accountId", label: "Account ID", type: "text", required: true },
    { key: "apiToken", label: "API Token", type: "password", required: true },
  ],
  accent: "oklch(0.72 0.18 50)",
};