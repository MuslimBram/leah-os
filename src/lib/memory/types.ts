// Sprint 2 — Memory & Shared Context types.
// Everything in the memory subsystem depends on these interfaces, not on a
// concrete provider. Swap in Qdrant / pgvector / Pinecone later by
// implementing `EmbeddingProvider` + `VectorStoreProvider`.

export type MemoryScope =
  | "short-term"   // volatile, single session
  | "long-term"    // durable knowledge
  | "project"      // scoped to a project id
  | "user"         // user preferences / profile
  | "agent"        // per-AI agent notes
  | "execution"    // scoped to an execution run
  | "session";     // browser session

export type MemoryKind =
  | "prompt"
  | "response"
  | "file"
  | "log"
  | "workflow"
  | "decision"
  | "summary"
  | "note";

export type MemoryRecord = {
  id: string;
  scope: MemoryScope;
  kind: MemoryKind;
  content: string;
  metadata: Record<string, string | number | boolean | null>;
  projectId?: string;
  executionId?: string;
  agentId?: string;
  userId?: string;
  createdAt: number;
  embedding?: number[];
};

export type MemoryQuery = {
  text?: string;
  scope?: MemoryScope | MemoryScope[];
  kind?: MemoryKind | MemoryKind[];
  projectId?: string;
  executionId?: string;
  agentId?: string;
  limit?: number;
  minScore?: number;
};

export type MemoryHit = {
  record: MemoryRecord;
  score: number;
};

export type EmbeddingProvider = {
  id: string;
  dims: number;
  embed: (text: string) => Promise<number[]>;
};

export type VectorStoreProvider = {
  id: string;
  upsert: (rec: MemoryRecord) => Promise<void>;
  delete: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  list: () => Promise<MemoryRecord[]>;
  search: (queryEmbedding: number[], limit: number) => Promise<MemoryHit[]>;
};

// ---- Shared Context ----

export type ContextLayer = "execution" | "project" | "agent" | "global";

export type ContextEntry = {
  id: string;
  layer: ContextLayer;
  ownerId?: string;   // executionId / projectId / agentId; empty for global
  key: string;        // free-form namespace, e.g. "goal", "constraints"
  value: unknown;
  version: number;
  updatedAt: number;
};

export type MergedContext = {
  execution: ContextEntry[];
  project: ContextEntry[];
  agent: ContextEntry[];
  global: ContextEntry[];
  flat: Record<string, unknown>; // key -> value with precedence exec > project > agent > global
};