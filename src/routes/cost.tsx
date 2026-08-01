import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { AI_CATALOG } from "@/lib/leah-catalog";
import { optimizeRoute, type CostPolicy } from "@/lib/cost/optimizer";
import { setCostPolicy } from "@/lib/cost/policy";
import { useCost } from "@/lib/cost/use-cost";
import { estimateTokens } from "@/lib/cost/pricing";
import { DollarSign, TrendingDown, Gauge, Sparkles } from "lucide-react";

export const Route = createFileRoute("/cost")({
  head: () => ({
    meta: [
      { title: "Cost Optimizer — Leah AI OS" },
      { name: "description", content: "Arbitrazh inteligjent midis AI-ve për të ulur koston." },
      { property: "og:title", content: "Cost Optimizer — Leah AI OS" },
      { property: "og:description", content: "Politika kostoje, telemetri e shpenzimeve reale dhe simulator routing-u mes 14 modeleve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CostPage,
});

const POLICIES: { id: CostPolicy; label: string; hint: string }[] = [
  { id: "cheapest", label: "Cheapest", hint: "prag cilësie 60" },
  { id: "balanced", label: "Balanced", hint: "prag cilësie 78" },
  { id: "quality", label: "Quality", hint: "cilësia mbi kosto" },
];

const KINDS = ["backend", "frontend", "testing", "documentation", "research", "security"];

const usd = (n: number) => `$${n < 0.01 ? n.toFixed(5) : n.toFixed(4)}`;

function CostPage() {
  const { summary, usage, policy } = useCost();
  const [kind, setKind] = useState("backend");
  const [promptText, setPromptText] = useState(
    "Ndërto një API me autentikim, tabela përdoruesish dhe RLS politika, plus teste integrimi.",
  );

  const inputTokens = estimateTokens(promptText) * 40; // simulon një kontekst realist
  const decision = useMemo(
    () => optimizeRoute({ kind, inputTokens, policy }),
    [kind, inputTokens, policy],
  );
  const name = (id: string) => AI_CATALOG.find((a) => a.id === id)?.name ?? id;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Cost Optimizer"
        title="Nuk je më rob i çmimeve të OpenAI"
        description="Politika e kostos zbatohet në çdo detyrë të swarm-it: Leah zgjedh modelin më të lirë që ende kalon pragun e cilësisë dhe hyn në dritaren e kontekstit."
      />

      <div className="flex flex-wrap gap-2 mb-6">
        {POLICIES.map((p) => (
          <button
            key={p.id}
            onClick={() => setCostPolicy(p.id)}
            className={
              "rounded-lg border px-3 py-2 text-sm transition-colors " +
              (policy === p.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:text-foreground")
            }
          >
            <span className="font-medium">{p.label}</span>
            <span className="ml-2 text-[11px] opacity-70">{p.hint}</span>
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-4 gap-3 mb-8">
        <div className="rounded-2xl border border-border bg-card p-5">
          <DollarSign className="h-5 w-5 text-primary" />
          <div className="mt-2 text-2xl font-bold">{usd(summary.spend)}</div>
          <div className="text-sm text-muted-foreground">Shpenzim real ({summary.calls} thirrje)</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <TrendingDown className="h-5 w-5 text-primary" />
          <div className="mt-2 text-2xl font-bold">-{summary.savedPct.toFixed(0)}%</div>
          <div className="text-sm text-muted-foreground">Kursim vs. baseline ({usd(summary.saved)})</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <Gauge className="h-5 w-5 text-primary" />
          <div className="mt-2 text-2xl font-bold">{(summary.inputTokens + summary.outputTokens).toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Token të konsumuar</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <Sparkles className="h-5 w-5 text-primary" />
          <div className="mt-2 text-2xl font-bold capitalize">{policy}</div>
          <div className="text-sm text-muted-foreground">Politika aktive</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border p-6" style={{ background: "var(--grad-surface)" }}>
          <div className="font-semibold mb-3">Simulator routing-u</div>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {KINDS.map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={"text-xs px-2.5 py-1 rounded-full border " + (kind === k ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground")}
              >
                {k}
              </button>
            ))}
          </div>
          <textarea
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-card p-3 text-sm text-foreground"
          />
          <div className="mt-3 rounded-lg border border-border bg-card p-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: decision.provider.color }} />
              <span className="font-semibold">{decision.provider.name}</span>
              <span className="ml-auto text-primary font-medium">{usd(decision.estCost)}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{decision.reason}</div>
            <div className="mt-2 text-xs text-muted-foreground">
              baseline {decision.baseline.name} · {usd(decision.baselineCost)} → kursim {decision.savingsPct.toFixed(0)}%
              · ~{inputTokens.toLocaleString()} token input
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {decision.candidates.slice(0, 6).map((c) => (
              <div key={c.provider.id} className="flex items-center justify-between text-xs">
                <span className={c.eligible ? "text-foreground" : "text-muted-foreground line-through"}>{c.provider.name}</span>
                <span className="text-muted-foreground">score {c.quality} · {usd(c.cost)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="font-semibold mb-3">Shpenzimi sipas modelit</div>
          {summary.byProvider.length === 0 && (
            <p className="text-sm text-muted-foreground">Ende asnjë ekzekutim. Nis një plan ose workflow për të parë telemetrinë reale.</p>
          )}
          <div className="space-y-2">
            {summary.byProvider.map((p) => (
              <div key={p.providerId}>
                <div className="flex items-center justify-between text-sm">
                  <span>{name(p.providerId)}</span>
                  <span className="text-muted-foreground">{p.calls} thirrje · {usd(p.spend)}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${summary.spend > 0 ? (p.spend / summary.spend) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 font-semibold text-sm">Thirrjet e fundit</div>
          <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
            {usage.slice(0, 12).map((u) => (
              <div key={u.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="text-foreground">{name(u.providerId)}</span>
                <span>· {u.kind}</span>
                <span className="ml-auto">{(u.inputTokens + u.outputTokens).toLocaleString()} tok · {usd(u.cost)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}