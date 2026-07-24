// Lifecycle mapping. Purely declarative: each stage lists the capabilities
// it needs. Concrete plugins that provide those capabilities are resolved
// at runtime through the registry — no stage hardcodes a plugin id.

import type { IntegrationCapability } from "./types";
import { pluginsByCapability } from "./registry";

export type LifecycleStageId =
  | "generate"
  | "test"
  | "fix"
  | "document"
  | "deploy"
  | "monitor";

export type LifecycleStage = {
  id: LifecycleStageId;
  title: string;
  description: string;
  capabilities: IntegrationCapability[];
};

export const LIFECYCLE: LifecycleStage[] = [
  {
    id: "generate",
    title: "Generate",
    description: "Planner + Router zbërthejnë kërkesën dhe gjenerojnë kod përmes plugin-eve me capability generate-code.",
    capabilities: ["plan", "generate-code"],
  },
  {
    id: "test",
    title: "Test",
    description: "Worker nodes ekzekutojnë unit / integration / E2E tests.",
    capabilities: ["test", "run-workflow"],
  },
  {
    id: "fix",
    title: "Fix",
    description: "Debug worker analizon trace/log-e dhe kthen patch-e.",
    capabilities: ["debug", "refactor"],
  },
  {
    id: "document",
    title: "Document",
    description: "Scrape docs, gjenero README, API reference dhe changelog.",
    capabilities: ["document", "scrape"],
  },
  {
    id: "deploy",
    title: "Publish",
    description: "Deploy nëpër Vercel, Fly, Cloudflare ose vetë-hosted.",
    capabilities: ["deploy", "run-workflow"],
  },
  {
    id: "monitor",
    title: "Monitor",
    description: "Traces, error tracking dhe metrics në kohë reale.",
    capabilities: ["trace", "monitor"],
  },
];

export function providersForStage(stage: LifecycleStage) {
  const seen = new Map<string, ReturnType<typeof pluginsByCapability>[number]>();
  for (const cap of stage.capabilities) {
    for (const p of pluginsByCapability(cap)) seen.set(p.id, p);
  }
  return Array.from(seen.values());
}