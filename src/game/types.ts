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
  | { kind: "roost"; used: boolean }
  | { kind: "crack" }
  | { kind: "nest"; filled: boolean }
  | { kind: "lock" };

/** A thing that is picked up or pushed. A cell has at most one. */
export type Pickup =
  | { kind: "rock"; id?: string }
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
  /** Farm campaign gates wait for the entire flock to pass safely. */
  gentle?: boolean;
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
  | "fledge"
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
  motion?: { id: string; path: Point[] }[];
};

export type WorldId = "soil" | "runnel" | "nursery" | "shear";

export type Level = {
  gentle?: boolean;
  hints?: string[];
  insight?: string;
  challenge?: boolean;
  difficulty?: 1 | 2 | 3 | 4 | 5;
  tutorial?: boolean;
  requires?: ("fledge" | "push" | "grow" | "water")[];
  id: string;
  world: WorldId;
  name: string;
  hint: string;
  rows: string[];
  /** 1–10 */
  rank?: string;
  par?: number;
};
