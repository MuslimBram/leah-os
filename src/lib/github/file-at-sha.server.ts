const SHA_RE = /^[0-9a-f]{40}$/i;
const NAME_RE = /^[A-Za-z0-9_.-]{1,100}$/;

function token(): string {
  const value = process.env["LEAH_GITHUB_TOKEN"]?.trim();
  if (!value) throw new Error("LEAH GitHub server credential is not configured");
  return value;
}

function safeName(value: string, label: string): string {
  const clean = value.trim();
  if (!NAME_RE.test(clean)) throw new Error(`Invalid GitHub ${label}`);
  return clean;
}

export async function readGithubTextFileAtSha(input: {
  owner: string;
  repo: string;
  sha: string;
  path: string;
  maxBytes?: number;
}): Promise<{ path: string; sha: string; content: string; blobSha: string }> {
  const owner = safeName(input.owner, "owner");
  const repo = safeName(input.repo, "repo");
  const sha = input.sha.trim().toLowerCase();
  if (!SHA_RE.test(sha)) throw new Error("Invalid GitHub commit SHA");
  const path = input.path.trim().replace(/^\/+/, "");
  if (!path || path.includes("..") || path.includes("\\") || path.length > 500) throw new Error("Invalid GitHub file path");

  const response = await fetch(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${sha}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token()}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "LEAH-AI-OS",
      },
    },
  );
  const payload = await response.json().catch(() => null) as {
    type?: string;
    encoding?: string;
    content?: string;
    sha?: string;
    size?: number;
    message?: string;
  } | null;
  if (!response.ok) throw new Error(`GitHub API ${response.status}${payload?.message ? `: ${payload.message}` : ""}`);
  if (!payload || payload.type !== "file" || payload.encoding !== "base64" || typeof payload.content !== "string") {
    throw new Error("GitHub did not return a text file payload");
  }
  const maxBytes = Math.min(Math.max(input.maxBytes ?? 1_000_000, 1), 2_000_000);
  if ((payload.size ?? 0) > maxBytes) throw new Error("GitHub deployment file exceeds size limit");
  const bytes = Uint8Array.from(atob(payload.content.replace(/\n/g, "")), (char) => char.charCodeAt(0));
  if (bytes.byteLength > maxBytes) throw new Error("GitHub deployment file exceeds size limit");
  const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  return { path, sha, content, blobSha: payload.sha ?? "" };
}
