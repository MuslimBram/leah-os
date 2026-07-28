// Retrieval Engine — semantic retrieval, ranking, compression, and prompt
// injection. Depends only on the Memory + Context services, so any provider
// swap upstream is invisible here.

import { contextService } from "./context-service";
import { memoryService } from "./memory-service";
import type { MemoryHit, MemoryQuery } from "./types";

export type BuildPromptInput = {
  query: string;
  projectId?: string;
  executionId?: string;
  agentId?: string;
  limit?: number;
  maxChars?: number;
};

export type BuiltPrompt = {
  hits: MemoryHit[];
  contextBlock: string;
  finalPrompt: string;
};

export const retrievalService = {
  async semanticRetrieve(query: MemoryQuery): Promise<MemoryHit[]> {
    return memoryService.search(query);
  },

  /** Rank hits by score with a mild recency bonus so newer memory wins ties. */
  rank(hits: MemoryHit[]): MemoryHit[] {
    const now = Date.now();
    return [...hits].sort((a, b) => {
      const rA = 1 - Math.min((now - a.record.createdAt) / (30 * 24 * 3600 * 1000), 1);
      const rB = 1 - Math.min((now - b.record.createdAt) / (30 * 24 * 3600 * 1000), 1);
      return (b.score + rB * 0.05) - (a.score + rA * 0.05);
    });
  },

  /** Compress content to fit a character budget; truncates per-hit fairly. */
  compress(hits: MemoryHit[], maxChars: number): string {
    if (hits.length === 0) return "";
    const budget = Math.max(120, Math.floor(maxChars / hits.length));
    return hits
      .map((h, i) => {
        const c = h.record.content.length > budget
          ? `${h.record.content.slice(0, budget - 1)}…`
          : h.record.content;
        return `[#${i + 1} ${h.record.scope}/${h.record.kind} score=${h.score.toFixed(2)}]\n${c}`;
      })
      .join("\n\n");
  },

  async buildPrompt(input: BuildPromptInput): Promise<BuiltPrompt> {
    const limit = input.limit ?? 6;
    const maxChars = input.maxChars ?? 2400;

    const raw = await this.semanticRetrieve({
      text: input.query,
      projectId: input.projectId,
      executionId: input.executionId,
      agentId: input.agentId,
      limit,
    });
    const hits = this.rank(raw);
    const memoryBlock = this.compress(hits, Math.floor(maxChars * 0.7));

    const merged = contextService.merge({
      executionId: input.executionId,
      projectId: input.projectId,
      agentId: input.agentId,
    });
    const ctxLines = Object.entries(merged.flat)
      .map(([k, v]) => `- ${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`)
      .join("\n");
    const ctxBlock = ctxLines ? `SHARED CONTEXT:\n${ctxLines}` : "";

    const parts = [
      ctxBlock,
      memoryBlock ? `RELEVANT MEMORY:\n${memoryBlock}` : "",
      `USER REQUEST:\n${input.query}`,
    ].filter(Boolean);

    return {
      hits,
      contextBlock: [ctxBlock, memoryBlock].filter(Boolean).join("\n\n"),
      finalPrompt: parts.join("\n\n"),
    };
  },
};

export type RetrievalService = typeof retrievalService;