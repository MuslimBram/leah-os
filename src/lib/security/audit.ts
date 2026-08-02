// Append-only audit log. Every privileged action lands here.

import type { AuditEntry, Role } from "./types";

const MAX = 500;
const entries: AuditEntry[] = [];
const listeners = new Set<() => void>();

export function subscribeAudit(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() { for (const l of listeners) { try { l(); } catch { /* isolate */ } } }

export function audit(input: Omit<AuditEntry, "id" | "ts">): AuditEntry {
  const entry: AuditEntry = {
    ...input,
    id: `aud_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
  };
  entries.push(entry);
  if (entries.length > MAX) entries.splice(0, entries.length - MAX);
  notify();
  return entry;
}

export function listAudit(filter?: { outcome?: AuditEntry["outcome"]; actorRole?: Role }): AuditEntry[] {
  let rows = [...entries];
  if (filter?.outcome) rows = rows.filter((e) => e.outcome === filter.outcome);
  if (filter?.actorRole) rows = rows.filter((e) => e.actorRole === filter.actorRole);
  return rows.sort((a, b) => b.ts - a.ts);
}

export function clearAudit() {
  entries.length = 0;
  notify();
}