// Integration registry. Core code depends on this file (interfaces + list),
// never on individual plugin files. Add a plugin by dropping it into
// `./plugins/*` and pushing it into `BUILT_IN_PLUGINS` below — nothing else
// in the app needs to change.

import type {
  IntegrationCapability,
  IntegrationCategory,
  IntegrationInvokeInput,
  IntegrationInvokeResult,
  IntegrationPlugin,
  IntegrationRuntimeContext,
} from "./types";

import { antigravityPlugin } from "./plugins/antigravity";
import { miniappPlugin } from "./plugins/miniapp";
import { n8nPlugin } from "./plugins/n8n";
import { langgraphPlugin } from "./plugins/langgraph";
import { cursorPlugin } from "./plugins/cursor";
import { windsurfPlugin } from "./plugins/windsurf";
import { firecrawlPlugin } from "./plugins/firecrawl";
import { qdrantPlugin } from "./plugins/qdrant";
import { lovableAiPlugin } from "./plugins/lovable-ai";
import { langfusePlugin } from "./plugins/langfuse";
import { sentryPlugin } from "./plugins/sentry";
import { grafanaPlugin } from "./plugins/grafana";
import { weaviatePlugin } from "./plugins/weaviate";
import { ollamaPlugin } from "./plugins/ollama";
import { typedocPlugin } from "./plugins/typedoc";
import { vitestPlugin } from "./plugins/vitest";
import { playwrightPlugin } from "./plugins/playwright";
import { mcpPlugin } from "./plugins/mcp";
import { aiSdkPlugin } from "./plugins/ai-sdk";
import { githubPlugin } from "./plugins/github";
import { supabasePlugin } from "./plugins/supabase";
import { stripePlugin } from "./plugins/stripe";
import { cloudflarePlugin } from "./plugins/cloudflare";
import { telegramPlugin } from "./plugins/telegram";
import { whatsappPlugin } from "./plugins/whatsapp";

const BUILT_IN_PLUGINS: IntegrationPlugin[] = [
  lovableAiPlugin,
  aiSdkPlugin,
  mcpPlugin,
  antigravityPlugin,
  miniappPlugin,
  githubPlugin,
  supabasePlugin,
  stripePlugin,
  cloudflarePlugin,
  telegramPlugin,
  whatsappPlugin,
  n8nPlugin,
  langgraphPlugin,
  cursorPlugin,
  windsurfPlugin,
  firecrawlPlugin,
  qdrantPlugin,
  weaviatePlugin,
  ollamaPlugin,
  langfusePlugin,
  sentryPlugin,
  grafanaPlugin,
  typedocPlugin,
  vitestPlugin,
  playwrightPlugin,
];

const runtime = new Map<string, IntegrationPlugin>(
  BUILT_IN_PLUGINS.map((p) => [p.id, p]),
);

export function listPlugins(): IntegrationPlugin[] {
  return Array.from(runtime.values());
}

export function getPlugin(id: string): IntegrationPlugin | undefined {
  return runtime.get(id);
}

export function registerPlugin(plugin: IntegrationPlugin): void {
  runtime.set(plugin.id, plugin);
}

export function unregisterPlugin(id: string): void {
  runtime.delete(id);
}

export function pluginsByCategory(category: IntegrationCategory): IntegrationPlugin[] {
  return listPlugins().filter((p) => p.category === category);
}

export function pluginsByCapability(capability: IntegrationCapability): IntegrationPlugin[] {
  return listPlugins().filter((p) => p.capabilities.includes(capability));
}

/**
 * Invoke a plugin capability with runtime config. Core code (Planner, Router,
 * Workers) calls this — it never imports a specific plugin. If the plugin
 * doesn't implement the capability, we return a structured "not-implemented"
 * result so the caller can fall back gracefully.
 */
export async function invokePlugin(
  id: string,
  input: IntegrationInvokeInput,
  ctx: IntegrationRuntimeContext = { config: {} },
): Promise<IntegrationInvokeResult> {
  const plugin = runtime.get(id);
  if (!plugin) return { ok: false, message: `Plugin '${id}' not registered` };
  if (!plugin.invoke) {
    return { ok: false, message: `Plugin '${plugin.name}' has no runtime handler yet` };
  }
  try {
    return await plugin.invoke(input, ctx);
  } catch (err) {
    return { ok: false, message: (err as Error).message ?? "invoke failed" };
  }
}

export type { IntegrationPlugin } from "./types";