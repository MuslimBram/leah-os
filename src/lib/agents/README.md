# Multi-Agent System (Sprint 3)

Modular agent layer on top of the Orchestrator. The core never imports a
concrete agent — only the registry.

| File | Role |
| --- | --- |
| `types.ts` | `Agent`, `AgentContext`, `AgentResult`, `AgentMessage` contracts |
| `registry.ts` | `registerAgent` / `unregisterAgent` / `selectAgent` (capability match) |
| `bus.ts` | Inter-agent message bus (agent → agent, broadcast) |
| `swarm.ts` | Executor: routing, per-agent concurrency slots, subtask delegation (max depth 2), memory write-back |
| `agents.seed.ts` | Built-in roster (architect, backend, frontend, tester, writer, researcher, operator) |
| `bootstrap.ts` | `installAgentBootstrap()` — seeds agents + installs the executor |
| `use-agents.ts` | React hooks for the `/agents` dashboard |

## Adding an agent

```ts
registerAgent({
  id: "security", name: "Security Auditor", role: "reviewer",
  providerId: "claude", capabilities: ["security"], concurrency: 1,
  description: "…", accent: "oklch(0.7 0.2 20)",
  run: async (ctx) => ({ output: await myProvider(ctx.prompt) }),
});
```

Prompts are pre-enriched by the Retrieval Engine (shared context + semantic
memory). Results are written back to memory under the `agent` scope.

The Orchestrator queue is now a **priority queue** (`task.priority`, higher
first, FIFO within equal priority).