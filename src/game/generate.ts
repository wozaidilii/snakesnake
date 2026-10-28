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
    name: `${length}只`,
    hint: `踏板和栅门隔了 ${length - 1} 格。小鸡不够多，栅门会在你走进去之前合上。`,
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
    name: `推${steps}格`,
    hint: "木桶要推到踏板上。推的方向错了，你会把自己的路堵住。",
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
    name: length >= 4 ? `长渠${length}` : `顺渠${length}`,
    hint: "你踏不进水渠。把木桶推进箭头，它会自己冲到岸上的踏板。",
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
    hint: "先站到木桶上面，再把它推进向下的水渠。",
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
    hint: "朝上的水渠会把木桶冲进死角。要开的踏板在右边。",
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
    name: `绕坑${width}`,
    hint: "衔着蛋踩上泥坑，蛋就碎了。碎了只能撤销。",
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
    hint: "先让木桶压住栅门，再把蛋送进去。带着蛋时不要抄泥坑。",
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
    name: `滑${length}格`,
    hint: "从向日葵上离开时，你会顺着那个方向再滑出几格。滑进泥坑会磕碎蛋；这一关先别往下踩。",
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
    name: "两窝蛋",
    hint: "两个鸡窝都要填。中间的栅栏和泥坑会逼你换一条路。",
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
    name: `剪开栏${doorX}`,
    hint: "吃完玉米也不够长。站到篱剪上按空格，剪开中间那只小鸡，分成两只母鸡。一只留下压踏板。",
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
    name: `分群${doorX}`,
    hint: "现在有两只母鸡。点另一只，或按 Tab。一只压踏板，另一只去进栅门。",
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
    hint: "先拿到钥匙，再走进门闩。门闩后面才是金蛋。",
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
    hint: "钥匙被木桶挡着。先想好要把木桶推到哪里，别把钥匙推进死角。",
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
    name: `里院${doorX}`,
    hint: "一把门闩、一块踏板、一把篱剪。一只母鸡压不住踏板还去开门闩。",
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
  return paintDot(candidate, "H", "·草帽", " 旁边有草帽，戴上再离开才算收干净。", 8, 2);
}

function withSecondGold(candidate: Candidate): Candidate | null {
  return paintDot(candidate, "G", "·双蛋", " 还有一枚金蛋不在主路上，两枚都要拿到，鸡舍门才开。", 10, 3);
}

function withDirt(candidate: Candidate): Candidate | null {
  return paintDot(candidate, ",", "·谷", " 路上埋着谷。啄下去会从队尾排出来，可能堵住你刚走过的格子。", 7, 1);
}

/** 水渠往左流，母鸡从右边把木桶推进来。 */
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
    name: `左渠${length}`,
    hint: "站到木桶右边，把它推进向左的水渠。冲错方向就进不了左边的栅门。",
    rows: rowsOf(cells),
    minMoves: 5 + length,
    weight: 9 + length * 2,
  };
}

/** 左右各有一枚金蛋，中间才能走到鸡舍门。一边可能挡着木桶。 */
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
    hint: "左右各一枚金蛋。只拿一枚，鸡舍门不会开。木桶和谷会挡在某一边。",
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
    plain("进院", "点一格，或按住方向键。金蛋会打开鸡舍门。", ["#######", "#0...G#", "#.....#", "#...X.#", "#######"]),
    plain("啄谷", "啄掉的谷会从队尾排出来，谷不会变少。", ["########", "#0,,,G.#", "#......#", "#.....X#", "########"]),
    plain("吃玉米", "玉米会叫来一只黄小鸡。小鸡多了以后，队尾不会立刻跟上。", ["########", "#0.A...#", "#......#", "#..G...#", "#..X...#", "########"]),
    plain("让开桶", "木桶可以推开，一次一只，也不能推进栅栏里。", ["#######", "#0R..G#", "#.....#", "#...X.#", "#######"]),
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

type Kept = Level & { moves: number; nodes: number; score: number };

/** 同一条走廊拉长几次，玩法并没有变。 */
function familyOf(name: string): string {
  const base = name.split("·")[0] ?? name;
  if (base === "进院" || base === "啄谷" || base === "吃玉米" || base === "让开桶") return base;
  if (base.startsWith("两边")) return "两边";
  if (base.startsWith("顺渠") || base.startsWith("长渠")) return "右渠";
  if (base.startsWith("左渠")) return "左渠";
  if (base.startsWith("下冲")) return "下冲";
  if (base.startsWith("别冲错")) return "别冲错";
  if (base.startsWith("推")) return "推";
  if (base.startsWith("滑")) return "滑";
  if (base.startsWith("绕坑")) return "绕坑";
  if (base.startsWith("送蛋")) return "送蛋";
  if (base.startsWith("剪开栏")) return "剪开栏";
  if (base.startsWith("分群")) return "分群";
  if (base.startsWith("钥匙")) return "钥匙";
  if (base.startsWith("搬开")) return "搬开";
  if (base.startsWith("里院")) return "里院";
  if (base.endsWith("只")) return "只";
  return base.replace(/\d+/g, "");
}

