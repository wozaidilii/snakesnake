import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyMove,
  isReverse,
  legalDirs,
  OPPOSITE,
  applySnip,
  applyFledge,
  fledgeCandidates,
  formatState,
  goalsReady,
  isPressed,
  doorIsOpen,
} from "./engine";
import { LEVELS, getLevel } from "./levels";
import { chapterProgress, continueJourney, recommendedLevel } from "./progression";
import { emptySave } from "./save";
import { parseLevel } from "./parse";
import { hashState, replayAction, solve } from "./solver";
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

test("legacy rules retain the length-2 reversal for archived boards", () => {
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

test("forward campaign blocks reversal for solo heads and two-member flocks without spending a move", () => {
  for (const length of [1,2,3]) {
    const state=arena(8,6); state.noReverse=true;
    state.worms=[worm(Array.from({length},(_,i)=>({x:4-i,y:3})))];
    const snapshot=structuredClone(state);
    assert.equal(applyMove(state,0,"left"),null);
    assert.equal(isReverse(state,0,"left"),true);
    assert.equal(legalDirs(state,0).includes("left"),false);
    assert.deepEqual(state,snapshot);
    const turn=applyMove(state,0,"up")!;
    assert.equal(turn.state.worms[0]!.facing,"up");
    assert.equal(applyMove(turn.state,0,"down"),null);
    assert.ok(applyMove(turn.state,0,"left"),"two successive side turns face the opposite direction with real space");
  }
});

test("hitting a wall cannot rotate a head to bypass the no-reverse rule", () => {
  const state=arena(6,3);state.noReverse=true;state.worms=[worm([{x:2,y:1}])];
  assert.equal(applyMove(state,0,"up"),null);
  assert.equal(state.worms[0]!.facing,"right");
  assert.equal(applyMove(state,0,"left"),null);
  assert.equal(state.moves,0);
});

test("growing and switching preserve heading, and a fledged tail faces its own former leader", () => {
  const state=arena(8,6);state.gentle=true;state.noReverse=true;
  state.worms=[worm([{x:4,y:2},{x:3,y:2},{x:3,y:3}])];
  put(state,{x:3,y:3},{fixture:{kind:"roost",used:false}});
  const split=applyFledge(state,0,2)!.state;
  assert.equal(split.worms[0]!.facing,"right");
  assert.equal(split.worms[1]!.facing,"up");
  assert.equal(applyMove({...split,activeId:"w0"},1,"down"),null);
  assert.equal(applyMove({...split,activeId:"w1"},0,"left"),null);
  assert.equal(split.moves,1);
  const grown=arena(6,4);grown.noReverse=true;grown.worms=[worm([{x:2,y:2}])];
  put(grown,{x:3,y:2},{pickup:{kind:"apple"}});
  const ate=applyMove(grown,0,"right")!.state;
  assert.equal(ate.worms[0]!.segments.length,2);
  assert.equal(applyMove(ate,0,"left"),null);
});

test("solver distinguishes opposite headings at the same square", () => {
  const start=parseLevel({id:"heading",name:"heading",world:"soil",hint:"",gentle:true,noReverse:true,rows:["######","#0.GX#","######"]});
  const opposite=structuredClone(start);opposite.worms[0]!.facing="left";
  assert.notEqual(hashState(start),hashState(opposite));
  assert.equal(solve(start).ok,true);
  assert.equal(solve(opposite).reason,"stuck");
  const restored=structuredClone(start);
  assert.equal(restored.worms[0]!.facing,"right");
  assert.equal(OPPOSITE[restored.worms[0]!.facing],"left");
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
      assert.equal(start.noReverse, true, `${level.id}: campaign must require forward movement`);
      const result = solve(start, { needHat, maxNodes: 1_000_000, maxMoves: 150 });
      if (!result.ok) {
        failures.push(`${level.id} ${result.reason} nodes=${result.nodes}`);
        continue;
      }
      const shortest = solve(start);
      assert.equal(shortest.moves, level.par, `${level.id}: stale par`);
      let replay = start;
      for (const action of result.path) {
        const step = replayAction(replay, action);
        assert.ok(step, `${level.id}: illegal solution step`);
        if (action.dir !== "fledge" && action.dir !== "snip") assert.equal(isReverse(replay, replay.worms.findIndex(w=>w.id===action.wormId), action.dir), false, `${level.id}: solution reversed`);
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
  for (const level of LEVELS) for (const mechanic of level.requires ?? []) {
    const result = solve(parseLevel(level), { forbid: mechanic });
    assert.equal(result.reason, "stuck", `${level.id}: ${mechanic} must be required (a search budget is not proof)`);
  }
});

test("fledging conserves the flock, retains the egg, consumes the patch and can be undone", () => {
  const state = arena(8, 4);
  state.gentle = true;
  state.worms = [worm([{ x: 5, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 2 }], true)];
  put(state, { x: 3, y: 2 }, { fixture: { kind: "roost", used: false } });
  const snapshot = structuredClone(state);
  const step = applyFledge(state, 0)!;
  assert.ok(step);
  assert.equal(step.sound, "fledge");
  assert.deepEqual(step.state.worms.map((w) => [w.id, w.segments.length, w.carrying]), [["w0", 2, true], ["w1", 2, false]]);
  assert.equal(step.state.activeId, "w1");
  assert.deepEqual(step.state.cells[19]?.fixture, { kind: "roost", used: true });
  assert.equal(step.state.moves, 1);
  assert.deepEqual(state, snapshot, "undo snapshot must stay untouched");
  assert.equal(applyFledge(step.state, 1), null);
  assert.deepEqual(applyFledge(state, 0), step, "restoring the snapshot restores the patch and IDs");
});

test("fledging is explicit, excludes the mother and supports choosing among chicks", () => {
  const state = arena(8, 4);
  state.worms = [worm([{ x: 5, y: 2 }, { x: 4, y: 2 }, { x: 3, y: 2 }])];
  for (const x of [3, 4, 5]) put(state, { x, y: 2 }, { fixture: { kind: "roost", used: false } });
  assert.deepEqual(fledgeCandidates(state, 0), [1, 2]);
  assert.equal(applyFledge(state, 0, 0), null);
  assert.equal(applyFledge(state, 0, 7), null);
  assert.equal(applyFledge(state, 0, 2)?.state.worms[0]?.segments.length, 2);
  assert.equal(applyFledge(state, 0, 1)?.state.worms[0]?.segments.length, 1);
  const used = structuredClone(state);
  put(used, { x: 4, y: 2 }, { fixture: { kind: "roost", used: true } });
  assert.notEqual(hashState(state), hashState(used));
});

test("lily pads wait for the entire flock, restore on undo and affect solver identity", () => {
  const initial = arena(9, 4);
  initial.gentle = true;
  initial.worms = [worm([{x:3,y:1},{x:2,y:1},{x:1,y:1}])];
  put(initial, {x:3,y:1}, {fixture:{kind:"bridge",collapsed:false}});
  const snapshot = structuredClone(initial);
  let state = initial;
  for (let n=0;n<3;n++) {
    const step=applyMove(state,0,"right")!;
    assert.ok(step);
    assert.deepEqual(step.state.cells[12]!.fixture,{kind:"bridge",collapsed:n===2});
    assert.equal(step.state.cells[12]!.terrain,n===2?"water":"floor");
    assert.equal(step.state.lost,null);
    assert.equal(step.state.worms[0]!.segments.length,3);
    assert.equal(step.ripples?.length,n===2?1:0);
    state=step.state;
  }
  assert.deepEqual(initial,snapshot);
  const comparison=structuredClone(state); comparison.cells[12]!.fixture={kind:"bridge",collapsed:false}; comparison.cells[12]!.terrain="floor";
  assert.notEqual(hashState(state),hashState(comparison));
  assert.deepEqual(applyMove(initial,0,"right"),applyMove(snapshot,0,"right"));
});

test("a crate and a hen can hand off the same lily pad without sinking it", () => {
  const initial=arena(8,4); initial.gentle=true;
  initial.worms=[worm([{x:1,y:1}])];
  put(initial,{x:2,y:1},{fixture:{kind:"bridge",collapsed:false},pickup:{kind:"rock",id:"crate"}});
  const handoff=applyMove(initial,0,"right")!;
  assert.equal(handoff.state.cells[10]!.terrain,"floor");
  assert.deepEqual(handoff.ripples,[]);
  const leave=applyMove(handoff.state,0,"down")!;
  assert.equal(leave.state.cells[10]!.terrain,"water");
  assert.equal(applyMove(leave.state,0,"up"),null);
  assert.equal(initial.cells[10]!.pickup?.kind,"rock");
});

test("only hen heads ring bells, and bell gates are independent from pressure gates", () => {
  const initial=arena(8,4); initial.gentle=true;
  initial.worms=[worm([{x:2,y:1},{x:1,y:1}])];
  put(initial,{x:3,y:1},{fixture:{kind:"lever",color:"red"}});
  const rung=applyMove(initial,0,"right")!;
  assert.equal(rung.state.flips.red,true);
  assert.equal(rung.sound,"bell");
  const chick=applyMove(rung.state,0,"right")!;
  assert.equal(chick.state.flips.red,true);
  assert.equal(doorIsOpen(chick.state,{color:"red"}),false);
  assert.equal(doorIsOpen(chick.state,{color:"red",gate:"flip"}),true);
  const second=applyMove(chick.state,0,"left")!;
  assert.equal(second.state.flips.red,false);
  assert.equal(rung.state.flips.red,true);
});

test("chapter keepsakes and recommended routes do not demand optional challenges or optimal play", () => {
  const core=LEVELS.filter(l=>l.world==="soil"&&!l.challenge);
  const save={...emptySave,cleared:core.map(l=>l.id),best:core.map(l=>({id:l.id,moves:500}))};
  const progress=chapterProgress("soil",save);
  assert.equal(progress.earned,true);
  assert.equal(progress.perfect,false);
  assert.equal(progress.mastered,0);
  assert.equal(recommendedLevel(emptySave),"gugu-01");
  assert.equal(continueJourney("gugu-01",emptySave),"gugu-02");
  const all={...emptySave,cleared:LEVELS.map(l=>l.id),best:LEVELS.map(l=>({id:l.id,moves:l.par!}))};
  assert.equal(recommendedLevel(all),null);
  assert.equal(continueJourney("gugu-05",all),null);
  assert.equal(chapterProgress("soil",all).perfect,true);
});

test("the authored sequence teaches each rule before its combinations", () => {
  assert.deepEqual(LEVELS.map(l=>l.id),["gugu-01","gugu-02","gugu-03","gugu-04","gugu-05"]);
  for(const mechanic of ["grow","push"] as const) {
    assert.equal(LEVELS.find(l=>l.requires?.includes(mechanic))?.tutorial,true,mechanic);
  }
  assert.equal(new Set(LEVELS.map(l=>l.id)).size,LEVELS.length);
});

test("a door opens only while every button of its group is held", () => {
  const state=parseLevel(getLevel("gugu-05")!);
  const buttons=state.cells.flatMap((c,i)=>c.fixture?.kind==="button"?[i]:[]);
  assert.equal(buttons.length,2);
  assert.equal(isPressed(state,"red"),false);
  const one=structuredClone(state); one.cells[buttons[0]!]!.pickup={kind:"rock"};
  assert.equal(isPressed(one,"red"),false);
  const both=structuredClone(one); both.cells[buttons[1]!]!.pickup={kind:"rock"};
  assert.equal(isPressed(both,"red"),true);
});

