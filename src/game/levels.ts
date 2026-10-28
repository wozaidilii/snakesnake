import { CAMPAIGN } from "./campaign";
import { PARS } from "./pars";
import type { Level, WorldId } from "./types";

export type World = { id: WorldId; name: string; depth: string; blurb: string; subtitle: string; icon: "chick" | "gate" | "egg" | "flower" };
export const WORLDS: World[] = [
  { id: "soil", name: "晨光草地", depth: "01", subtitle: "认识规则，再试两道巧思题", blurb: "四个教学认识跟随、推箱、运蛋与成长，再用两道题练习提前安排站位。", icon: "chick" },
  { id: "runnel", name: "篱笆小径", depth: "02", subtitle: "离群长大，分工接力", blurb: "长队留门，短队转身。分队时机、门内接力与伙伴数量都需要认真安排。", icon: "gate" },
  { id: "nursery", name: "麦田摇篮", depth: "03", subtitle: "把珍贵的，轻轻带回", blurb: "捡起鸡蛋，绕开泥塘。先想好归路，再出发。", icon: "egg" },
  { id: "shear", name: "溪畔归途", depth: "04", subtitle: "上游出发，下游接应", blurb: "一个水流教学，然后规划落岸站位、双箱运输与多队协作。", icon: "flower" },
];
export const TIERS = WORLDS.map((world, i) => ({ id: String(i + 1), name: world.name, blurb: world.blurb }));
export const LEVELS: Level[] = CAMPAIGN.map((level) => ({ ...level, par: PARS[level.id] }));
export const levelsInTier = (tier: string) => LEVELS.filter((level) => level.rank === tier);
export const levelsIn = (world: WorldId) => LEVELS.filter((level) => level.world === world);
export const getLevel = (id: string) => LEVELS.find((level) => level.id === id);
export const nextLevelId = (id: string) => LEVELS[LEVELS.findIndex((level) => level.id === id) + 1]?.id ?? null;
