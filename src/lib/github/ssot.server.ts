import type {
  GithubCommitProvenance,
  GithubCommitResult,
  GithubGeneratedFile,
  GithubMergeResult,
  GithubPullRequestResult,
  GithubReleaseGate,
  GithubRepoSnapshot,
} from "./types";

const GITHUB_API = "https://api.github.com";
const ACCEPTED_CHECK_CONCLUSIONS = new Set(["success", "neutral", "skipped"]);
const NAME_RE = /^[A-Za-z0-9_.-]{1,100}$/;
const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,199}$/;
const SHA_RE = /^[0-9a-f]{40}$/i;

function credential(): string {
  const token = process.env["LEAH_GITHUB_TOKEN"]?.trim();
  if (!token) throw new Error("LEAH GitHub server credential is not configured");
  return token;
}

function assertName(value: string, label: string): string {
  const trimmed = value.trim();
  if (!NAME_RE.test(trimmed)) throw new Error(`Invalid GitHub ${label}`);
  return trimmed;
}

function assertBranch(value: string): string {
  const trimmed = value.trim();
  if (!BRANCH_RE.test(trimmed) || trimmed.includes("..") || trimmed.endsWith(".") || trimmed.endsWith("/")) {
    throw new Error("Invalid GitHub branch name");
  }
  return trimmed;
}

function assertSha(value: string, label = "SHA"): string {
  const trimmed = value.trim();
  if (!SHA_RE.test(trimmed)) throw new Error(`Invalid GitHub ${label}`);
  return trimmed.toLowerCase();
}

function repoPath(owner: string, repo: string): string {
  return `/repos/${encodeURIComponent(assertName(owner, "owner"))}/${encodeURIComponent(assertName(repo, "repo"))}`;
}

async function github<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${credential()}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "LEAH-AI-OS",
      ...(init.headers ?? {}),
    },
  });

  const text = await response.text();
  const payload = text ? safeJson(text) : null;
  if (!response.ok) {
    const apiMessage = payload && typeof payload === "object" && "message" in payload
      ? String((payload as { message?: unknown }).message ?? "")
      : "";
    throw new Error(`GitHub API ${response.status}${apiMessage ? `: ${apiMessage}` : ""}`);
  }
  return payload as T;
}

function safeJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return value; }
}

export async function readGithubRepo(owner: string, repo: string): Promise<GithubRepoSnapshot> {
  const base = repoPath(owner, repo);
  const metadata = await github<{
    name: string;
    full_name: string;
    private: boolean;
    default_branch: string;
    html_url: string;
  }>(base);
  const commit = await github<{ sha: string }>(`${base}/commits/${encodeURIComponent(metadata.default_branch)}`);
  return {
    owner: metadata.full_name.split("/")[0] || owner,
    repo: metadata.name,
    private: metadata.private,
    defaultBranch: metadata.default_branch,
    headSha: assertSha(commit.sha),
    htmlUrl: metadata.html_url,
  };
}

