import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { installAgentBootstrap } from "@/lib/agents/bootstrap";
import { useAgentMessages, useAgents } from "@/lib/agents/use-agents";
import { Bot, MessagesSquare, Network } from "lucide-react";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Multi-Agent Swarm — Leah AI OS" },
      { name: "description", content: "Agjentë të specializuar, ngarkesa e tyre, delegimet swarm dhe komunikimi mes tyre në kohë reale." },
      { property: "og:title", content: "Multi-Agent Swarm — Leah AI OS" },
      { property: "og:description", content: "Shiko agjentët, subtask-et e deleguara dhe mesazhet mes agjentëve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AgentsPage,
});

const statusTone: Record<string, string> = {
  running: "text-primary border-primary/40",
  completed: "text-emerald-400 border-emerald-400/40",
  failed: "text-destructive border-destructive/40",
};

function AgentsPage() {
  useEffect(() => { installAgentBootstrap(); }, []);
  const { agents, load, subtasks } = useAgents();
  const { messages } = useAgentMessages();

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Multi-Agent System"
        title="Swarm i agjentëve"
        description="Çdo detyrë e Orchestrator-it kalon te agjenti më i përshtatshëm. Agjentët mund të delegojnë subtask-e dhe të komunikojnë mes tyre."
      />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {agents.map((a) => {
          const busy = load(a.id);
          return (
            <div key={a.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-md flex items-center justify-center" style={{ background: `color-mix(in oklch, ${a.accent} 20%, transparent)`, color: a.accent }}>
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{a.name}</div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{a.role} · {a.providerId}</div>
                </div>
                <span className={"ml-auto text-[11px] px-2 py-0.5 rounded-full border " + (busy > 0 ? "text-primary border-primary/40" : "text-muted-foreground border-border")}>
                  {busy}/{a.concurrency}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{a.description}</p>
              <div className="mt-3 flex flex-wrap gap-1">
                {a.capabilities.map((c) => (
                  <span key={c} className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground">{c}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-8">
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Network className="h-4 w-4 text-primary" /> Subtask-e të deleguara
          </h2>
          {subtasks.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Ende asnjë delegim. Nis një ekzekutim nga Planner.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {subtasks.slice(0, 20).map((s) => (
                <li key={s.id} className="text-xs flex items-center gap-2">
                  <span className={"px-1.5 py-0.5 rounded border " + (statusTone[s.status] ?? "")}>{s.status}</span>
                  <span className="truncate">{s.title}</span>
                  <span className="ml-auto text-muted-foreground shrink-0">{s.agentId}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MessagesSquare className="h-4 w-4 text-primary" /> Komunikimi mes agjentëve
          </h2>
          {messages.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">Bus-i i mesazheve është bosh.</p>
          ) : (
            <ul className="mt-3 space-y-2 max-h-80 overflow-y-auto">
              {messages.slice(0, 40).map((m) => (
                <li key={m.id} className="text-xs">
                  <span className="text-primary">{m.from}</span>
                  <span className="text-muted-foreground"> → {m.to}: </span>
                  <span>{m.content}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}