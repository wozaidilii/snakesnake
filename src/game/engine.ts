import type {
  Cell,
  Color,
  Dir,
  GameState,
  Point,
  Sound,
  StepResult,
  Worm,
} from "./types";

export const DIRS: Dir[] = ["up", "down", "left", "right"];

export const DIR_DELTA: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const SOUND_RANK: Record<Sound, number> = {
  no: -1,
  move: 0,
  push: 10,
  eat: 20,
  spring: 25,
  splash: 30,
  key: 40,
  lock: 40,
  egg: 45,
  grow: 50,
  hat: 60,
  gold: 70,
  cut: 80,
  crack: 90,
  win: 100,
};

function louder(current: Sound, next: Sound): Sound {
  return SOUND_RANK[next] > SOUND_RANK[current] ? next : current;
}

export function add(p: Point, dir: Dir): Point {
  const d = DIR_DELTA[dir];
  return { x: p.x + d.x, y: p.y + d.y };
}

export function inside(state: GameState, p: Point): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < state.width && p.y < state.height;
}

export function at(state: GameState, p: Point): Cell | undefined {
  if (!inside(state, p)) return undefined;
  return state.cells[p.y * state.width + p.x];
}

function same(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

type SegRef = { wormIndex: number; segIndex: number };

function findSeg(state: GameState, p: Point): SegRef | null {
  for (let wormIndex = 0; wormIndex < state.worms.length; wormIndex++) {
    const worm = state.worms[wormIndex];
    if (!worm) continue;
    for (let segIndex = 0; segIndex < worm.segments.length; segIndex++) {
      const seg = worm.segments[segIndex];
      if (seg && same(seg, p)) return { wormIndex, segIndex };
    }
  }
  return null;
}

export function doorIsOpen(
  state: GameState,
  door: { color: Color; gate?: "hold" | "flip" },
): boolean {
  if (state.gentle && state.worms.some((worm) => worm.segments.some((point) => {
    const fixture = at(state, point)?.fixture;
    return fixture?.kind === "door" && fixture.color === door.color && fixture.gate === door.gate;
  }))) return true;
  if (door.gate === "flip") return state.flips[door.color];
  return isPressed(state, door.color);
}

export function isPressed(state: GameState, color: Color): boolean {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const cell = state.cells[y * state.width + x];
      if (cell?.fixture?.kind !== "button" || cell.fixture.color !== color) {
        continue;
      }
      if (cell.pickup?.kind === "rock") return true;
      if (findSeg(state, { x, y })) return true;
    }
  }
  return false;
}

export function goalsReady(state: GameState): boolean {
  if (state.worms.some((worm) => worm.carrying)) return false;
  for (const cell of state.cells) {
    if (cell.pickup?.kind === "gold" || cell.pickup?.kind === "egg") return false;
    if (cell.fixture?.kind === "nest" && !cell.fixture.filled) return false;
  }
  return true;
}

export function activeIndex(state: GameState): number {
  const index = state.worms.findIndex((worm) => worm.id === state.activeId);
  return index < 0 ? 0 : index;
}

function tailOf(worm: Worm): { point: Point; index: number } | null {
  const index = worm.segments.length - 1;
  const point = worm.segments[index];
  if (!point) return null;
  return { point, index };
}

function canLandRock(state: GameState, p: Point, ignore: Point | null): boolean {
  const cell = at(state, p);
  if (!cell) return false;
  if (cell.terrain === "wall" || cell.terrain === "dirt") return false;
  const occ = findSeg(state, p);
  if (occ && !(ignore && same(p, ignore))) return false;
  if (cell.terrain === "water") return !cell.pickup;
  if (cell.pickup) return false;
  const fixture = cell.fixture?.kind;
  return (
    fixture === undefined ||
    fixture === "button" ||
    fixture === "crack" ||
    fixture === "oneway"
  );
}

function shiftWorm(
  state: GameState,
  wormIndex: number,
  dir: Dir,
  grow: boolean,
  excrete: boolean,
): void {
  const worm = state.worms[wormIndex];
  if (!worm) return;
  const head = worm.segments[0];
  if (!head) return;
  const dest = add(head, dir);
  const tail = worm.segments[worm.segments.length - 1];
  if (grow) {
    worm.segments = [dest, ...worm.segments];
  } else {
    worm.segments = [dest, ...worm.segments.slice(0, -1)];
    if (excrete && tail) {
      const cell = at(state, tail);
      if (cell && cell.terrain === "floor") cell.terrain = "dirt";
    }
  }
  worm.facing = dir;
}

