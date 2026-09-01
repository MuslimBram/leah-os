import type { DeployStage, DeployTarget } from "./types";

export const DEPLOY_TARGETS: DeployTarget[] = [
  { id: "vercel", name: "Vercel", vendor: "Vercel", database: false, regions: ["fra1", "iad1", "sfo1"], readiness: "server-adapter", accent: "oklch(0.78 0.02 265)", description: "Server adapter: GitHub ref → Vercel deployment → exact SHA verification → health check." },
  { id: "supabase", name: "Supabase", vendor: "Supabase", database: true, regions: ["eu-central-1", "us-east-1"], readiness: "server-adapter", accent: "oklch(0.75 0.18 150)", description: "Server adapter scope: database migration/functions with explicit safety gates; live proof still required." },
  { id: "netlify", name: "Netlify", vendor: "Netlify", database: false, regions: ["eu-central", "us-east"], readiness: "planned", accent: "oklch(0.75 0.15 190)", description: "Planned — no certified live adapter yet." },
  { id: "railway", name: "Railway", vendor: "Railway", database: false, regions: ["eu-west", "us-west"], readiness: "planned", accent: "oklch(0.72 0.16 300)", description: "Planned — no certified live adapter yet." },
  { id: "flyio", name: "Fly.io", vendor: "Fly", database: false, regions: ["ams", "fra", "iad"], readiness: "planned", accent: "oklch(0.72 0.20 280)", description: "Planned — no certified live adapter yet." },
  { id: "render", name: "Render", vendor: "Render", database: false, regions: ["frankfurt", "oregon"], readiness: "planned", accent: "oklch(0.74 0.14 220)", description: "Planned — no certified live adapter yet." },
  { id: "cloudflare", name: "Cloudflare", vendor: "Cloudflare", database: false, regions: ["global"], readiness: "planned", accent: "oklch(0.78 0.17 70)", description: "Planned — Workers/D1 are not marked ready before live proof." },
  { id: "docker", name: "Docker", vendor: "OCI", database: false, regions: ["self-host"], readiness: "planned", accent: "oklch(0.74 0.15 240)", description: "Planned — no certified remote deployment adapter yet." },
  { id: "kubernetes", name: "Kubernetes", vendor: "CNCF", database: false, regions: ["cluster"], readiness: "planned", accent: "oklch(0.72 0.13 250)", description: "Planned — no certified cluster adapter yet." },
];

export function getTarget(id: string): DeployTarget | undefined {
  return DEPLOY_TARGETS.find((t) => t.id === id);
}

/** Canonical release pipeline. `database` is skipped when the certified adapter has no DB stage. */
export const DEPLOY_STAGES: DeployStage[] = [
  { id: "build", title: "Build", kind: "deployment", description: "Kompilo bundle-in e prodhimit dhe kontrollo tipet." },
  { id: "test", title: "Test", kind: "testing", description: "Unit + integration + E2E para publikimit." },
  { id: "database", title: "Database", kind: "database", description: "Apliko migrimet dhe verifiko RLS/grants." },
  { id: "deploy", title: "Deploy", kind: "deployment", description: "Publiko exact Git SHA me adapter-in real të provider-it." },
  { id: "healthcheck", title: "Health check", kind: "testing", description: "Verifiko URL-në që ktheu provider-i; mos gjenero URL lokalisht." },
];

export function stagesFor(withDatabase: boolean): DeployStage[] {
  return DEPLOY_STAGES.filter((s) => (s.id === "database" ? withDatabase : true));
}
