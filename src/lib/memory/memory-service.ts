// High-level Memory Service. Callers (Planner, Orchestrator, UI) depend only
// on this file. It orchestrates the embedding + vector store providers so
// they can be swapped without touching consumers.

import { emit } from "@/lib/core/event-bus";
import { getEmbeddingProvider } from "./embeddings";
import { getVectorStore } from "./vector-store";
import type { MemoryHit, MemoryQuery, MemoryRecord } from "./types";

function uid() {
  return `mem_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type StoreInput = Omit<MemoryRecord, "id" | "createdAt" | "embedding"> & {
  id?: string;
  createdAt?: number;
};

const listeners = new Set<() => void>();

export function subscribeMemory(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() { for (const l of listeners) { try { l(); } catch { /* ignore */ } } }

export const memoryService = {
  async store(input: StoreInput): Promise<MemoryRecord> {
    const emb = getEmbeddingProvider();
    const embedding = await emb.embed(input.content);
    const rec: MemoryRecord = {
      ...input,
      id: input.id ?? uid(),
      createdAt: input.createdAt ?? Date.now(),
      metadata: input.metadata ?? {},
      embedding,
    };
    await getVectorStore().upsert(rec);
    emit({ type: "pipeline.stage", stage: `memory:${rec.kind}`, status: "ok" });
    notify();
    return rec;
  },

  async delete(id: string) {
    await getVectorStore().delete(id);
    notify();
  },

  async clear() {
    await getVectorStore().clear();
    notify();
  },

  async list(): Promise<MemoryRecord[]> {
    const all = await getVectorStore().list();
    return all.sort((a, b) => b.createdAt - a.createdAt);
  },

  async search(query: MemoryQuery): Promise<MemoryHit[]> {
    const emb = getEmbeddingProvider();
    const vs = getVectorStore();
    const limit = query.limit ?? 8;
    const all = await vs.list();

    const matchesFilters = (r: MemoryRecord) => {
      if (query.scope) {
        const scopes = Array.isArray(query.scope) ? query.scope : [query.scope];
        if (!scopes.includes(r.scope)) return false;
      }
      if (query.kind) {
        const kinds = Array.isArray(query.kind) ? query.kind : [query.kind];
        if (!kinds.includes(r.kind)) return false;
      }
      if (query.projectId && r.projectId !== query.projectId) return false;
      if (query.executionId && r.executionId !== query.executionId) return false;
      if (query.agentId && r.agentId !== query.agentId) return false;
      return true;
    };

    if (!query.text) {
      return all
        .filter(matchesFilters)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map((record) => ({ record, score: 1 }));
    }

    const qEmb = await emb.embed(query.text);
    const hits = await vs.search(qEmb, Math.max(limit * 4, 16));
    const filtered = hits.filter((h) => matchesFilters(h.record));
    const min = query.minScore ?? 0;
    return filtered.filter((h) => h.score >= min).slice(0, limit);
  },
};

export type MemoryService = typeof memoryService;