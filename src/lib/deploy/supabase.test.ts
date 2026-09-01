// @ts-ignore -- bun's built-in test runner; types not installed in the project.
import { afterEach, describe, expect, it } from "bun:test";
import { applyGithubMigrationToSupabase } from "./supabase.server";

const originalFetch = globalThis.fetch;
const saved = {
  github: process.env["LEAH_GITHUB_TOKEN"],
  supabase: process.env["LEAH_SUPABASE_ACCESS_TOKEN"],
  policy: process.env["LEAH_SUPABASE_PROJECT_POLICY"],
  prod: process.env["LEAH_SUPABASE_ALLOW_PRODUCTION_DEPLOY"],
};

function restore(name: keyof typeof saved, env: string) {
  const value = saved[name];
  if (value === undefined) delete process.env[env]; else process.env[env] = value;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  restore("github", "LEAH_GITHUB_TOKEN");
  restore("supabase", "LEAH_SUPABASE_ACCESS_TOKEN");
  restore("policy", "LEAH_SUPABASE_PROJECT_POLICY");
  restore("prod", "LEAH_SUPABASE_ALLOW_PRODUCTION_DEPLOY");
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function githubFile(sql: string) {
  return { type: "file", encoding: "base64", content: btoa(sql), size: new TextEncoder().encode(sql).byteLength, sha: "blobsha" };
}

const ref = "abcdefghijklmnopqrst";
const sha = "1111111111111111111111111111111111111111";
const path = "supabase/migrations/20260901180000_create_demo.sql";

describe("Supabase GitHub migration adapter", () => {
  it("rejects a project ref that is not in the server allowlist before any network call", async () => {
    process.env["LEAH_SUPABASE_PROJECT_POLICY"] = JSON.stringify({ zzzzzzzzzzzzzzzzzzzz: "preview" });
    let calls = 0;
    globalThis.fetch = (async () => { calls += 1; return json({}); }) as typeof fetch;
    await expect(applyGithubMigrationToSupabase({ projectRef: ref, githubOwner: "acme", githubRepo: "app", commitSha: sha, migrationPath: path }))
      .rejects.toThrow("not allowed by server policy");
    expect(calls).toBe(0);
  });

  it("blocks production when the server production switch is disabled", async () => {
    process.env["LEAH_SUPABASE_PROJECT_POLICY"] = JSON.stringify({ [ref]: "production" });
    delete process.env["LEAH_SUPABASE_ALLOW_PRODUCTION_DEPLOY"];
    let calls = 0;
    globalThis.fetch = (async () => { calls += 1; return json({}); }) as typeof fetch;
    await expect(applyGithubMigrationToSupabase({ projectRef: ref, githubOwner: "acme", githubRepo: "app", commitSha: sha, migrationPath: path }))
      .rejects.toThrow("production migration is disabled");
    expect(calls).toBe(0);
  });

  it("requires production commit SHA to equal the current GitHub default branch HEAD", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "gh-test";
    process.env["LEAH_SUPABASE_PROJECT_POLICY"] = JSON.stringify({ [ref]: "production" });
    process.env["LEAH_SUPABASE_ALLOW_PRODUCTION_DEPLOY"] = "true";
    let supabaseCalls = 0;
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.endsWith("/repos/acme/app")) return json({ name: "app", full_name: "acme/app", private: true, default_branch: "main", html_url: "https://github.com/acme/app" });
      if (url.endsWith("/repos/acme/app/commits/main")) return json({ sha: "2222222222222222222222222222222222222222" });
      if (url.startsWith("https://api.supabase.com/")) supabaseCalls += 1;
      return json({});
    }) as typeof fetch;
    await expect(applyGithubMigrationToSupabase({ projectRef: ref, githubOwner: "acme", githubRepo: "app", commitSha: sha, migrationPath: path }))
      .rejects.toThrow("Production migration commit is not current main HEAD");
    expect(supabaseCalls).toBe(0);
  });

  it("blocks destructive migration text unless explicitly approved", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "gh-test";
    process.env["LEAH_SUPABASE_PROJECT_POLICY"] = JSON.stringify({ [ref]: "preview" });
    let supabaseCalls = 0;
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.startsWith("https://api.github.com/")) return json(githubFile("drop table public.customers;"));
      if (url.startsWith("https://api.supabase.com/")) supabaseCalls += 1;
      return json({});
    }) as typeof fetch;
    await expect(applyGithubMigrationToSupabase({ projectRef: ref, githubOwner: "acme", githubRepo: "app", commitSha: sha, migrationPath: path }))
      .rejects.toThrow("Destructive migration requires explicit approval");
    expect(supabaseCalls).toBe(0);
  });

  it("blocks migration transaction escape before any Supabase write", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "gh-test";
    process.env["LEAH_SUPABASE_PROJECT_POLICY"] = JSON.stringify({ [ref]: "preview" });
    let supabaseCalls = 0;
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.startsWith("https://api.github.com/")) return json(githubFile("create table public.a(id int); commit; create table public.b(id int);"));
      if (url.startsWith("https://api.supabase.com/")) supabaseCalls += 1;
      return json({});
    }) as typeof fetch;
    await expect(applyGithubMigrationToSupabase({ projectRef: ref, githubOwner: "acme", githubRepo: "app", commitSha: sha, migrationPath: path }))
      .rejects.toThrow("cannot control or escape");
    expect(supabaseCalls).toBe(0);
  });

  it("blocks attempts to disable the wrapper timeout", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "gh-test";
    process.env["LEAH_SUPABASE_PROJECT_POLICY"] = JSON.stringify({ [ref]: "preview" });
    globalThis.fetch = (async (input) => {
      const url = String(input);
      if (url.startsWith("https://api.github.com/")) return json(githubFile("set local statement_timeout = 0; select 1;"));
      return json({ message: "unexpected Supabase call" }, 500);
    }) as typeof fetch;
    await expect(applyGithubMigrationToSupabase({ projectRef: ref, githubOwner: "acme", githubRepo: "app", commitSha: sha, migrationPath: path }))
      .rejects.toThrow("migration timeout override");
  });

  it("allows BEGIN/END inside a dollar-quoted procedural body without treating it as transaction control", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "gh-test";
    process.env["LEAH_SUPABASE_ACCESS_TOKEN"] = "sbp_test";
    process.env["LEAH_SUPABASE_PROJECT_POLICY"] = JSON.stringify({ [ref]: "preview" });
    const sql = "do $$ begin perform 1; end $$;";
    let applyCalls = 0;
    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.startsWith("https://api.github.com/")) return json(githubFile(sql));
      const body = JSON.parse(String(init?.body ?? "{}")) as { query?: string };
      const query = body.query ?? "";
      if (query.includes("where version=") && applyCalls === 0) return json({ message: "relation leah_internal.deploy_migration_ledger does not exist" }, 500);
      if (query.includes("create schema if not exists leah_internal")) {
        applyCalls += 1;
        return json([], 201);
      }
      if (query.includes("where version=")) {
        const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sql));
        const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
        return json([{ version: "20260901180000", content_hash: hash, commit_sha: sha, migration_path: path, applied_at: "2026-09-01T08:00:00Z" }], 201);
      }
      return json({ message: "unexpected" }, 500);
    }) as typeof fetch;
    const result = await applyGithubMigrationToSupabase({ projectRef: ref, githubOwner: "acme", githubRepo: "app", commitSha: sha, migrationPath: path });
    expect(result.replay).toBe(false);
    expect(applyCalls).toBe(1);
  });

  it("applies an immutable GitHub migration only inside the serialized wrapper and accepts success after ledger proof", async () => {
    process.env["LEAH_GITHUB_TOKEN"] = "gh-test";
    process.env["LEAH_SUPABASE_ACCESS_TOKEN"] = "sbp_test";
    process.env["LEAH_SUPABASE_PROJECT_POLICY"] = JSON.stringify({ [ref]: "preview" });
    const sql = "create table if not exists public.demo(id bigint primary key);";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sql));
    const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
    let missingLedgerReads = 0;
    let applyCalls = 0;

    globalThis.fetch = (async (input, init) => {
      const url = String(input);
      if (url.startsWith("https://api.github.com/")) return json(githubFile(sql));
      if (url.startsWith(`https://api.supabase.com/v1/projects/${ref}/database/query`)) {
        const body = JSON.parse(String(init?.body ?? "{}")) as { query?: string };
        const query = body.query ?? "";
        if (query.includes("where version=") && missingLedgerReads === 0) {
          missingLedgerReads += 1;
          return json({ message: "relation leah_internal.deploy_migration_ledger does not exist" }, 500);
        }
        if (query.includes("create schema if not exists leah_internal")) {
          applyCalls += 1;
          expect(query).toContain(sql);
          expect(query).toContain(hash);
          expect(query).toContain(sha);
          expect(query).toContain("pg_advisory_xact_lock(hashtextextended('leah:migrations:global',0))");
          expect(query).toContain("select max(version) into _latest");
          return json([], 201);
        }
        if (query.includes("where version=")) {
          return json([{ version: "20260901180000", content_hash: hash, commit_sha: sha, migration_path: path, applied_at: "2026-09-01T08:00:00Z" }], 201);
        }
      }
      return json({ message: "unexpected" }, 500);
    }) as typeof fetch;

    const result = await applyGithubMigrationToSupabase({ projectRef: ref, githubOwner: "acme", githubRepo: "app", commitSha: sha, migrationPath: path, expectedContentHash: hash });
    expect(applyCalls).toBe(1);
    expect(result.replay).toBe(false);
    expect(result.contentHash).toBe(hash);
    expect(result.commitSha).toBe(sha);
    expect(result.targetPolicy).toBe("preview");
  });
});
