import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyMove,
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
      const result = solve(start, { needHat, maxNodes: 160_000, maxMoves: 85 });
      if (!result.ok) {
        failures.push(`${level.id} ${result.reason} nodes=${result.nodes}`);
      }
      const shortest = solve(start);
      assert.equal(shortest.moves, level.par, `${level.id}: stale par`);
      let replay = start;
      for (const action of result.path) {
        const step = replayAction(replay, action);
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

test("water motion records every bend and never teleports through the flock", () => {
  const state = parseLevel(LEVELS.find((l) => l.id === "flock-19")!);
  const step = applyMove(state, 0, "right")!;
  assert.ok(step);
  assert.deepEqual(step.motion?.[0]?.path, [{ x: 2, y: 1 }, { x: 3, y: 1 }, { x: 4, y: 1 }, { x: 4, y: 2 }, { x: 4, y: 3 }]);
  assert.equal(step.motion?.[0]?.id, "crate-2-1");
});

test("planning puzzles require repositioning and a genuine gate handoff", () => {
  for (const id of ["flock-05", "flock-06", "flock-14", "flock-20", "flock-23"]) {
    let state = parseLevel(LEVELS.find((l) => l.id === id)!);
    const route = solve(state).path;
    const directions = new Set<string>(); let pushes = 0;
    for (const action of route) {
      const step = replayAction(state, action)!;
      if (step.motion?.length) { pushes++; directions.add(action.dir); }
      state = step.state;
    }
    assert.ok(pushes >= 4 && directions.size >= 3, `${id}: crate puzzle became a straight push`);
  }
  const handoff = solve(parseLevel(LEVELS.find((l) => l.id === "flock-07")!)).path;
  let previous = "w0", switches = 0;
  for (const action of handoff) { if (previous !== action.wormId) switches++; previous = action.wormId; }
  assert.ok(switches >= 4, "two gates must require handing control back and forth");
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
  const core=LEVELS.filter(l=>l.world==="orchard"&&!l.challenge);
  const save={...emptySave,cleared:core.map(l=>l.id),best:core.map(l=>({id:l.id,moves:100}))};
  const progress=chapterProgress("orchard",save);
  assert.equal(progress.earned,true);
  assert.equal(progress.perfect,false);
  assert.equal(progress.mastered,0);
  assert.equal(progress.challenges,0);
  assert.equal(continueJourney(core.at(-1)!.id,save),"flock-35");
  assert.equal(recommendedLevel(save,"orchard"),"flock-34");
  assert.equal(recommendedLevel(emptySave),"flock-01");
  const all={...emptySave,cleared:LEVELS.map(l=>l.id),best:LEVELS.map(l=>({id:l.id,moves:l.par!}))};
  assert.equal(recommendedLevel(all),null);
  assert.equal(continueJourney("flock-40-r2",all),null);
  assert.equal(chapterProgress("pond",all).perfect,true);
});

test("the authored sequence teaches each rule before its combinations", () => {
  const firstEgg=LEVELS.find(l=>l.rows.join("").includes("E"))!;
  const firstFledge=LEVELS.find(l=>l.rows.join("").includes("S"))!;
  assert.equal(firstEgg.id,"flock-03");
  assert.equal(firstFledge.id,"flock-04");
  for(const mechanic of ["grow","push","fledge","water","bell","bridge"] as const) {
    assert.equal(LEVELS.find(l=>l.requires?.includes(mechanic))?.tutorial,true,mechanic);
  }
  assert.equal(new Set(LEVELS.map(l=>l.id)).size,LEVELS.length);
});

test("bell parity requires three rings", () => {
  let state=parseLevel(getLevel("flock-30")!); let rings=0;
  for(const action of solve(state).path) { const step=replayAction(state,action)!; if(step.state.flips.red!==state.flips.red) rings++; state=step.state; }
  assert.equal(rings,3);
});

test("the bridge loop needs four continuous occupants, not just visiting a bridge", () => {
  const level=getLevel("flock-36-r2")!;
  const short=parseLevel({...level,rows:level.rows.map(row=>row.replace("A","."))});
  assert.equal(solve(short).reason,"stuck");
  let unprepared=parseLevel(level);
  for(const dir of ["right","right","up","right","down"] as const) unprepared=applyMove(unprepared,0,dir)!.state;
  assert.equal(solve(unprepared).reason,"stuck","taking the direct route before growing loses the return bridge");
  let state=parseLevel(level);let bridgeEntries=0;
  for(const action of solve(state).path) {
    state=replayAction(state,action)!.state;
    const head=state.worms[0]!.segments[0]!;
    if(head.x===5 && head.y===2) {
      bridgeEntries++;
      assert.deepEqual(state.cells[2*state.width+5]!.fixture,{kind:"bridge",collapsed:false});
    }
  }
  assert.equal(bridgeEntries,2);
  assert.equal(state.won,true);
});

test("the orchard delivery requires opening the bell route before picking up the egg", () => {
  const initial=parseLevel(getLevel("flock-32-r2")!);
  const tooSoon=applyMove(initial,0,"left")!;
  assert.equal(tooSoon.state.worms[0]!.carrying,true);
  assert.equal(solve(tooSoon.state).reason,"stuck");
  const opened=applyMove(applyMove(initial,0,"down")!.state,0,"right")!;
  assert.equal(opened.state.flips.red,true);
  assert.equal(solve(opened.state).ok,true);
  assert.equal(initial.worms[0]!.carrying,false,"undo preserves the chance to prepare first");
});

test("two deliveries require both leaders, and the finale reserves a third crossing", () => {
  for(const id of ["flock-38-r2","flock-40-r2"]) {
    let state=parseLevel(getLevel(id)!); const deliveredBy=new Set<string>();
    const count=(s:GameState)=>s.cells.filter(c=>c.fixture?.kind==="nest"&&c.fixture.filled).length;
    for(const action of solve(state).path) {
      const step=replayAction(state,action)!;
      if(count(step.state)>count(state))deliveredBy.add(action.wormId);
      state=step.state;
    }
    assert.equal(state.won,true);
    assert.deepEqual([...deliveredBy].sort(),["w0","w1"]);
    assert.equal(state.cells.filter(c=>c.fixture?.kind==="bridge"&&c.fixture.collapsed).length,id==="flock-40-r2"?3:2);
  }
});

test("the crate bridge puzzle punishes using the return bridge before shipping the crate", () => {
  const initial=parseLevel(getLevel("flock-39-r2")!);
  let state=initial;
  for(const dir of ["down","down","right","right","right"] as const) state=applyMove(state,0,dir)!.state;
  assert.equal(solve(state).reason,"stuck");
  assert.equal(initial.cells[4*initial.width+4]!.terrain,"floor","undo history retains the bridge");
  const directions=new Set<string>(); let pushes=0; state=initial;
  for(const action of solve(state).path) {
    const step=replayAction(state,action)!;
    if(step.motion?.length) {pushes++;directions.add(action.dir);}
    state=step.state;
  }
  assert.ok(pushes>=5);
  assert.ok(directions.size>=3);
  assert.equal(state.won,true);
});

test("revised geometry keeps old records separate while resuming the corresponding board", () => {
  assert.equal(getLevel("flock-40")?.id,"flock-40-r2");
  assert.equal(getLevel("flock-36")?.id,"flock-36-r2");
  const previous={...emptySave,cleared:["flock-35","flock-36","flock-38","flock-39","flock-40"],best:[{id:"flock-40",moves:1}]};
  assert.equal(chapterProgress("pond",previous).done,1);
  assert.equal(chapterProgress("pond",previous).mastered,0);
  assert.equal(recommendedLevel(previous,"pond"),"flock-36-r2");
});
