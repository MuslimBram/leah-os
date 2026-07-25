// Seed a small set of connectors + AI providers so the UI has something to
// render out of the box. Real credentials/handlers are wired later — these
// are declarative stubs that prove the abstraction is enough.

import { registerConnector } from "./connectors";
import { registerAIProvider } from "./ai-provider";

let seeded = false;

export function seedCore() {
  if (seeded) return;
  seeded = true;

  // --- Connectors ---
  registerConnector({
    id: "github",
    name: "GitHub",
    vendor: "GitHub",
    kind: "vcs",
    description: "Single source of truth për repos, PRs dhe Actions.",
    docsUrl: "https://docs.github.com",
    auth: { kind: "oauth", authorizeUrl: "https://github.com/login/oauth/authorize", scopes: ["repo", "workflow"] },
  });
  registerConnector({
    id: "supabase",
    name: "Supabase",
    vendor: "Supabase",
    kind: "database",
    description: "Postgres + Auth + Storage + pgvector për memory.",
    auth: { kind: "api-key", fields: [
      { key: "url", label: "Project URL" },
      { key: "anonKey", label: "Anon Key" },
      { key: "serviceKey", label: "Service Role Key", secret: true },
    ] },
  });
  registerConnector({
    id: "n8n",
    name: "n8n",
    vendor: "n8n",
    kind: "automation",
    description: "Workflow automation & webhooks.",
    auth: { kind: "api-key", fields: [
      { key: "baseUrl", label: "Base URL" },
      { key: "apiKey", label: "API Key", secret: true },
    ] },
  });
  registerConnector({
    id: "mcp-generic",
    name: "MCP Server",
    vendor: "Model Context Protocol",
    kind: "mcp-server",
    description: "Lidhu me çdo MCP-compatible tool server (Notion, Linear, Sanity, custom).",
    auth: { kind: "mcp", url: "" },
  });
  registerConnector({
    id: "vercel",
    name: "Vercel",
    vendor: "Vercel",
    kind: "deploy",
    description: "Deploy dhe preview environments.",
    auth: { kind: "api-key", fields: [{ key: "token", label: "Access Token", secret: true }] },
  });
  registerConnector({
    id: "stripe",
    name: "Stripe",
    vendor: "Stripe",
    kind: "other",
    description: "Pagesa, abonime dhe webhooks.",
    docsUrl: "https://stripe.com/docs/api",
    auth: { kind: "api-key", fields: [
      { key: "secretKey", label: "Secret Key", secret: true },
      { key: "webhookSecret", label: "Webhook Signing Secret", secret: true },
    ] },
  });
  registerConnector({
    id: "cloudflare",
    name: "Cloudflare",
    vendor: "Cloudflare",
    kind: "deploy",
    description: "Workers, R2, KV, D1, Pages — runtime edge.",
    docsUrl: "https://developers.cloudflare.com",
    auth: { kind: "api-key", fields: [
      { key: "accountId", label: "Account ID" },
      { key: "apiToken", label: "API Token", secret: true },
    ] },
  });
  registerConnector({
    id: "telegram",
    name: "Telegram Bot",
    vendor: "Telegram",
    kind: "other",
    description: "Bot API + Mini Apps.",
    docsUrl: "https://core.telegram.org/bots/api",
    auth: { kind: "api-key", fields: [{ key: "botToken", label: "Bot Token", secret: true }] },
  });
  registerConnector({
    id: "whatsapp",
    name: "WhatsApp Cloud API",
    vendor: "Meta",
    kind: "other",
    description: "WhatsApp Business Cloud API zyrtare.",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    auth: { kind: "api-key", fields: [
      { key: "phoneNumberId", label: "Phone Number ID" },
      { key: "accessToken", label: "Access Token", secret: true },
    ] },
  });

  // --- AI Providers (stub complete → real SDK wired later) ---
  const stub = (id: string, label: string, models: string[]) =>
    registerAIProvider({
      id, label, models,
      complete: async ({ model }) => ({ text: `[${label}:${model}] not wired yet`, model }),
    });

  stub("anthropic", "Anthropic Claude", ["claude-4-opus", "claude-4-sonnet"]);
  stub("openai", "OpenAI", ["gpt-5", "gpt-5-mini"]);
  stub("google", "Google Gemini", ["gemini-3-pro", "gemini-3-flash"]);
  stub("deepseek", "DeepSeek", ["deepseek-v3"]);
  stub("ollama", "Ollama (local)", ["llama3.3", "qwen2.5-coder"]);
}