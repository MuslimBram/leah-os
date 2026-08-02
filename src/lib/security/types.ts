// Sprint 6 — Security Layer types.

export type Role = "owner" | "admin" | "developer" | "agent" | "viewer";

export type Permission =
  | "secret.read"
  | "secret.write"
  | "secret.rotate"
  | "workflow.run"
  | "workflow.edit"
  | "deploy.publish"
  | "agent.execute"
  | "audit.read"
  | "policy.edit";

export type Principal = {
  id: string;
  name: string;
  role: Role;
  /** Agents get a machine principal; humans a user principal. */
  kind: "user" | "agent";
};

export type SecretRecord = {
  id: string;
  name: string;
  scope: string;
  /** AES-256-GCM ciphertext, base64. */
  ciphertext: string;
  iv: string;
  hint: string;
  createdAt: number;
  rotatedAt?: number;
  version: number;
};

export type AuditEntry = {
  id: string;
  ts: number;
  actor: string;
  actorRole: Role;
  action: string;
  target?: string;
  outcome: "allow" | "deny" | "info";
  detail?: string;
};