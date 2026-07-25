// Connector abstraction for external services (GitHub, Supabase, MCP servers,
// n8n, Vercel, Stripe…). Connectors are declarative: id, auth shape, optional
// runtime handlers. UI + core code depend on this contract only.

import { emit } from "./event-bus";

export type ConnectorAuth =
  | { kind: "none" }
  | { kind: "api-key"; fields: { key: string; label: string; secret?: boolean }[] }
  | { kind: "oauth"; authorizeUrl: string; scopes?: string[] }
  | { kind: "mcp"; url: string };

export type ConnectorKind =
  | "vcs"           // GitHub, GitLab
  | "database"      // Supabase, Neon
  | "ai-provider"   // Claude, OpenAI, Gemini
  | "automation"    // n8n, Zapier
  | "mcp-server"    // MCP-compatible tool servers
  | "deploy"        // Vercel, Fly
  | "codegen"       // Antigravity, MiniApp builders
  | "other";

export type ConnectorSpec = {
  id: string;
  name: string;
  vendor: string;
  kind: ConnectorKind;
  description: string;
  docsUrl?: string;
  auth: ConnectorAuth;
  /** Optional runtime action registry. Keeps connectors lazy-loadable. */
  actions?: Record<string, (input: unknown, ctx: { config: Record<string, string> }) => Promise<unknown>>;
};

const registry = new Map<string, ConnectorSpec>();

export function registerConnector(spec: ConnectorSpec) {
  registry.set(spec.id, spec);
}

export function getConnector(id: string) {
  return registry.get(id);
}

export function listConnectors(): ConnectorSpec[] {
  return Array.from(registry.values());
}

export function markConnected(id: string) {
  emit({ type: "connector.connected", id });
}

export function markDisconnected(id: string) {
  emit({ type: "connector.disconnected", id });
}