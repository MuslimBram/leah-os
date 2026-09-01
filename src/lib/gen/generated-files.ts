import type { GithubGeneratedFile } from "../github/types";

const MAX_FILE_BYTES = 1_000_000;
const MAX_TOTAL_BYTES = 5_000_000;
const MAX_FILES = 25;

const PROTECTED_PATHS = [
  /^\.git(?:\/|$)/i,
  /^\.github(?:\/|$)/i,
  /(^|\/)\.env(?:\.|$)/i,
  /(^|\/)(credentials|secrets?)(?:\.|\/|$)/i,
  /(^|\/)(id_rsa|id_ed25519)(?:\.|$)/i,
  /(^|\/)\.npmrc$/i,
  /(^|\/)\.pypirc$/i,
  /(^|\/)\.netrc$/i,
];

export function normalizeGeneratedPath(raw: string): string {
  const path = raw.trim().normalize("NFC");
  const segments = path.split("/");
  if (
    !path ||
    path.length > 500 ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("\\") ||
    /[\u0000-\u001f\u007f]/.test(path) ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Invalid generated file path: ${raw.slice(0, 120)}`);
  }
  if (PROTECTED_PATHS.some((rule) => rule.test(path))) {
    throw new Error(`Autonomous generation cannot modify protected path: ${path}`);
  }
  return path;
}

/**
 * Parses only the canonical LEAH response format:
 * **path/to/file.ts**
 * ```ts
 * ...
 * ```
 *
 * The bold path marker is mandatory. Prose headings or bare filenames are never
 * interpreted as repository paths. Ambiguous output fails instead of being guessed.
 */
export function extractGeneratedFiles(text: string): GithubGeneratedFile[] {
  if (!text.trim()) throw new Error("Generated response is empty");
  const files: GithubGeneratedFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;
  const pattern = /^[ \t]*\*\*([^*\r\n]+)\*\*[ \t]*\r?\n```[^\r\n`]*\r?\n([\s\S]*?)^```[ \t]*(?:\r?\n|$)/gm;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const path = normalizeGeneratedPath(match[1] ?? "");
    const content = match[2] ?? "";
    if (!content.trim()) throw new Error(`Generated file is empty: ${path}`);
    const bytes = new TextEncoder().encode(content).byteLength;
    if (bytes > MAX_FILE_BYTES) throw new Error(`Generated file exceeds 1 MB: ${path}`);
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) throw new Error("Generated response exceeds 5 MB total");
    if (seen.has(path)) throw new Error(`Generated response contains duplicate path: ${path}`);
    seen.add(path);
    files.push({ path, content });
    if (files.length > MAX_FILES) throw new Error(`Generated response exceeds ${MAX_FILES} files`);
  }
  if (files.length < 1) throw new Error("Generated response did not contain canonical path + code blocks");
  return files;
}
