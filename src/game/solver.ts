import { applyMove, applySnip } from "./engine";
import type { Cell, GameState } from "./types";
import { DIRS } from "./engine";

function fixtureCode(cell: Cell): string {
  const fixture = cell.fixture;
  if (!fixture) return ".";
  if (fixture.kind === "button") return fixture.color === "red" ? "B" : "b";
  if (fixture.kind === "door") return fixture.color === "red" ? "D" : "d";
  if (fixture.kind === "nest") return fixture.filled ? "n" : "N";
  if (fixture.kind === "exit") return "X";
  if (fixture.kind === "daisy") return "*";
  if (fixture.kind === "scissors") return "S";
  if (fixture.kind === "crack") return "!";
  return "L";
}

function pickupCode(cell: Cell): string {
  const pickup = cell.pickup;
  if (!pickup) return ".";
  if (pickup.kind === "hat") return "H";
  return pickup.kind[0] ?? "?";
}

export function hashState(state: GameState): string {
  let hash = `${state.keys}|${state.flips.red ? 1 : 0}${state.flips.blue ? 1 : 0}|${state.lost ?? ""}|${state.won ? 1 : 0}|${[...state.hats].sort().join(",")}|`;
  for (const cell of state.cells) {
    hash += `${cell.terrain[0] ?? "?"}${cell.flow?.[0] ?? "."}${fixtureCode(cell)}${pickupCode(cell)};`;
  }
  const worms = state.worms
    .map((worm) => {
      const body = worm.segments.map((seg) => `${seg.x},${seg.y}`).join(".");
      return `${worm.carrying ? "1" : "0"}:${body}`;
    })
    .sort();
  hash += worms.join("|");
  return hash;
}

export type SolveResult = {
  ok: boolean;
  reason: "solved" | "stuck" | "budget";
  nodes: number;
  moves: number;
};

export function solve(
  start: GameState,
  options?: { needHat?: boolean; maxNodes?: number; maxMoves?: number },
): SolveResult {
  const maxNodes = options?.maxNodes ?? 80_000;
  const maxMoves = options?.maxMoves ?? 100;
  const needHat = options?.needHat ?? false;
  const queue: GameState[] = [start];
  const seen = new Set<string>([hashState(start)]);
  let cursor = 0;

  while (cursor < queue.length) {
    if (seen.size > maxNodes) {
      return { ok: false, reason: "budget", nodes: seen.size, moves: 0 };
    }
    const state = queue[cursor];
    cursor += 1;
    if (!state || state.moves > maxMoves) continue;
    if (state.won) {
      if (!needHat || state.hats.length > 0) {
        return { ok: true, reason: "solved", nodes: seen.size, moves: state.moves };
      }
      continue;
    }
    if (state.lost) continue;

    for (let wormIndex = 0; wormIndex < state.worms.length; wormIndex++) {
      for (const dir of DIRS) {
        const step = applyMove(state, wormIndex, dir);
        if (step) enqueue(step.state);
      }
      const snip = applySnip(state, wormIndex);
      if (snip) enqueue(snip.state);
    }
  }

  return { ok: false, reason: "stuck", nodes: seen.size, moves: 0 };

  function enqueue(state: GameState) {
    const key = hashState(state);
    if (seen.has(key)) return;
    seen.add(key);
    queue.push(state);
  }
}
