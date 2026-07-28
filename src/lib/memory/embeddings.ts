// Embedding provider abstraction. The default is a deterministic local hash
// embedding so the whole memory pipeline (semantic search, ranking, tests)
// works with zero network calls. Swap in Lovable AI Gateway / OpenAI / Gemini
// by registering another provider via `setEmbeddingProvider`.

import type { EmbeddingProvider } from "./types";

const DIMS = 128;

// FNV-1a hash → deterministic pseudo-random projection into DIMS buckets.
// Not "real" semantic embedding, but stable + local + good enough for
// keyword-flavored similarity ranking in the demo runtime.
function hashEmbed(text: string): number[] {
  const v = new Array<number>(DIMS).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/g).filter(Boolean);
  for (const tok of tokens) {
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) {
      h ^= tok.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    const idx = h % DIMS;
    // Sign from second hash bit — spreads collisions.
    const sign = ((h >> 16) & 1) === 0 ? 1 : -1;
    v[idx] += sign;
  }
  // L2 normalize
  let norm = 0;
  for (const x of v) norm += x * x;
  norm = Math.sqrt(norm) || 1;
  return v.map((x) => x / norm);
}

export const localHashEmbeddingProvider: EmbeddingProvider = {
  id: "local-hash",
  dims: DIMS,
  embed: async (text) => hashEmbed(text ?? ""),
};

let current: EmbeddingProvider = localHashEmbeddingProvider;

export function setEmbeddingProvider(p: EmbeddingProvider) {
  current = p;
}

export function getEmbeddingProvider(): EmbeddingProvider {
  return current;
}

export function cosineSim(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const d = Math.sqrt(na) * Math.sqrt(nb);
  return d === 0 ? 0 : dot / d;
}