function movePickup(state: GameState, from: Point, to: Point): void {
  const src = at(state, from);
  const dst = at(state, to);
  if (!src || !dst) return;
  dst.pickup = src.pickup;
  src.pickup = undefined;
}

/** Slides a rock that is currently on water. Returns true if it moved at least once. */
function slideRock(state: GameState, start: Point): boolean {
  let cursor = start;
  let moved = false;
  for (let guard = 0; guard < 24; guard++) {
    const cell = at(state, cursor);
    if (cell?.terrain !== "water" || !cell.flow || cell.pickup?.kind !== "rock") {
      return moved;
    }
    const next = add(cursor, cell.flow);
    if (!canLandRock(state, next, null)) return moved;
    movePickup(state, cursor, next);
    moved = true;
    cursor = next;
    if (at(state, cursor)?.terrain !== "water") return moved;
  }
  return moved;
}

function rockTouchesWorm(state: GameState): boolean {
  for (let y = 0; y < state.height; y++) {
    for (let x = 0; x < state.width; x++) {
      const cell = state.cells[y * state.width + x];
      if (cell?.pickup?.kind === "rock" && findSeg(state, { x, y })) return true;
    }
  }
  return false;
}

function resolveCuts(state: GameState): boolean {
  if (state.gentle) return false;
  let any = false;
  for (let pass = 0; pass < 8; pass++) {
    let cutThisPass = false;
    const nextWorms: Worm[] = [];
    for (const worm of state.worms) {
      const cuts = new Set<number>();
      worm.segments.forEach((seg, index) => {
        const fixture = at(state, seg)?.fixture;
        if (fixture?.kind === "door" && !doorIsOpen(state, fixture)) {
          cuts.add(index);
        }
      });
      if (cuts.size === 0) {
        nextWorms.push(worm);
        continue;
      }
      cutThisPass = true;
      any = true;
      if (cuts.has(0) && worm.carrying) state.lost = "egg";
      let run: Point[] = [];
      const runs: Point[][] = [];
      worm.segments.forEach((seg, index) => {
        if (cuts.has(index)) {
          if (run.length > 0) runs.push(run);
          run = [];
        } else {
          run.push(seg);
        }
      });
      if (run.length > 0) runs.push(run);
      const keepId = !cuts.has(0);
      runs.forEach((segments, index) => {
        nextWorms.push({
          id: index === 0 && keepId ? worm.id : `w${state.nextWorm++}`,
          segments,
          facing: worm.facing,
          carrying: index === 0 && keepId ? worm.carrying : false,
        });
      });
    }
    state.worms = nextWorms;
    if (!cutThisPass) break;
  }
  if (state.worms.length === 0 && !state.lost) state.lost = "dead";
  if (!state.worms.some((worm) => worm.id === state.activeId)) {
    state.activeId = state.worms[0]?.id ?? state.activeId;
  }
  return any;
}

function finish(state: GameState, sound: Sound, cut: boolean): StepResult {
  if (cut) sound = louder(sound, "cut");
  if (!state.lost && goalsReady(state)) {
    const escaped = state.worms.some((worm) => {
      if (state.gentle && worm.id !== "w0") return false;
      const head = worm.segments[0];
      return head ? at(state, head)?.fixture?.kind === "exit" : false;
    });
    if (escaped) {
      state.won = true;
      sound = "win";
    }
  }
  return { state, sound };
}

function springAhead(state: GameState, wormIndex: number, dir: Dir): number {
  let steps = 0;
  while (steps < 3) {
    const worm = state.worms[wormIndex];
    const head = worm?.segments[0];
    if (!worm || !head) break;
    const dest = add(head, dir);
    const cell = at(state, dest);
    if (!cell || cell.terrain !== "floor") break;
    const occ = findSeg(state, dest);
    const tail = tailOf(worm);
    const intoTail =
      !!occ &&
      !!tail &&
      occ.wormIndex === wormIndex &&
      occ.segIndex === tail.index &&
      same(dest, tail.point);
    if (occ && !intoTail) break;
    if (cell.fixture?.kind === "crack" && !occ) {
      if (worm.carrying) {
        worm.carrying = false;
        state.lost = "egg";
      }
      shiftWorm(state, wormIndex, dir, false, false);
      steps += 1;
      break;
    }
    if (cell.fixture || cell.pickup) break;
    shiftWorm(state, wormIndex, dir, false, false);
    steps += 1;
  }
  return steps;
}

