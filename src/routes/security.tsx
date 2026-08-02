import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/leah/AppShell";
import { ShieldCheck, KeyRound, Lock, ScrollText, Eye, EyeOff, RotateCcw, Plus, Trash2 } from "lucide-react";
import { useSecurity } from "@/lib/security/use-security";
import { ROLES, permissionsFor, setPrincipal } from "@/lib/security/rbac";
import { guard, setRateLimit } from "@/lib/security/guard";
import { deleteSecret, putSecret, revealSecret, rotateSecret } from "@/lib/security/vault";
import type { Role } from "@/lib/security/types";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — Leah AI OS" },
      { name: "description", content: "Vault, AES-256, OAuth, RBAC, Audit Logs, MFA, Rate Limiting, Secrets Rotation." },
      { property: "og:title", content: "Security — Leah AI OS" },
      { property: "og:description", content: "Vault me AES-256-GCM, RBAC me role, audit log i plotë dhe rate limiting për çdo veprim të swarm-it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SecurityPage,
});

const ROLE_LABEL: Record<Role, string> = {
  owner: "Owner", admin: "Admin", developer: "Developer", agent: "Agent", viewer: "Viewer",
};

function SecurityPage() {
  const { principal, secrets, entries, rateLimit } = useSecurity();
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  const toggleReveal = async (id: string) => {
    if (revealed[id]) {
      setRevealed((r) => { const n = { ...r }; delete n[id]; return n; });
      return;
    }
    const res = guard("secret.read", { target: id });
    if (!res.allowed) return;
    const plain = await revealSecret(id);
    if (plain) setRevealed((r) => ({ ...r, [id]: plain }));
  };

  const add = async () => {
    if (!name.trim() || !value.trim()) return;
    if (!guard("secret.write", { target: name }).allowed) return;
    await putSecret({ name: name.trim().toUpperCase().replace(/\s+/g, "_"), value: value.trim() });
    setName(""); setValue("");
  };

  const rotate = async (id: string) => {
    if (!guard("secret.rotate", { target: id }).allowed) return;
    await rotateSecret(id, `rot_${Math.random().toString(36).slice(2, 12)}`);
    setRevealed((r) => { const n = { ...r }; delete n[id]; return n; });
  };

  const remove = (id: string) => {
    if (!guard("secret.write", { target: id }).allowed) return;
    deleteSecret(id);
  };

  const denies = entries.filter((e) => e.outcome === "deny").length;

  return (
    <div className="px-6 md:px-10 py-8 md:py-12 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Security"
        title="Enterprise-grade nga dita e parë"
        description="Vault me AES-256-GCM, RBAC me role, rate limiting dhe një audit log ku çdo veprim i njeriut ose i agjentit lë gjurmë."
      />

      <div className="grid md:grid-cols-4 gap-3 mb-8">
        <div className="rounded-2xl border border-border bg-card p-5">
          <KeyRound className="h-5 w-5 text-primary" />
          <div className="mt-2 text-2xl font-bold">{secrets.length}</div>
          <div className="text-sm text-muted-foreground">Sekrete të enkriptuara</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <ScrollText className="h-5 w-5 text-primary" />
          <div className="mt-2 text-2xl font-bold">{entries.length}</div>
          <div className="text-sm text-muted-foreground">Hyrje në audit log</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div className="mt-2 text-2xl font-bold">{denies}</div>
          <div className="text-sm text-muted-foreground">Veprime të bllokuara</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <Lock className="h-5 w-5 text-primary" />
          <div className="mt-2 text-2xl font-bold">{rateLimit}/min</div>
          <div className="text-sm text-muted-foreground">Rate limit për principal</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border p-6 mb-4" style={{ background: "var(--grad-surface)" }}>
        <div className="font-semibold mb-1">Roli aktiv (RBAC)</div>
        <p className="text-xs text-muted-foreground mb-3">Ndrysho rolin për të parë si zbatohen lejet në kohë reale — provo të zbulosh një sekret si Viewer.</p>
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setPrincipal({ id: `usr_${r}`, name: ROLE_LABEL[r], role: r, kind: r === "agent" ? "agent" : "user" })}
              className={
                "rounded-lg border px-3 py-2 text-sm transition-colors " +
                (principal.role === r ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")
              }
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            Rate limit
            <input
              type="number"
              min={1}
              value={rateLimit}
              onChange={(e) => setRateLimit(Number(e.target.value) || 1)}
              className="w-20 rounded-md border border-border bg-card px-2 py-1 text-foreground"
            />
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {permissionsFor(principal.role).map((p) => (
            <span key={p} className="text-[11px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">{p}</span>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="font-semibold mb-3">Vault · AES-256-GCM</div>
          <div className="flex gap-2 mb-4">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="EMRI_I_ÇELËSIT"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="vlera"
              type="password"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <button onClick={add} className="rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {secrets.length === 0 && <p className="text-sm text-muted-foreground">Vault bosh.</p>}
            {secrets.map((s) => (
              <div key={s.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-[11px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">{s.scope}</span>
                  <span className="text-[11px] text-muted-foreground">v{s.version}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={() => void toggleReveal(s.id)} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Shfaq sekretin">
                      {revealed[s.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => void rotate(s.id)} className="p-1.5 text-muted-foreground hover:text-foreground" aria-label="Rrotullo sekretin">
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button onClick={() => remove(s.id)} className="p-1.5 text-muted-foreground hover:text-destructive" aria-label="Fshi sekretin">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="mt-1 font-mono text-xs text-muted-foreground break-all">
                  {revealed[s.id] ?? s.hint}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="font-semibold mb-3">Audit log</div>
          <div className="space-y-1 max-h-[28rem] overflow-y-auto">
            {entries.length === 0 && <p className="text-sm text-muted-foreground">Asnjë veprim i regjistruar ende.</p>}
            {entries.map((e) => (
              <div key={e.id} className="flex items-start gap-2 text-xs border-b border-border/50 py-1.5">
                <span
                  className={
                    "mt-0.5 h-2 w-2 shrink-0 rounded-full " +
                    (e.outcome === "deny" ? "bg-destructive" : e.outcome === "allow" ? "bg-primary" : "bg-muted-foreground")
                  }
                />
                <div className="min-w-0">
                  <div className="text-foreground">
                    {e.actor} · <span className="font-mono">{e.action}</span>
                    {e.target && <span className="text-muted-foreground"> → {e.target}</span>}
                  </div>
                  {e.detail && <div className="text-muted-foreground">{e.detail}</div>}
                </div>
                <span className="ml-auto shrink-0 text-muted-foreground">
                  {new Date(e.ts).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}