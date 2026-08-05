import type { DeployStage, DeployTarget } from "./types";

export const DEPLOY_TARGETS: DeployTarget[] = [
  { id: "vercel", name: "Vercel", vendor: "Vercel", database: false, regions: ["fra1", "iad1", "sfo1"], accent: "oklch(0.78 0.02 265)", description: "Edge hosting për Next/TanStack." },
  { id: "netlify", name: "Netlify", vendor: "Netlify", database: false, regions: ["eu-central", "us-east"], accent: "oklch(0.75 0.15 190)", description: "Static + functions." },
  { id: "railway", name: "Railway", vendor: "Railway", database: true, regions: ["eu-west", "us-west"], accent: "oklch(0.72 0.16 300)", description: "App + Postgres i menaxhuar." },
  { id: "flyio", name: "Fly.io", vendor: "Fly", database: true, regions: ["ams", "fra", "iad"], accent: "oklch(0.72 0.20 280)", description: "Makina globale + Fly Postgres." },
  { id: "render", name: "Render", vendor: "Render", database: true, regions: ["frankfurt", "oregon"], accent: "oklch(0.74 0.14 220)", description: "Web service + managed DB." },
  { id: "cloudflare", name: "Cloudflare", vendor: "Cloudflare", database: true, regions: ["global"], accent: "oklch(0.78 0.17 70)", description: "Workers + D1 database." },
  { id: "supabase", name: "Supabase", vendor: "Supabase", database: true, regions: ["eu-central-1", "us-east-1"], accent: "oklch(0.75 0.18 150)", description: "Postgres, auth, storage." },
  { id: "docker", name: "Docker", vendor: "OCI", database: true, regions: ["self-host"], accent: "oklch(0.74 0.15 240)", description: "Compose me app + db." },
  { id: "kubernetes", name: "Kubernetes", vendor: "CNCF", database: true, regions: ["cluster"], accent: "oklch(0.72 0.13 250)", description: "Helm chart + StatefulSet." },
];

export function getTarget(id: string): DeployTarget | undefined {
  return DEPLOY_TARGETS.find((t) => t.id === id);
}

/** Canonical release pipeline. `database` is skipped when the app has no DB. */
export const DEPLOY_STAGES: DeployStage[] = [
  { id: "build", title: "Build", kind: "deployment", description: "Kompilo bundle-in e prodhimit dhe kontrollo tipet." },
  { id: "test", title: "Test", kind: "testing", description: "Unit + integration + E2E para publikimit." },
  { id: "database", title: "Database", kind: "database", description: "Apliko migrimet dhe verifiko RLS/grants." },
  { id: "deploy", title: "Deploy", kind: "deployment", description: "Publiko artefaktin te targeti i zgjedhur." },
  { id: "healthcheck", title: "Health check", kind: "testing", description: "Smoke test i URL-së live dhe monitorim fillestar." },
];

export function stagesFor(withDatabase: boolean): DeployStage[] {
  return DEPLOY_STAGES.filter((s) => (s.id === "database" ? withDatabase : true));
}

export function previewUrl(projectName: string, targetId: string, env: string): string {
  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
  const suffix = env === "production" ? "" : `-${env}`;
  return `https://${slug}${suffix}.${targetId}.app`;
}