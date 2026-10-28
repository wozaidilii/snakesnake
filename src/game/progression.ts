import { LEVELS, WORLDS, levelsIn } from "./levels";
import type { DigSaveData } from "./save";
import type { WorldId } from "./types";

/** Completion comes first. Optimal routes and optional challenges never block a chapter. */
export function chapterProgress(world: WorldId, save: DigSaveData) {
  const levels = levelsIn(world);
  const core = levels.filter((level) => !level.challenge);
  const cleared = new Set(save.cleared);
  const done = core.filter((level) => cleared.has(level.id)).length;
  const mastered = levels.filter((level) => level.par !== undefined && save.best.some((b) => b.id === level.id && b.moves <= level.par!)).length;
  return { done, total: core.length, earned: done === core.length, mastered, perfect: mastered === levels.length,
    challenges: levels.filter((l) => l.challenge && cleared.has(l.id)).length };
}

export function recommendedLevel(save: DigSaveData, world?: WorldId): string | null {
  const pool = world ? levelsIn(world) : LEVELS;
  return pool.find((l) => !l.challenge && !save.cleared.includes(l.id))?.id
    ?? pool.find((l) => !save.cleared.includes(l.id))?.id ?? null;
}

export function continueJourney(id: string, save: DigSaveData): string | null {
  const effective = { ...save, cleared: [...save.cleared, id] };
  const level = LEVELS.find((l) => l.id === id);
  if (!level) return recommendedLevel(effective);
  const sameChapter = levelsIn(level.world).find((l) => !l.challenge && !effective.cleared.includes(l.id));
  if (sameChapter) return sameChapter.id;
  const start = WORLDS.findIndex((w) => w.id === level.world);
  const nextWorlds = [...WORLDS.slice(start + 1), ...WORLDS.slice(0, start)];
  for (const world of nextWorlds) {
    const next = levelsIn(world.id).find((l) => !l.challenge && !effective.cleared.includes(l.id));
    if (next) return next.id;
  }
  return recommendedLevel(effective);
}
