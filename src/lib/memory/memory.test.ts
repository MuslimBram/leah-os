// @ts-ignore -- bun's built-in test runner
import { describe, expect, it, beforeEach } from "bun:test";
import { memoryService } from "./memory-service";
import { contextService } from "./context-service";
import { retrievalService } from "./retrieval";
import { setVectorStore, createInMemoryVectorStore } from "./vector-store";
import { localHashEmbeddingProvider, setEmbeddingProvider, cosineSim } from "./embeddings";

beforeEach(async () => {
  setEmbeddingProvider(localHashEmbeddingProvider);
  setVectorStore(createInMemoryVectorStore());
  await memoryService.clear();
  contextService.clear();
});

describe("Memory Service", () => {
  it("stores and lists memory records with embeddings", async () => {
    const rec = await memoryService.store({
      scope: "project", kind: "prompt", content: "hello world", metadata: {}, projectId: "p1",
    });
    expect(rec.embedding && rec.embedding.length).toBeGreaterThan(0);
    const all = await memoryService.list();
    expect(all).toHaveLength(1);
  });

  it("performs semantic search that ranks similar content higher", async () => {
    await memoryService.store({ scope: "long-term", kind: "note", content: "stripe payments integration", metadata: {} });
    await memoryService.store({ scope: "long-term", kind: "note", content: "database migration script", metadata: {} });
    const hits = await memoryService.search({ text: "how do I add stripe billing", limit: 2 });
    expect(hits[0].record.content).toContain("stripe");
  });

  it("filters by scope, kind and executionId", async () => {
    await memoryService.store({ scope: "execution", kind: "response", content: "a", metadata: {}, executionId: "e1" });
    await memoryService.store({ scope: "execution", kind: "response", content: "b", metadata: {}, executionId: "e2" });
    const hits = await memoryService.search({ executionId: "e1" });
    expect(hits).toHaveLength(1);
  });
});

describe("Context Service", () => {
  it("versions entries on update", () => {
    const a = contextService.set({ layer: "global", key: "style", value: "concise" });
    const b = contextService.set({ layer: "global", key: "style", value: "verbose" });
    expect(a.id).toBe(b.id);
    expect(b.version).toBe(2);
  });

  it("merges layers with execution > project > agent > global precedence", () => {
    contextService.set({ layer: "global", key: "lang", value: "en" });
    contextService.set({ layer: "agent", ownerId: "gpt", key: "lang", value: "sq" });
    contextService.set({ layer: "project", ownerId: "p1", key: "lang", value: "de" });
    contextService.set({ layer: "execution", ownerId: "e1", key: "lang", value: "fr" });
    const merged = contextService.merge({ executionId: "e1", projectId: "p1", agentId: "gpt" });
    expect(merged.flat.lang).toBe("fr");
  });

  it("isolates ownerIds within a layer", () => {
    contextService.set({ layer: "project", ownerId: "p1", key: "k", value: 1 });
    contextService.set({ layer: "project", ownerId: "p2", key: "k", value: 2 });
    expect(contextService.merge({ projectId: "p1" }).flat.k).toBe(1);
    expect(contextService.merge({ projectId: "p2" }).flat.k).toBe(2);
  });
});

describe("Retrieval + Planner integration", () => {
  it("builds a prompt injecting context and memory hits", async () => {
    contextService.set({ layer: "project", ownerId: "p1", key: "goal", value: "build airbnb clone" });
    await memoryService.store({ scope: "project", kind: "summary", content: "previous airbnb plan used stripe and maps", metadata: {}, projectId: "p1" });
    const built = await retrievalService.buildPrompt({ query: "add stripe checkout", projectId: "p1" });
    expect(built.finalPrompt).toContain("SHARED CONTEXT");
    expect(built.finalPrompt).toContain("RELEVANT MEMORY");
    expect(built.finalPrompt).toContain("add stripe checkout");
    expect(built.hits.length).toBeGreaterThan(0);
  });
});

describe("Provider abstraction", () => {
  it("cosineSim returns 1 for identical vectors and 0 for orthogonal", () => {
    expect(cosineSim([1, 0], [1, 0])).toBeCloseTo(1);
    expect(cosineSim([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it("swapping the vector store is transparent to callers", async () => {
    const custom = createInMemoryVectorStore();
    setVectorStore(custom);
    await memoryService.store({ scope: "session", kind: "note", content: "abc", metadata: {} });
    expect((await memoryService.list()).length).toBe(1);
  });
});