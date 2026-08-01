// Usage telemetry — every agent/task run records tokens + estimated cost so
// the Cost Optimizer can show real spend and realized savings.

import { estimateCost } from "./pricing";

export type UsageEvent = {
  id: string;
  ts: number;
  providerId: string;
  agentId?: string;
  executionId?: string;
  taskId?: string;
  kind: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  baselineCost: number;
};

const MAX = 500;
const events: UsageEvent[] = [];
const listeners = new Set<() => void>();

export function subscribeUsage(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function notify() { for (const l of listeners) { try { l(); } catch { /* isolate */ } } }

export function recordUsage(
  input: Omit<UsageEvent, "id" | "ts" | "cost"> & { cost?: number },
): UsageEvent {
  const ev: UsageEvent = {
    ...input,
    cost: input.cost ?? estimateCost(input.providerId, input.inputTokens, input.outputTokens),
    id: `use_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    ts: Date.now(),
  };
  events.push(ev);
  if (events.length > MAX) events.splice(0, events.length - MAX);
  notify();
  return ev;
}

export function listUsage(executionId?: string): UsageEvent[] {
  const rows = executionId ? events.filter((e) => e.executionId === executionId) : events;
  return [...rows].sort((a, b) => b.ts - a.ts);
}

export function clearUsage() {
  events.length = 0;
  notify();
}

export type UsageSummary = {
  calls: number;
  inputTokens: number;
  outputTokens: number;
  spend: number;
  baselineSpend: number;
  saved: number;
  savedPct: number;
  byProvider: { providerId: string; calls: number; tokens: number; spend: number }[];
};

export function usageSummary(executionId?: string): UsageSummary {
  const rows = listUsage(executionId);
  const acc = new Map<string, { calls: number; tokens: number; spend: number }>();
  let spend = 0, baselineSpend = 0, inputTokens = 0, outputTokens = 0;
  for (const e of rows) {
    spend += e.cost;
    baselineSpend += e.baselineCost;
    inputTokens += e.inputTokens;
    outputTokens += e.outputTokens;
    const cur = acc.get(e.providerId) ?? { calls: 0, tokens: 0, spend: 0 };
    cur.calls += 1;
    cur.tokens += e.inputTokens + e.outputTokens;
    cur.spend += e.cost;
    acc.set(e.providerId, cur);
  }
  const saved = Math.max(0, baselineSpend - spend);
  return {
    calls: rows.length,
    inputTokens,
    outputTokens,
    spend,
    baselineSpend,
    saved,
    savedPct: baselineSpend > 0 ? (saved / baselineSpend) * 100 : 0,
    byProvider: [...acc.entries()]
      .map(([providerId, v]) => ({ providerId, ...v }))
      .sort((a, b) => b.spend - a.spend),
  };
}