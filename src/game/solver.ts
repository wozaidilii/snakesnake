import { add, at, applyFledge, applyMove, applySnip, DIRS, fledgeCandidates } from "./engine";
import type { Dir, GameState, Level, StepResult } from "./types";

/** Static geometry is fixed within a search; encode only mutable facts. */
export function hashState(state: GameState): string {
  let hash = `${state.levelId}|${state.keys}|${+state.flips.red}${+state.flips.blue}|${state.lost ?? ""}|${+state.won}|${[...state.hats].sort().join(",")}|`;
  state.cells.forEach((cell, i) => {
    const f = cell.fixture;
    const mutable = `${cell.terrain === "dirt" ? "," : ""}${cell.pickup?.kind[0] ?? ""}${f?.kind === "nest" ? f.filled ? "n" : "N" : f?.kind === "roost" ? f.used ? "s" : "S" : f?.kind === "bridge" ? f.collapsed ? "~" : "=" : f?.kind === "lock" ? "L" : ""}`;
    if (mutable) hash += `${i.toString(36)}:${mutable};`;
  });
  return hash + state.worms.map((worm) => `${state.gentle ? worm.id : ""}:${+worm.carrying}:${worm.segments.map((p) => (p.y * state.width + p.x).toString(36)).join(".")}`).sort().join("|");
}

export type Action = { wormId: string; dir: Dir | "snip" | "fledge"; segmentIndex?: number };
export function replayAction(state: GameState, action: Action): StepResult | null {
  const index = state.worms.findIndex((worm) => worm.id === action.wormId);
  return action.dir === "fledge" ? applyFledge(state, index, action.segmentIndex)
    : action.dir === "snip" ? applySnip(state, index) : applyMove(state, index, action.dir);
}
export type SolveResult = { ok: boolean; reason: "solved" | "stuck" | "budget"; nodes: number; moves: number; path: Action[] };
export type SolveOptions = { needHat?: boolean; maxNodes?: number; maxMoves?: number; forbid?: NonNullable<Level["requires"]>[number] };
export function solve(start: GameState, options: SolveOptions = {}): SolveResult {
  const maxNodes = options.maxNodes ?? 250_000;
  const maxMoves = options.maxMoves ?? 150;
  type Node = { state?: GameState; parent: number; action?: Action };
  const queue: Node[] = [{ state: start, parent: -1 }];
  const seen = new Set<string>([hashState(start)]);
  let cursor = 0;
  let depthLimited = false;
  while (cursor < queue.length) {
    if (seen.size > maxNodes) return { ok: false, reason: "budget", nodes: seen.size, moves: 0, path: [] };
    const node = queue[cursor++]!;
    const state = node.state!;
    node.state = undefined;
    if (state.won) {
      if (!options.needHat || state.hats.length > 0) {
        const path: Action[] = [];
        let ancestor: Node | undefined = node;
        while (ancestor?.action) { path.push(ancestor.action); ancestor = queue[ancestor.parent]; }
        return { ok: true, reason: "solved", nodes: seen.size, moves: state.moves - start.moves, path: path.reverse() };
      }
      continue;
    }
    if (state.lost) continue;
    if (state.moves - start.moves >= maxMoves) { depthLimited = true; continue; }
    for (let wi = 0; wi < state.worms.length; wi++) {
      const wormId = state.worms[wi]!.id;
      for (const dir of DIRS) {
        const dest = at(state, add(state.worms[wi]!.segments[0]!, dir));
        if (options.forbid === "bridge" && dest?.fixture?.kind === "bridge") continue;
        if (options.forbid === "bell" && dest?.fixture?.kind === "lever") continue;
        const step = applyMove(state, wi, dir);
        if (!step || step.state.lost) continue;
        if (options.forbid === "push" && step.motion?.length) continue;
        if (options.forbid === "water" && step.motion?.some((motion) => motion.path.length > 2)) continue;
        if (options.forbid === "grow" && step.state.worms[wi]!.segments.length > state.worms[wi]!.segments.length) continue;
        enqueue(step.state, { wormId, dir });
      }
      if (options.forbid !== "fledge") for (const segmentIndex of fledgeCandidates(state, wi)) {
        enqueue(applyFledge(state, wi, segmentIndex)!.state, { wormId, dir: "fledge", segmentIndex });
      }
      if (!state.gentle) {
        const snip = applySnip(state, wi);
        if (snip && !snip.state.lost) enqueue(snip.state, { wormId, dir: "snip" });
      }
    }
  }
  return { ok: false, reason: depthLimited ? "budget" : "stuck", nodes: seen.size, moves: 0, path: [] };
  function enqueue(state: GameState, action: Action) {
    const key = hashState(state);
    if (seen.has(key)) return;
    seen.add(key);
    queue.push({ state, parent: cursor - 1, action });
  }
}
