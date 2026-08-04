// Wires the skills engine into the orchestrator: completed tasks feed XP and
// lessons back into every matching installed skill.

import { orchestrator } from "@/lib/core/orchestrator";
import { installSkill, installedSkills } from "./store";
import { learnFromResult } from "./engine";

let installed = false;
const seen = new Set<string>();

/** Default packs so the system is useful on first load. */
const DEFAULTS = ["react", "supabase", "testing", "docs"];

export function installSkillsBootstrap() {
  if (installed) return;
  installed = true;

  if (installedSkills().length === 0) {
    for (const id of DEFAULTS) installSkill(id);
  }

  orchestrator.subscribe(() => {
    for (const exec of orchestrator.listExecutions()) {
      for (const task of orchestrator.getTasks(exec.id)) {
        if (task.status !== "completed" || seen.has(task.id)) continue;
        seen.add(task.id);
        const output = typeof task.result === "string"
          ? task.result
          : JSON.stringify(task.result ?? "");
        learnFromResult({ kind: task.kind, title: task.title, output });
      }
    }
  });
}