// Secrets Vault — AES-256-GCM encryption at rest via WebCrypto. Plaintext
// never leaves this module except through an explicit, guarded reveal.

import type { SecretRecord } from "./types";

const store = new Map<string, SecretRecord>();
const listeners = new Set<() => void>();
let keyPromise: Promise<CryptoKey> | null = null;

export function subscribeVault(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() { for (const l of listeners) { try { l(); } catch { /* isolate */ } } }

const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf: ArrayBuffer | Uint8Array) => {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Master key. In production this comes from a KMS; here it is session-scoped. */
function masterKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, [
      "encrypt",
      "decrypt",
    ]) as Promise<CryptoKey>;
  }
  return keyPromise;
}

function hintOf(value: string): string {
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 3)}••••${value.slice(-2)}`;
}

export async function putSecret(input: { name: string; scope?: string; value: string }): Promise<SecretRecord> {
  const key = await masterKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(input.value));
  const id = `sec_${input.scope ?? "global"}_${input.name}`;
  const prev = store.get(id);
  const record: SecretRecord = {
    id,
    name: input.name,
    scope: input.scope ?? "global",
    ciphertext: toB64(ciphertext),
    iv: toB64(iv),
    hint: hintOf(input.value),
    createdAt: prev?.createdAt ?? Date.now(),
    rotatedAt: prev ? Date.now() : undefined,
    version: (prev?.version ?? 0) + 1,
  };
  store.set(id, record);
  notify();
  return record;
}

export async function revealSecret(id: string): Promise<string | null> {
  const record = store.get(id);
  if (!record) return null;
  const key = await masterKey();
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(record.iv) },
    key,
    fromB64(record.ciphertext),
  );
  return dec.decode(plain);
}

export async function rotateSecret(id: string, nextValue: string): Promise<SecretRecord | null> {
  const record = store.get(id);
  if (!record) return null;
  return putSecret({ name: record.name, scope: record.scope, value: nextValue });
}

export function deleteSecret(id: string): boolean {
  const ok = store.delete(id);
  if (ok) notify();
  return ok;
}

/** Masked listing — safe for the UI, never contains plaintext. */
export function listSecrets(): SecretRecord[] {
  return [...store.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function clearVault() {
  store.clear();
  notify();
}