import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { memoryService } from "@/lib/memory/memory-service";
import { useMemoryRecords } from "@/lib/memory/use-memory";
import type { MemoryHit, MemoryKind, MemoryRecord, MemoryScope } from "@/lib/memory/types";
import { Brain, Search, Trash2, Filter } from "lucide-react";

export const Route = createFileRoute("/memory")({
  head: () => ({
    meta: [
      { title: "Memory Explorer — Leah AI OS" },
      { name: "description", content: "Semantic search, timeline dhe metadata për çdo prompt, response dhe log në sistem." },
    ],
  }),
  component: MemoryExplorer,
});

const SCOPES: MemoryScope[] = ["short-term", "long-term", "project", "user", "agent", "execution", "session"];
const KINDS: MemoryKind[] = ["prompt", "response", "file", "log", "workflow", "decision", "summary", "note"];

function fmt(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function MemoryExplorer() {
  const { records } = useMemoryRecords();
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<MemoryScope | "">("");
  const [kind, setKind] = useState<MemoryKind | "">("");
  const [projectId, setProjectId] = useState("");
  const [executionId, setExecutionId] = useState("");
  const [hits, setHits] = useState<MemoryHit[]>([]);
  const [selected, setSelected] = useState<MemoryRecord | null>(null);
  const [searching, setSearching] = useState(false);

  const projectIds = useMemo(() => Array.from(new Set(records.map((r) => r.projectId).filter(Boolean) as string[])), [records]);
  const executionIds = useMemo(() => Array.from(new Set(records.map((r) => r.executionId).filter(Boolean) as string[])), [records]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setSearching(true);
      const res = await memoryService.search({
        text: query || undefined,
        scope: scope || undefined,
        kind: kind || undefined,
        projectId: projectId || undefined,
        executionId: executionId || undefined,
        limit: 50,
      });
      if (!cancelled) { setHits(res); setSearching(false); }
    };
    void run();
    return () => { cancelled = true; };
  }, [query, scope, kind, projectId, executionId, records.length]);

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Memory Explorer"
        title="Kërko, filtrofilo dhe zbulo kujtesën e sistemit"
        description="Semantic search mbi çdo prompt, response, log dhe workflow. Konteksti i çdo ekzekutimi ruhet automatikisht."
      />

      <div className="rounded-2xl border border-border bg-card p-4 md:p-5 mb-6">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Semantic search — p.sh. 'stripe payments', 'auth error'..."
            className="flex-1 bg-transparent focus:outline-none text-sm"
          />
          {searching && <span className="text-[10px] text-muted-foreground">searching…</span>}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 items-center">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select value={scope} onChange={(e) => setScope(e.target.value as MemoryScope | "")} className="text-xs bg-input border border-border rounded px-2 py-1">
            <option value="">Të gjitha scope</option>
            {SCOPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={kind} onChange={(e) => setKind(e.target.value as MemoryKind | "")} className="text-xs bg-input border border-border rounded px-2 py-1">
            <option value="">Të gjitha kind</option>
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="text-xs bg-input border border-border rounded px-2 py-1">
            <option value="">Të gjitha projektet</option>
            {projectIds.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={executionId} onChange={(e) => setExecutionId(e.target.value)} className="text-xs bg-input border border-border rounded px-2 py-1">
            <option value="">Të gjitha ekzekutimet</option>
            {executionIds.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button
            onClick={() => memoryService.clear()}
            className="ml-auto text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50"
          >
            <Trash2 className="h-3 w-3" /> Fshi të gjitha
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-2">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
            {query ? `${hits.length} rezultate semantike` : `Timeline — ${hits.length} regjistrime`}
          </div>
          {hits.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Brain className="h-6 w-6 mx-auto mb-2 opacity-60" />
              Ende s'ka kujtesë. Nis një plan te <span className="text-primary">/planner</span> dhe ekzekutoje.
            </div>
          )}
          {hits.map((h) => (
            <button
              key={h.record.id}
              onClick={() => setSelected(h.record)}
              className={`w-full text-left rounded-xl border p-3 transition ${selected?.id === h.record.id ? "border-primary bg-card" : "border-border bg-card/60 hover:border-primary/40"}`}
            >
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest">
                <span className="text-primary font-mono">{h.score.toFixed(2)}</span>
                <span className="text-muted-foreground">{h.record.scope}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{h.record.kind}</span>
                <span className="ml-auto text-muted-foreground normal-case tracking-normal">{fmt(h.record.createdAt)}</span>
              </div>
              <div className="mt-1 text-sm line-clamp-2">{h.record.content}</div>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-4 h-fit sticky top-4">
          <div className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Preview</div>
          {!selected && <div className="text-sm text-muted-foreground">Zgjidh një regjistrim.</div>}
          {selected && (
            <div className="space-y-3">
              <div className="text-[10px] font-mono text-muted-foreground break-all">{selected.id}</div>
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <span className="px-2 py-0.5 rounded-full border border-border">{selected.scope}</span>
                <span className="px-2 py-0.5 rounded-full border border-border">{selected.kind}</span>
                {selected.projectId && <span className="px-2 py-0.5 rounded-full border border-border">proj: {selected.projectId}</span>}
                {selected.executionId && <span className="px-2 py-0.5 rounded-full border border-border">exec: {selected.executionId}</span>}
                {selected.agentId && <span className="px-2 py-0.5 rounded-full border border-border">ai: {selected.agentId}</span>}
              </div>
              <div className="text-sm whitespace-pre-wrap">{selected.content}</div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Metadata</div>
                <pre className="text-[11px] bg-input rounded p-2 overflow-auto">{JSON.stringify(selected.metadata, null, 2)}</pre>
              </div>
              <div className="text-[10px] text-muted-foreground">{fmt(selected.createdAt)}</div>
              <button
                onClick={() => { memoryService.delete(selected.id); setSelected(null); }}
                className="text-xs inline-flex items-center gap-1 px-2 py-1 rounded border border-border text-muted-foreground hover:text-destructive hover:border-destructive/50"
              >
                <Trash2 className="h-3 w-3" /> Fshi
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}