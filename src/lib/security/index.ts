export { guard, requirePermission, setRateLimit, getRateLimit, clearRateLimits, type GuardResult } from "./guard";
export { can, currentPrincipal, setPrincipal, permissionsFor, subscribePrincipal, ROLES } from "./rbac";
export { audit, listAudit, clearAudit, subscribeAudit } from "./audit";
export { putSecret, revealSecret, rotateSecret, deleteSecret, listSecrets, clearVault, subscribeVault } from "./vault";
export { installSecurityBootstrap } from "./bootstrap";
export { useSecurity } from "./use-security";
export type { Role, Permission, Principal, SecretRecord, AuditEntry } from "./types";