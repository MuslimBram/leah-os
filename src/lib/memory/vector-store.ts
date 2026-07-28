// Vector store provider abstraction. Default: in-memory + localStorage.
// Replace with a Qdrant / pgvector / Pinecone provider by implementing
// `VectorStoreProvider` and calling `setVectorStore`.

import { cosineSim } from "./embeddings";
import type { MemoryHit, MemoryRecord, VectorStoreProvider } from "./types";

const STORAGE_KEY = "leah:memory:v1";

function readStorage(): MemoryRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as MemoryRecord[];
  } catch {
    return [];
  }
}

function writeStorage(records: MemoryRecord[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* quota / privacy mode — memory still works in RAM */
  }
}

export function createInMemoryVectorStore(): VectorStoreProvider {
  let records: MemoryRecord[] = readStorage();

  const persist = () => writeStorage(records);

  return {
    id: "in-memory",
    async upsert(rec) {
      const idx = records.findIndex((r) => r.id === rec.id);
      if (idx >= 0) records[idx] = rec;
      else records.push(rec);
      persist();
    },
    async delete(id) {
      records = records.filter((r) => r.id !== id);
      persist();
    },
    async clear() {
      records = [];
      persist();
    },
    async list() {
      return [...records];
    },
    async search(queryEmbedding, limit) {
      const hits: MemoryHit[] = [];
      for (const r of records) {
        if (!r.embedding) continue;
        hits.push({ record: r, score: cosineSim(queryEmbedding, r.embedding) });
      }
      hits.sort((a, b) => b.score - a.score);
      return hits.slice(0, limit);
    },
  };
}

let current: VectorStoreProvider = createInMemoryVectorStore();

export function setVectorStore(p: VectorStoreProvider) {
  current = p;
}

export function getVectorStore(): VectorStoreProvider {
  return current;
}