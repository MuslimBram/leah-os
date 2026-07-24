import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { LIFECYCLE, providersForStage } from "@/lib/integrations/lifecycle";
import type { LifecycleStageId } from "@/lib/integrations/lifecycle";
import { useIntegrationState } from "@/lib/integrations/store";
import { ArrowRight, Bot, Bug, FileText, Rocket, Sparkles, Activity } from "lucide-react";

export const Route = createFileRoute("/pipeline")({
  head: () => ({
    meta: [
      { title: "Pipeline — Leah AI OS" },
      { name: "description", content: "Lifecycle i një projekti: Generate → Test → Fix → Document → Publish → Monitor. Çdo hap i orkestruar nga plugins të Integration Layer." },
    ],
  }),
  component: PipelinePage,
});

const ICONS: Record<LifecycleStageId, typeof Bot> = {
  generate: Sparkles,
  test: Bot,
  fix: Bug,
  document: FileText,
  deploy: Rocket,
  monitor: Activity,
};

function PipelinePage() {
  const { state, hydrated } = useIntegrationState();

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="AI Development Platform"
        title="Nga kërkesa te production — automatikisht"
        description="Leah nuk është CRUD. Çdo projekt kalon nëpër 6 hapa, secili i mbështetur nga plugins të Integration Layer. Shto/hiq platforma pa prekur pipeline-in."
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {LIFECYCLE.map((stage, idx) => {
          const Icon = ICONS[stage.id];
          const providers = providersForStage(stage);
          const active = providers.filter((p) =>
            hydrated ? state.enabled[p.id] : p.defaultEnabled,
          );
          return (
            <div key={stage.id} className="rounded-2xl border border-border bg-card p-5 relative overflow-hidden">
              <div className="absolute -right-4 -top-4 text-[80px] font-black text-primary/5 leading-none select-none">
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-muted-foreground">Step {idx + 1}</div>
                  <div className="font-semibold">{stage.title}</div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">{stage.description}</p>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {stage.capabilities.map((c) => (
                  <span key={c} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                    {c}
                  </span>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="text-[11px] tracking-widest uppercase text-muted-foreground mb-2">
                  Providers ({active.length}/{providers.length} active)
                </div>
                {providers.length === 0 ? (
                  <div className="text-xs text-muted-foreground italic">Asnjë plugin i regjistruar për këtë hap.</div>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {providers.map((p) => {
                      const on = hydrated ? Boolean(state.enabled[p.id]) : Boolean(p.defaultEnabled);
                      return (
                        <span
                          key={p.id}
                          className={
                            "text-[11px] px-2 py-0.5 rounded-full border transition " +
                            (on
                              ? "border-primary/50 text-primary bg-primary/10"
                              : "border-border text-muted-foreground")
                          }
                          title={p.vendor}
                        >
                          {p.name}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card/60 p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary mb-3">Flow</div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {LIFECYCLE.map((s, i) => (
            <span key={s.id} className="inline-flex items-center gap-2">
              <span className="px-3 py-1.5 rounded-lg border border-border bg-background">{s.title}</span>
              {i < LIFECYCLE.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}