// Build blueprint — turns a project goal into an ordered task plan.
// Pure data + pure functions so the service file stays a thin wrapper.

import type { BuildStep } from "./types";

export const DEFAULT_BLUEPRINT: BuildStep[] = [
  { kind: "plan", title: "Arkitektura & zbërthimi", description: "Zbërtho kërkesën në module, të dhëna dhe kufizime.", priority: 5 },
  { kind: "database", title: "Skema e databazës", description: "Tabela, relacione, RLS dhe migrime.", priority: 4 },
  { kind: "backend", title: "API & logjika e serverit", description: "Endpoint-e, auth dhe rregulla biznesi.", priority: 3 },
  { kind: "frontend", title: "UI & rrjedhat", description: "Faqet, komponentët dhe design system.", priority: 3 },
  { kind: "testing", title: "Teste unit & E2E", description: "Mbulim për rrjedhat kritike.", priority: 2 },
  { kind: "documentation", title: "Dokumentim", description: "README, API reference dhe udhëzues përdorimi.", priority: 1 },
  { kind: "deployment", title: "Deploy & monitorim", description: "Publikim, health checks dhe alerte.", priority: 0 },
];

/** Maps a task kind to the artifact it produces. */
export function artifactForKind(kind: string): { kind: "code" | "test" | "doc" | "config" | "deploy" | "note"; path: string } {
  switch (kind) {
    case "database": return { kind: "config", path: "supabase/migrations/" };
    case "backend": return { kind: "code", path: "src/lib/server/" };
    case "frontend": return { kind: "code", path: "src/routes/" };
    case "testing": return { kind: "test", path: "src/**/*.test.ts" };
    case "documentation": return { kind: "doc", path: "README.md" };
    case "deployment": return { kind: "deploy", path: "deploy/manifest.json" };
    case "plan": return { kind: "note", path: "docs/architecture.md" };
    default: return { kind: "note", path: `artifacts/${kind}` };
  }
}

export function buildStepsFor(goal: string, steps: BuildStep[] = DEFAULT_BLUEPRINT): BuildStep[] {
  return steps.map((s) => ({ ...s, description: `${s.description}\nQëllimi: ${goal}` }));
}