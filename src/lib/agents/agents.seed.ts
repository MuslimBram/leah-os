// Built-in agent roster. Each agent is optional and swappable — remove a
// register call and the rest of the system keeps working.

import { registerAgent } from "./registry";
import type { Agent, AgentContext, AgentResult } from "./types";
import { generateCode } from "@/lib/gen/codegen.functions";
import { activeByok } from "@/lib/gen/byok-store";
import { addArtifact, parseFiles } from "@/lib/gen/artifacts";
import { getFreeProvider } from "@/lib/gen/free-providers";

/** Real runner: calls a live model and stores the generated files. */
function makeRunner(agent: Omit<Agent, "run">) {
  return async (ctx: AgentContext): Promise<AgentResult> => {
    ctx.log(`${agent.name} mori detyrën (${ctx.kind}) — po thërret modelin…`);

    const byokCfg = activeByok();
    const spec = byokCfg ? getFreeProvider(byokCfg.providerId) : undefined;
    const byok = byokCfg
      ? {
          providerId: byokCfg.providerId,
          apiKey: byokCfg.apiKey,
          baseUrl: byokCfg.baseUrl || spec?.baseUrl,
          model: byokCfg.model || spec?.models[0],
        }
      : null;

    let res: { text: string; provider: string; model: string };
    try {
      res = await generateCode({
        data: {
          kind: ctx.kind,
          title: ctx.title,
          description: ctx.description,
          prompt: ctx.prompt,
          role: agent.role,
          byok,
        },
      });
    } catch (err) {
      // Offline / no provider reachable: degrade instead of failing the task.
      const message = err instanceof Error ? err.message : String(err);
      ctx.log(`Modeli nuk u arrit (${message}) — dalje offline.`);
      return {
        output: `${agent.name} nuk arriti të thërrasë një model për "${ctx.title}". Konfiguro një provider te /free-ai.`,
        artifacts: { agent: agent.id, provider: "offline", model: "none", files: 0 },
      };
    }

    const { notes, files } = parseFiles(res.text);
    ctx.log(`${res.provider}/${res.model} → ${files.length} file të gjeneruar`);

    addArtifact({
      taskId: ctx.taskId,
      executionId: ctx.executionId,
      agentId: agent.id,
      title: ctx.title,
      provider: res.provider,
      model: res.model,
      notes,
      files,
      createdAt: Date.now(),
    });

    return {
      output: files.length
        ? `${files.length} file: ${files.map((f) => f.path).join(", ")}\n${notes}`.trim()
        : res.text.slice(0, 4000),
      artifacts: { agent: agent.id, provider: res.provider, model: res.model, files: files.length },
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