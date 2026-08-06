// Client-side BYOK configuration for the free/OpenAI-compatible providers.
// Stored in localStorage; sent per-request to the server function that does
// the actual model call. Nothing is persisted server-side.

export type ByokConfig = {
  providerId: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  enabled: boolean;
};

const KEY = "leah.byok.v1";
const listeners = new Set<() => void>();
let state: Record<string, ByokConfig> = {};
let loaded = false;

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    state = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
  } catch {
    state = {};
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
  for (const l of listeners) l();
}

export function subscribeByok(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function listByok(): Record<string, ByokConfig> {
  load();
  return state;
}

export function getByok(providerId: string): ByokConfig | undefined {
  load();
  return state[providerId];
}

export function setByok(cfg: ByokConfig) {
  load();
  state[cfg.providerId] = cfg;
  persist();
}

export function removeByok(providerId: string) {
  load();
  delete state[providerId];
  persist();
}

/** The provider the runtime should use right now (first enabled one). */
export function activeByok(): ByokConfig | undefined {
  load();
  return Object.values(state).find((c) => c.enabled);
}