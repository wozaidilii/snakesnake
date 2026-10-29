import { mkdirSync, writeFileSync } from "node:fs";
import { LEVELS, WORLDS } from "./levels";
import { parseLevel } from "./parse";
import { replayAction, solve } from "./solver";
import { isReverse } from "./engine";

const report = LEVELS.map((level) => {
  const result = solve(parseLevel(level));
  const hasHat = level.rows.some((row) => row.includes("H"));
  const bonus = hasHat ? solve(parseLevel(level), { needHat: true }) : null;
  if (!result.ok || (bonus && !bonus.ok) || result.moves !== level.par) throw new Error(`${level.id}: validation failed; main=${result.reason}/${result.nodes}, bonus=${bonus?.reason}/${bonus?.nodes}, par=${level.par}/${result.moves}`);
  const ablations = (level.requires ?? []).map((mechanic) => {
    const without = solve(parseLevel(level), { forbid: mechanic });
    if (without.reason !== "stuck") throw new Error(`${level.id}: ${mechanic} can be bypassed or search is inconclusive`);
    return { mechanic, result: without.reason, exploredStates: without.nodes };
  });
  let state = parseLevel(level), pushes = 0, fledges = 0, switches = 0, quarterTurns = 0, previous = "w0";
  const pushDirections = new Set<string>();
  for (const action of result.path) {
    const wi = state.worms.findIndex((worm) => worm.id === action.wormId);
    if (action.dir !== "fledge" && action.dir !== "snip") {
      if (isReverse(state, wi, action.dir)) throw new Error(`${level.id}: solution reversed`);
      if (state.worms[wi]!.facing !== action.dir) quarterTurns++;
    }
    const step = replayAction(state, action);
    if (!step || step.state.lost) throw new Error(`${level.id}: invalid replay`);
    if (step.motion?.length) { pushes++; pushDirections.add(action.dir); }
    if (action.dir === "fledge") fledges++;
    if (action.wormId !== previous) switches++;
    previous = action.wormId; state = step.state;
  }
  return { id: level.id, name: level.name, chapter: WORLDS.find((w) => w.id === level.world)?.name,
    insight: level.insight, tutorial: !!level.tutorial, difficulty: level.difficulty,
    challenge: !!level.challenge, par: result.moves, ablations,
    planning: { pushes, pushDirections: [...pushDirections], fledges, switches, quarterTurns },
    exploredStates: result.nodes, solution: result.path,
    bonusPar: bonus?.moves ?? null, bonusSolution: bonus?.path ?? null };
});
mkdirSync(new URL("../../output/qa/", import.meta.url), { recursive: true });
writeFileSync(new URL("../../output/qa/campaign-report.json", import.meta.url), JSON.stringify(report, null, 2) + "\n");
console.log(`Validated ${report.length} levels, ${report.filter((l) => l.tutorial).length} tutorials, ${report.reduce((n, l) => n + l.ablations.length, 0)} required-mechanic checks, every shortest replay and optional hat. Report: output/qa/campaign-report.json`);
