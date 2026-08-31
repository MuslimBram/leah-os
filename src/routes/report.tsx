import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { CheckCircle2, CircleDashed, Clock } from "lucide-react";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Raporti Total i Sistemit — Leah AI OS" },
      { name: "description", content: "Statusi i verifikuar i çdo aftësie të Leah AI OS: çfarë punon realisht, çfarë është runtime lokal dhe çfarë kërkon certifikim live." },
      { property: "og:title", content: "Raporti Total i Sistemit — Leah AI OS" },
      { property: "og:description", content: "Status runtime-truth: funksionalitet real, prototype dhe bllokues live." },
    ],
  }),
  component: ReportPage,
});

type State = "done" | "partial" | "planned";

const CAPABILITIES: { name: string; state: State; where: string; note: string }[] = [
  { name: "Agent Concurrent Tasks", state: "done", where: "lib/agents/swarm.ts", note: "Slot-e konkurrence për agjent + worker pool real brenda procesit të aplikacionit; remote workers mbeten fazë tjetër." },
  { name: "Agent Priority Queue", state: "done", where: "lib/core/orchestrator.ts", note: "task.priority — më i larti ekzekutohet i pari, me retry/backoff dhe status real dështimi." },
  { name: "Extra Long Chat / Context", state: "partial", where: "lib/memory/retrieval.ts", note: "Kontekst me shtresa dhe retrieval ekziston; nuk është certifikuar ende një bisedë reale shumë e gjatë end-to-end." },
  { name: "Capacity deri në 1M tokens", state: "partial", where: "lib/cost/pricing.ts", note: "Varet nga modeli/provider-i; duhet test live për çdo model që deklaron dritare 1M." },
  { name: "Customizable Dashboard", state: "partial", where: "routes/index.tsx", note: "Dashboard ekziston; rirenditja dhe persistenca multi-device e widget-eve mbetet." },
  { name: "Scheduled Tasks", state: "partial", where: "lib/workflows/scheduler.ts", note: "Scheduler-i aktual përdor setInterval/event bus në runtime; nuk është durable cron/job queue pas restart-it." },
  { name: "Widget Task", state: "partial", where: "routes/executions.tsx", note: "Kartat live të ekzekutimeve ekzistojnë; jo ende widget-e të lëvizshme/persistente." },
  { name: "Projects", state: "done", where: "lib/projects/", note: "Workspace, blueprint 7-hapësh, artefakte dhe status live funksionojnë në runtime." },
  { name: "Project Storage", state: "partial", where: "lib/projects/store.ts", note: "Persistencë localStorage vetëm në pajisjen aktuale; mungon storage server-side, multi-user dhe backup." },
  { name: "Plugins", state: "partial", where: "lib/integrations/", note: "Registry/capability layer është real, por disa plugin-e janë metadata/stub dhe duan invoke + test connection live." },
  { name: "Swarm", state: "partial", where: "lib/agents/swarm.ts", note: "Routing, concurrency dhe agent bus punojnë; providerId i çdo roli nuk është ende një lidhje e certifikuar me provider të veçantë." },
  { name: "Swarm subtasks", state: "partial", where: "lib/agents/swarm.ts", note: "API i delegimit dhe ndjekja ekzistojnë; built-in agents duhet të përdorin delegimin real në skenarë të certifikuar." },
  { name: "Dream Memory", state: "partial", where: "lib/memory/", note: "Memory pipeline punon lokalisht; vector store është localStorage/in-memory dhe embedding default është hash lokal, jo semantic provider production." },
  { name: "Self-evolving Skills", state: "partial", where: "lib/skills/engine.ts", note: "XP/nivele/mësime funksionojnë në runtime; mungon persistence server-side dhe governance/versioning i skill-eve." },
  { name: "Goals", state: "done", where: "lib/projects/service.ts", note: "Qëllimi i projektit injektohet në execution context për build-in." },
  { name: "Code generation", state: "done", where: "lib/gen/codegen.functions.ts", note: "Server function thërret BYOK, Lovable AI Gateway ose fallback real dhe ruan file artifacts; providerët individualë kërkojnë certifikim live." },
  { name: "Provider Live Verification", state: "partial", where: "lib/gen/free-providers.ts", note: "Katalogu përfshin Z.ai, Kimi/OpenRouter, DeepAI, Groq, Cerebras, Mistral, Hugging Face, Ollama etj.; duhet test connection për endpoint/model/credential real." },
  { name: "Cost Optimizer", state: "partial", where: "lib/cost/", note: "Routing/telemetri e kostos ekziston, por duhet reconciliim me usage/cost real të providerëve." },
  { name: "Security (Vault, RBAC, Audit)", state: "partial", where: "lib/security/", note: "RBAC/audit/vault runtime ekzistojnë; BYOK dhe integration config ruhen ende në browser storage dhe nuk kanë KMS/server vault production." },
  { name: "GitHub Single Source of Truth", state: "partial", where: "lib/integrations/plugins/github.ts", note: "Repo field + plugin contract ekzistojnë; invoke aktual nuk kryen ende commit/PR/review/merge real nga Leah." },
  { name: "Deploy website me database", state: "partial", where: "lib/deploy/", note: "Pipeline krijon task-et build/test/database/deploy/health; target API calls dhe URL live nuk janë ende të implementuara/certifikuara." },
  { name: "Claw (Web, Android, PC)", state: "planned", where: "—", note: "Kërkon agjent nativ jashtë shfletuesit; jo pjesë e runtime-it aktual." },
  { name: "Group Chat me Claw", state: "planned", where: "lib/agents/bus.ts", note: "Bus-i i mesazheve ekziston; mungojnë Claw runtime dhe UI e bisedës në grup." },
];

const ICONS: Record<State, typeof CheckCircle2> = { done: CheckCircle2, partial: Clock, planned: CircleDashed };
const LABEL: Record<State, string> = { done: "Gati", partial: "Pjesërisht", planned: "Në roadmap" };

const SPRINTS = [
  "Sprint 1 — Orchestrator, Task Queue, Worker Pool, Execution Dashboard",
  "Sprint 2 — Shared Context + Memory + Vector Retrieval foundation",
  "Sprint 3 — Multi-Agent Swarm + Priority Queue + Agent Bus foundation",
  "Sprint 4 — Workflow Engine (DAG) + local runtime scheduler",
  "Sprint 5 — Cost Optimizer + estimated telemetry",
  "Sprint 6 — Security Layer foundation (Vault, RBAC, Audit, Guard)",
  "Sprint 7 — Project Workspace foundation",
  "Sprint 8 — Self-evolving Skills + AI Teams foundation",
  "Sprint 9 — Deployment orchestration foundation + Runtime Truth Report",
];

function ReportPage() {
  const counts = CAPABILITIES.reduce<Record<State, number>>(
    (acc, c) => ({ ...acc, [c.state]: acc[c.state] + 1 }),
    { done: 0, partial: 0, planned: 0 },
  );

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="Raporti Total — Runtime Truth" title="Statusi i verifikuar i Leah AI OS" description="Gati do të thotë funksionon në runtime. Pjesërisht do të thotë se foundation ekziston, por mungon persistence/provider/deploy/live proof. Asnjë status nuk quhet FULL LIVE pa provë reale." />

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

      <h2 className="mt-10 mb-3 text-lg font-semibold">Sprintet e ndërtuara</h2>
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