export async function createGithubTaskBranch(input: {
  owner: string;
  repo: string;
  branch: string;
  baseSha: string;
}): Promise<{ branch: string; headSha: string }> {
  const base = repoPath(input.owner, input.repo);
  const branch = assertBranch(input.branch);
  const baseSha = assertSha(input.baseSha, "base SHA");

  const commit = await github<{ sha: string }>(`${base}/commits/${baseSha}`);
  if (assertSha(commit.sha) !== baseSha) throw new Error("GitHub base SHA could not be verified");

  await github(`${base}/git/refs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });
  return { branch, headSha: baseSha };
}

function normalizeFiles(files: GithubGeneratedFile[]): GithubGeneratedFile[] {
  if (!Array.isArray(files) || files.length < 1 || files.length > 100) {
    throw new Error("GitHub commit requires 1-100 files");
  }
  const seen = new Set<string>();
  return files.map((file) => {
    const path = file.path.trim().replace(/^\/+/, "");
    if (!path || path.length > 500 || path.includes("..") || path.includes("\\")) {
      throw new Error("Invalid generated file path");
    }
    if (seen.has(path)) throw new Error(`Duplicate generated file path: ${path}`);
    seen.add(path);
    if (typeof file.content !== "string" || file.content.length > 1_000_000) {
      throw new Error(`Generated file exceeds 1 MB: ${path}`);
    }
    return { path, content: file.content };
  });
}

function commitMessage(message: string, provenance: GithubCommitProvenance | undefined): string {
  const clean = message.trim();
  if (!clean || clean.length > 500) throw new Error("Invalid GitHub commit message");
  const trailers = [
    provenance?.executionId ? `LEAH-Execution: ${provenance.executionId}` : null,
    provenance?.taskId ? `LEAH-Task: ${provenance.taskId}` : null,
    provenance?.provider ? `LEAH-Provider: ${provenance.provider}` : null,
    provenance?.model ? `LEAH-Model: ${provenance.model}` : null,
  ].filter(Boolean);
  return trailers.length ? `${clean}\n\n${trailers.join("\n")}` : clean;
}

export async function commitGithubFiles(input: {
  owner: string;
  repo: string;
  branch: string;
  expectedHeadSha: string;
  message: string;
  files: GithubGeneratedFile[];
  provenance?: GithubCommitProvenance;
}): Promise<GithubCommitResult> {
  const base = repoPath(input.owner, input.repo);
  const branch = assertBranch(input.branch);
  const expectedHeadSha = assertSha(input.expectedHeadSha, "expected head SHA");
  const files = normalizeFiles(input.files);

  const ref = await github<{ object: { sha: string } }>(`${base}/git/ref/heads/${encodeURIComponent(branch)}`);
  const currentHead = assertSha(ref.object.sha);
  if (currentHead !== expectedHeadSha) {
    throw new Error(`GitHub head moved: expected ${expectedHeadSha}, got ${currentHead}`);
  }

  const parent = await github<{ tree: { sha: string } }>(`${base}/git/commits/${expectedHeadSha}`);
  const treeEntries: Array<{ path: string; mode: "100644"; type: "blob"; sha: string }> = [];
  for (const file of files) {
    const blob = await github<{ sha: string }>(`${base}/git/blobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: file.content, encoding: "utf-8" }),
    });
    treeEntries.push({ path: file.path, mode: "100644", type: "blob", sha: blob.sha });
  }

  const tree = await github<{ sha: string }>(`${base}/git/trees`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base_tree: parent.tree.sha, tree: treeEntries }),
  });
  const created = await github<{ sha: string; html_url: string }>(`${base}/git/commits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: commitMessage(input.message, input.provenance),
      tree: tree.sha,
      parents: [expectedHeadSha],
    }),
  });

  await github(`${base}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: created.sha, force: false }),
  });
  return {
    branch,
    previousHeadSha: expectedHeadSha,
    commitSha: assertSha(created.sha),
    treeSha: tree.sha,
    htmlUrl: created.html_url,
  };
}

export async function openGithubPullRequest(input: {
  owner: string;
  repo: string;
  headBranch: string;
  expectedHeadSha: string;
  baseBranch: string;
  title: string;
  body?: string;
  draft?: boolean;
}): Promise<GithubPullRequestResult> {
  const base = repoPath(input.owner, input.repo);
  const headBranch = assertBranch(input.headBranch);
  const baseBranch = assertBranch(input.baseBranch);
  const expectedHeadSha = assertSha(input.expectedHeadSha, "expected head SHA");
  const ref = await github<{ object: { sha: string } }>(`${base}/git/ref/heads/${encodeURIComponent(headBranch)}`);
  if (assertSha(ref.object.sha) !== expectedHeadSha) throw new Error("GitHub head moved before PR creation");

  const pr = await github<{
    number: number;
    html_url: string;
    draft: boolean;
    head: { sha: string };
    base: { ref: string };
  }>(`${base}/pulls`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: input.title.trim().slice(0, 256),
      body: input.body?.slice(0, 20_000) ?? "",
      head: headBranch,
      base: baseBranch,
      draft: input.draft ?? true,
    }),
  });
  if (assertSha(pr.head.sha) !== expectedHeadSha) throw new Error("GitHub PR head mismatch after creation");
  return { number: pr.number, htmlUrl: pr.html_url, headSha: pr.head.sha, baseBranch: pr.base.ref, draft: pr.draft };
}

