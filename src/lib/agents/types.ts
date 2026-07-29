// Sprint 3 — Multi-Agent System types.
// Agents are declarative: a role + capabilities + a runner. The orchestrator
// never imports a concrete agent, only the registry.

export type AgentCapability =
  | "plan"
  | "backend"
  | "frontend"
  | "database"
  | "testing"
  | "documentation"
  | "security"
  | "deployment"
  | "research"
  | "review";

export type AgentRole =
  | "architect"
  | "engineer"
  | "reviewer"
  | "tester"
  | "writer"
  | "researcher"
  | "operator";

export type AgentContext = {
  taskId: string;
  executionId: string;
  kind: string;
  title: string;
  description: string;
  /** Prompt already enriched with shared context + retrieved memory. */
  prompt: string;
  /** Delegate a subtask to the swarm and await its result. */
  delegate: (input: { kind: string; title: string; description: string }) => Promise<unknown>;
  log: (message: string) => void;
};

export type AgentResult = {
  output: string;
  artifacts?: Record<string, string | number | boolean | null>;
};

export type Agent = {
  id: string;
  name: string;
  role: AgentRole;
  /** Preferred provider id from AI_CATALOG. */
  providerId: string;
  capabilities: AgentCapability[];
  description: string;
  /** Max concurrent tasks this agent accepts. */
  concurrency: number;
  accent: string;
  run: (ctx: AgentContext) => Promise<AgentResult>;
};

export type AgentMessage = {
  id: string;
  from: string;
  to: string | "broadcast";
  executionId?: string;
  content: string;
  ts: number;
};