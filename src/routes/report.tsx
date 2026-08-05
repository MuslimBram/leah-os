import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { CheckCircle2, CircleDashed, Clock } from "lucide-react";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Raporti Total i Sistemit — Leah AI OS" },
      { name: "description", content: "Statusi i detajuar i çdo aftësie të Leah AI OS: swarm, memory, skills, cost, security, deployment dhe çfarë mbetet." },
      { property: "og:title", content: "Raporti Total i Sistemit — Leah AI OS" },
      { property: "og:description", content: "Çfarë është ndërtuar, si funksionon dhe çfarë mbetet në roadmap." },
    ],
  }),
  component: ReportPage,
});

type State = "done" | "partial" | "planned";

const CAPABILITIES: { name: string; state: State; where: string; note: string }[] = [
  { name: "Agent Concurrent Tasks", state: "done", where: "lib/agents/swarm.ts", note: "Slot-e konkurrence për agjent + worker pool në orchestrator." },
  { name: "Agent Priority Queue", state: "done", where: "lib/core/orchestrator.ts", note: "task.priority — më i larti ekzekutohet i pari, me retry/backoff." },
  { name: "Extra Long Chat / Context", state: "done", where: "lib/memory/retrieval.ts", note: "Kontekst me shtresa + kompresim para injektimit në prompt." },
  { name: "Capacity deri në 1M tokens", state: "partial", where: "lib/cost/pricing.ts", note: "Dritaret e kontekstit respektohen nga router-i; 1M vlen vetëm për modelet që e mbështesin." },
  { name: "Customizable Dashboard", state: "partial", where: "routes/index.tsx", note: "Dashboard me widget-e statike; rirenditja/persistenca e widget-eve mbetet." },
  { name: "Scheduled Tasks", state: "done", where: "lib/workflows/scheduler.ts", note: "Interval + event triggers mbi Event Bus." },
  { name: "Widget Task", state: "partial", where: "routes/executions.tsx", note: "Kartat live të ekzekutimeve; jo ende widget-e të lëvizshme." },
  { name: "Projects", state: "done", where: "lib/projects/", note: "Workspace, blueprint 7-hapësh, artefakte, status live." },
  { name: "Project Storage", state: "done", where: "lib/projects/store.ts", note: "Persistencë lokale e projekteve dhe artefakteve." },
  { name: "Plugins", state: "done", where: "lib/integrations/", note: "26+ plugin-e opsionale me registry dhe capability routing." },
  { name: "Swarm", state: "done", where: "lib/agents/swarm.ts", note: "7 agjentë me rol, përzgjedhje sipas aftësisë, bus mesazhesh." },
  { name: "Swarm subtasks", state: "done", where: "lib/agents/swarm.ts", note: "Delegim me thellësi maks. 2 dhe ndjekje e nën-detyrave." },
  { name: "Dream Memory", state: "partial", where: "lib/memory/", note: "Kujtesë semantike + mësime; konsolidimi 'offline' mbetet." },
  { name: "Self-evolving Skills", state: "done", where: "lib/skills/engine.ts", note: "XP, nivele dhe mësime të distiluara pas çdo detyre." },
  { name: "Goals", state: "done", where: "lib/projects/service.ts", note: "Qëllimi i projektit injektohet si kontekst në çdo detyrë." },
  { name: "Code generation", state: "done", where: "lib/planner.functions.ts", note: "Planner me AI Gateway → detyra të ekzekutueshme." },
  { name: "Cost Optimizer", state: "done", where: "lib/cost/", note: "Politika cheapest/balanced/quality + telemetri kursimesh." },
  { name: "Security (Vault, RBAC, Audit)", state: "done", where: "lib/security/", note: "AES-256-GCM, 5 role, log audit-i append-only, rate limiting." },
  { name: "Deploy website me database", state: "done", where: "lib/deploy/", note: "9 targete, pipeline build → test → migrime → deploy → health check." },
  { name: "Claw (Web, Android, PC)", state: "planned", where: "—", note: "Kërkon agjent nativ jashtë shfletuesit; jo pjesë e këtij runtime." },
  { name: "Group Chat me Claw", state: "planned", where: "lib/agents/bus.ts", note: "Bus-i i mesazheve është gati; i mungon UI-ja e bisedës në grup." },
];

const ICONS: Record<State, typeof CheckCircle2> = { done: CheckCircle2, partial: Clock, planned: CircleDashed };
const LABEL: Record<State, string> = { done: "Gati", partial: "Pjesërisht", planned: "Në roadmap" };

const SPRINTS = [
  "Sprint 1 — Orchestrator, Task Queue, Worker Pool, Execution Dashboard",
  "Sprint 2 — Shared Context + Memory + Vector Retrieval",
  "Sprint 3 — Multi-Agent Swarm + Priority Queue + Agent Bus",
  "Sprint 4 — Workflow Engine (DAG) + Scheduler",
  "Sprint 5 — Cost Optimizer + Telemetry",
  "Sprint 6 — Security Layer (Vault, RBAC, Audit, Guard)",
  "Sprint 7 — Project Workspace (Single Source of Truth)",
  "Sprint 8 — Self-evolving Skills + AI Teams",
  "Sprint 9 — Deployment Layer + Raporti Total",
];

function ReportPage() {
  const counts = CAPABILITIES.reduce<Record<State, number>>(
    (acc, c) => ({ ...acc, [c.state]: acc[c.state] + 1 }),
    { done: 0, partial: 0, planned: 0 },
  );

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="Raporti Total" title="Statusi i plotë i Leah AI OS" description="Çdo aftësi e kërkuar, ku ndodhet në sistem dhe sa larg është realizimi i saj." />

      <div className="grid grid-cols-3 gap-3 mb-8">
        {(["done", "partial", "planned"] as State[]).map((s) => (
          <div key={s} className="rounded-xl border border-border bg-card p-4">
            <div className="text-3xl font-bold">{counts[s]}</div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{LABEL[s]}</div>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {CAPABILITIES.map((c) => {
          const Icon = ICONS[c.state];
          return (
            <div key={c.name} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
              <Icon className={"h-4 w-4 mt-0.5 shrink-0 " + (c.state === "done" ? "text-primary" : c.state === "partial" ? "text-foreground" : "text-muted-foreground")} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-sm">{c.name}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{LABEL[c.state]}</span>
                  <code className="text-[10px] text-muted-foreground font-mono">{c.where}</code>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{c.note}</p>
              </div>
            </div>
          );
        })}
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Sprintet e përfunduara</h2>
      <ol className="space-y-1 text-sm text-muted-foreground">
        {SPRINTS.map((s) => (
          <li key={s} className="flex items-start gap-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
            <span>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}