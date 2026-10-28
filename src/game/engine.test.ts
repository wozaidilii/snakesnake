import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyMove,
  applySnip,
  formatState,
  goalsReady,
  isPressed,
  doorIsOpen,
} from "./engine";
import { LEVELS } from "./levels";
import { parseLevel } from "./parse";
import { hashState, solve } from "./solver";
import type { Cell, GameState, Point, Worm } from "./types";

function arena(width: number, height: number): GameState {
  const cells: Cell[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      cells.push({ terrain: edge ? "wall" : "floor" });
    }
  }
  return {
    levelId: "test",
    width,
    height,
    cells,
    worms: [],
    activeId: "w0",
    keys: 0,
    hats: [],
    flips: { red: false, blue: false },
    won: false,
    lost: null,
    moves: 0,
    nextWorm: 1,
  };
}

function put(state: GameState, point: Point, patch: Partial<Cell>): void {
  const cell = state.cells[point.y * state.width + point.x];
  if (!cell) throw new Error("out of arena");
  Object.assign(cell, patch);
}

function worm(segments: Point[], carrying = false): Worm {
  return { id: "w0", segments, facing: "right", carrying };
}

test("eating dirt excretes it behind the tail", () => {
  const state = parseLevel({
    id: "dirt",
    world: "soil",
    name: "dirt",
    hint: "",
    rows: ["#####", "#0,.#", "#..G#", "#..X#", "#####"],
  });
  const before = state.cells.filter((cell) => cell.terrain === "dirt").length;
  const step = applyMove(state, 0, "right");
  assert.ok(step);
  const after = step.state.cells.filter((cell) => cell.terrain === "dirt").length;
  assert.equal(after, before);
  assert.equal(step.state.worms[0]?.segments.length, 1);
  assert.equal(step.sound, "eat");
});

test("apples grow the worm and do not move the tail", () => {
  const state = parseLevel({
    id: "apple",
    world: "soil",
    name: "apple",
    hint: "",
    rows: ["#####", "#0A.#", "#..G#", "#..X#", "#####"],
  });
  const step = applyMove(state, 0, "right");
  assert.ok(step);
  assert.equal(step.state.worms[0]?.segments.length, 2);
  assert.deepEqual(step.state.worms[0]?.segments[1], { x: 1, y: 1 });
  assert.equal(step.sound, "grow");
});

test("a length-2 worm can reverse and a length-3 worm cannot", () => {
  const state = arena(7, 3);
  state.worms = [worm([{ x: 3, y: 1 }, { x: 2, y: 1 }])];
  const reversed = applyMove(state, 0, "left");
  assert.ok(reversed);
  assert.deepEqual(reversed.state.worms[0]?.segments, [
    { x: 2, y: 1 },
    { x: 3, y: 1 },
  ]);

  const long = arena(7, 3);
  long.worms = [worm([{ x: 4, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 1 }])];
  assert.equal(applyMove(long, 0, "left"), null);
});

test("rocks open doors and cannot be pushed into walls", () => {
  const state = parseLevel({
    id: "rock",
    world: "soil",
    name: "rock",
    hint: "",
    rows: ["#######", "#0R..G#", "#B...X#", "#######"],
  });
  assert.equal(applyMove(state, 0, "right")?.state.cells[1 * 7 + 3]?.pickup?.kind, "rock");
  const blocked = parseLevel({
    id: "blocked",
    world: "soil",
    name: "blocked",
    hint: "",
    rows: ["#####", "#0R##", "#..G#", "#..X#", "#####"],
  });
  assert.equal(applyMove(blocked, 0, "right"), null);
});