export async function inspectGithubReleaseGate(input: {
  owner: string;
  repo: string;
  pullNumber: number;
  expectedHeadSha: string;
  requireApproval?: boolean;
}): Promise<GithubReleaseGate> {
  const base = repoPath(input.owner, input.repo);
  if (!Number.isInteger(input.pullNumber) || input.pullNumber < 1) throw new Error("Invalid GitHub pull request number");
  const expectedHeadSha = assertSha(input.expectedHeadSha, "expected head SHA");
  const pr = await github<{
    number: number;
    state: string;
    draft: boolean;
    mergeable: boolean | null;
    head: { sha: string };
    base: { sha: string };
  }>(`${base}/pulls/${input.pullNumber}`);
  const actualHead = assertSha(pr.head.sha);

  const checks = await github<{
    total_count: number;
    check_runs: Array<{ name: string; status: string; conclusion: string | null }>;
  }>(`${base}/commits/${expectedHeadSha}/check-runs?per_page=100`);
  const statuses = await github<{
    state: string;
    statuses: Array<{ context: string; state: string }>;
  }>(`${base}/commits/${expectedHeadSha}/status`);
  const reviews = await github<Array<{ user?: { login?: string }; state: string }>>(`${base}/pulls/${input.pullNumber}/reviews?per_page=100`);

  const failedChecks = checks.check_runs
    .filter((run) => run.status !== "completed" || !run.conclusion || !ACCEPTED_CHECK_CONCLUSIONS.has(run.conclusion))
    .map((run) => `${run.name}:${run.status}/${run.conclusion ?? "none"}`);
  const pending = checks.check_runs.filter((run) => run.status !== "completed").length;
  const passedChecks = checks.check_runs
    .filter((run) => run.status === "completed" && !!run.conclusion && ACCEPTED_CHECK_CONCLUSIONS.has(run.conclusion))
    .map((run) => run.name);
  const failedStatuses = statuses.statuses.filter((s) => s.state !== "success").map((s) => `${s.context}:${s.state}`);

  const latestReviewState = new Map<string, string>();
  for (const review of reviews) {
    const login = review.user?.login;
    if (login) latestReviewState.set(login, review.state);
  }
  const approvals = Array.from(latestReviewState.values()).filter((state) => state === "APPROVED").length;

  let reason = "PASS";
  if (actualHead !== expectedHeadSha) reason = "PR head moved";
  else if (pr.state !== "open") reason = "PR is not open";
  else if (pr.draft) reason = "PR is draft";
  else if (checks.total_count < 1) reason = "No real CI check runs found";
  else if (failedChecks.length > 0 || pending > 0) reason = "CI checks are not fully successful";
  else if (statuses.statuses.length > 0 && (statuses.state !== "success" || failedStatuses.length > 0)) reason = "Commit statuses are not fully successful";
  else if (input.requireApproval && approvals < 1) reason = "Required approval missing";

  return {
    pass: reason === "PASS",
    reason,
    pullRequest: {
      number: pr.number,
      state: pr.state,
      draft: pr.draft,
      headSha: actualHead,
      baseSha: assertSha(pr.base.sha),
      mergeable: pr.mergeable,
    },
    checks: { total: checks.total_count, pending, failed: failedChecks, passed: passedChecks },
    statuses: { total: statuses.statuses.length, state: statuses.state, failed: failedStatuses },
    approvals,
  };
}

export async function mergeGithubPullRequest(input: {
  owner: string;
  repo: string;
  pullNumber: number;
  expectedHeadSha: string;
  requireApproval?: boolean;
  method?: "merge" | "squash" | "rebase";
}): Promise<GithubMergeResult> {
  const gate = await inspectGithubReleaseGate(input);
  if (!gate.pass) throw new Error(`GitHub release gate blocked merge: ${gate.reason}`);
  const base = repoPath(input.owner, input.repo);
  const merged = await github<{ merged: boolean; sha: string | null; message: string }>(`${base}/pulls/${input.pullNumber}/merge`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sha: assertSha(input.expectedHeadSha), merge_method: input.method ?? "squash" }),
  });
  if (!merged.merged || !merged.sha) throw new Error(`GitHub merge failed: ${merged.message}`);
  return { merged: true, sha: assertSha(merged.sha), message: merged.message };
}
