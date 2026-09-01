// @ts-ignore -- bun's built-in test runner; types not installed in the project.
import { afterEach, describe, expect, it } from "bun:test";
import { deployExactGithubShaToVercel } from "./vercel.server";

const originalFetch = globalThis.fetch;
const githubToken = process.env["LEAH_GITHUB_TOKEN"];
const vercelToken = process.env["LEAH_VERCEL_TOKEN"];

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (githubToken === undefined) delete process.env["LEAH_GITHUB_TOKEN"]; else process.env["LEAH_GITHUB_TOKEN"] = githubToken;
  if (vercelToken === undefined) delete process.env["LEAH_VERCEL_TOKEN"]; else process.env["LEAH_VERCEL_TOKEN"] = vercelToken;
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("Vercel exact Git SHA adapter", () => {
  it("does not call Vercel if the GitHub branch already moved", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "gh-test";
    process.env["LEAH_VERCEL_TOKEN"] = "vc-test";
    let vercelCalls = 0;
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.startsWith("https://api.github.com/")) {
        return json({ object: { sha: "2222222222222222222222222222222222222222" } });
      }
      if (url.startsWith("https://api.vercel.com/")) vercelCalls += 1;
      return json({});
    }) as typeof fetch;

    await expect(deployExactGithubShaToVercel({
      project: "app",
      githubOwner: "acme",
      githubRepo: "app",
      branch: "task",
      expectedSha: "1111111111111111111111111111111111111111",
    })).rejects.toThrow("GitHub head moved before deploy");
    expect(vercelCalls).toBe(0);
  });

  it("accepts only a READY provider result that reports the exact Git SHA and passes health", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "gh-test";
    process.env["LEAH_VERCEL_TOKEN"] = "vc-test";
    const sha = "3333333333333333333333333333333333333333";
    let githubReads = 0;
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.startsWith("https://api.github.com/")) {
        githubReads += 1;
        return json({ object: { sha } });
      }
      if (url.startsWith("https://api.vercel.com/v13/deployments") && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { gitSource?: { ref?: string }; gitMetadata?: { commitSha?: string } };
        expect(body.gitSource?.ref).toBe("task");
        expect(body.gitMetadata?.commitSha).toBe(sha);
        return json({ id: "dpl_real" });
      }
      if (url.startsWith("https://api.vercel.com/v13/deployments/dpl_real")) {
        return json({ id: "dpl_real", url: "app-real.vercel.app", readyState: "READY", meta: { githubCommitSha: sha } });
      }
      if (url === "https://app-real.vercel.app/health") return new Response("ok", { status: 200 });
      return json({ message: "unexpected" }, 404);
    }) as typeof fetch;

    const result = await deployExactGithubShaToVercel({
      project: "app",
      githubOwner: "acme",
      githubRepo: "app",
      branch: "task",
      expectedSha: sha,
      healthPath: "/health",
    });
    expect(result.deploymentId).toBe("dpl_real");
    expect(result.sourceSha).toBe(sha);
    expect(result.url).toBe("https://app-real.vercel.app");
    expect(result.healthStatus).toBe(200);
    expect(githubReads).toBe(2);
  });

  it("rejects a READY deployment whose provider Git SHA is different", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "gh-test";
    process.env["LEAH_VERCEL_TOKEN"] = "vc-test";
    const expected = "4444444444444444444444444444444444444444";
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.startsWith("https://api.github.com/")) return json({ object: { sha: expected } });
      if (url.startsWith("https://api.vercel.com/v13/deployments") && init?.method === "POST") return json({ id: "dpl_wrong" });
      if (url.startsWith("https://api.vercel.com/v13/deployments/dpl_wrong")) {
        return json({ id: "dpl_wrong", url: "wrong.vercel.app", readyState: "READY", meta: { githubCommitSha: "5555555555555555555555555555555555555555" } });
      }
      return json({});
    }) as typeof fetch;

    await expect(deployExactGithubShaToVercel({
      project: "app",
      githubOwner: "acme",
      githubRepo: "app",
      branch: "task",
      expectedSha: expected,
    })).rejects.toThrow("Vercel deployed the wrong Git SHA");
  });
});
