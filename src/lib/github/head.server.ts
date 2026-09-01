const SHA_RE = /^[0-9a-f]{40}$/i;
const NAME_RE = /^[A-Za-z0-9_.-]{1,100}$/;
const BRANCH_RE = /^[A-Za-z0-9][A-Za-z0-9._\/-]{0,199}$/;

function serverToken(): string {
  const token = process.env["LEAH_GITHUB_TOKEN"]?.trim();
  if (!token) throw new Error("LEAH GitHub server credential is not configured");
  return token;
}

function checked(value: string, re: RegExp, label: string): string {
  const trimmed = value.trim();
  if (!re.test(trimmed)) throw new Error(`Invalid GitHub ${label}`);
  return trimmed;
}

export async function readGithubBranchHead(owner: string, repo: string, branch: string): Promise<string> {
  const o = checked(owner, NAME_RE, "owner");
  const r = checked(repo, NAME_RE, "repo");
  const b = checked(branch, BRANCH_RE, "branch");
  if (b.includes("..") || b.endsWith(".") || b.endsWith("/")) throw new Error("Invalid GitHub branch");

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(o)}/${encodeURIComponent(r)}/git/ref/heads/${encodeURIComponent(b)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${serverToken()}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "LEAH-AI-OS",
      },
    },
  );
  const payload = await response.json().catch(() => null) as { object?: { sha?: string }; message?: string } | null;
  if (!response.ok) throw new Error(`GitHub API ${response.status}${payload?.message ? `: ${payload.message}` : ""}`);
  const sha = payload?.object?.sha?.trim() ?? "";
  if (!SHA_RE.test(sha)) throw new Error("GitHub branch head did not return a valid SHA");
  return sha.toLowerCase();
}
