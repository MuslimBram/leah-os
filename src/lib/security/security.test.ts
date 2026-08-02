// @ts-ignore -- bun's built-in test runner
import { describe, expect, it, beforeEach } from "bun:test";
import { can, permissionsFor, setPrincipal, currentPrincipal } from "./rbac";
import { guard, setRateLimit, clearRateLimits } from "./guard";
import { clearAudit, listAudit } from "./audit";
import { clearVault, listSecrets, putSecret, revealSecret, rotateSecret } from "./vault";

describe("security layer", () => {
  beforeEach(() => {
    clearAudit(); clearVault(); clearRateLimits(); setRateLimit(60);
    setPrincipal({ id: "usr_owner", name: "Owner", role: "owner", kind: "user" });
  });

  it("grants owners everything and viewers almost nothing", () => {
    expect(can("secret.write")).toBe(true);
    expect(permissionsFor("viewer")).toEqual(["audit.read"]);
    expect(can("secret.write", { id: "v", name: "V", role: "viewer", kind: "user" })).toBe(false);
  });

  it("denies and audits an unauthorized action", () => {
    setPrincipal({ id: "usr_v", name: "Viewer", role: "viewer", kind: "user" });
    const r = guard("deploy.publish", { target: "prod" });
    expect(r.allowed).toBe(false);
    expect(listAudit({ outcome: "deny" })).toHaveLength(1);
  });

  it("audits allowed actions too", () => {
    expect(guard("workflow.run", { target: "wf_1" }).allowed).toBe(true);
    expect(listAudit({ outcome: "allow" })[0]?.action).toBe("workflow.run");
  });

  it("enforces the rate limit", () => {
    setRateLimit(3);
    for (let i = 0; i < 3; i++) expect(guard("agent.execute").allowed).toBe(true);
    const blocked = guard("agent.execute");
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain("rate limit");
  });

  it("encrypts secrets and never exposes plaintext in listings", async () => {
    await putSecret({ name: "API_KEY", value: "super-secret-value" });
    const [rec] = listSecrets();
    expect(rec?.ciphertext).not.toContain("super-secret-value");
    expect(rec?.hint).toBe("sup••••ue");
    expect(await revealSecret(rec!.id)).toBe("super-secret-value");
  });

  it("rotates a secret and bumps the version", async () => {
    const first = await putSecret({ name: "TOKEN", value: "v1-value" });
    const rotated = await rotateSecret(first.id, "v2-value");
    expect(rotated?.version).toBe(2);
    expect(rotated?.rotatedAt).toBeGreaterThan(0);
    expect(await revealSecret(first.id)).toBe("v2-value");
  });

  it("keeps the active principal globally", () => {
    setPrincipal({ id: "a1", name: "Backend Agent", role: "agent", kind: "agent" });
    expect(currentPrincipal().kind).toBe("agent");
    expect(can("policy.edit")).toBe(false);
  });
});