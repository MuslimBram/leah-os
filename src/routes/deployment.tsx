import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { DEPLOY_TARGETS, deployService, getTarget, stagesFor, useDeployments } from "@/lib/deploy";
import type { DeployEnv } from "@/lib/deploy";
import { useProjects } from "@/lib/projects/use-projects";
import { useOrchestrator } from "@/lib/core/use-orchestrator";
import { Rocket, Database, CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/deployment")({
  head: () => ({
    meta: [
      { title: "Deployment — Leah AI OS" },
      { name: "description", content: "Publiko një app me database në Vercel, Railway, Fly.io, Cloudflare ose Kubernetes — pipeline i plotë build → test → migrime → deploy → health check." },
      { property: "og:title", content: "Deployment — Leah AI OS" },
      { property: "og:description", content: "Release pipeline i orkestruar nga agjentët e Leah, me database dhe health check." },
    ],
  }),
  component: DeploymentPage,
});

const ENVS: DeployEnv[] = ["preview", "staging", "production"];

function DeploymentPage() {
  const deployments = useDeployments();
  const { projects } = useProjects();
  const { executions, tasksFor } = useOrchestrator();
  const [targetId, setTargetId] = useState("railway");
  const [env, setEnv] = useState<DeployEnv>("production");
  const [projectId, setProjectId] = useState<string>("");
  const [name, setName] = useState("Leah App");
  const [withDb, setWithDb] = useState(true);

  const target = getTarget(targetId)!;
  const region = target.regions[0];
  const dbEnabled = withDb && target.database;
  const stages = stagesFor(dbEnabled);

  function launch() {
    deployService.deploy({
      projectId: projectId || undefined,
      projectName: projectId ? undefined : name,
      targetId,
      env,
      withDatabase: withDb,
    });
  }

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader eyebrow="Deployment" title="Publiko një website me database" description="Zgjedh targetin, mjedisin dhe nëse duhet database. Leah krijon një execution me faza reale dhe ndjek statusin deri te health check." />

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {DEPLOY_TARGETS.map((t) => (
          <button key={t.id} onClick={() => setTargetId(t.id)}
            className={"rounded-xl border p-4 text-left transition " + (t.id === targetId ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40")}>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: t.accent, color: "oklch(0.15 0.02 265)" }}>
              <Rocket className="h-4 w-4" />
            </div>
            <div className="mt-2 font-semibold text-sm">{t.name}</div>
            <div className="text-[11px] text-muted-foreground">{t.description}</div>
            {t.database && (
              <span className="mt-2 inline-flex items-center gap-1 text-[10px] text-primary">
                <Database className="h-3 w-3" /> DB
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-border p-5" style={{ background: "var(--grad-surface)" }}>
        <div className="grid md:grid-cols-4 gap-4">
          <label className="text-sm">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Projekt</span>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <option value="">— Ad-hoc —</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          {!projectId && (
            <label className="text-sm">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Emri i app-it</span>
              <input value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm" />
            </label>
          )}
          <label className="text-sm">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Environment</span>
            <select value={env} onChange={(e) => setEnv(e.target.value as DeployEnv)}
              className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm">
              {ENVS.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
          </label>
          <label className="text-sm flex items-end gap-2">
            <input type="checkbox" checked={withDb} disabled={!target.database}
              onChange={(e) => setWithDb(e.target.checked)} className="h-4 w-4" />
            <span className={target.database ? "" : "text-muted-foreground line-through"}>Me database</span>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {stages.map((s, i) => (
            <span key={s.id} className="text-[11px] px-2.5 py-1 rounded-full border border-border bg-card">
              {i + 1}. {s.title}
            </span>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button onClick={launch}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--grad-hero)" }}>
            <Rocket className="h-4 w-4" /> Deploy te {target.name}
          </button>
          <span className="text-xs text-muted-foreground">region: {region}</span>
        </div>
      </div>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Historiku i deploy-eve</h2>
      {deployments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Ende asnjë deploy. Nis një më sipër.</p>
      ) : (
        <div className="space-y-3">
          {deployments.map((d) => {
            const exec = executions.find((e) => e.id === d.executionId);
            const tasks = exec ? tasksFor(exec.id) : [];
            const done = tasks.filter((t) => t.status === "completed").length;
            const Icon = d.status === "succeeded" ? CheckCircle2 : d.status === "failed" ? XCircle : Loader2;
            return (
              <div key={d.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <Icon className={"h-4 w-4 " + (d.status === "failed" ? "text-destructive" : d.status === "succeeded" ? "text-primary" : "text-muted-foreground animate-spin")} />
                    <div>
                      <div className="font-semibold text-sm">{d.projectName} → {getTarget(d.targetId)?.name}</div>
                      <div className="text-xs text-muted-foreground">{d.env} · {d.region} · {d.withDatabase ? "me database" : "pa database"}</div>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">{done}/{tasks.length} faza</div>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {tasks.map((t) => (
                    <span key={t.id} className={"text-[10px] px-2 py-0.5 rounded-full border " + (t.status === "completed" ? "border-primary/40 text-primary" : t.status === "failed" ? "border-destructive/40 text-destructive" : "border-border text-muted-foreground")}>
                      {t.title.split("—").pop()?.trim()}
                    </span>
                  ))}
                </div>
                {d.status === "succeeded" && (
                  <a href={d.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
                    {d.url} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}