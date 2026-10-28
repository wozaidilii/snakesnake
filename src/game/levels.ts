import { CAMPAIGN } from "./campaign";
import { PARS } from "./pars";
import type { Level, WorldId } from "./types";

export type Souvenir = "wateringCan" | "gardenBadge" | "eggBasket" | "sailboat" | "chimeBadge" | "lotusLantern";
export type World = { id: WorldId; name: string; depth: string; blurb: string; subtitle: string; icon: "chick" | "gate" | "egg" | "flower" | "bell" | "bridge"; souvenir: Souvenir; reward: string };
export const WORLDS: World[] = [
  { id: "soil", name: "晨光草地", depth: "01", subtitle: "小脚留门，绕路推箱", blurb: "跟随 → 麦穗教学 → 长度与顺序 → 推箱教学 → 两道站位题。先理解一条规则，再发现它的另一面。", icon: "chick", souvenir: "wateringCan", reward: "雏菊小水壶" },
  { id: "runnel", name: "篱笆小径", depth: "02", subtitle: "离群长大，分工接力", blurb: "从分队教学与窄巷练习开始，再安排队伍长度、交换守门与伙伴数量。", icon: "gate", souvenir: "gardenBadge", reward: "常春藤小院门" },
  { id: "nursery", name: "麦田摇篮", depth: "03", subtitle: "把珍贵的，轻轻带回", blurb: "先认识抱蛋与泥塘，再考虑空手站位、送蛋顺序与多队调度。最后一道组合挑战可以留待以后。", icon: "egg", souvenir: "eggBasket", reward: "薰衣草编篮" },
  { id: "shear", name: "溪畔归途", depth: "04", subtitle: "上游出发，下游接应", blurb: "水流教学之后，规划落岸站位、双箱运输与多队协作。", icon: "flower", souvenir: "sailboat", reward: "蓝帆小木船" },
  { id: "orchard", name: "风铃果园", depth: "05", subtitle: "响一次，换一种可能", blurb: "风铃会记住开关。探索奇偶、回程和双铃顺序，再和守门、运蛋、水路组合。", icon: "bell", souvenir: "chimeBadge", reward: "花间小风铃" },
  { id: "pond", name: "月光荷塘", depth: "06", subtitle: "出发之前，留好归路", blurb: "荷叶等最后一位离开才收起。先发现长队留桥，再分配跨岸任务，最后为回程留下通路。", icon: "bridge", souvenir: "lotusLantern", reward: "月光莲花灯" },
];
export const TIERS = WORLDS.map((world, i) => ({ id: String(i + 1), name: world.name, blurb: world.blurb }));
export const LEVELS: Level[] = CAMPAIGN.map((level) => ({ ...level, par: PARS[level.id] }));
export const levelsInTier = (tier: string) => LEVELS.filter((level) => level.rank === tier);
export const levelsIn = (world: WorldId) => LEVELS.filter((level) => level.world === world);
export const getLevel = (id: string) => LEVELS.find((level) => level.id === id) ?? LEVELS.find((level) => level.id === `${id}-r2`);
export const nextLevelId = (id: string) => LEVELS[LEVELS.findIndex((level) => level.id === id) + 1]?.id ?? null;
