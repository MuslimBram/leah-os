import type { IntegrationPlugin } from "../types";

export const mcpPlugin: IntegrationPlugin = {
  id: "mcp",
  name: "MCP (Model Context Protocol)",
  vendor: "Anthropic / OSS",
  category: "protocol",
  capabilities: ["tool-calling", "chat"],
  status: "stable",
  description: "Lidh Leah me çdo MCP-compatible tool server (Notion, Linear, Sanity, custom). Streamable HTTP transport.",
  docsUrl: "https://modelcontextprotocol.io",
  configSchema: [
    { key: "url", label: "MCP Server URL", type: "url", placeholder: "https://example.com/mcp", required: true },
    { key: "token", label: "Bearer Token (opsional)", type: "password" },
  ],
  accent: "oklch(0.72 0.18 280)",
  invoke: async ({ payload }, { config }) => {
    if (!config.url) return { ok: false, message: "Mungon MCP URL" };
    return { ok: true, data: { transport: "http", url: config.url, payload } };
  },
};