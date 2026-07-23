import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { AI_CATALOG } from "@/lib/leah-catalog";
import { Zap } from "lucide-react";

export const Route = createFileRoute("/router")({
  head: () => ({
    meta: [
      { title: "AI Router — Leah AI OS" },
      { name: "description", content: "Marketplace i AI-ve. Çdo model konkurron për detyrat ku është më i mirë." },
    ],
  }),
  component: RouterPage,
});

function Bar({ value, color }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${value}%`, background: color ?? "var(--grad-hero)" }} />
    </div>
  );
}

function RouterPage() {
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <PageHeader eyebrow="AI Router" title="Zemra e Leah — Marketplace i AI-ve" description="Çdo AI ka një profil pikësh. Router-i zgjedh më të mirin për çdo detyrë, duke respektuar limitet ditore dhe kosto." />
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AI_CATALOG.map((ai) => (
          <div key={ai.id} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center font-bold" style={{ background: ai.color, color: "oklch(0.15 0.02 265)" }}>
                  {ai.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold">{ai.name}</div>
                  <div className="text-xs text-muted-foreground">{ai.vendor}</div>
                </div>
              </div>
              {ai.mock ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">MOCK</span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-primary/40 text-primary">
                  <Zap className="h-2.5 w-2.5" /> LIVE
                </span>
              )}
            </div>
            <div className="mt-3 text-sm text-muted-foreground">{ai.specialty}</div>
            <div className="mt-4 space-y-2">
              {(["backend", "frontend", "code", "docs", "research", "speed", "cost"] as const).map((k) => (
                <div key={k}>
                  <div className="flex justify-between text-[11px] text-muted-foreground uppercase tracking-wider">
                    <span>{k}</span><span>{ai.scores[k]}</span>
                  </div>
                  <Bar value={ai.scores[k]} />
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {ai.strengths.map((s) => (
                <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{s}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}