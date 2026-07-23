import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { Github, GitBranch, GitCommit, GitPullRequest, GitMerge } from "lucide-react";

export const Route = createFileRoute("/github")({
  head: () => ({
    meta: [
      { title: "GitHub SSoT — Leah AI OS" },
      { name: "description", content: "GitHub si Single Source of Truth për të gjitha AI-të." },
    ],
  }),
  component: GithubPage,
});

const FLOW = [
  { icon: Github, t: "GitHub", d: "Burimi i vetëm i së vërtetës" },
  { icon: GitBranch, t: "Planner", d: "Krijon branch për çdo task" },
  { icon: GitCommit, t: "AI Commits", d: "Çdo AI commit-on ndryshimet e veta" },
  { icon: GitPullRequest, t: "Review", d: "AI review + human approval" },
  { icon: GitMerge, t: "Merge", d: "Merge në main, deploy triggerohet" },
];

function GithubPage() {
  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="GitHub SSoT" title="Çdo AI punon vetëm mbi GitHub" description="Jo mbi kopje. Një burim, shumë kontribues AI." />
      <div className="rounded-2xl border border-border p-6" style={{ background: "var(--grad-surface)" }}>
        <div className="grid md:grid-cols-5 gap-3">
          {FLOW.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.t} className="rounded-xl border border-border bg-card p-4 text-center">
                <div className="mx-auto h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="mt-2 text-xs text-primary font-mono">STEP 0{i + 1}</div>
                <div className="font-semibold text-sm mt-1">{s.t}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.d}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}