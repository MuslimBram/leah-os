import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { listConnectors, type ConnectorSpec } from "@/lib/core/connectors";
import { listAIProviders } from "@/lib/core/ai-provider";
import { listWebhookSources } from "@/lib/core/webhooks";
import { seedCore } from "@/lib/core/seed";
import { Plug, KeyRound, Webhook, Cpu, Github, Database, Workflow, Rocket, Server } from "lucide-react";

export const Route = createFileRoute("/connectors")({
  head: () => ({
    meta: [
      { title: "Connectors — Leah AI OS" },
      { name: "description", content: "Menaxho AI providers, MCP servers, GitHub, Supabase, n8n, webhooks dhe integrime të tjera nga një vend i vetëm." },
    ],
  }),
  component: ConnectorsPage,
});

const KIND_ICON = {
  vcs: Github,
  database: Database,
  "ai-provider": Cpu,
  automation: Workflow,
  "mcp-server": Server,
  deploy: Rocket,
  codegen: Cpu,
  other: Plug,
} as const;

function ConnectorsPage() {
  const [ready, setReady] = useState(false);
  useEffect(() => { seedCore(); setReady(true); }, []);
  const connectors = useMemo<ConnectorSpec[]>(() => (ready ? listConnectors() : []), [ready]);
  const providers = useMemo(() => (ready ? listAIProviders() : []), [ready]);
  const webhooks = useMemo(() => (ready ? listWebhookSources() : []), [ready]);

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Connector Layer"
        title="Një bazë e vetme për të gjitha integrimet"
        description="AI providers, MCP servers, GitHub, Supabase, n8n, deploy targets dhe webhooks — të gjitha përmes një kontrate të vetme. Shto integrime pa prekur kodin bazë."
      />

      <div className="grid md:grid-cols-3 gap-3 mb-8">
        <StatCard icon={Plug} label="Connectors" value={connectors.length} />
        <StatCard icon={Cpu} label="AI Providers" value={providers.length} />
        <StatCard icon={Webhook} label="Webhook sources" value={webhooks.length} />
      </div>

      <section className="mb-10">
        <SectionHeader title="Connectors" hint="Shërbime të jashtme të regjistruara" />
        <div className="grid md:grid-cols-2 gap-3">
          {connectors.map((c) => {
            const Icon = KIND_ICON[c.kind] ?? Plug;
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold truncate">{c.name}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground uppercase tracking-wider">
                        {c.kind}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground">{c.vendor}</div>
                    <p className="text-sm text-muted-foreground mt-2">{c.description}</p>
                    <div className="mt-3 text-[11px] text-muted-foreground inline-flex items-center gap-1.5">
                      <KeyRound className="h-3 w-3" />
                      {c.auth.kind === "oauth" && `OAuth · ${c.auth.scopes?.join(", ") || "no scopes"}`}
                      {c.auth.kind === "api-key" && `API Key · ${c.auth.fields.map((f) => f.label).join(", ")}`}
                      {c.auth.kind === "mcp" && "MCP endpoint URL"}
                      {c.auth.kind === "none" && "No auth"}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-10">
        <SectionHeader title="AI Providers" hint="Abstraksion i njëjtë për Claude, GPT, Gemini, DeepSeek, Ollama…" />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {providers.map((p) => (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="font-semibold">{p.label}</div>
              <div className="text-[11px] text-muted-foreground">{p.id}</div>
              <div className="mt-2 flex flex-wrap gap-1">
                {p.models.map((m) => (
                  <span key={m} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{m}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Webhooks" hint="POST → /api/public/webhooks/:source" />
        <div className="rounded-xl border border-border bg-card p-5 text-sm text-muted-foreground">
          {webhooks.length === 0 ? (
            <>Asnjë webhook i regjistruar ende. Regjistro me <code className="text-primary">registerWebhook("github", handler)</code>.</>
          ) : (
            <ul className="space-y-1">
              {webhooks.map((s) => <li key={s}><code className="text-primary">/api/public/webhooks/{s}</code></li>)}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Plug; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
      <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

function SectionHeader({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="text-xs uppercase tracking-[0.25em] text-primary">{title}</div>
      <div className="h-px flex-1 bg-border" />
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}