test("a closing door severs the segment standing in it", () => {
  const state = arena(8, 3);
  put(state, { x: 1, y: 1 }, { fixture: { kind: "button", color: "red" } });
  put(state, { x: 3, y: 1 }, { fixture: { kind: "door", color: "red" } });
  state.worms = [
    worm([
      { x: 4, y: 1 },
      { x: 3, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
    ]),
  ];
  assert.equal(isPressed(state, "red"), true);
  const step = applyMove(state, 0, "right");
  assert.ok(step);
  assert.equal(step.sound, "cut");
  assert.equal(step.state.worms.length, 2);
  assert.deepEqual(step.state.worms[0]?.segments, [
    { x: 5, y: 1 },
    { x: 4, y: 1 },
  ]);
  assert.equal(isPressed(step.state, "red"), false);
});

test("water carries a rock onto a button", () => {
  const state = parseLevel({
    id: "water",
    world: "runnel",
    name: "water",
    hint: "",
    rows: ["#######", "#0R>>B#", "#....G#", "#...X.#", "#######"],
  });
  const step = applyMove(state, 0, "right");
  assert.ok(step);
  assert.equal(step.sound, "splash");
  const button = step.state.cells[1 * 7 + 5];
  assert.equal(button?.fixture?.kind, "button");
  assert.equal(button?.pickup?.kind, "rock");
  assert.equal(isPressed(step.state, "red"), true);
});

test("eggs crack on fissures and can be delivered to nests", () => {
  const crack = parseLevel({
    id: "crack",
    world: "nursery",
    name: "crack",
    hint: "",
    rows: ["######", "#0E.!#", "#..NG#", "#...X#", "######"],
  });
  const picked = applyMove(crack, 0, "right");
  assert.ok(picked);
  assert.equal(picked.state.worms[0]?.carrying, true);
  const broken = applyMove(picked.state, 0, "right");
  assert.ok(broken);
  const shattered = applyMove(broken.state, 0, "right");
  assert.ok(shattered);
  assert.equal(shattered.state.lost, "egg");

  const nest = parseLevel({
    id: "nest",
    world: "nursery",
    name: "nest",
    hint: "",
    rows: ["######", "#0EN.#", "#.G..#", "#.X..#", "######"],
  });
  const carry = applyMove(nest, 0, "right");
  assert.ok(carry);
  const delivered = applyMove(carry.state, 0, "right");
  assert.ok(delivered);
  assert.equal(delivered.state.worms[0]?.carrying, false);
  assert.equal(goalsReady(delivered.state), false);
});

test("scissors split a worm into two", () => {
  const state = parseLevel({
    id: "snip",
    world: "shear",
    name: "snip",
    hint: "",
    rows: ["#######", "#0AAS.#", "#....G#", "#...X.#", "#######"],
  });
  let current = state;
  for (const dir of ["right", "right", "right", "right"] as const) {
    const step = applyMove(current, 0, dir);
    assert.ok(step, formatState(current));
    current = step.state;
  }
  const snip = applySnip(current, 0);
  assert.ok(snip, formatState(current));
  assert.equal(snip.state.worms.length, 2);
  assert.ok(snip.state.worms.every((item) => item.segments.length >= 1));
});

test("the exit stays shut until every goal is done", () => {
  const state = parseLevel({
    id: "exit",
    world: "soil",
    name: "exit",
    hint: "",
    rows: ["#####", "#0.G#", "##X##", "#####"],
  });
  assert.equal(applyMove(state, 0, "down"), null);
  const step = applyMove(state, 0, "right");
  assert.ok(step);
  const gold = applyMove(step.state, 0, "right");
  assert.ok(gold);
  assert.equal(gold.state.won, false);
  const back = applyMove(gold.state, 0, "left");
  assert.ok(back);
  const win = applyMove(back.state, 0, "down");
  assert.ok(win);
  assert.equal(win.state.won, true);
  assert.equal(win.sound, "win");
});

test("one-way tiles only accept the marked direction", () => {
  const state = parseLevel({
    id: "way",
    world: "soil",
    name: "way",
    hint: "",
    rows: ["#######", "#0.r.G#", "#.....#", "#...X.#", "#######"],
  });
  assert.equal(applyMove(state, 0, "right") === null, false);
  const onto = applyMove(applyMove(state, 0, "right")!.state, 0, "right");
  assert.ok(onto);
  const past = applyMove(onto.state, 0, "right");
  assert.ok(past);
  assert.equal(applyMove(past.state, 0, "left"), null);
});

test("a lever toggles a flip-door and toggles it shut again", () => {
  const state = parseLevel({
    id: "lever",
    world: "soil",
    name: "lever",
    hint: "",
    rows: ["#########", "#0..P...#", "#......F#", "#######G#", "#######X#", "#########"],
  });
  let current = state;
  for (const dir of ["right", "right", "right"] as const) {
    const step = applyMove(current, 0, dir);
    assert.ok(step);
    current = step.state;
  }
  assert.equal(current.flips.red, true);
  const back = applyMove(current, 0, "left");
  assert.ok(back);
  const shut = applyMove(back.state, 0, "right");
  assert.ok(shut);
  assert.equal(shut.state.flips.red, false);
});

test("every campaign level parses and has a solution", { timeout: 300_000 }, () => {
  const failures: string[] = [];
  for (const level of LEVELS) {
    try {
      const start = parseLevel(level);
      const needHat = level.rows.some((row) => row.includes("H"));
      const result = solve(start, { needHat, maxNodes: 30_000, maxMoves: 85 });
      if (!result.ok) {
        failures.push(`${level.id} ${result.reason} nodes=${result.nodes}`);
      }
      const shortest = solve(start);
      assert.equal(shortest.moves, level.par, `${level.id}: stale par`);
      let replay = start;
      for (const action of result.path) {
        const wi = replay.worms.findIndex((w) => w.id === action.wormId);
        const step = action.dir === "snip" ? applySnip(replay, wi) : applyMove(replay, wi, action.dir);
        assert.ok(step, `${level.id}: illegal solution step`);
        assert.equal(step.state.lost, null);
        assert.ok(step.state.worms.reduce((n, w) => n + w.segments.length, 0) >= start.worms.reduce((n, w) => n + w.segments.length, 0), `${level.id}: flock lost`);
        replay = step.state;
      }
      assert.equal(replay.won, true, `${level.id}: replay did not win`);
    } catch (error) {
      failures.push(`${level.id} ${error instanceof Error ? error.message : "parse"}`);
    }
  }
  assert.deepEqual(failures, []);
});

test("farm gates stay open while the flock passes, then close without cutting", () => {
  let state = arena(9, 3);
  state.gentle = true;
  state.worms = [worm([{ x: 4, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 1 }])];
  put(state, { x: 1, y: 1 }, { fixture: { kind: "button", color: "red" } });
  put(state, { x: 3, y: 1 }, { fixture: { kind: "door", color: "red" } });
  for (let i = 0; i < 3; i++) {
    const step = applyMove(state, 0, "right");
    assert.ok(step);
    state = step.state;
    assert.equal(state.worms.length, 1);
    assert.equal(state.worms[0]?.segments.length, 4);
    assert.equal(state.lost, null);
    assert.equal(doorIsOpen(state, { color: "red" }), i < 2);
  }
});

test("an already filled nest does not swallow a second egg", () => {
  const state = arena(5, 4);
  state.worms = [worm([{ x: 1, y: 1 }], true)];
  put(state, { x: 2, y: 1 }, { fixture: { kind: "nest", filled: true } });
  const step = applyMove(state, 0, "right");
  assert.ok(step);
  assert.equal(step.state.worms[0]?.carrying, true);
  assert.equal(step.state.cells[7]?.fixture?.kind, "nest");
});

test("a helping hen cannot finish while the lead flock is still away", () => {
  const state = arena(6, 4);
  state.gentle = true;
  state.worms = [worm([{ x: 1, y: 1 }]), { id: "w1", segments: [{ x: 3, y: 2 }], facing: "right", carrying: false }];
  put(state, { x: 4, y: 2 }, { fixture: { kind: "exit" } });
  const step = applyMove(state, 1, "right");
  assert.ok(step);
  assert.equal(step.state.won, false);
  const swapped = structuredClone(state);
  [swapped.worms[0]!.id, swapped.worms[1]!.id] = ["w1", "w0"];
  assert.notEqual(hashState(swapped), hashState(state));
});

test("authored lessons require their intended mechanic", () => {
  for (const id of ["farm-07", "farm-08", "farm-15", "farm-19", "farm-20", "farm-21", "farm-22", "farm-24"]) {
    const state = parseLevel(LEVELS.find((l) => l.id === id)!);
    state.cells.forEach((cell) => { if (cell.pickup?.kind === "rock") cell.pickup = undefined; });
    assert.equal(solve(state, { maxNodes: 30_000 }).reason, "stuck", `${id}: barrel can be bypassed`);
  }
  const grow = parseLevel(LEVELS.find((l) => l.id === "farm-10")!);
  grow.cells.forEach((cell) => { if (cell.pickup?.kind === "apple") cell.pickup = undefined; });
  assert.equal(solve(grow).reason, "stuck", "corn is necessary to reach the gate");
  for (const id of ["farm-12", "farm-23"]) {
    const state = parseLevel(LEVELS.find((l) => l.id === id)!);
    state.worms = state.worms.filter((w) => w.id === "w0");
    assert.equal(solve(state).reason, "stuck", `${id}: helper can be bypassed`);
  }
});
