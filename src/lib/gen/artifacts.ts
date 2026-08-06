// Store for REAL generated output (code files + notes) produced by agents.

export type GeneratedFile = { path: string; language: string; content: string };

export type GeneratedArtifact = {
  taskId: string;
  executionId: string;
  agentId: string;
  title: string;
  provider: string;
  model: string;
  notes: string;
  files: GeneratedFile[];
  createdAt: number;
};

const store: GeneratedArtifact[] = [];
const listeners = new Set<() => void>();
/** Cached per-task slices so useSyncExternalStore snapshots stay stable. */
const byTask = new Map<string, GeneratedArtifact[]>();
const EMPTY: GeneratedArtifact[] = [];

export function subscribeArtifacts(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function addArtifact(a: GeneratedArtifact) {
  store.push(a);
  byTask.set(a.taskId, [...(byTask.get(a.taskId) ?? []), a]);
  for (const l of listeners) l();
}

export function artifactsFor(taskId: string): GeneratedArtifact[] {
  return byTask.get(taskId) ?? EMPTY;
}

export function listArtifacts(executionId?: string): GeneratedArtifact[] {
  const rows = executionId ? store.filter((a) => a.executionId === executionId) : store;
  return [...rows].sort((a, b) => b.createdAt - a.createdAt);
}

export function clearArtifacts() {
  store.length = 0;
  byTask.clear();
  for (const l of listeners) l();
}

/** Extracts fenced code blocks with optional `// path:` hints into files. */
export function parseFiles(text: string): { notes: string; files: GeneratedFile[] } {
  const files: GeneratedFile[] = [];
  const fence = /```([a-zA-Z0-9+#._-]*)\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  let notes = text;
  let index = 0;
  while ((match = fence.exec(text)) !== null) {
    const language = match[1] || "txt";
    const body = match[2].trimEnd();
    // A path hint can precede the fence ("**src/x.ts**", "File: src/x.ts") or
    // be the first comment line inside it.
    const before = text.slice(Math.max(0, match.index - 160), match.index);
    const hint =
      before.match(/([\w./-]+\.[a-zA-Z0-9]{1,6})\s*\**\s*:?\s*$/)?.[1] ??
      body.match(/^(?:\/\/|#|--)\s*([\w./-]+\.[a-zA-Z0-9]{1,6})/)?.[1];
    index += 1;
    files.push({
      path: hint ?? `generated/file-${index}.${language === "txt" ? "md" : language}`,
      language,
      content: body,
    });
    notes = notes.replace(match[0], "");
  }
  return { notes: notes.trim(), files };
}