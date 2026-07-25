import type { IntegrationPlugin } from "../types";

export const supabasePlugin: IntegrationPlugin = {
  id: "supabase",
  name: "Supabase",
  vendor: "Supabase",
  category: "database",
  capabilities: ["db", "auth", "storage", "embed"],
  status: "stable",
  description: "Postgres + Auth + Storage + pgvector për memory. BYO project ose Lovable Cloud i menaxhuar.",
  docsUrl: "https://supabase.com/docs",
  configSchema: [
    { key: "url", label: "Project URL", type: "url", required: true },
    { key: "anonKey", label: "Anon Key", type: "password", required: true },
    { key: "serviceKey", label: "Service Role Key", type: "password", help: "Vetëm server-side" },
  ],
  accent: "oklch(0.75 0.16 160)",
};