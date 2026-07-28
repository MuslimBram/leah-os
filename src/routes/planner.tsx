import { createFileRoute } from "@tanstack/react-router";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { planRequest } from "@/lib/planner.functions";
import { AI_CATALOG } from "@/lib/leah-catalog";
import { orchestrator } from "@/lib/core/orchestrator";
import { memoryService } from "@/lib/memory/memory-service";
import { retrievalService } from "@/lib/memory/retrieval";
import type { MemoryHit } from "@/lib/memory/types";
import { Loader2, Send, Workflow, Play, Brain } from "lucide-react";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner — Leah AI OS" },
      { name: "description", content: "Planner që zbërthen çdo kërkesë në nën-detyra dhe i cakton secilën AI-së më të mirë." },
    ],
  }),
  component: PlannerPage,
});

type Task = { kind: string; title: string; description: string; assignedAi: string };
type Plan = { summary: string; tasks: Task[]; mock?: boolean; error?: string };

const EXAMPLES = [
  "Dua një aplikacion si Airbnb me pagesa dhe harta",
  "Ndërto një dashboard SaaS për menaxhim projektesh me faturim mujor",
  "Krijo një AI agent që përgjigjet emailve automatikisht",
];

function PlannerPage() {
  const call = useServerFn(planRequest);
  const navigate = useNavigate();
  const [input, setInput] = useState("Dua një aplikacion si Airbnb me pagesa dhe harta");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRequest, setLastRequest] = useState("");
  const [retrieved, setRetrieved] = useState<MemoryHit[]>([]);

  async function submit(text?: string) {
    const req = (text ?? input).trim();
    if (!req) return;
    setLoading(true);
    setPlan(null);
    setLastRequest(req);
    try {
      // Retrieve relevant memory BEFORE calling the AI so the user can see it.
      const built = await retrievalService.buildPrompt({ query: req, limit: 5 });
      setRetrieved(built.hits);
      await memoryService.store({
        scope: "session", kind: "prompt", content: req, metadata: { at: Date.now() },
      });
      const res = await call({ data: { request: req } });
      setPlan(res as Plan);
      if ((res as Plan).summary) {
        await memoryService.store({
          scope: "long-term", kind: "summary", content: (res as Plan).summary, metadata: { request: req },
        });
      }
    } catch (e) {
      setPlan({ summary: "", tasks: [], error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  function sendToOrchestrator() {
    if (!plan || plan.tasks.length === 0) return;
    const exec = orchestrator.createExecution({
      request: lastRequest || input,
      summary: plan.summary,
      tasks: plan.tasks,
    });
    void navigate({ to: "/executions" });
    return exec;
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="Planner" title="Zbërthe kërkesën. Leja Leah të orkestrojë." description="Shkruaj çfarë do të ndërtosh. Leah e ndan në nën-detyra teknike dhe cakton secilën AI-së më të mirë." />

      <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
        <label className="text-xs uppercase tracking-widest text-muted-foreground">Kërkesa jote</label>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          className="mt-2 w-full bg-input rounded-lg border border-border px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
          placeholder="Dua një aplikacion si..."
        />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            disabled={loading || !input.trim()}
            onClick={() => submit()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 hover:opacity-90 glow-primary"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {loading ? "Duke planifikuar..." : "Gjenero planin"}
          </button>
          <div className="text-xs text-muted-foreground">ose provo:</div>
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => { setInput(ex); submit(ex); }} className="text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary/50 hover:text-primary transition">
              {ex}
            </button>
          ))}
        </div>
      </div>

      {plan?.error && (
        <div className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive-foreground">{plan.error}</div>
      )}

      {retrieved.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-card/60 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-primary" />
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Konteksti i injektuar nga Memory</div>
          </div>
          <ul className="space-y-1.5">
            {retrieved.map((h) => (
              <li key={h.record.id} className="text-xs text-muted-foreground">
                <span className="text-primary font-mono">{h.score.toFixed(2)}</span>{" "}
                <span className="opacity-70">[{h.record.scope}/{h.record.kind}]</span>{" "}
                {h.record.content.slice(0, 140)}{h.record.content.length > 140 ? "…" : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan && plan.tasks.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <Workflow className="h-5 w-5 text-primary" />
            <div className="text-sm text-muted-foreground">{plan.summary}</div>
            {plan.mock && <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">FALLBACK</span>}
            <button
              onClick={sendToOrchestrator}
              className="ml-auto inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90 glow-primary"
            >
              <Play className="h-3.5 w-3.5" /> Dërgo te Orchestrator
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {plan.tasks.map((t, i) => {
              const ai = AI_CATALOG.find((a) => a.id === t.assignedAi) ?? AI_CATALOG[0];
              return (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-mono tracking-widest text-primary uppercase">{t.kind}</div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="h-2 w-2 rounded-full" style={{ background: ai.color }} />
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{ai.name}</span>
                    </div>
                  </div>
                  <div className="font-semibold">{t.title}</div>
                  <div className="text-sm text-muted-foreground mt-1">{t.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}