import { CAMPAIGN } from "./campaign";
import { PARS } from "./pars";
import type { Level, WorldId } from "./types";

export type Souvenir = "wateringCan" | "gardenBadge" | "eggBasket" | "sailboat" | "chimeBadge" | "lotusLantern";
export type World = { id: WorldId; name: string; depth: string; blurb: string; subtitle: string; icon: "chick" | "gate" | "egg" | "flower" | "bell" | "bridge"; souvenir: Souvenir; reward: string };
export const WORLDS: World[] = [
  { id: "soil", name: "咕咕归巢", depth: "01", subtitle: "长大、推箱、守门", blurb: "五张地图：吃麦穗让队伍变长，用自己或果箱压住踏板打开门，带大家回到小屋。", icon: "chick", souvenir: "wateringCan", reward: "雏菊小水壶" },
];
export const TIERS = WORLDS.map((world, i) => ({ id: String(i + 1), name: world.name, blurb: world.blurb }));
export const LEVELS: Level[] = CAMPAIGN.map((level) => ({ ...level, par: PARS[level.id] }));
export const levelsInTier = (tier: string) => LEVELS.filter((level) => level.rank === tier);
export const levelsIn = (world: WorldId) => LEVELS.filter((level) => level.world === world);
export const getLevel = (id: string) => LEVELS.find((level) => level.id === id);
export const nextLevelId = (id: string) => LEVELS[LEVELS.findIndex((level) => level.id === id) + 1]?.id ?? null;
