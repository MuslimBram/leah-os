// Policy Guard — the only place that combines RBAC + audit + rate limiting.
// Callers never check permissions directly.

import { audit } from "./audit";
import { can, currentPrincipal } from "./rbac";
import type { Permission, Principal } from "./types";

export type GuardResult = { allowed: boolean; reason: string };

const RATE_WINDOW_MS = 60_000;
let rateLimit = 60;
const hits = new Map<string, number[]>();

export function setRateLimit(perMinute: number) {
  rateLimit = Math.max(1, perMinute);
}
export function getRateLimit(): number {
  return rateLimit;
}
export function clearRateLimits() {
  hits.clear();
}

function underRateLimit(actorId: string): boolean {
  const now = Date.now();
  const recent = (hits.get(actorId) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(actorId, recent);
  return recent.length <= rateLimit;
}

export function guard(
  permission: Permission,
  options: { target?: string; principal?: Principal; detail?: string } = {},
): GuardResult {
  const principal = options.principal ?? currentPrincipal();

  if (!underRateLimit(principal.id)) {
    audit({
      actor: principal.name, actorRole: principal.role, action: permission,
      target: options.target, outcome: "deny", detail: "rate limit i tejkaluar",
    });
    return { allowed: false, reason: "rate limit i tejkaluar" };
  }

  const allowed = can(permission, principal);
  audit({
    actor: principal.name,
    actorRole: principal.role,
    action: permission,
    target: options.target,
    outcome: allowed ? "allow" : "deny",
    detail: options.detail ?? (allowed ? undefined : `roli "${principal.role}" nuk ka këtë leje`),
  });
  return { allowed, reason: allowed ? "ok" : `roli "${principal.role}" nuk ka lejen ${permission}` };
}

/** Throwing variant for code paths that must abort. */
export function requirePermission(permission: Permission, target?: string): void {
  const r = guard(permission, { target });
  if (!r.allowed) throw new Error(`Access denied: ${r.reason}`);
}