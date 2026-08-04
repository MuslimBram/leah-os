import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { AI_CATALOG, AI_TEAMS } from "@/lib/leah-catalog";
import { useSkills } from "@/lib/skills/use-skills";
import { activateTeam, deactivateTeam } from "@/lib/skills/teams";
import { Users, Check } from "lucide-react";

export const Route = createFileRoute("/teams")({
  head: () => ({
    meta: [
      { title: "AI Teams — Leah AI OS" },
      { name: "description", content: "Zgjedh një ekip AI në vend të një AI-je të vetme." },
    ],
  }),
  component: TeamsPage,
});

function TeamsPage() {
  const { activeTeam } = useSkills();
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="AI Teams" title="Ekipe AI me role të veçanta" description="Nga 'një AI për gjithçka' në 'ekipe me role' — organizata e lëngshme." />
      <div className="grid md:grid-cols-3 gap-5">
        {AI_TEAMS.map((team) => {
          const active = activeTeam?.teamId === team.id;
          return (
          <div key={team.id} className={"rounded-2xl border bg-card p-6 transition " + (active ? "border-primary/50 shadow-[0_0_0_1px_var(--primary)]" : "border-border")}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold">{team.name}</div>
                <div className="text-xs text-muted-foreground">{team.tagline}</div>
              </div>
            </div>
            <div className="space-y-2 mt-4">
              {team.roles.map((r) => {
                const ai = AI_CATALOG.find((a) => a.id === r.ai) ?? AI_CATALOG[0];
                return (
                  <div key={r.role} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{r.role}</span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: ai.color }} />
                      <span className="font-medium">{ai.name}</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => (active ? deactivateTeam() : activateTeam(team.id))}
              className={
                "mt-5 w-full py-2 rounded-lg text-sm transition inline-flex items-center justify-center gap-1.5 " +
                (active
                  ? "bg-primary/15 border border-primary/50 text-primary"
                  : "border border-primary/40 text-primary hover:bg-primary/10")
              }
            >
              {active ? <><Check className="h-3.5 w-3.5" /> Aktiv — çaktivizo</> : "Aktivizo ekipin"}
            </button>
          </div>
          );
        })}
      </div>
      {activeTeam && (
        <p className="mt-6 text-xs text-muted-foreground">
          Ekipi aktiv ri-drejton providerët e agjentëve në Swarm — kontrollo faqen Agents.
        </p>
      )}
    </div>
  );
}