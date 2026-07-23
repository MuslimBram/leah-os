import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { AI_SKILLS } from "@/lib/leah-catalog";
import { Puzzle, Download } from "lucide-react";

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
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="AI Skills Marketplace" title="Plug-ins njohurie për Leah" description="Si WordPress plugins, por për AI. Ekosistem i hapur me paketa njohurish të gatshme." />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {AI_SKILLS.map((s) => (
          <div key={s} className="rounded-xl border border-border bg-card p-4 hover:border-primary/40 transition">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-secondary flex items-center justify-center text-primary">
                <Puzzle className="h-4 w-4" />
              </div>
              <div className="font-medium">{s} Expert</div>
            </div>
            <button className="mt-3 w-full inline-flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md border border-border hover:border-primary/50 hover:text-primary transition">
              <Download className="h-3 w-3" /> Instalo
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}