// Installs the multi-agent runtime into the orchestrator. Called once from
// the router bootstrap, alongside the memory bootstrap.

import { orchestrator } from "@/lib/core/orchestrator";
import { seedAgents } from "./agents.seed";
import { agentTaskExecutor } from "./swarm";

let installed = false;

export function installAgentBootstrap() {
  if (installed) return;
  installed = true;
  seedAgents();
  orchestrator.setTaskExecutor(agentTaskExecutor);
}