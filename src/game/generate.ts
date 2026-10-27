import { writeFileSync } from "node:fs";

import { parseLevel } from "./parse";
import { solve } from "./solver";
import type { Level, WorldId } from "./types";

type Grid = string[][];

type Candidate = {
  world: WorldId;
  name: string;
  hint: string;
  rows: string[];
  minMoves: number;
  weight: number;
};

function grid(width: number, height: number, fill = "#"): Grid {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

function put(cells: Grid, x: number, y: number, char: string) {
  const row = cells[y];
  if (!row || x < 0 || x >= row.length) {
    throw new Error(`格子越界 ${x},${y}（${row?.length ?? 0}×${cells.length}）`);
  }
  row[x] = char;
}

function fillRow(cells: Grid, y: number, char: string) {
  const row = cells[y];
  if (!row) throw new Error(`没有第 ${y} 行`);
  for (let x = 1; x < row.length - 1; x++) row[x] = char;
}

function rowsOf(cells: Grid): string[] {
  return cells.map((row) => row.join(""));
}

/** 身体必须够长，才能自己压住按钮并钻进下面唯一的门。 */
function span(length: number): Candidate {
  const apples = length - 1;
  const buttonX = 2;
  const doorX = buttonX + length - 1;
  const width = doorX + 6;
  const cells = grid(width, 7);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  put(cells, 1, 1, "0");
  for (let index = 0; index < apples; index++) put(cells, 2 + index, 1, "A");
  put(cells, buttonX, 2, "B");
  put(cells, doorX, 2, "D");
  fillRow(cells, 3, "#");
  fillRow(cells, 4, "#");
  fillRow(cells, 5, "#");
  put(cells, doorX, 3, ".");
  put(cells, doorX, 4, "G");
  put(cells, doorX, 5, "X");
  return {
    world: "soil",
    name: `${length}节身`,
    hint: `按钮和门隔了 ${length - 1} 格。身体不够长，门就会在你钻进去之前合上。`,
    rows: rowsOf(cells),
    minMoves: 6 + length,
    weight: 8 + length * 3,
  };
}

/** 把石头沿地面向右顶到按钮上，再从左边钻进被封住的门。 */
function rockPush(steps: number): Candidate {
  const rockX = 3;
  const buttonX = rockX + steps;
  const width = buttonX + 2;
  const cells = grid(width, 7);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  put(cells, 1, 1, "0");
  put(cells, rockX, 2, "R");
  put(cells, buttonX, 2, "B");
  fillRow(cells, 3, "#");
  fillRow(cells, 4, "#");
  fillRow(cells, 5, "#");
  put(cells, 2, 3, "D");
  put(cells, 2, 4, "G");
  put(cells, 2, 5, "X");
  return {
    world: "soil",
    name: `顶${steps}格`,
    hint: "石头要顶到按钮上。顶的方向错了，你会把自己的路堵住。",
    rows: rowsOf(cells),
    minMoves: 4 + steps,
    weight: 6 + steps * 2,
  };
}

function waterAcross(length: number): Candidate {
  const width = length + 7;
  const cells = grid(width, 6);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  put(cells, 1, 1, "0");
  put(cells, 3, 1, "R");
  for (let index = 0; index < length; index++) put(cells, 4 + index, 1, ">");
  const buttonX = 4 + length;
  const doorX = buttonX + 1;
  put(cells, buttonX, 1, "B");
  put(cells, doorX, 2, "D");
  fillRow(cells, 3, "#");
  fillRow(cells, 4, "#");
  put(cells, doorX, 3, "G");
  put(cells, doorX, 4, "X");
  return {
    world: "runnel",
    name: length >= 4 ? `长河${length}` : `顺水${length}`,
    hint: "你踏不进水。把石头推进箭头，它会自己冲到岸上的按钮。",
    rows: rowsOf(cells),
    minMoves: 5 + length,
    weight: 7 + length * 2,
  };
}

function waterDown(length: number): Candidate {
  const height = length + 8;
  const cells = grid(7, height);
  fillRow(cells, 1, ".");
  put(cells, 1, 1, "0");
  fillRow(cells, 2, ".");
  put(cells, 3, 2, "R");
  for (let index = 0; index < length; index++) {
    fillRow(cells, 3 + index, ".");
    put(cells, 3, 3 + index, "v");
  }
  const buttonY = 3 + length;
  fillRow(cells, buttonY, ".");
  put(cells, 3, buttonY, "B");
  fillRow(cells, buttonY + 1, "#");
  put(cells, 2, buttonY + 1, "D");
  fillRow(cells, buttonY + 2, "#");
  put(cells, 2, buttonY + 2, "G");
  fillRow(cells, buttonY + 3, "#");
  put(cells, 2, buttonY + 3, "X");
  return {
    world: "runnel",
    name: `下冲${length}`,
    hint: "先站到石头上面，再把它推进向下的水里。",
    rows: rowsOf(cells),
    minMoves: 4 + length,
    weight: 8 + length * 2,
  };
}

function waterTrap(): Candidate {
  const cells = grid(9, 7);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  fillRow(cells, 3, ".");
  put(cells, 1, 2, "0");
  put(cells, 3, 1, "^");
  put(cells, 3, 2, "R");
  put(cells, 4, 2, ">");
  put(cells, 5, 2, ">");
  put(cells, 6, 2, "B");
  put(cells, 7, 3, "D");
  fillRow(cells, 4, "#");
  fillRow(cells, 5, "#");
  put(cells, 7, 4, "G");
  put(cells, 7, 5, "X");
  return {
    world: "runnel",
    name: "别冲错",
    hint: "朝上的水会把石头吞进死角。要开的按钮在右边。",
    rows: rowsOf(cells),
    minMoves: 6,
    weight: 16,
  };
}

function eggAround(width: number): Candidate {
  const cells = grid(width, 6);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  fillRow(cells, 3, ".");
  fillRow(cells, 4, ".");
  put(cells, 1, 1, "0");
  put(cells, 2, 1, "!");
  put(cells, Math.min(5, width - 3), 1, "E");
  put(cells, 1, 3, "N");
  put(cells, width - 3, 3, "G");
  put(cells, width - 3, 4, "X");
  return {
    world: "nursery",
    name: `绕缝${width}`,
    hint: "衔着蛋踩上裂缝，蛋就碎了。碎了只能撤销。",
    rows: rowsOf(cells),
    minMoves: 8,
    weight: 12 + width,
  };
}

function eggDoor(steps: number): Candidate {
  const rockX = 3;
  const buttonX = rockX + steps;
  const width = buttonX + 2;
  const cells = grid(width, 8);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  put(cells, 1, 1, "0");
  put(cells, 2, 1, "!");
  put(cells, Math.min(buttonX, width - 2), 1, "E");
  put(cells, rockX, 2, "R");
  put(cells, buttonX, 2, "B");
  for (let y = 3; y <= 6; y++) fillRow(cells, y, "#");
  put(cells, 2, 3, "D");
  put(cells, 2, 4, "N");
  put(cells, 2, 5, "G");
  put(cells, 2, 6, "X");
  return {
    world: "nursery",
    name: `送蛋${steps}`,
    hint: "先让石头压住门，再把蛋送进去。带着蛋时不要抄裂缝。",
    rows: rowsOf(cells),
    minMoves: 8 + steps,
    weight: 14 + steps * 2,
  };
}

function daisyHall(length: number): Candidate {
  const width = length + 4;
  const cells = grid(width, 5);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  fillRow(cells, 3, ".");
  put(cells, 1, 1, "0");
  put(cells, 2, 1, "*");
  put(cells, width - 2, 1, "G");
  put(cells, 3, 2, "!");
  put(cells, width - 2, 3, "X");
  return {
    world: "nursery",
    name: `弹${length}格`,
    hint: "从雏菊上离开时，你会顺着那个方向再滑出几格。滑进裂缝会磕碎蛋；这一关先别往下踩。",
    rows: rowsOf(cells),
    minMoves: 3,
    weight: 8 + length,
  };
}

function twoEggs(): Candidate {
  const cells = grid(11, 7);
  for (let y = 1; y <= 5; y++) fillRow(cells, y, ".");
  put(cells, 1, 1, "0");
  put(cells, 3, 1, "E");
  put(cells, 8, 1, "E");
  for (let y = 1; y <= 4; y++) put(cells, 5, y, "#");
  put(cells, 2, 4, "N");
  put(cells, 8, 4, "N");
  put(cells, 8, 5, "G");
  put(cells, 3, 5, "X");
  put(cells, 4, 2, "!");
  return {
    world: "nursery",
    name: "两枚蛋",
    hint: "两个巢都要填。中间的墙和裂缝会逼你换一条路。",
    rows: rowsOf(cells),
    minMoves: 12,
    weight: 22,
  };
}

function scissors(apples: number, doorX: number): Candidate {
  const width = doorX + 3;
  const cells = grid(width, 7);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  put(cells, 1, 1, "0");
  for (let index = 0; index < apples; index++) put(cells, 2 + index, 1, "A");
  put(cells, 2 + apples + 1, 1, "S");
  put(cells, 1, 2, "B");
  put(cells, doorX, 2, "D");
  for (let y = 3; y <= 5; y++) fillRow(cells, y, "#");
  put(cells, doorX, 3, ".");
  put(cells, doorX, 4, "G");
  put(cells, doorX, 5, "X");
  return {
    world: "shear",
    name: `剪开门${doorX}`,
    hint: "吃完苹果也不够长。站到剪刀上按空格，剪掉中间那一节，分成两条虫。一条留下压按钮。",
    rows: rowsOf(cells),
    minMoves: 8,
    weight: 18 + doorX,
  };
}

function pair(doorX: number): Candidate {
  const width = doorX + 3;
  const cells = grid(width, 6);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  put(cells, 1, 1, "0");
  put(cells, 2, 2, "a");
  put(cells, 3, 2, "B");
  put(cells, doorX, 2, "D");
  fillRow(cells, 3, "#");
  fillRow(cells, 4, "#");
  put(cells, doorX, 3, "G");
  put(cells, doorX, 4, "X");
  return {
    world: "shear",
    name: `分头${doorX}`,
    hint: "现在有两条虫。点另一条，或按 Tab。一条压按钮，另一条去钻门。",
    rows: rowsOf(cells),
    minMoves: 6,
    weight: 10 + doorX,
  };
}

function keyGate(gap: number): Candidate {
  const lockX = 4 + gap;
  const width = lockX + 2;
  const cells = grid(width, 6);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  put(cells, 1, 1, "0");
  put(cells, 3, 1, "K");
  put(cells, lockX, 2, "L");
  fillRow(cells, 3, "#");
  fillRow(cells, 4, "#");
  put(cells, lockX, 3, "G");
  put(cells, lockX, 4, "X");
  return {
    world: "shear",
    name: `钥匙${gap}`,
    hint: "先拿到钥匙，再走进锁。锁后面才是金苹果。",
    rows: rowsOf(cells),
    minMoves: 6 + gap,
    weight: 8 + gap * 2,
  };
}

function keyBehindRock(steps: number): Candidate {
  const cells = grid(steps + 8, 6);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  put(cells, 1, 1, "0");
  put(cells, 3, 1, "R");
  put(cells, 4 + steps, 1, "K");
  const lockX = cells[0]!.length - 2;
  put(cells, lockX, 2, "L");
  fillRow(cells, 3, "#");
  fillRow(cells, 4, "#");
  put(cells, lockX, 3, "G");
  put(cells, lockX, 4, "X");
  return {
    world: "shear",
    name: `搬开${steps}`,
    hint: "钥匙被石头挡着。先想好要把石头顶到哪里，别把钥匙顶进死角。",
    rows: rowsOf(cells),
    minMoves: 8 + steps,
    weight: 14 + steps * 2,
  };
}

function snipThenLock(doorX: number): Candidate {
  const cells = grid(doorX + 3, 7);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  put(cells, 1, 1, "0");
  put(cells, 2, 1, "A");
  put(cells, 3, 1, "A");
  put(cells, 5, 1, "S");
  put(cells, doorX - 1, 1, "K");
  put(cells, 1, 2, "B");
  put(cells, doorX, 2, "L");
  for (let y = 3; y <= 5; y++) fillRow(cells, y, "#");
  put(cells, doorX, 3, ".");
  put(cells, doorX, 4, "G");
  put(cells, doorX, 5, "X");
  return {
    world: "shear",
    name: `深处${doorX}`,
    hint: "一把锁、一个按钮、一把剪刀。一个人压不住按钮还去开锁。",
    rows: rowsOf(cells),
    minMoves: 10,
    weight: 24 + doorX,
  };
}

function paintDot(candidate: Candidate, char: string, suffix: string, extraHint: string, weight: number, moves: number): Candidate | null {
  const cells = candidate.rows.map((row) => row.split(""));
  const row = cells[1];
  const width = row?.length ?? 0;
  if (!row) return null;
  for (let x = width - 2; x >= 2; x--) {
    if (row[x] !== ".") continue;
    row[x] = char;
    return {
      ...candidate,
      name: `${candidate.name}${suffix}`,
      hint: `${candidate.hint}${extraHint}`,
      rows: cells.map((line) => line.join("")),
      weight: candidate.weight + weight,
      minMoves: candidate.minMoves + moves,
    };
  }
  return null;
}

function withHat(candidate: Candidate): Candidate | null {
  return paintDot(candidate, "H", "·帽", " 旁边有帽子，戴上再离开才算挖干净。", 8, 2);
}

function withSecondGold(candidate: Candidate): Candidate | null {
  return paintDot(candidate, "G", "·双果", " 还有一枚金苹果不在主路上，两枚都要拿到，洞口才开。", 10, 3);
}

function withDirt(candidate: Candidate): Candidate | null {
  return paintDot(candidate, ",", "·土", " 路上埋着土。吃下去会从身后排出来，可能堵住你刚走过的格子。", 7, 1);
}

/** 河往左流，虫子从右边把石头推进来。 */
function waterLeft(length: number): Candidate {
  const width = length + 7;
  const cells = grid(width, 6);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  put(cells, 2, 1, "B");
  for (let index = 0; index < length; index++) put(cells, 3 + index, 1, "<");
  put(cells, 3 + length, 1, "R");
  put(cells, width - 2, 1, "0");
  put(cells, 1, 2, "D");
  fillRow(cells, 3, "#");
  fillRow(cells, 4, "#");
  put(cells, 1, 3, "G");
  put(cells, 1, 4, "X");
  return {
    world: "runnel",
    name: `左流${length}`,
    hint: "站到石头右边，把它推进向左的水。冲错方向就进不了左边的门。",
    rows: rowsOf(cells),
    minMoves: 5 + length,
    weight: 9 + length * 2,
  };
}

/** 左右各有一枚金苹果，中间才能下到洞口。一边可能挡着石头。 */
function twoGolds(left: number, right: number): Candidate {
  const width = left + right + 3;
  const cells = grid(width, 5);
  fillRow(cells, 1, ".");
  fillRow(cells, 2, ".");
  fillRow(cells, 3, "#");
  const mid = left + 1;
  put(cells, mid, 1, "0");
  put(cells, 1, 1, "G");
  put(cells, width - 2, 1, "G");
  put(cells, mid, 3, "X");
  if (left >= 4) put(cells, 2, 1, "R");
  if (right >= 4) put(cells, width - 3, 1, ",");
  return {
    world: "soil",
    name: `两边${left}+${right}`,
    hint: "左右各一枚金苹果。只拿一枚，洞口不会开。石头和土会挡在某一边。",
    rows: rowsOf(cells),
    minMoves: left + right,
    weight: 12 + left + right,
  };
}

function push(list: Candidate[], candidate: Candidate | null) {
  if (candidate) list.push(candidate);
}

function lessons(): Candidate[] {
  const plain = (name: string, hint: string, rows: string[]): Candidate => ({
    world: "soil",
    name,
    hint,
    rows,
    minMoves: 1,
    weight: 1,
  });
  return [
    plain("第一口", "点一格，或按住方向键。金苹果会打开洞口。", ["#######", "#0...G#", "#.....#", "#...X.#", "#######"]),
    plain("吞下去", "吃掉的土会从尾巴后面排出来，土不会变少。", ["########", "#0,,,G.#", "#......#", "#.....X#", "########"]),
    plain("红苹果", "红苹果让你长长一节。变长以后，尾巴不会立刻跟上。", ["########", "#0.A...#", "#......#", "#..G...#", "#..X...#", "########"]),
    plain("让一让", "石头可以顶开，一次一块，也不能顶进墙里。", ["#######", "#0R..G#", "#.....#", "#...X.#", "#######"]),
  ];
}

function candidates(): Candidate[] {
  const list: Candidate[] = lessons();
  const bases: Candidate[] = [];
  for (const length of [3, 4, 5, 6, 7]) bases.push(span(length));
  for (const steps of [1, 2, 3, 4, 5, 6, 7, 8]) bases.push(rockPush(steps));
  for (const length of [1, 2, 3, 4, 5, 6]) bases.push(waterAcross(length));
  for (const length of [1, 2, 3, 4, 5]) bases.push(waterDown(length));
  for (const length of [1, 2, 3, 4, 5]) bases.push(waterLeft(length));
  bases.push(waterTrap());
  for (const width of [8, 9, 10, 11, 12, 13, 14]) bases.push(eggAround(width));
  for (const steps of [1, 2, 3, 4, 5, 6]) bases.push(eggDoor(steps));
  for (const length of [4, 5, 6, 7, 8, 9, 10]) bases.push(daisyHall(length));
  bases.push(twoEggs());
  for (const left of [2, 3, 4, 5, 6]) {
    for (const right of [2, 4, 6]) bases.push(twoGolds(left, right));
  }
  for (const apples of [2, 3]) {
    for (const doorX of [7, 8, 9, 10, 11, 12]) {
      if (1 + apples < doorX) bases.push(scissors(apples, doorX));
    }
  }
  for (const doorX of [5, 6, 7, 8, 9, 10, 11]) bases.push(pair(doorX));
  for (const gap of [1, 2, 3, 4, 5, 6, 7]) bases.push(keyGate(gap));
  for (const steps of [1, 2, 3, 4]) bases.push(keyBehindRock(steps));
  for (const doorX of [8, 9, 10, 11, 12]) bases.push(snipThenLock(doorX));

  for (const base of bases) {
    list.push(base);
    push(list, withHat(base));
    push(list, withSecondGold(base));
    push(list, withDirt(base));
  }
  return list;
}

function scoreOf(moves: number, weight: number): number {
  return moves + weight;
}

function signature(rows: string[]): string {
  const kinds = [...new Set(rows.join("").replace(/[#.]/g, ""))].sort().join("");
  return `${kinds}:${rows.length}x${rows[0]?.length ?? 0}`;
}

type Kept = Level & { moves: number; nodes: number; score: number };

function evaluate(list: Candidate[]): { kept: Kept[]; rejected: string[] } {
  const kept: Kept[] = [];
  const rejected: string[] = [];
  const seen = new Set<string>();
  for (const candidate of list) {
    const key = candidate.rows.join("/");
    if (seen.has(key)) continue;
    seen.add(key);
    let parsed;
    try {
      parsed = parseLevel({
        id: "try",
        world: candidate.world,
        name: candidate.name,
        hint: candidate.hint,
        rows: candidate.rows,
      });
    } catch (error) {
      rejected.push(`${candidate.world} ${candidate.name} 解析失败 ${error instanceof Error ? error.message : ""}`);
      continue;
    }
    const needHat = candidate.rows.some((row) => row.includes("H"));
    const result = solve(parsed, { needHat, maxNodes: 22_000, maxMoves: 80 });
    if (!result.ok || result.moves < candidate.minMoves) {
      rejected.push(
        `${candidate.world} ${candidate.name} ${result.ok ? `太短 ${result.moves}<${candidate.minMoves}` : result.reason} nodes=${result.nodes}`,
      );
      continue;
    }
    const score = scoreOf(result.moves, candidate.weight);
    kept.push({
      id: "",
      world: candidate.world,
      name: candidate.name,
      hint: candidate.hint,
      rows: candidate.rows,
      rank: "0",
      moves: result.moves,
      nodes: result.nodes,
      score,
    });
  }
  return { kept, rejected };
}

function pickDiverse(bin: Kept[], limit: number): Kept[] {
  const sorted = [...bin].sort((a, b) => a.score - b.score || a.moves - b.moves);
  const picked: Kept[] = [];
  const seen = new Set<string>();
  for (const level of sorted) {
    const key = signature(level.rows);
    if (seen.has(key)) continue;
    seen.add(key);
    picked.push(level);
    if (picked.length === limit) return picked;
  }
  for (const level of sorted) {
    if (picked.length === limit) break;
    if (!picked.includes(level)) picked.push(level);
  }
  return picked;
}

const TEACHING = ["第一口", "吞下去", "红苹果", "让一让"];

export function bakeGenerated(): Level[] {
  const { kept, rejected } = evaluate(candidates());
  const sorted = [...kept].sort((a, b) => a.score - b.score || a.moves - b.moves);
  const bins: Kept[][] = Array.from({ length: 10 }, () => []);
  sorted.forEach((level, index) => {
    const tier = Math.min(9, Math.floor((index * 10) / Math.max(sorted.length, 1)));
    bins[tier]?.push(level);
  });
  const chosen: Level[] = [];
  bins.forEach((bin, tierIndex) => {
    let group = pickDiverse(bin, 20);
    if (tierIndex === 0) {
      const taught = TEACHING.map((name) => sorted.find((level) => level.name === name)).filter(
        (level): level is Kept => !!level,
      );
      const rest = group.filter((level) => !TEACHING.includes(level.name));
      group = [...taught, ...rest].slice(0, 20);
    }
    const rank = String(tierIndex + 1);
    group.forEach((level, index) => {
      chosen.push({
        id: `d${rank}-${String(index + 1).padStart(2, "0")}`,
        world: level.world,
        name: level.name,
        hint: level.hint,
        rows: level.rows,
        rank,
      });
    });
    const scores = group.map((level) => level.score);
    const low = scores[0] ?? 0;
    const high = scores[scores.length - 1] ?? 0;
    console.log(`第${rank}档 ${group.length}关 分数 ${low}–${high}`);
  });
  const short = chosen.length < 200 ? `，不足 200（可用题 ${kept.length}）` : "";
  console.log(`保留 ${chosen.length} 关${short}，淘汰 ${rejected.length} 关`);
  const stuck = rejected.filter((line) => line.includes("stuck") || line.includes("budget") || line.includes("解析")).length;
  console.log(`其中走不通或超时 ${stuck}`);
  return chosen;
}

function emit(levels: Level[]): string {
  const body = levels
    .map((level) => {
      const rows = level.rows.map((row) => `    ${JSON.stringify(row)},`).join("\n");
      return `  {
    id: ${JSON.stringify(level.id)},
    world: ${JSON.stringify(level.world)},
    name: ${JSON.stringify(level.name)},
    hint: ${JSON.stringify(level.hint)},
    rank: ${JSON.stringify(level.rank)},
    rows: [
${rows}
    ],
  }`;
    })
    .join(",\n");
  return `// 由 pnpm gen:levels 生成。改规则请编辑 src/game/generate.ts 后重新生成。
import type { Level } from "./types";

export const BAKED: Level[] = [
${body},
];
`;
}

const entry = process.argv[1] ?? "";
if (entry.endsWith("generate.ts")) {
  const levels = bakeGenerated();
  writeFileSync(new URL("./baked-levels.ts", import.meta.url), emit(levels));
}
