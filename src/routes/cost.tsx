import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { AI_CATALOG } from "@/lib/leah-catalog";
import { DollarSign, TrendingDown } from "lucide-react";

export const Route = createFileRoute("/cost")({
  head: () => ({
    meta: [
      { title: "Cost Optimizer — Leah AI OS" },
      { name: "description", content: "Arbitrazh inteligjent midis AI-ve për të ulur koston." },
    ],
  }),
  component: CostPage,
});

const RULES = [
  { size: "Prompt i vogël", ai: "Gemini Flash", why: "Speed + cost", color: "oklch(0.75 0.18 240)" },
  { size: "Prompt mesatar", ai: "GPT-5.4 mini", why: "Balanced", color: "oklch(0.75 0.18 150)" },
  { size: "Prompt i madh", ai: "Claude", why: "Long context", color: "oklch(0.75 0.18 40)" },
  { size: "Gjenerim kodi", ai: "Codex / DeepSeek", why: "Code-specialized", color: "oklch(0.72 0.20 130)" },
  { size: "UI", ai: "Lovable", why: "UI-native", color: "oklch(0.75 0.20 340)" },
];

function CostPage() {
  const cheapest = [...AI_CATALOG].sort((a, b) => b.scores.cost - a.scores.cost).slice(0, 4);
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="Cost Optimizer" title="Nuk je më rob i çmimeve të OpenAI" description="Leah zgjedh AI-në më të lirë që ende plotëson kërkesat." />
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-border bg-card p-5">
          <DollarSign className="h-5 w-5 text-primary" />
          <div className="mt-2 text-3xl font-bold">-63%</div>
          <div className="text-sm text-muted-foreground">Kursim mesatar mujor me routing inteligjent</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 md:col-span-2">
          <TrendingDown className="h-5 w-5 text-primary" />
          <div className="mt-2 font-semibold">Modelet më kosto-efektive</div>
          <div className="mt-3 space-y-2">
            {cheapest.map((ai) => (
              <div key={ai.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full" style={{ background: ai.color }} />{ai.name}</span>
                <span className="text-muted-foreground">score {ai.scores.cost}/100</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="rounded-2xl border border-border p-6" style={{ background: "var(--grad-surface)" }}>
        <div className="font-semibold mb-4">Rregullat e routing-ut</div>
        <div className="grid md:grid-cols-5 gap-3">
          {RULES.map((r) => (
            <div key={r.size} className="rounded-lg border border-border bg-card/70 p-4">
              <div className="text-xs text-muted-foreground">{r.size}</div>
              <div className="mt-1 font-semibold text-sm flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                {r.ai}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">{r.why}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}