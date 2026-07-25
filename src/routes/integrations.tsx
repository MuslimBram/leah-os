import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { listPlugins } from "@/lib/integrations/registry";
import { setConfig, setEnabled, useIntegrationState } from "@/lib/integrations/store";
import type { IntegrationCategory, IntegrationPlugin } from "@/lib/integrations/types";
import { Boxes, Check, ExternalLink, Plug, Settings2, X } from "lucide-react";

export const Route = createFileRoute("/integrations")({
  head: () => ({
    meta: [
      { title: "Integration Layer — Leah AI OS" },
      { name: "description", content: "Plugin system për Leah. Aktivizo Antigravity, MiniApp frameworks, n8n, LangGraph dhe të tjera pa prekur logjikën kryesore." },
    ],
  }),
  component: IntegrationsPage,
});

const CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  "code-generation": "Code Generation",
  "miniapp-framework": "MiniApp Frameworks",
  automation: "Automation",
  "worker-node": "Worker Nodes",
  builder: "Builders",
  deployment: "Deployment",
  memory: "Memory",
  research: "Research",
  observability: "Observability",
  "local-model": "Local Models",
  vcs: "Version Control",
  database: "Databases",
  payments: "Payments",
  "edge-platform": "Edge Platform",
  messaging: "Messaging",
  protocol: "Protocols",
  sdk: "SDKs",
  other: "Other",
};

function IntegrationsPage() {
  const plugins = useMemo(() => listPlugins(), []);
  const { state, hydrated } = useIntegrationState();
  const [openId, setOpenId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const map = new Map<IntegrationCategory, IntegrationPlugin[]>();
    for (const p of plugins) {
      const arr = map.get(p.category) ?? [];
      arr.push(p);
      map.set(p.category, arr);
    }
    return Array.from(map.entries());
  }, [plugins]);

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Integration Layer"
        title="Plugin system i Leah"
        description="Shto ose hiq platforma (Antigravity, MiniApp frameworks, n8n, LangGraph, worker nodes) pa ndryshuar logjikën kryesore. Çdo plugin implementon një kontratë të vetme dhe regjistrohet në registry."
      />

      <div className="mb-6 rounded-xl border border-border bg-card/60 p-4 flex items-start gap-3">
        <Boxes className="h-5 w-5 text-primary mt-0.5" />
        <div className="text-sm text-muted-foreground">
          Core i Leah (Planner, Router, Workers) nuk njeh asnjë plugin drejtpërdrejt — flet vetëm me{" "}
          <code className="text-primary">invokePlugin(id, capability, payload)</code>. Shtimi i një platforme të re
          është një skedar në <code className="text-primary">src/lib/integrations/plugins/</code> dhe një rresht në registry.
        </div>
      </div>

      <div className="space-y-10">
        {grouped.map(([cat, items]) => (
          <section key={cat}>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xs uppercase tracking-[0.25em] text-primary">{CATEGORY_LABEL[cat]}</div>
              <div className="h-px flex-1 bg-border" />
              <div className="text-[10px] text-muted-foreground">{items.length}</div>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {items.map((p) => {
                const enabled = hydrated ? Boolean(state.enabled[p.id]) : Boolean(p.defaultEnabled);
                const cfg = state.config[p.id] ?? {};
                const configured = (p.configSchema ?? []).every((f) => !f.required || Boolean(cfg[f.key]));
                return (
                  <div key={p.id} className="rounded-2xl border border-border bg-card p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center font-bold text-background"
                          style={{ background: p.accent ?? "var(--grad-hero)" }}
                        >
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-2">
                            {p.name}
                            <span className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground uppercase tracking-wider">
                              {p.status}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">{p.vendor}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setEnabled(p.id, !enabled)}
                        className={
                          "text-xs px-3 py-1.5 rounded-full border transition " +
                          (enabled
                            ? "border-primary/60 text-primary bg-primary/10"
                            : "border-border text-muted-foreground hover:border-primary/40")
                        }
                      >
                        {enabled ? (
                          <span className="inline-flex items-center gap-1"><Check className="h-3 w-3" /> Enabled</span>
                        ) : (
                          <span className="inline-flex items-center gap-1"><Plug className="h-3 w-3" /> Enable</span>
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">{p.description}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {p.capabilities.map((c) => (
                        <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                          {c}
                        </span>
                      ))}
                    </div>
                    <div className="mt-4 flex items-center gap-3 text-xs">
                      {p.configSchema && p.configSchema.length > 0 && (
                        <button
                          onClick={() => setOpenId(openId === p.id ? null : p.id)}
                          className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary"
                        >
                          <Settings2 className="h-3.5 w-3.5" /> {configured ? "Konfiguruar" : "Konfiguro"}
                        </button>
                      )}
                      {p.docsUrl && (
                        <a href={p.docsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary">
                          <ExternalLink className="h-3.5 w-3.5" /> Docs
                        </a>
                      )}
                      {!configured && enabled && (
                        <span className="ml-auto inline-flex items-center gap-1 text-amber-400/90">
                          <X className="h-3 w-3" /> mungon konfigurimi
                        </span>
                      )}
                    </div>

                    {openId === p.id && p.configSchema && (
                      <div className="mt-4 pt-4 border-t border-border space-y-3">
                        {p.configSchema.map((field) => (
                          <label key={field.key} className="block">
                            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-1">
                              {field.label} {field.required && <span className="text-primary">*</span>}
                            </div>
                            <input
                              type={field.type === "password" ? "password" : "text"}
                              defaultValue={cfg[field.key] ?? ""}
                              placeholder={field.placeholder}
                              onBlur={(e) => setConfig(p.id, { [field.key]: e.target.value })}
                              className="w-full bg-input rounded-md border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                            />
                            {field.help && <div className="text-[11px] text-muted-foreground mt-1">{field.help}</div>}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}