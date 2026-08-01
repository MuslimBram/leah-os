// Scheduler — interval triggers (cron-lite) + event triggers off the event bus.
import { on } from "@/lib/core/event-bus";
import { isWorkflowRunning, runWorkflow } from "./engine";
import { listWorkflows } from "./store";

let timer: ReturnType<typeof setInterval> | undefined;
let offEvents: (() => void) | undefined;
const TICK_MS = 1000;

export function schedulerTick(now = Date.now()) {
  for (const wf of listWorkflows()) {
    if (!wf.enabled || wf.trigger.type !== "interval") continue;
    if (isWorkflowRunning(wf.id)) continue;
    const due = wf.nextRunAt ?? (wf.lastRunAt ?? 0) + wf.trigger.everyMs;
    if (now >= due) void runWorkflow(wf, { trigger: "interval" });
  }
}

export function fireEventTrigger(event: string) {
  for (const wf of listWorkflows()) {
    if (!wf.enabled || wf.trigger.type !== "event") continue;
    if (wf.trigger.event !== event) continue;
    if (isWorkflowRunning(wf.id)) continue;
    void runWorkflow(wf, { trigger: `event:${event}` });
  }
}

export function startScheduler() {
  if (timer) return;
  timer = setInterval(() => schedulerTick(), TICK_MS);
  offEvents = on((e) => {
    if (e.type === "webhook.received") fireEventTrigger(`webhook.${e.source}`);
  });
}

export function stopScheduler() {
  if (timer) clearInterval(timer);
  timer = undefined;
  offEvents?.();
  offEvents = undefined;
}