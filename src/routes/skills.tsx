import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { useSkills } from "@/lib/skills/use-skills";
import { installSkill, uninstallSkill } from "@/lib/skills/store";
import { xpForLevel } from "@/lib/skills/types";
import { Puzzle, Download, Check, Sparkles } from "lucide-react";

export const Route = createFileRoute("/skills")({
  head: () => ({
    meta: [
      { title: "AI Skills Marketplace — Leah AI OS" },
      { name: "description", content: "Instalo aftësi si Shopify Expert, Flutter Expert, K8s Expert dhe më shumë." },
    ],
  }),
  component: SkillsPage,
});

function SkillsPage() {
  const { skills, hydrated } = useSkills();
  const installedCount = skills.filter((s) => s.installed).length;
  const totalLessons = skills.reduce((n, s) => n + s.lessons.length, 0);
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="AI Skills Marketplace" title="Aftësi që evoluojnë vetë" description="Paketa njohurish të instalueshme. Çdo detyrë e përfunduar u jep XP dhe mësime të reja agjentëve." />

      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Të instaluara", value: installedCount },
          { label: "Në katalog", value: skills.length },
          { label: "Mësime të mësuara", value: totalLessons },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-4">
            <div className="text-2xl font-bold">{k.value}</div>
            <div className="text-xs text-muted-foreground">{k.label}</div>
          </div>
        ))}
      </div>

      {!hydrated ? (
        <div className="text-sm text-muted-foreground">Duke ngarkuar…</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {skills.map((s) => {
            const need = xpForLevel(s.level);
            const pct = Math.min(100, Math.round((s.xp / need) * 100));
            return (
              <div key={s.id} className="rounded-2xl border border-border bg-card p-5" style={{ borderColor: s.installed ? `color-mix(in oklch, ${s.accent} 40%, transparent)` : undefined }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center" style={{ color: s.accent }}>
                      <Puzzle className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-semibold">{s.name}</div>
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{s.domain} · Lvl {s.level}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => (s.installed ? uninstallSkill(s.id) : installSkill(s.id))}
                    className={
                      "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition " +
                      (s.installed
                        ? "border-primary/50 text-primary hover:bg-primary/10"
                        : "border-border hover:border-primary/50 hover:text-primary")
                    }
                  >
                    {s.installed ? <><Check className="h-3 w-3" /> Instaluar</> : <><Download className="h-3 w-3" /> Instalo</>}
                  </button>
                </div>

                <p className="mt-3 text-sm text-muted-foreground">{s.description}</p>

                <div className="mt-4">
                  <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                    <span>XP {s.xp}/{need}</span>
                    <span>{s.usageCount} përdorime</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: s.accent }} />
                  </div>
                </div>

                {s.lessons.length > 0 && (
                  <div className="mt-4 space-y-1.5">
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" /> Mësime të vetë-mësuara
                    </div>
                    {s.lessons.slice(-3).reverse().map((l) => (
                      <div key={l.id} className="text-xs text-muted-foreground/90 rounded-md bg-secondary/50 px-2.5 py-1.5">{l.content}</div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}