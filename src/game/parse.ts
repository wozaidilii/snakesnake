import type { Cell, Dir, GameState, Level, Point, Worm } from "./types";

const FLOW: Record<string, Dir> = {
  ">": "right",
  "<": "left",
  "^": "up",
  v: "down",
};

function facingOf(segments: Point[]): Dir {
  const head = segments[0];
  const neck = segments[1];
  if (!head || !neck) return "right";
  if (head.x === neck.x + 1) return "right";
  if (head.x === neck.x - 1) return "left";
  if (head.y === neck.y + 1) return "down";
  return "up";
}

function chain(levelId: string, label: string, found: { ord: number; x: number; y: number }[]): Point[] {
  if (found.length === 0) return [];
  const ordered = [...found].sort((a, b) => a.ord - b.ord);
  ordered.forEach((part, index) => {
    if (part.ord !== index) {
      throw new Error(`${levelId} 的${label}编号不连续`);
    }
  });
  for (let index = 1; index < ordered.length; index++) {
    const prev = ordered[index - 1];
    const curr = ordered[index];
    if (!prev || !curr) continue;
    const dist = Math.abs(prev.x - curr.x) + Math.abs(prev.y - curr.y);
    if (dist !== 1) throw new Error(`${levelId} 的${label}没有连在一起`);
  }
  return ordered.map((part) => ({ x: part.x, y: part.y }));
}

export function parseLevel(level: Level): GameState {
  const height = level.rows.length;
  const width = level.rows[0]?.length ?? 0;
  if (width === 0 || height === 0) throw new Error(`${level.id} 是空关卡`);
  level.rows.forEach((row, index) => {
    if (row.length !== width) {
      throw new Error(`${level.id} 第 ${index + 1} 行宽度是 ${row.length}，不是 ${width}`);
    }
  });

  const cells: Cell[] = [];
  const head: { ord: number; x: number; y: number }[] = [];
  const friend: { ord: number; x: number; y: number }[] = [];

  for (let y = 0; y < height; y++) {
    const row = level.rows[y] ?? "";
    for (let x = 0; x < width; x++) {
      const char = row[x] ?? " ";
      const cell: Cell = { terrain: "floor" };
      if (char >= "0" && char <= "9") {
        head.push({ ord: Number(char), x, y });
      } else if (char === "a") {
        friend.push({ ord: 0, x, y });
      } else if (char === "#") cell.terrain = "wall";
      else if (char === ",") cell.terrain = "dirt";
      else if (char === ".") {
        /* floor */
      } else if (char in FLOW) {
        cell.terrain = "water";
        cell.flow = FLOW[char];
      } else if (char === "R") cell.pickup = { kind: "rock", id: `crate-${x}-${y}` };
      else if (char === "A") cell.pickup = { kind: "apple" };
      else if (char === "G") cell.pickup = { kind: "gold" };
      else if (char === "E") cell.pickup = { kind: "egg" };
      else if (char === "K") cell.pickup = { kind: "key" };
      else if (char === "H") cell.pickup = { kind: "hat", id: `${level.id}-hat` };
      else if (char === "B") cell.fixture = { kind: "button", color: "red" };
      else if (char === "b") cell.fixture = { kind: "button", color: "blue" };
      else if (char === "D") cell.fixture = { kind: "door", color: "red" };
      else if (char === "d") cell.fixture = { kind: "door", color: "blue" };
      else if (char === "X") cell.fixture = { kind: "exit" };
      else if (char === "*") cell.fixture = { kind: "daisy" };
      else if (char === "S") cell.fixture = level.gentle ? { kind: "roost", used: false } : { kind: "scissors" };
      else if (char === "!") cell.fixture = { kind: "crack" };
      else if (char === "N") cell.fixture = { kind: "nest", filled: false };
      else if (char === "L") cell.fixture = { kind: "lock" };
      else if (char === "P") cell.fixture = { kind: "lever", color: "red" };
      else if (char === "p") cell.fixture = { kind: "lever", color: "blue" };
      else if (char === "F") cell.fixture = { kind: "door", color: "red", gate: "flip" };
      else if (char === "f") cell.fixture = { kind: "door", color: "blue", gate: "flip" };
      else if (char === "r") cell.fixture = { kind: "oneway", dir: "right" };
      else if (char === "l") cell.fixture = { kind: "oneway", dir: "left" };
      else if (char === "u") cell.fixture = { kind: "oneway", dir: "up" };
      else if (char === "j") cell.fixture = { kind: "oneway", dir: "down" };
      else throw new Error(`${level.id} 有无法识别的格子 “${char}”`);
      cells.push(cell);
    }
  }

  const worms: Worm[] = [];
  const main = chain(level.id, "母鸡", head);
  if (main.length === 0) throw new Error(`${level.id} 没有母鸡`);
  worms.push({ id: "w0", segments: main, facing: facingOf(main), carrying: false });
  const extra = chain(level.id, "同伴", friend);
  if (extra.length > 0) {
    worms.push({ id: "w1", segments: extra, facing: facingOf(extra), carrying: false });
  }

  const state: GameState = {
    gentle: level.gentle,
    levelId: level.id,
    width,
    height,
    cells,
    worms,
    activeId: "w0",
    keys: 0,
    hats: [],
    flips: { red: false, blue: false },
    won: false,
    lost: null,
    moves: 0,
    nextWorm: worms.length,
  };

  const gold = cells.filter((cell) => cell.pickup?.kind === "gold").length;
  const exits = cells.filter((cell) => cell.fixture?.kind === "exit").length;
  const eggs = cells.filter((cell) => cell.pickup?.kind === "egg").length;
  const nests = cells.filter((cell) => cell.fixture?.kind === "nest").length;
  if (gold < 1) throw new Error(`${level.id} 没有收集目标`);
  if (exits !== 1) throw new Error(`${level.id} 应该有且只有一个出口`);
  if (eggs !== nests) throw new Error(`${level.id} 的蛋和巢数量不一致`);
  return state;
}
