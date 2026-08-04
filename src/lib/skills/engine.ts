// Skills Engine — matches installed skills to a task kind, injects their
// knowledge into the agent prompt, and learns from execution output.

import { addLesson, grantXp, installedSkills } from "./store";
import type { Skill } from "./types";

export function matchSkills(kind: string): Skill[] {
  return installedSkills().filter((s) => s.kinds.includes(kind));
}

/** Prompt fragment for the skills that apply to a kind ("" when none). */
export function skillBlock(kind: string): string {
  const matched = matchSkills(kind);
  if (matched.length === 0) return "";
  const lines = matched.map((s) => {
    const knowledge = [...s.knowledge, ...s.lessons.map((l) => l.content)]
      .slice(0, 8)
      .map((k) => `  - ${k}`)
      .join("\n");
    return `• ${s.name} (Lvl ${s.level})\n${knowledge}`;
  });
  return `SKILLS TË INSTALUARA:\n${lines.join("\n")}`;
}

/** Non-destructive prompt enrichment used by the swarm runtime. */
export function augmentPrompt(kind: string, prompt: string): string {
  const block = skillBlock(kind);
  return block ? `${prompt}\n\n${block}` : prompt;
}

/**
 * Self-evolution: after a task completes, every matching skill earns XP and
 * distils one lesson from the output.
 */
export function learnFromResult(input: { kind: string; title: string; output: string }) {
  const matched = matchSkills(input.kind);
  for (const s of matched) {
    grantXp(s.id, 25);
    const lesson = distil(input.title, input.output);
    if (lesson) addLesson(s.id, lesson, "execution");
  }
  return matched.map((s) => s.id);
}

function distil(title: string, output: string): string {
  const first = output.split(/[.\n]/).map((p) => p.trim()).find((p) => p.length > 12);
  return first ? `${title}: ${first}` : "";
}