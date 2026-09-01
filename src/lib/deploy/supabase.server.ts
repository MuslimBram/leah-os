import { readGithubTextFileAtSha } from "../github/file-at-sha.server";
import { readGithubRepo } from "../github/ssot.server";

const PROJECT_REF_RE = /^[a-z0-9]{20}$/;
const MIGRATION_PATH_RE = /^supabase\/migrations\/(\d{14})_([a-z0-9_]+)\.sql$/;
const SHA_RE = /^[0-9a-f]{40}$/i;
const HASH_RE = /^[0-9a-f]{64}$/i;

type ProjectPolicy = "preview" | "production";

const ALWAYS_FORBIDDEN: Array<{ re: RegExp; label: string }> = [
  { re: /\bdrop\s+database\b/i, label: "DROP DATABASE" },
  { re: /\balter\s+system\b/i, label: "ALTER SYSTEM" },
  { re: /\b(create|alter|drop)\s+role\b/i, label: "role administration" },
  { re: /\b(?:set|reset)\s+role\b/i, label: "role switching" },
  { re: /\bset\s+session\s+authorization\b/i, label: "SET SESSION AUTHORIZATION" },
  { re: /\bcopy\b[\s\S]{0,500}\bprogram\b/i, label: "COPY PROGRAM" },
  { re: /\bpg_(read|write|ls)_file\b/i, label: "server filesystem access" },
  { re: /\blo_(import|export)\s*\(/i, label: "large-object filesystem access" },
  { re: /\b(?:set|reset)\s+(?:(?:local|session)\s+)?(?:statement_timeout|lock_timeout|idle_in_transaction_session_timeout|transaction_timeout)\b/i, label: "migration timeout override" },
  { re: /\bset_config\s*\(\s*['"](?:statement_timeout|lock_timeout|idle_in_transaction_session_timeout|transaction_timeout)['"]/i, label: "migration timeout override" },
];

const DESTRUCTIVE: Array<{ re: RegExp; label: string }> = [
  { re: /\bdrop\s+(table|schema|type|domain|extension)\b/i, label: "DROP object" },
  { re: /\btruncate\s+(table\s+)?/i, label: "TRUNCATE" },
  { re: /\balter\s+table\b[\s\S]{0,2000}\bdrop\s+column\b/i, label: "DROP COLUMN" },
];

const TRANSACTION_CONTROL_RE = /(?:^|;)\s*(?:begin(?:\s+(?:work|transaction))?|start\s+transaction|commit(?:\s+prepared)?|end(?:\s+(?:work|transaction))?|rollback(?:\s+(?:work|transaction|to\s+(?:savepoint\s+)?[A-Za-z_][A-Za-z0-9_$]*|prepared))?|savepoint\s+[A-Za-z_][A-Za-z0-9_$]*|release\s+(?:savepoint\s+)?[A-Za-z_][A-Za-z0-9_$]*|prepare\s+transaction)\b/im;
const TRANSACTION_MODE_RE = /(?:^|;)\s*set\s+(?:local\s+)?transaction\b|(?:^|;)\s*set\s+session\s+characteristics\s+as\s+transaction\b/im;

export type SupabaseMigrationInput = {
  projectRef: string;
  githubOwner: string;
  githubRepo: string;
  commitSha: string;
  migrationPath: string;
  expectedContentHash?: string;
  allowDestructive?: boolean;
};

export type SupabaseMigrationResult = {
  provider: "supabase";
  projectRef: string;
  targetPolicy: ProjectPolicy;
  version: string;
  migrationPath: string;
  commitSha: string;
  contentHash: string;
  replay: boolean;
  appliedAt: string;
};

function managementToken(): string {
  const value = process.env["LEAH_SUPABASE_ACCESS_TOKEN"]?.trim();
  if (!value) throw new Error("LEAH Supabase Management API credential is not configured");
  return value;
}

function configuredPolicy(project: string): ProjectPolicy {
  const raw = process.env["LEAH_SUPABASE_PROJECT_POLICY"]?.trim();
  if (!raw) throw new Error("LEAH Supabase project allowlist is not configured");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("LEAH Supabase project allowlist is invalid JSON"); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("LEAH Supabase project allowlist is invalid");
  const value = (parsed as Record<string, unknown>)[project];
  if (value !== "preview" && value !== "production") throw new Error("Supabase project is not allowed by server policy");
  return value;
}

function projectRef(value: string): { ref: string; policy: ProjectPolicy } {
  const clean = value.trim();
  if (!PROJECT_REF_RE.test(clean)) throw new Error("Invalid Supabase project ref");
  return { ref: clean, policy: configuredPolicy(clean) };
}

function commitSha(value: string): string {
  const clean = value.trim().toLowerCase();
  if (!SHA_RE.test(clean)) throw new Error("Invalid Git commit SHA");
  return clean;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function maskQuotedSql(sql: string): string {
  let out = "";
  let i = 0;
  const mask = (value: string) => value.replace(/[^\r\n]/g, " ");

  while (i < sql.length) {
    if (sql.startsWith("--", i)) {
      const end = sql.indexOf("\n", i + 2);
      const stop = end === -1 ? sql.length : end;
      out += mask(sql.slice(i, stop));
      i = stop;
      continue;
    }
    if (sql.startsWith("/*", i)) {
      const start = i;
      let depth = 1;
      i += 2;
      while (i < sql.length && depth > 0) {
        if (sql.startsWith("/*", i)) { depth += 1; i += 2; continue; }
        if (sql.startsWith("*/", i)) { depth -= 1; i += 2; continue; }
        i += 1;
      }
      if (depth !== 0) throw new Error("Migration SQL contains an unterminated block comment");
      out += mask(sql.slice(start, i));
      continue;
    }
    const ch = sql[i];
    if (ch === "'" || ch === '"') {
      const quote = ch;
      const start = i;
      i += 1;
      let closed = false;
      while (i < sql.length) {
        if (sql[i] === "\\" && quote === "'") { i += 2; continue; }
        if (sql[i] === quote) {
          if (sql[i + 1] === quote) { i += 2; continue; }
          i += 1;
          closed = true;
          break;
        }
        i += 1;
      }
      if (!closed) throw new Error("Migration SQL contains an unterminated quoted value");
      out += mask(sql.slice(start, i));
      continue;
    }
    if (ch === "$") {
      const tag = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i))?.[0];
      if (tag) {
        const start = i;
        const close = sql.indexOf(tag, i + tag.length);
        if (close === -1) throw new Error("Migration SQL contains an unterminated dollar-quoted body");
        i = close + tag.length;
        out += mask(sql.slice(start, i));
        continue;
      }
    }
    out += ch;
    i += 1;
  }
  return out;
}

function assertMigrationPolicy(sql: string, allowDestructive: boolean) {
  if (!sql.trim()) throw new Error("Migration SQL is empty");
  if (/^\s*\\/m.test(sql)) throw new Error("psql meta-commands are not allowed in remote migrations");
  const structuralSql = maskQuotedSql(sql);
  if (TRANSACTION_CONTROL_RE.test(structuralSql) || TRANSACTION_MODE_RE.test(structuralSql)) {
    throw new Error("Migration cannot control or escape the LEAH transaction wrapper");
  }
  for (const rule of ALWAYS_FORBIDDEN) {
    if (rule.re.test(sql)) throw new Error(`Migration blocked by safety policy: ${rule.label}`);
  }
  if (!allowDestructive) {
    for (const rule of DESTRUCTIVE) {
      if (rule.re.test(sql)) throw new Error(`Destructive migration requires explicit approval: ${rule.label}`);
    }
  }
}

function sqlLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

async function runQuery(project: string, query: string, readOnly = false): Promise<unknown> {
  const response = await fetch(`https://api.supabase.com/v1/projects/${encodeURIComponent(project)}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${managementToken()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, read_only: readOnly }),
  });
  const text = await response.text();
  let payload: unknown = null;
  try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }
  if (!response.ok) {
    const detail = typeof payload === "string" ? payload : JSON.stringify(payload);
    throw new Error(`Supabase database query failed (${response.status}): ${detail.slice(0, 400)}`);
  }
  return payload;
}

function firstRow(payload: unknown): Record<string, unknown> | null {
  if (Array.isArray(payload)) {
    const row = payload[0];
    return row && typeof row === "object" ? row as Record<string, unknown> : null;
  }
  if (payload && typeof payload === "object" && "result" in payload) {
    const result = (payload as { result?: unknown }).result;
    if (Array.isArray(result)) {
      const row = result[0];
      return row && typeof row === "object" ? row as Record<string, unknown> : null;
    }
  }
  return null;
}

function isMissingLedgerError(message: string): boolean {
  return /(deploy_migration_ledger|leah_internal)/i.test(message) && /(does not exist|42P01|3F000)/i.test(message);
}

async function ledgerRow(project: string, version: string): Promise<Record<string, unknown> | null> {
  const query = `select version, content_hash, commit_sha, migration_path, applied_at::text as applied_at
    from leah_internal.deploy_migration_ledger where version=${sqlLiteral(version)} limit 1;`;
  try {
    return firstRow(await runQuery(project, query, false));
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (isMissingLedgerError(message)) return null;
    throw error;
  }
}

function wrapMigration(input: { version: string; hash: string; commitSha: string; path: string; sql: string }): string {
  return `begin;
set local lock_timeout='10s';
set local statement_timeout='120s';
select pg_advisory_xact_lock(hashtextextended('leah:migrations:global',0));
create schema if not exists leah_internal;
revoke all on schema leah_internal from public, anon, authenticated;
create table if not exists leah_internal.deploy_migration_ledger (
  version text primary key,
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  commit_sha text not null check (commit_sha ~ '^[0-9a-f]{40}$'),
  migration_path text not null,
  applied_at timestamptz not null default clock_timestamp()
);
revoke all on leah_internal.deploy_migration_ledger from public, anon, authenticated;
do $leah_preflight$
declare _hash text; _latest text;
begin
  select content_hash into _hash from leah_internal.deploy_migration_ledger where version=${sqlLiteral(input.version)};
  if _hash is not null then
    if _hash <> ${sqlLiteral(input.hash)} then raise exception 'LEAH_MIGRATION_HASH_CONFLICT:%',${sqlLiteral(input.version)}; end if;
    raise exception 'LEAH_MIGRATION_ALREADY_APPLIED:%',${sqlLiteral(input.version)};
  end if;
  select max(version) into _latest from leah_internal.deploy_migration_ledger;
  if _latest is not null and ${sqlLiteral(input.version)} < _latest then
    raise exception 'LEAH_MIGRATION_OUT_OF_ORDER:%:%',${sqlLiteral(input.version)},_latest;
  end if;
end;
$leah_preflight$;

${input.sql}

insert into leah_internal.deploy_migration_ledger(version,content_hash,commit_sha,migration_path)
values (${sqlLiteral(input.version)},${sqlLiteral(input.hash)},${sqlLiteral(input.commitSha)},${sqlLiteral(input.path)});
commit;`;
}

export async function applyGithubMigrationToSupabase(input: SupabaseMigrationInput): Promise<SupabaseMigrationResult> {
  const target = projectRef(input.projectRef);
  const sha = commitSha(input.commitSha);
  const path = input.migrationPath.trim();
  const match = MIGRATION_PATH_RE.exec(path);
  if (!match) throw new Error("Migration path must be supabase/migrations/YYYYMMDDHHMMSS_name.sql");
  const version = match[1];

  if (target.policy === "production") {
    if (process.env["LEAH_SUPABASE_ALLOW_PRODUCTION_DEPLOY"] !== "true") {
      throw new Error("Supabase production migration is disabled by server policy");
    }
    const repo = await readGithubRepo(input.githubOwner, input.githubRepo);
    if (repo.headSha !== sha) throw new Error(`Production migration commit is not current ${repo.defaultBranch} HEAD`);
  }

  const file = await readGithubTextFileAtSha({ owner: input.githubOwner, repo: input.githubRepo, sha, path, maxBytes: 1_000_000 });
  const hash = await sha256(file.content);
  if (input.expectedContentHash) {
    const expected = input.expectedContentHash.trim().toLowerCase();
    if (!HASH_RE.test(expected) || expected !== hash) throw new Error("Migration content hash mismatch");
  }
  assertMigrationPolicy(file.content, input.allowDestructive === true);

  const before = await ledgerRow(target.ref, version);
  if (before) {
    if (String(before.content_hash) !== hash) throw new Error(`Migration ${version} already exists with a different content hash`);
    if (String(before.migration_path) !== path) throw new Error(`Migration ${version} already exists with a different migration path`);
    return { provider: "supabase", projectRef: target.ref, targetPolicy: target.policy, version, migrationPath: path, commitSha: String(before.commit_sha || sha), contentHash: hash, replay: true, appliedAt: String(before.applied_at || "") };
  }

  try {
    await runQuery(target.ref, wrapMigration({ version, hash, commitSha: sha, path, sql: file.content }), false);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("LEAH_MIGRATION_ALREADY_APPLIED")) throw error;
  }

  const after = await ledgerRow(target.ref, version);
  if (!after) throw new Error("Supabase migration returned without durable ledger proof");
  if (String(after.content_hash) !== hash) throw new Error("Supabase migration ledger hash mismatch after apply");
  if (String(after.commit_sha) !== sha) throw new Error("Supabase migration ledger commit SHA mismatch after apply");
  if (String(after.migration_path) !== path) throw new Error("Supabase migration ledger path mismatch after apply");

  return { provider: "supabase", projectRef: target.ref, targetPolicy: target.policy, version, migrationPath: path, commitSha: sha, contentHash: hash, replay: false, appliedAt: String(after.applied_at || "") };
}
