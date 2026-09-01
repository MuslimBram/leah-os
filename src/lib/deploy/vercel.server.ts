import { readGithubBranchHead } from "../github/head.server";

const SHA_RE = /^[0-9a-f]{40}$/i;
const TERMINAL_FAILURES = new Set(["ERROR", "CANCELED", "CANCELLED"]);

type VercelDeployment = {
  id: string;
  url?: string | null;
  readyState?: string | null;
  status?: string | null;
  meta?: Record<string, unknown> | null;
  gitSource?: { sha?: string | null; ref?: string | null } | null;
};

export type VercelDeployInput = {
  project: string;
  githubOwner: string;
  githubRepo: string;
  branch: string;
  expectedSha: string;
  target?: "preview" | "production";
  teamId?: string;
  healthPath?: string;
  timeoutMs?: number;
};

export type VercelDeployResult = {
  provider: "vercel";
  deploymentId: string;
  url: string;
  sourceSha: string;
  readyState: string;
  healthStatus: number;
  healthCheckedAt: number;
};

function token(): string {
  const value = process.env["LEAH_VERCEL_TOKEN"]?.trim();
  if (!value) throw new Error("LEAH Vercel server credential is not configured");
  return value;
}

function expectedSha(value: string): string {
  const clean = value.trim().toLowerCase();
  if (!SHA_RE.test(clean)) throw new Error("Invalid expected Git SHA");
  return clean;
}

function query(teamId?: string): string {
  const team = teamId?.trim() || process.env["LEAH_VERCEL_TEAM_ID"]?.trim();
  return team ? `?teamId=${encodeURIComponent(team)}` : "";
}

async function vercel<T>(path: string, init: RequestInit, teamId?: string): Promise<T> {
  const response = await fetch(`https://api.vercel.com${path}${query(teamId)}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token()}`,
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const message = payload && typeof payload === "object" && "error" in payload
      ? JSON.stringify((payload as { error?: unknown }).error).slice(0, 300)
      : `HTTP ${response.status}`;
    throw new Error(`Vercel API failed: ${message}`);
  }
  return payload as T;
}

function deploymentSha(deployment: VercelDeployment): string | null {
  const meta = deployment.meta ?? {};
  const candidates = [
    deployment.gitSource?.sha,
    typeof meta.githubCommitSha === "string" ? meta.githubCommitSha : null,
    typeof meta.gitCommitSha === "string" ? meta.gitCommitSha : null,
  ];
  const value = candidates.find((candidate) => typeof candidate === "string" && SHA_RE.test(candidate));
  return value ? value.toLowerCase() : null;
}

function readyState(deployment: VercelDeployment): string {
  return String(deployment.readyState ?? deployment.status ?? "UNKNOWN").toUpperCase();
}

function safeHealthPath(value?: string): string {
  const path = value?.trim() || "/";
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    throw new Error("Invalid Vercel health path");
  }
  return path;
}

async function waitForDeployment(id: string, teamId: string | undefined, timeoutMs: number): Promise<VercelDeployment> {
  const deadline = Date.now() + timeoutMs;
  let latest: VercelDeployment | null = null;
  while (Date.now() < deadline) {
    latest = await vercel<VercelDeployment>(`/v13/deployments/${encodeURIComponent(id)}`, { method: "GET" }, teamId);
    const state = readyState(latest);
    if (state === "READY") return latest;
    if (TERMINAL_FAILURES.has(state)) throw new Error(`Vercel deployment ended in ${state}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Vercel deployment timed out${latest ? ` at ${readyState(latest)}` : ""}`);
}

export async function deployExactGithubShaToVercel(input: VercelDeployInput): Promise<VercelDeployResult> {
  const sha = expectedSha(input.expectedSha);
  const before = await readGithubBranchHead(input.githubOwner, input.githubRepo, input.branch);
  if (before !== sha) throw new Error(`GitHub head moved before deploy: expected ${sha}, got ${before}`);

  const project = input.project.trim();
  if (!project || project.length > 100) throw new Error("Invalid Vercel project");
  const target = input.target ?? "preview";
  const create = await vercel<VercelDeployment>("/v13/deployments", {
    method: "POST",
    body: JSON.stringify({
      name: project,
      project,
      ...(target === "production" ? { target: "production" } : {}),
      gitSource: {
        type: "github",
        org: input.githubOwner,
        repo: input.githubRepo,
        ref: input.branch,
      },
      gitMetadata: {
        remoteUrl: `https://github.com/${input.githubOwner}/${input.githubRepo}`,
        commitRef: input.branch,
        commitSha: sha,
        dirty: "false",
        ci: "false",
      },
    }),
  }, input.teamId);
  if (!create.id) throw new Error("Vercel did not return a deployment id");

  const detail = await waitForDeployment(create.id, input.teamId, Math.min(Math.max(input.timeoutMs ?? 180_000, 10_000), 600_000));
  const actualSha = deploymentSha(detail);
  if (!actualSha) throw new Error("Vercel READY deployment did not expose a verifiable Git SHA");
  if (actualSha !== sha) throw new Error(`Vercel deployed the wrong Git SHA: expected ${sha}, got ${actualSha}`);

  const after = await readGithubBranchHead(input.githubOwner, input.githubRepo, input.branch);
  if (after !== sha) throw new Error(`GitHub head moved during deploy: expected ${sha}, got ${after}`);

  const host = detail.url?.trim();
  if (!host) throw new Error("Vercel READY deployment did not return a URL");
  const url = host.startsWith("http://") || host.startsWith("https://") ? host : `https://${host}`;
  const healthUrl = new URL(safeHealthPath(input.healthPath), url).toString();
  const health = await fetch(healthUrl, { method: "GET", redirect: "follow", headers: { "User-Agent": "LEAH-AI-OS-Health" } });
  if (health.status < 200 || health.status >= 400) {
    throw new Error(`Vercel health check failed with HTTP ${health.status}`);
  }

  return {
    provider: "vercel",
    deploymentId: detail.id,
    url,
    sourceSha: actualSha,
    readyState: readyState(detail),
    healthStatus: health.status,
    healthCheckedAt: Date.now(),
  };
}
