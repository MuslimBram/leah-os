// @ts-ignore -- bun's built-in test runner; types not installed in the project.
import { afterEach, describe, expect, it } from "bun:test";
import { commitGithubFiles, inspectGithubReleaseGate, readGithubRepo } from "./ssot.server";

const originalFetch = globalThis.fetch;
const originalToken = process.env["LEAH_GITHUB_TOKEN"];
const REQUIRED = ["Full Verification Gate"];

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalToken === undefined) delete process.env["LEAH_GITHUB_TOKEN"];
  else process.env["LEAH_GITHUB_TOKEN"] = originalToken;
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("GitHub SSoT server adapter", () => {
  it("reads the real default branch head with only a server credential", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "server-only-test-token";
    const seenAuth: string[] = [];
    globalThis.fetch = (async (input, init) => {
      seenAuth.push(new Headers(init?.headers).get("authorization") ?? "");
      const url = String(input);
      if (url.endsWith("/repos/acme/app")) {
        return jsonResponse({ name: "app", full_name: "acme/app", private: true, default_branch: "main", html_url: "https://github.com/acme/app" });
      }
      if (url.endsWith("/repos/acme/app/commits/main")) {
        return jsonResponse({ sha: "1111111111111111111111111111111111111111" });
      }
      return jsonResponse({ message: "not found" }, 404);
    }) as typeof fetch;

    const snapshot = await readGithubRepo("acme", "app");
    expect(snapshot.headSha).toBe("1111111111111111111111111111111111111111");
    expect(snapshot.defaultBranch).toBe("main");
    expect(seenAuth.every((value) => value === "Bearer server-only-test-token")).toBe(true);
  });

  it("refuses generated-file writes when the branch head moved", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "server-only-test-token";
    let blobWrites = 0;
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.includes("/git/ref/heads/task")) {
        return jsonResponse({ object: { sha: "2222222222222222222222222222222222222222" } });
      }
      if (url.endsWith("/git/blobs") && init?.method === "POST") blobWrites += 1;
      return jsonResponse({ message: "unexpected" }, 500);
    }) as typeof fetch;

    await expect(commitGithubFiles({
      owner: "acme",
      repo: "app",
      branch: "task",
      expectedHeadSha: "1111111111111111111111111111111111111111",
      message: "feat: generated",
      files: [{ path: "src/a.ts", content: "export const a = 1;" }],
    })).rejects.toThrow("GitHub head moved");
    expect(blobWrites).toBe(0);
  });

  it("requires an explicit named CI gate", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "server-only-test-token";
    const sha = "3333333333333333333333333333333333333333";
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.endsWith("/pulls/7")) {
        return jsonResponse({ number: 7, state: "open", draft: false, mergeable: true, head: { sha }, base: { sha: "4444444444444444444444444444444444444444" } });
      }
      if (url.includes(`/commits/${sha}/check-runs`)) return jsonResponse({ total_count: 0, check_runs: [] });
      if (url.endsWith(`/commits/${sha}/status`)) return jsonResponse({ state: "pending", statuses: [] });
      if (url.includes("/pulls/7/reviews")) return jsonResponse([]);
      return jsonResponse({ message: "not found" }, 404);
    }) as typeof fetch;

    const gate = await inspectGithubReleaseGate({ owner: "acme", repo: "app", pullNumber: 7, expectedHeadSha: sha, requiredChecks: REQUIRED });
    expect(gate.pass).toBe(false);
    expect(gate.reason).toContain("Required CI checks missing");
  });

  it("does not accept an unrelated Vercel check as CI proof", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "server-only-test-token";
    const sha = "5555555555555555555555555555555555555555";
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.endsWith("/pulls/8")) return jsonResponse({ number: 8, state: "open", draft: false, mergeable: true, head: { sha }, base: { sha: "6666666666666666666666666666666666666666" } });
      if (url.includes(`/commits/${sha}/check-runs`)) return jsonResponse({ total_count: 1, check_runs: [{ id: 1, name: "Vercel", status: "completed", conclusion: "success" }] });
      if (url.endsWith(`/commits/${sha}/status`)) return jsonResponse({ state: "success", statuses: [] });
      if (url.includes("/pulls/8/reviews")) return jsonResponse([]);
      return jsonResponse({ message: "not found" }, 404);
    }) as typeof fetch;

    const gate = await inspectGithubReleaseGate({ owner: "acme", repo: "app", pullNumber: 8, expectedHeadSha: sha, requiredChecks: REQUIRED });
    expect(gate.pass).toBe(false);
    expect(gate.reason).toContain("Full Verification Gate");
  });

  it("passes only when the named verification gate succeeds", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "server-only-test-token";
    const sha = "7777777777777777777777777777777777777777";
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.endsWith("/pulls/9")) return jsonResponse({ number: 9, state: "open", draft: false, mergeable: true, head: { sha }, base: { sha: "8888888888888888888888888888888888888888" } });
      if (url.includes(`/commits/${sha}/check-runs`)) return jsonResponse({ total_count: 1, check_runs: [{ id: 7, name: "Full Verification Gate", status: "completed", conclusion: "success" }] });
      if (url.endsWith(`/commits/${sha}/status`)) return jsonResponse({ state: "success", statuses: [] });
      if (url.includes("/pulls/9/reviews")) return jsonResponse([]);
      return jsonResponse({ message: "not found" }, 404);
    }) as typeof fetch;

    const gate = await inspectGithubReleaseGate({ owner: "acme", repo: "app", pullNumber: 9, expectedHeadSha: sha, requiredChecks: REQUIRED });
    expect(gate.pass).toBe(true);
    expect(gate.reason).toBe("PASS");
  });
});
