import { mkdirSync, writeFileSync } from "node:fs";
import { LEVELS, WORLDS } from "./levels";
import { parseLevel } from "./parse";
import { solve } from "./solver";

const report = LEVELS.map((level) => {
  const result = solve(parseLevel(level));
  const hasHat = level.rows.some((row) => row.includes("H"));
  const bonus = hasHat ? solve(parseLevel(level), { needHat: true }) : null;
  if (!result.ok || (bonus && !bonus.ok) || result.moves !== level.par) throw new Error(`${level.id}: validation failed`);
  return { id: level.id, name: level.name, chapter: WORLDS.find((w) => w.id === level.world)?.name,
    insight: level.insight, challenge: !!level.challenge, par: result.moves,
    exploredStates: result.nodes, solution: result.path,
    bonusPar: bonus?.moves ?? null, bonusSolution: bonus?.path ?? null };
});
mkdirSync(new URL("../../output/qa/", import.meta.url), { recursive: true });
writeFileSync(new URL("../../output/qa/campaign-report.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(`Validated ${report.length} authored levels, shortest routes, and every optional hat. Report: output/qa/campaign-report.json`);
