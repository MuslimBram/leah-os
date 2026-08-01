import { loadWorkflows } from "./store";
import { seedWorkflows } from "./workflows.seed";
import { startScheduler } from "./scheduler";

let installed = false;

export function installWorkflowBootstrap() {
  if (installed) return;
  installed = true;
  loadWorkflows();
  seedWorkflows();
  startScheduler();
}