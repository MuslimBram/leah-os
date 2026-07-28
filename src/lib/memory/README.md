# Memory & Shared Context (Sprint 2)

Modular memory pipeline. Every consumer (Planner, Orchestrator, UI) depends
only on the services in this folder — never on a specific provider.

```
          ┌────────────────────┐
          │  Planner / UI      │
          └─────────┬──────────┘
                    │
       ┌────────────┴───────────┐
       │  retrievalService      │  buildPrompt · rank · compress · inject
       └────────────┬───────────┘
                    │
       ┌────────────┴───────────┐    ┌────────────────────┐
       │  memoryService         │────│  contextService    │
       │  store/search/list     │    │  execution/project │
       └────────────┬───────────┘    │  agent/global      │
                    │                └────────────────────┘
   ┌────────────────┴──────────────┐
   │ EmbeddingProvider (swappable) │  local-hash · openai · gemini · lovable-ai
   └────────────────┬──────────────┘
   ┌────────────────┴──────────────┐
   │ VectorStore   (swappable)     │  in-memory · qdrant · pgvector · pinecone
   └───────────────────────────────┘
```

## Modules
- `types.ts` — record, query, hit, provider contracts.
- `embeddings.ts` — `EmbeddingProvider` interface + `localHashEmbeddingProvider` default.
- `vector-store.ts` — `VectorStoreProvider` interface + in-memory + localStorage.
- `memory-service.ts` — `store`, `list`, `search`, `delete`, `clear`, pub/sub.
- `context-service.ts` — layered (execution / project / agent / global), versioned, merged.
- `retrieval.ts` — semantic retrieve → rank → compress → inject.
- `use-memory.ts` — React hooks.
- `bootstrap.ts` — wires orchestrator → memory (auto-store after every task).

## Planner integration
`Planner.generatePlan → retrievalService.buildPrompt → executeTasks → orchestrator → memoryService.store(after each task)`

## Swapping providers
```ts
import { setEmbeddingProvider, setVectorStore } from "@/lib/memory";
setEmbeddingProvider(myLovableAiEmbeddings);
setVectorStore(myQdrantStore);
```
No consumer changes required.