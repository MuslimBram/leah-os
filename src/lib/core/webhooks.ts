// Webhook dispatch abstraction. External services (GitHub, Stripe, n8n,
// Supabase, MCP tool servers) POST to /api/public/webhooks/:source. Handlers
// register here; the route just verifies + dispatches. Kept minimal —
// signature verification lives with the handler that owns the secret.

import { emit } from "./event-bus";

export type WebhookContext = {
  source: string;
  headers: Headers;
  body: unknown;
  rawBody: string;
};

export type WebhookHandler = (ctx: WebhookContext) => Promise<Response> | Response;

const handlers = new Map<string, WebhookHandler>();

export function registerWebhook(source: string, handler: WebhookHandler) {
  handlers.set(source, handler);
}

export function getWebhookHandler(source: string) {
  return handlers.get(source);
}

export function listWebhookSources(): string[] {
  return Array.from(handlers.keys());
}

export async function dispatchWebhook(ctx: WebhookContext): Promise<Response> {
  const handler = handlers.get(ctx.source);
  if (!handler) return new Response("unknown source", { status: 404 });
  emit({ type: "webhook.received", source: ctx.source, event: ctx.headers.get("x-event") ?? "unknown" });
  return handler(ctx);
}