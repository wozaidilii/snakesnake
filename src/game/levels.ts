import { CAMPAIGN } from "./campaign";
import { PARS } from "./pars";
import type { Level, WorldId } from "./types";

export type World = { id: WorldId; name: string; depth: string; blurb: string; subtitle: string; icon: "chick" | "gate" | "egg" | "flower" };
export const WORLDS: World[] = [
  { id: "soil", name: "晨光草地", depth: "01", subtitle: "跟着脚印，认识彼此", blurb: "从一小步开始，学会转弯、留路，带上每一个小伙伴。", icon: "chick" },
  { id: "runnel", name: "篱笆小径", depth: "02", subtitle: "小小机关，大大默契", blurb: "木桶可以留门，小鸡也可以。试着给熟悉的东西一个新用途。", icon: "gate" },
  { id: "nursery", name: "麦田摇篮", depth: "03", subtitle: "把珍贵的，轻轻带回", blurb: "捡起鸡蛋，绕开泥塘。先想好归路，再出发。", icon: "egg" },
  { id: "shear", name: "溪畔归途", depth: "04", subtitle: "借一点水流的力气", blurb: "让溪水送走木桶，让伙伴守住小门，把一天的收获送回家。", icon: "flower" },
];
export const TIERS = WORLDS.map((world, i) => ({ id: String(i + 1), name: world.name, blurb: world.blurb }));
export const LEVELS: Level[] = CAMPAIGN.map((level) => ({ ...level, par: PARS[level.id] }));
export const levelsInTier = (tier: string) => LEVELS.filter((level) => level.rank === tier);
export const levelsIn = (world: WorldId) => LEVELS.filter((level) => level.world === world);
export const getLevel = (id: string) => LEVELS.find((level) => level.id === id);
export const nextLevelId = (id: string) => LEVELS[LEVELS.findIndex((level) => level.id === id) + 1]?.id ?? null;
