import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { installWorkflowBootstrap } from "@/lib/workflows/bootstrap";
import { installAgentBootstrap } from "@/lib/agents/bootstrap";
import { isWorkflowRunning, resolveWaves, runWorkflow } from "@/lib/workflows/engine";
import { setWorkflowEnabled } from "@/lib/workflows/store";
import { useWorkflows } from "@/lib/workflows/use-workflows";
import { CalendarClock, Play, Radio, Workflow as WorkflowIcon } from "lucide-react";
import type { Workflow } from "@/lib/workflows/types";

export const Route = createFileRoute("/workflows")({
  head: () => ({
    meta: [
      { title: "Workflow Engine — Leah AI OS" },
      { name: "description", content: "Workflow DAG me hapa të varur, trigger-a manualë, të planifikuar dhe nga evente — ekzekutuar nga swarm-i i agjentëve." },
      { property: "og:title", content: "Workflow Engine — Leah AI OS" },
      { property: "og:description", content: "Ndërto dhe ekzekuto workflow-e shumë-hapëshe me varësi dhe planifikim automatik." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WorkflowsPage,
});

const tone: Record<string, string> = {
  running: "text-primary border-primary/40",
  completed: "text-emerald-400 border-emerald-400/40",
  failed: "text-destructive border-destructive/40",
};

function triggerLabel(wf: Workflow) {
  if (wf.trigger.type === "interval") return `çdo ${Math.round(wf.trigger.everyMs / 1000)}s`;
  if (wf.trigger.type === "event") return wf.trigger.event;
  return "manual";
}

function TriggerIcon({ wf }: { wf: Workflow }) {
  if (wf.trigger.type === "interval") return <CalendarClock className="h-3.5 w-3.5" />;
  if (wf.trigger.type === "event") return <Radio className="h-3.5 w-3.5" />;
  return <Play className="h-3.5 w-3.5" />;
}

function WorkflowsPage() {
  useEffect(() => { installAgentBootstrap(); installWorkflowBootstrap(); }, []);
  const { workflows, runs } = useWorkflows();

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Workflow Engine"
        title="Workflow-e me varësi dhe planifikim"
        description="Çdo workflow është një DAG hapash. Motori i kthen në valë paralele dhe ia dorëzon Orchestrator-it, i cili i ruton te agjentët."
      />

      <div className="grid lg:grid-cols-2 gap-3">
        {workflows.map((wf) => {
          let waves: string[][] = [];
          let error: string | undefined;
          try { waves = resolveWaves(wf.steps).map((w) => w.map((s) => s.title)); }
          catch (e) { error = e instanceof Error ? e.message : String(e); }
          const running = isWorkflowRunning(wf.id);
          return (
            <div key={wf.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-2">
                <div className="h-8 w-8 rounded-md bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <WorkflowIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{wf.name}</div>
                  <div className="text-xs text-muted-foreground">{wf.description}</div>
                </div>
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border border-border text-muted-foreground shrink-0">
                  <TriggerIcon wf={wf} /> {triggerLabel(wf)}
                </span>
              </div>

              <div className="mt-3 space-y-1.5">
                {error && <div className="text-xs text-destructive">{error}</div>}
                {waves.map((w, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground w-12 shrink-0">valë {i + 1}</span>
                    <div className="flex flex-wrap gap-1">
                      {w.map((t) => (
                        <span key={t} className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground">{t}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => void runWorkflow(wf, { trigger: "manual" })}
                  disabled={running || Boolean(error)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
                >
                  <Play className="h-3.5 w-3.5" /> {running ? "Duke ekzekutuar…" : "Ekzekuto tani"}
                </button>
                <button
                  onClick={() => setWorkflowEnabled(wf.id, !wf.enabled)}
                  className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  {wf.enabled ? "Çaktivizo trigger-in" : "Aktivizo trigger-in"}
                </button>
                {wf.lastRunAt && (
                  <span className="text-[11px] text-muted-foreground ml-auto">
                    e fundit {new Date(wf.lastRunAt).toLocaleTimeString()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 mb-3 text-sm font-semibold tracking-wide uppercase text-muted-foreground">Historiku i ekzekutimeve</h2>
      <div className="rounded-xl border border-border bg-card divide-y divide-border">
        {runs.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground">Ende asnjë ekzekutim workflow-i.</div>
        )}
        {runs.map((r) => (
          <div key={r.id} className="p-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{r.workflowName}</span>
              <span className={"text-[11px] px-2 py-0.5 rounded-full border " + (tone[r.status] ?? "text-muted-foreground border-border")}>
                {r.status}
              </span>
              <span className="text-[11px] text-muted-foreground">trigger: {r.trigger}</span>
              <span className="ml-auto text-[11px] text-muted-foreground">{new Date(r.startedAt).toLocaleTimeString()}</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {r.waves.map((w) => (
                <span key={w.executionId} className={"text-[11px] px-2 py-0.5 rounded-md border " + (tone[w.status] ?? "border-border text-muted-foreground")}>
                  valë {w.index + 1} · {w.stepIds.length} hapa · {w.status}
                </span>
              ))}
            </div>
            {r.error && <div className="mt-2 text-xs text-destructive">{r.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}