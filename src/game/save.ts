export type DigSaveData = {
  cleared: string[];
  hats: string[];
  jigsaws: string[];
  best: { id: string; moves: number }[];
};

export const emptySave: DigSaveData = { cleared: [], hats: [], jigsaws: [], best: [] };

function strings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function normalizeSave(value: unknown): DigSaveData {
  if (!value || typeof value !== "object") return emptySave;
  const record = value as Record<string, unknown>;
  return {
    cleared: strings(record.cleared),
    hats: strings(record.hats),
    jigsaws: strings(record.jigsaws),
    best: bestOf(record.best),
  };
}

function bestOf(value: unknown): { id: string; moves: number }[] {
  if (!Array.isArray(value)) return [];
  const best: { id: string; moves: number }[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== "string" || typeof record.moves !== "number") continue;
    best.push({ id: record.id, moves: record.moves });
  }
  return best;
}

export function mergeSave(left: DigSaveData, right: DigSaveData): DigSaveData {
  const union = (a: string[], b: string[]) => [...new Set([...a, ...b])];
  const best = new Map<string, number>();
  for (const item of [...left.best, ...right.best]) {
    const previous = best.get(item.id);
    if (previous === undefined || item.moves < previous) best.set(item.id, item.moves);
  }
  return {
    cleared: union(left.cleared, right.cleared),
    hats: union(left.hats, right.hats),
    jigsaws: union(left.jigsaws, right.jigsaws),
    best: [...best].map(([id, moves]) => ({ id, moves })),
  };
}

export function sameSave(left: DigSaveData, right: DigSaveData): boolean {
  const eq = (a: string[], b: string[]) =>
    a.length === b.length && a.every((item) => b.includes(item));
  const sameBest =
    left.best.length === right.best.length &&
    left.best.every((item) =>
      right.best.some((other) => other.id === item.id && other.moves === item.moves),
    );
  return eq(left.cleared, right.cleared) && eq(left.hats, right.hats) && eq(left.jigsaws, right.jigsaws) && sameBest;
}