export function applyMove(
  state: GameState,
  wormIndex: number,
  dir: Dir,
): StepResult | null {
  if (state.won || state.lost) return null;
  const worm = state.worms[wormIndex];
  const head = worm?.segments[0];
  if (!worm || !head) return null;
  const dest = add(head, dir);
  const destCell = at(state, dest);
  if (!destCell) return null;
  if (destCell.terrain === "wall" || destCell.terrain === "water") return null;

  const growing = destCell.pickup?.kind === "apple";
  const tail = tailOf(worm);
  const fixture = destCell.fixture;

  if (fixture?.kind === "oneway" && fixture.dir !== dir) return null;
  if (fixture?.kind === "door" && !doorIsOpen(state, fixture)) return null;
  if (fixture?.kind === "lock" && state.keys < 1) return null;
  if (fixture?.kind === "exit" && !goalsReady(state)) return null;

  const pushing = destCell.pickup?.kind === "rock";
  if (pushing) {
    const beyond = add(dest, dir);
    const ignore = !growing && tail ? tail.point : null;
    const beyondFixture = at(state, beyond)?.fixture;
    if (beyondFixture?.kind === "oneway" && beyondFixture.dir !== dir) return null;
    if (!canLandRock(state, beyond, ignore)) return null;
  } else {
    const occ = findSeg(state, dest);
    const intoTail =
      !!occ &&
      !!tail &&
      !growing &&
      occ.wormIndex === wormIndex &&
      occ.segIndex === tail.index;
    if (occ && !intoTail) return null;
    if (destCell.pickup?.kind === "egg" && worm.carrying) return null;
  }

  const next = structuredClone(state);
  const moving = next.worms[wormIndex];
  if (!moving) return null;
  next.activeId = moving.id;
  next.moves += 1;

  let sound: Sound = "move";
  if (pushing) {
    const beyond = add(dest, dir);
    movePickup(next, dest, beyond);
    sound = "push";
    if (slideRock(next, beyond)) sound = "splash";
  }

  const cell = at(next, dest);
  if (!cell || !moving.segments[0]) return null;
  const ateDirt = cell.terrain === "dirt";
  const grow = cell.pickup?.kind === "apple";
  const leftDaisy = at(next, head)?.fixture?.kind === "daisy";

  if (ateDirt) {
    cell.terrain = "floor";
    sound = louder(sound, "eat");
  }
  if (cell.pickup?.kind === "apple") {
    cell.pickup = undefined;
    sound = louder(sound, "grow");
  } else if (cell.pickup?.kind === "gold") {
    cell.pickup = undefined;
    sound = louder(sound, "gold");
  } else if (cell.pickup?.kind === "key") {
    cell.pickup = undefined;
    next.keys += 1;
    sound = louder(sound, "key");
  } else if (cell.pickup?.kind === "hat") {
    const hatId = cell.pickup.id;
    cell.pickup = undefined;
    if (!next.hats.includes(hatId)) next.hats.push(hatId);
    sound = louder(sound, "hat");
  } else if (cell.pickup?.kind === "egg") {
    cell.pickup = undefined;
    moving.carrying = true;
    sound = louder(sound, "egg");
  }

  if (cell.fixture?.kind === "nest" && !cell.fixture.filled && moving.carrying) {
    cell.fixture = { kind: "nest", filled: true };
    moving.carrying = false;
    sound = louder(sound, "egg");
  }
  if (cell.fixture?.kind === "lock") {
    cell.fixture = undefined;
    next.keys -= 1;
    sound = louder(sound, "lock");
  }
  if (cell.fixture?.kind === "crack" && moving.carrying) {
    moving.carrying = false;
    next.lost = "egg";
    sound = louder(sound, "crack");
  }

  shiftWorm(next, wormIndex, dir, grow, ateDirt && !grow);

  const landed = moving.segments[0];
  const landedFixture = landed ? at(next, landed)?.fixture : undefined;
  if (landedFixture?.kind === "lever") {
    next.flips[landedFixture.color] = !next.flips[landedFixture.color];
    sound = louder(sound, "lock");
  }

  if (leftDaisy && !next.lost) {
    const flown = springAhead(next, wormIndex, dir);
    if (flown > 0) sound = louder(sound, next.lost === "egg" ? "crack" : "spring");
  }

  if (rockTouchesWorm(next)) return null;

  const cut = resolveCuts(next);
  return finish(next, sound, cut);
}

