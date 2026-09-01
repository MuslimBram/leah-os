import type { GithubGeneratedFile } from "../github/types";

const PROTECTED_PATHS = [
  /^\.git(?:\/|$)/i,
  /^\.github\/workflows(?:\/|$)/i,
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)(credentials|secrets?)(?:\.|\/|$)/i,
  /(^|\/)(id_rsa|id_ed25519)(?:\.|$)/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.pypirc$/i,
  /(^|\/)\.netrc$/i,
];

function normalizePath(raw: string): string {
  const path = raw.trim().replace(/^`|`$/g, "").replace(/^\/+/, "");
  if (!path || path.length > 500 || path.includes("..") || path.includes("\\") || /[\u0000-\u001f]/.test(path)) {
    throw new Error(`Invalid generated file path: ${raw.slice(0, 120)}`);
  }
  if (PROTECTED_PATHS.some((rule) => rule.test(path))) {
    throw new Error(`Autonomous generation cannot modify protected path: ${path}`);
  }
  return path;
}

/**
 * Parses the canonical LEAH response format:
 * **path/to/file.ts**
 * ```ts
 * ...
 * ```
 *
 * No fuzzy filename invention is allowed. If the model does not produce explicit
 * path+code pairs, the generation fails instead of committing ambiguous text.
 */
export function extractGeneratedFiles(text: string): GithubGeneratedFile[] {
  if (!text.trim()) throw new Error("Generated response is empty");
  const files: GithubGeneratedFile[] = [];
  const seen = new Set<string>();
  const pattern = /(?:^|\n)\s*(?:\*\*)?([^\n*`]+?)(?:\*\*)?\s*\n```[^\n]*\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const path = normalizePath(match[1] ?? "");
    const content = match[2] ?? "";
    if (!content.trim()) throw new Error(`Generated file is empty: ${path}`);
    if (new TextEncoder().encode(content).byteLength > 1_000_000) throw new Error(`Generated file exceeds 1 MB: ${path}`);
    if (seen.has(path)) throw new Error(`Generated response contains duplicate path: ${path}`);
    seen.add(path);
    files.push({ path, content });
    if (files.length > 25) throw new Error("Generated response exceeds 25 files");
  }
  if (files.length < 1) throw new Error("Generated response did not contain canonical path + code blocks");
  return files;
}
