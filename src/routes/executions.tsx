import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { useOrchestrator } from "@/lib/core/use-orchestrator";
import { orchestrator, type Task, type TaskStatus } from "@/lib/core/orchestrator";
import { AI_CATALOG } from "@/lib/leah-catalog";
import { useState } from "react";
import { Activity, CheckCircle2, XCircle, Loader2, Clock, RotateCw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/executions")({
  head: () => ({
    meta: [
      { title: "Executions — Leah AI OS" },
      { name: "description", content: "Live execution dashboard for the Master Orchestrator: queued, running, completed and failed tasks." },
    ],
  }),
  component: ExecutionsPage,
});

const STATUS_STYLE: Record<TaskStatus, { label: string; cls: string; Icon: typeof Clock }> = {
  pending:   { label: "Pending",   cls: "text-muted-foreground border-border",           Icon: Clock },
  running:   { label: "Running",   cls: "text-primary border-primary/40 bg-primary/10",  Icon: Loader2 },
  retrying:  { label: "Retrying",  cls: "text-amber-400 border-amber-400/40 bg-amber-400/10", Icon: RotateCw },
  completed: { label: "Completed", cls: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10", Icon: CheckCircle2 },
  failed:    { label: "Failed",    cls: "text-destructive border-destructive/40 bg-destructive/10", Icon: XCircle },
  cancelled: { label: "Cancelled", cls: "text-muted-foreground border-border",           Icon: XCircle },
};

function StatusPill({ status }: { status: TaskStatus }) {
  const s = STATUS_STYLE[status];
  const Icon = s.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 rounded-full border ${s.cls}`}>
      <Icon className={`h-3 w-3 ${status === "running" ? "animate-spin" : ""}`} />
      {s.label}
    </span>
  );
}

function ExecutionsPage() {
  const { executions, getTasks } = useOrchestrator();
  const [selectedId, setSelectedId] = useState<string | null>(executions[0]?.id ?? null);
  const activeId = selectedId ?? executions[0]?.id ?? null;
  const activeExec = activeId ? executions.find((e) => e.id === activeId) : undefined;
  const activeTasks = activeExec ? getTasks(activeExec.id) : [];

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Executions"
        title="Master Orchestrator"
        description="Çdo plan i dërguar nga Planner-i shndërrohet në një execution: task queue → worker pool → live status."
      />

      {executions.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center">
          <Activity className="h-8 w-8 text-primary mx-auto mb-3" />
          <div className="font-semibold">Ende asnjë execution.</div>
          <div className="text-sm text-muted-foreground mt-1">Shko te Planner, gjenero një plan dhe dërgoje te Orchestrator-i.</div>
          <Link to="/planner" className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Hap Planner
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-[320px_1fr] gap-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-widest text-muted-foreground">Executions ({executions.length})</div>
              <button
                onClick={() => { orchestrator.reset(); setSelectedId(null); }}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive"
                title="Reset all"
              >
                <Trash2 className="h-3 w-3" /> reset
              </button>
            </div>
            {executions.map((exec) => {
              const tasks = getTasks(exec.id);
              const done = tasks.filter((t) => t.status === "completed").length;
              const failed = tasks.filter((t) => t.status === "failed").length;
              const total = tasks.length;
              const active = exec.id === activeId;
              return (
                <button
                  key={exec.id}
                  onClick={() => setSelectedId(exec.id)}
                  className={`w-full text-left rounded-xl border p-3 transition ${active ? "border-primary/60 bg-primary/5" : "border-border bg-card hover:border-primary/40"}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium line-clamp-1">{exec.request}</div>
                    <StatusPill status={exec.status === "queued" ? "pending" : exec.status === "running" ? "running" : exec.status === "failed" ? "failed" : "completed"} />
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground flex items-center gap-2">
                    <span>{done}/{total} done</span>
                    {failed > 0 && <span className="text-destructive">· {failed} failed</span>}
                    <span className="ml-auto font-mono">{new Date(exec.createdAt).toLocaleTimeString()}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            {activeExec ? (
              <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="text-[10px] font-mono uppercase tracking-widest text-primary">{activeExec.id}</div>
                    <div className="text-lg font-semibold mt-1">{activeExec.request}</div>
                    <div className="text-sm text-muted-foreground mt-1">{activeExec.summary}</div>
                  </div>
                  <StatusPill status={activeExec.status === "queued" ? "pending" : activeExec.status === "running" ? "running" : activeExec.status === "failed" ? "failed" : "completed"} />
                </div>
                <div className="space-y-3">
                  {activeTasks.map((t) => <TaskRow key={t.id} task={t} />)}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Zgjidh një execution nga majtas.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const ai = AI_CATALOG.find((a) => a.id === task.assignedAi) ?? AI_CATALOG[0];
  const duration = task.startedAt && task.finishedAt ? `${task.finishedAt - task.startedAt}ms` : task.startedAt ? "…" : "—";
  return (
    <div className="rounded-xl border border-border bg-background/40">
      <button onClick={() => setOpen((v) => !v)} className="w-full text-left p-3 flex items-center gap-3">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: ai.color }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-primary">{task.kind}</span>
            <span className="font-medium truncate">{task.title}</span>
          </div>
          <div className="text-xs text-muted-foreground truncate mt-0.5">{task.description}</div>
        </div>
        <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground">
          <span>{ai.name}</span>
          <span className="font-mono">×{task.attempts}</span>
          <span className="font-mono">{duration}</span>
        </div>
        <StatusPill status={task.status} />
      </button>
      {open && (
        <div className="border-t border-border px-3 py-2 bg-card/60">
          {task.error && <div className="text-xs text-destructive mb-2">{task.error}</div>}
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Logs</div>
          <div className="space-y-0.5 font-mono text-[11px] max-h-40 overflow-y-auto">
            {task.logs.map((l, i) => (
              <div key={i} className={l.level === "error" ? "text-destructive" : l.level === "warn" ? "text-amber-400" : "text-muted-foreground"}>
                <span className="opacity-60">{new Date(l.ts).toLocaleTimeString()}</span> · {l.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}