// Team activation — maps an AI_TEAMS roster onto the live agent registry.
// Activating a team re-points agent providers; deactivating restores them.

import { AI_TEAMS } from "@/lib/leah-catalog";
import { listAgents, registerAgent } from "@/lib/agents/registry";
import { getActiveTeam, setActiveTeam } from "./store";

const ROLE_TO_AGENT: Record<string, string> = {
  "Product Manager": "architect",
  "Solution Architect": "architect",
  "Shopify Expert": "backend-eng",
  "Backend Developer": "backend-eng",
  "Database Engineer": "backend-eng",
  "Frontend Developer": "frontend-eng",
  "UI/UX": "frontend-eng",
  "Marketing AI": "writer",
  "Technical Writer": "writer",
  "SEO AI": "researcher",
  "Ads AI": "researcher",
  "CRM AI": "operator",
  DevOps: "operator",
  Security: "architect",
  QA: "tester",
};

let baseline: Record<string, string> | null = null;

function snapshot(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const a of listAgents()) map[a.id] = a.providerId;
  return map;
}

function applyProviders(map: Record<string, string>) {
  for (const agent of listAgents()) {
    const providerId = map[agent.id];
    if (providerId && providerId !== agent.providerId) {
      registerAgent({ ...agent, providerId });
    }
  }
}

export function activateTeam(teamId: string) {
  const team = AI_TEAMS.find((t) => t.id === teamId);
  if (!team) return;
  if (!baseline) baseline = snapshot();

  const roles: Record<string, string> = {};
  const providerByAgent: Record<string, string> = {};
  for (const r of team.roles) {
    roles[r.role] = r.ai;
    const agentId = ROLE_TO_AGENT[r.role];
    if (agentId && !providerByAgent[agentId]) providerByAgent[agentId] = r.ai;
  }
  applyProviders(providerByAgent);
  setActiveTeam({ teamId, activatedAt: Date.now(), roles });
}

export function deactivateTeam() {
  if (baseline) applyProviders(baseline);
  setActiveTeam(null);
}

export function activeTeamId(): string | null {
  return getActiveTeam()?.teamId ?? null;
}