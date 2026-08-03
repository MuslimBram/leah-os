import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/leah/AppShell";
import { FolderKanban, Plus, Play, Trash2, FileCode2, GitBranch } from "lucide-react";
import { useProjects } from "@/lib/projects/use-projects";
import { projectService } from "@/lib/projects/service";
import { removeProject } from "@/lib/projects/store";
import { DEFAULT_BLUEPRINT } from "@/lib/projects/blueprint";
import type { ProjectStatus } from "@/lib/projects/types";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Projects — Leah AI OS" },
      { name: "description", content: "Menaxho projektet e ndërtuara nga Leah." },
      { property: "og:title", content: "Projects — Leah AI OS" },
      { property: "og:description", content: "Workspace me projekte, build pipeline dhe artefakte të gjeneruara." },
    ],
  }),
  component: ProjectsPage,
});

const STATUS_STYLE: Record<ProjectStatus, string> = {
  planning: "border-border text-muted-foreground",
  building: "border-primary/50 text-primary",
  testing: "border-primary/40 text-primary/90",
  deployed: "border-emerald-500/50 text-emerald-400",
  failed: "border-destructive/50 text-destructive",
};

function ProjectsPage() {
  const { projects, artifacts, hydrated } = useProjects();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", stack: "", repo: "" });

  const submit = () => {
    if (!form.name.trim()) return;
    projectService.create({
      name: form.name.trim(),
      description: form.description.trim() || form.name.trim(),
      stack: form.stack.split(",").map((s) => s.trim()).filter(Boolean),
      repo: form.repo.trim() || undefined,
    });
    setForm({ name: "", description: "", stack: "", repo: "" });
    setOpen(false);
  };

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <PageHeader eyebrow="Projektet" title="Ndërtimet e tua në Leah" description="Çdo projekt zotëron ekzekutimet, kontekstin dhe artefaktet e veta — Single Source of Truth." />
        <button onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 glow-primary">
          <Plus className="h-4 w-4" /> Projekt i ri
        </button>
      </div>

      {open && (
        <div className="rounded-2xl border border-border bg-card p-5 mb-8 grid md:grid-cols-2 gap-3">
          {([["name", "Emri"], ["description", "Përshkrimi / qëllimi"], ["stack", "Stack (me presje)"], ["repo", "GitHub repo (opsional)"]] as const).map(([key, label]) => (
            <label key={key} className="text-sm space-y-1.5">
              <span className="text-xs text-muted-foreground">{label}</span>
              <input
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary/60"
              />
            </label>
          ))}
          <div className="md:col-span-2 flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg border border-border text-sm">Anulo</button>
            <button onClick={submit} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium">Krijo</button>
          </div>
        </div>
      )}

      {hydrated && projects.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Ende s'ka projekte. Krijo një dhe Leah do ta zbërthejë në {DEFAULT_BLUEPRINT.length} hapa build.
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((p) => {
          const files = artifacts(p.id);
          const isOpen = selected === p.id;
          return (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center text-primary shrink-0">
                  <FolderKanban className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>
                </div>
              </div>

              {p.stack.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {p.stack.map((s) => (
                    <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{s}</span>
                  ))}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between text-xs">
                <span className={"px-2 py-0.5 rounded-full border " + STATUS_STYLE[p.status]}>{p.status}</span>
                <span className="text-muted-foreground">{p.executionIds.length} ekzekutime · {files.length} artefakte</span>
              </div>

              {p.repo && (
                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <GitBranch className="h-3 w-3" /> {p.repo}
                </div>
              )}

              <div className="mt-4 flex items-center gap-2">
                <button
                  onClick={() => projectService.build(p.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition"
                >
                  <Play className="h-3 w-3" /> Build
                </button>
                <button
                  onClick={() => setSelected(isOpen ? null : p.id)}
                  className="inline-flex items-center gap-1.5 text-xs py-1.5 px-3 rounded-lg border border-border hover:border-primary/40 transition"
                >
                  <FileCode2 className="h-3 w-3" /> Artefakte
                </button>
                <button
                  onClick={() => removeProject(p.id)}
                  aria-label={`Fshi ${p.name}`}
                  className="inline-flex items-center py-1.5 px-2 rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/40 transition"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>

              {isOpen && (
                <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
                  {files.length === 0 && <div className="text-xs text-muted-foreground">Asnjë artefakt ende — nis një build.</div>}
                  {files.map((a) => (
                    <div key={a.id} className="rounded-lg border border-border/60 bg-background/60 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase tracking-wider text-primary">{a.kind}</span>
                        <span className="text-[10px] text-muted-foreground">{a.agentId}</span>
                      </div>
                      <div className="text-xs font-mono text-muted-foreground truncate">{a.path}</div>
                      <div className="text-xs truncate">{a.summary}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}