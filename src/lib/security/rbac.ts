// Role-Based Access Control. Roles map to permission sets; every check is
// audited by the policy guard, never by callers directly.

import type { Permission, Principal, Role } from "./types";

const MATRIX: Record<Role, Permission[]> = {
  owner: [
    "secret.read", "secret.write", "secret.rotate", "workflow.run", "workflow.edit",
    "deploy.publish", "agent.execute", "audit.read", "policy.edit",
  ],
  admin: [
    "secret.read", "secret.write", "secret.rotate", "workflow.run", "workflow.edit",
    "deploy.publish", "agent.execute", "audit.read",
  ],
  developer: ["secret.read", "workflow.run", "workflow.edit", "agent.execute", "audit.read"],
  agent: ["secret.read", "agent.execute", "workflow.run"],
  viewer: ["audit.read"],
};

let current: Principal = { id: "usr_owner", name: "Ti (Owner)", role: "owner", kind: "user" };
const listeners = new Set<() => void>();

export function subscribePrincipal(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() { for (const l of listeners) { try { l(); } catch { /* isolate */ } } }

export function currentPrincipal(): Principal {
  return current;
}

export function setPrincipal(p: Principal) {
  current = p;
  notify();
}

export function permissionsFor(role: Role): Permission[] {
  return [...(MATRIX[role] ?? [])];
}

export function can(permission: Permission, principal: Principal = current): boolean {
  return permissionsFor(principal.role).includes(permission);
}

export const ROLES: Role[] = ["owner", "admin", "developer", "agent", "viewer"];