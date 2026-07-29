// Built-in agent roster. Each agent is optional and swappable — remove a
// register call and the rest of the system keeps working.

import { registerAgent } from "./registry";
import type { Agent, AgentContext, AgentResult } from "./types";

function work(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Shared simulated runner. Real provider calls slot in here later. */
function makeRunner(agent: Pick<Agent, "id" | "name" | "providerId">) {
  return async (ctx: AgentContext): Promise<AgentResult> => {
    ctx.log(`${agent.name} mori detyrën (${ctx.kind})`);
    await work(300 + Math.floor(Math.random() * 600));
    return {
      output: `${agent.name} përfundoi "${ctx.title}" duke përdorur ${agent.providerId}.`,
      artifacts: { agent: agent.id, provider: agent.providerId, kind: ctx.kind },
    };
  };
}

const ROSTER: Omit<Agent, "run">[] = [
  { id: "architect", name: "Arkitekt", role: "architect", providerId: "claude", capabilities: ["plan", "review", "security"], description: "Zbërthen kërkesat, vendos strukturën dhe rishikon dizajnin.", concurrency: 1, accent: "oklch(0.75 0.18 40)" },
  { id: "backend-eng", name: "Backend Engineer", role: "engineer", providerId: "claude", capabilities: ["backend", "database"], description: "API, skema të bazës së të dhënave, logjikë serveri.", concurrency: 2, accent: "oklch(0.72 0.18 200)" },
  { id: "frontend-eng", name: "Frontend Engineer", role: "engineer", providerId: "lovable", capabilities: ["frontend"], description: "UI, komponentë dhe përvoja e përdoruesit.", concurrency: 2, accent: "oklch(0.75 0.20 340)" },
  { id: "tester", name: "QA Tester", role: "tester", providerId: "codex", capabilities: ["testing"], description: "Unit, integration dhe E2E teste.", concurrency: 2, accent: "oklch(0.72 0.20 130)" },
  { id: "writer", name: "Docs Writer", role: "writer", providerId: "gpt", capabilities: ["documentation"], description: "Dokumentim teknik dhe README.", concurrency: 1, accent: "oklch(0.75 0.18 150)" },
  { id: "researcher", name: "Researcher", role: "researcher", providerId: "perplexity", capabilities: ["research"], description: "Kërkim live dhe referenca.", concurrency: 1, accent: "oklch(0.75 0.15 190)" },
  { id: "operator", name: "DevOps Operator", role: "operator", providerId: "gemini", capabilities: ["deployment"], description: "Build, deploy dhe monitorim.", concurrency: 1, accent: "oklch(0.75 0.18 240)" },
];

let seeded = false;

export function seedAgents() {
  if (seeded) return;
  seeded = true;
  for (const a of ROSTER) {
    registerAgent({ ...a, run: makeRunner(a) });
  }
}