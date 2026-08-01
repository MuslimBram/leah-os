import { listWorkflows, upsertWorkflow } from "./store";
import type { Workflow } from "./types";

const SEEDS: Omit<Workflow, "createdAt">[] = [
  {
    id: "wf_full_delivery",
    name: "Full Delivery Pipeline",
    description: "Plan → backend + frontend paralel → teste → dokumentim → deploy.",
    trigger: { type: "manual" },
    enabled: true,
    steps: [
      { id: "plan", kind: "plan", title: "Arkitektura & plani", description: "Zbërtheji kërkesat në module." },
      { id: "backend", kind: "backend", title: "Backend & API", description: "Ndërto endpoint-et dhe logjikën.", dependsOn: ["plan"] },
      { id: "frontend", kind: "frontend", title: "UI & komponentë", description: "Ndërto ndërfaqen.", dependsOn: ["plan"] },
      { id: "testing", kind: "testing", title: "Teste", description: "Unit + integration teste.", dependsOn: ["backend", "frontend"] },
      { id: "docs", kind: "documentation", title: "Dokumentim", description: "README dhe API docs.", dependsOn: ["testing"] },
      { id: "deploy", kind: "deployment", title: "Publikim", description: "Deploy në prodhim.", dependsOn: ["docs"] },
    ],
  },
  {
    id: "wf_nightly_audit",
    name: "Nightly Security Audit",
    description: "Skanim sigurie + raport, çdo 5 minuta në demo.",
    trigger: { type: "interval", everyMs: 5 * 60 * 1000 },
    enabled: false,
    steps: [
      { id: "scan", kind: "security", title: "Skanim sigurie", description: "Kontrollo varësitë dhe RLS." },
      { id: "report", kind: "documentation", title: "Raport", description: "Përmblidh gjetjet.", dependsOn: ["scan"] },
    ],
  },
  {
    id: "wf_github_push",
    name: "On GitHub Push",
    description: "Reagon te webhook-u i GitHub: teste + review.",
    trigger: { type: "event", event: "webhook.github" },
    enabled: false,
    steps: [
      { id: "test", kind: "testing", title: "Run tests", description: "Ekzekuto suitën e testeve." },
      { id: "review", kind: "review", title: "Code review", description: "Rishiko ndryshimet.", dependsOn: ["test"] },
    ],
  },
];

export function seedWorkflows() {
  const existing = new Set(listWorkflows().map((w) => w.id));
  for (const s of SEEDS) {
    if (existing.has(s.id)) continue;
    upsertWorkflow({ ...s, createdAt: Date.now() });
  }
}