function twistOf(name: string): string {
  const mark = name.indexOf("·");
  return mark < 0 ? "" : name.slice(mark + 1);
}

/** 拉长走廊不会变成新题。只有格子关系会变的题，才再留一道难的。 */
const SCALING = new Set(["只", "剪开栏", "分群", "里院", "两边", "送蛋", "搬开"]);

function harder(a: Kept, b: Kept): Kept {
  if (a.nodes !== b.nodes) return a.nodes > b.nodes ? a : b;
  if (a.moves !== b.moves) return a.moves > b.moves ? a : b;
  return a.score >= b.score ? a : b;
}

function isPuzzle(level: Kept, introMoves: number): boolean {
  return level.moves >= Math.max(10, introMoves + 3) && level.nodes >= 80;
}

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

const TEACHING = ["进院", "啄谷", "吃玉米", "让开桶"];

function byFamily(levels: Kept[]): Map<string, Kept[]> {
  const groups = new Map<string, Kept[]>();
  for (const level of levels) {
    const key = familyOf(level.name);
    const list = groups.get(key) ?? [];
    list.push(level);
    groups.set(key, list);
  }
  return groups;
}

/** 每种玩法先走一道入门，再留一道分叉最多的题。谷、草帽、双蛋不各做一遍。 */
function selectCampaign(kept: Kept[]): { teaching: Kept[]; chapters: Kept[][] } {
  const teaching: Kept[] = [];
  for (const name of TEACHING) {
    const level = kept.find((item) => item.name === name);
    if (level) teaching.push(level);
  }
  const groups = byFamily(kept.filter((level) => !TEACHING.includes(level.name)));
  const chapters: { introScore: number; levels: Kept[] }[] = [];
  for (const [family, levels] of groups) {
    const plains = levels.filter((level) => twistOf(level.name) === "");
    plains.sort((a, b) => a.score - b.score || a.moves - b.moves || a.nodes - b.nodes);
    const intro = plains[0];
    const chapter: Kept[] = [];
    if (intro) chapter.push(intro);
    const introMoves = intro?.moves ?? 0;
    if (intro && SCALING.has(family)) {
      const hardest = plains.reduce(harder);
      if (hardest !== intro && isPuzzle(hardest, introMoves)) chapter.push(hardest);
    }
    let bestTwist: Kept | null = null;
    for (const level of levels) {
      if (!twistOf(level.name) || !isPuzzle(level, introMoves)) continue;
      if (!bestTwist || harder(level, bestTwist) === level) bestTwist = level;
    }
    if (bestTwist) chapter.push(bestTwist);
    if (chapter.length === 0) continue;
    chapters.push({ introScore: intro?.score ?? chapter[0]?.score ?? 0, levels: chapter });
  }
  chapters.sort((a, b) => a.introScore - b.introScore);
  const glued: Kept[][] = [];
  let pending: Kept[] = [];
  for (const chapter of chapters) {
    pending.push(...chapter.levels);
    const hasPuzzle = chapter.levels.some((level) => isPuzzle(level, 0));
    if (hasPuzzle) {
      glued.push(pending);
      pending = [];
    }
  }
  if (pending.length > 0) {
    const last = glued.at(-1);
    if (last) last.push(...pending);
    else glued.push(pending);
  }
  return { teaching, chapters: glued };
}

function tierSizes(count: number): number[] {
  const sizes = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  let cursor = 0;
  while (cursor < count && cursor < sizes.length) {
    sizes[cursor] = 1;
    cursor++;
  }
  const later = [8, 8, 7, 7, 6, 6, 5, 5, 4, 4, 3, 2, 1, 0];
  let index = 0;
  while (cursor < count) {
    const slot = later[index % later.length] ?? 8;
    sizes[slot] = (sizes[slot] ?? 0) + 1;
    cursor++;
    index++;
  }
  return sizes;
}

export function bakeGenerated(): Level[] {
  const { kept, rejected } = evaluate(candidates());
  const { teaching, chapters } = selectCampaign(kept);
  const bins: Kept[][] = [teaching];
  const sizes = tierSizes(chapters.length);
  let cursor = 0;
  for (const size of sizes) {
    const group: Kept[] = [];
    for (const chapter of chapters.slice(cursor, cursor + size)) group.push(...chapter);
    bins.push(group);
    cursor += size;
  }
  const chosen: Level[] = [];
  bins.forEach((group, tierIndex) => {
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
    const names = group.map((level) => `${level.name}(${level.moves}步/${level.nodes})`).join("，");
    console.log(`第${rank}档 ${group.length}关 ${names}`);
  });
  console.log(`保留 ${chosen.length} 关，候选 ${kept.length}，淘汰 ${rejected.length}`);
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