export function applySnip(state: GameState, wormIndex: number): StepResult | null {
  if (state.won || state.lost) return null;
  const worm = state.worms[wormIndex];
  if (!worm || worm.segments.length < 2) return null;
  const onScissors: number[] = [];
  worm.segments.forEach((seg, index) => {
    if (at(state, seg)?.fixture?.kind === "scissors") onScissors.push(index);
  });
  if (onScissors.length === 0) return null;
  const middle = onScissors.find(
    (index) => index > 0 && index < worm.segments.length - 1,
  );
  const cutIndex = middle ?? onScissors[0];
  if (cutIndex === undefined) return null;

  const next = structuredClone(state);
  const target = next.worms[wormIndex];
  if (!target) return null;
  next.activeId = target.id;
  next.moves += 1;
  if (cutIndex === 0 && target.carrying) next.lost = "egg";

  const left = target.segments.slice(0, cutIndex);
  const right = target.segments.slice(cutIndex + 1);
  const pieces: Worm[] = [];
  if (left.length > 0) {
    pieces.push({ ...target, segments: left });
  }
  if (right.length > 0) {
    pieces.push({
      id: left.length > 0 ? `w${next.nextWorm++}` : target.id,
      segments: right,
      facing: target.facing,
      carrying: false,
    });
  }
  next.worms.splice(wormIndex, 1, ...pieces);
  if (next.worms.length === 0) next.lost = next.lost ?? "dead";
  if (!next.worms.some((item) => item.id === next.activeId)) {
    next.activeId = next.worms[0]?.id ?? next.activeId;
  }
  const cut = resolveCuts(next);
  return finish(next, "cut", cut);
}

export function canSnip(state: GameState, wormIndex: number): boolean {
  return applySnip(state, wormIndex) !== null;
}

export function legalDirs(state: GameState, wormIndex: number): Dir[] {
  return DIRS.filter((dir) => applyMove(state, wormIndex, dir) !== null);
}

export function formatState(state: GameState): string {
  const rows: string[] = [];
  const marks = new Map<string, string>();
  state.worms.forEach((worm, wormIndex) => {
    worm.segments.forEach((seg, segIndex) => {
      const label =
        segIndex === 0 ? (wormIndex === 0 ? "H" : "h") : String(segIndex % 10);
      marks.set(`${seg.x},${seg.y}`, worm.carrying && segIndex === 0 ? "E" : label);
    });
  });
  for (let y = 0; y < state.height; y++) {
    let line = "";
    for (let x = 0; x < state.width; x++) {
      const mark = marks.get(`${x},${y}`);
      if (mark) {
        line += mark;
        continue;
      }
      const cell = state.cells[y * state.width + x];
      if (!cell) {
        line += "?";
        continue;
      }
      if (cell.pickup?.kind === "rock") line += "R";
      else if (cell.pickup?.kind === "apple") line += "A";
      else if (cell.pickup?.kind === "gold") line += "G";
      else if (cell.pickup?.kind === "egg") line += "e";
      else if (cell.pickup?.kind === "key") line += "K";
      else if (cell.pickup?.kind === "hat") line += "T";
      else if (cell.terrain === "wall") line += "#";
      else if (cell.terrain === "dirt") line += ",";
      else if (cell.terrain === "water") line += cell.flow ?? "~";
      else if (cell.fixture?.kind === "button") line += cell.fixture.color === "red" ? "B" : "b";
      else if (cell.fixture?.kind === "door") line += cell.fixture.color === "red" ? "D" : "d";
      else if (cell.fixture?.kind === "exit") line += "X";
      else if (cell.fixture?.kind === "daisy") line += "*";
      else if (cell.fixture?.kind === "scissors") line += "S";
      else if (cell.fixture?.kind === "crack") line += "!";
      else if (cell.fixture?.kind === "nest") line += cell.fixture.filled ? "n" : "N";
      else if (cell.fixture?.kind === "lock") line += "L";
      else line += ".";
    }
    rows.push(line);
  }
  return rows.join("\n");
}
