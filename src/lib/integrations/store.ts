// Client-side store for enabled state + BYOK configs.
// Kept fully separate from the registry so the plugin list stays declarative
// and swappable. Persistence is localStorage today; swap for Supabase later
// without touching plugin code or the registry contract.

import { useEffect, useState, useSyncExternalStore } from "react";
import { listPlugins } from "./registry";

type IntegrationState = {
  enabled: Record<string, boolean>;
  config: Record<string, Record<string, string>>;
};

const STORAGE_KEY = "leah.integrations.v1";

function loadState(): IntegrationState {
  if (typeof window === "undefined") return { enabled: {}, config: {} };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as IntegrationState;
  } catch {
    /* ignore */
  }
  const enabled: Record<string, boolean> = {};
  for (const p of listPlugins()) enabled[p.id] = Boolean(p.defaultEnabled);
  return { enabled, config: {} };
}

let state: IntegrationState | null = null;
const listeners = new Set<() => void>();

function getState(): IntegrationState {
  if (!state) state = loadState();
  return state;
}

function persist() {
  if (typeof window === "undefined" || !state) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function setEnabled(id: string, enabled: boolean) {
  const s = getState();
  s.enabled[id] = enabled;
  persist();
}

export function setConfig(id: string, config: Record<string, string>) {
  const s = getState();
  s.config[id] = { ...(s.config[id] ?? {}), ...config };
  persist();
}

export function isEnabled(id: string): boolean {
  return Boolean(getState().enabled[id]);
}

export function getConfig(id: string): Record<string, string> {
  return getState().config[id] ?? {};
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useIntegrationState() {
  // useSyncExternalStore avoids SSR mismatch — snapshot on server = empty state.
  const snapshot = useSyncExternalStore(
    subscribe,
    () => JSON.stringify(getState()),
    () => JSON.stringify({ enabled: {}, config: {} }),
  );
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return { state: JSON.parse(snapshot) as IntegrationState, hydrated };
}