export type Dir = "up" | "down" | "left" | "right";

export type Terrain = "floor" | "dirt" | "wall" | "water";

export type Color = "red" | "blue";

/** Stays on the cell when a worm walks over it, or when a rock sits on it. */
export type Fixture =
  | { kind: "button"; color: Color }
  | { kind: "door"; color: Color; gate?: "hold" | "flip" }
  | { kind: "lever"; color: Color }
  | { kind: "oneway"; dir: Dir }
  | { kind: "exit" }
  | { kind: "daisy" }
  | { kind: "scissors" }
  | { kind: "crack" }
  | { kind: "nest"; filled: boolean }
  | { kind: "lock" };

/** A thing that is picked up or pushed. A cell has at most one. */
export type Pickup =
  | { kind: "rock" }
  | { kind: "apple" }
  | { kind: "gold" }
  | { kind: "egg" }
  | { kind: "key" }
  | { kind: "hat"; id: string };

export type Cell = {
  terrain: Terrain;
  flow?: Dir;
  fixture?: Fixture;
  pickup?: Pickup;
};

export type Point = { x: number; y: number };

export type Worm = {
  id: string;
  segments: Point[];
  facing: Dir;
  carrying: boolean;
};

export type GameState = {
  levelId: string;
  width: number;
  height: number;
  cells: Cell[];
  worms: Worm[];
  activeId: string;
  keys: number;
  hats: string[];
  flips: { red: boolean; blue: boolean };
  won: boolean;
  lost: "egg" | "dead" | null;
  moves: number;
  nextWorm: number;
};

export type Sound =
  | "move"
  | "eat"
  | "push"
  | "grow"
  | "gold"
  | "cut"
  | "egg"
  | "crack"
  | "win"
  | "lock"
  | "splash"
  | "spring"
  | "hat"
  | "key"
  | "no";

export type StepResult = {
  state: GameState;
  sound: Sound;
};

export type WorldId = "soil" | "runnel" | "nursery" | "shear";

export type Level = {
  id: string;
  world: WorldId;
  name: string;
  hint: string;
  rows: string[];
  /** 1–10 */
  rank?: string;
  par?: number;
};
