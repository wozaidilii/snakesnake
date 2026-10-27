import { BAKED } from "./baked-levels";
import { PARS } from "./pars";
import { assemble } from "./twists";
import type { Level, WorldId } from "./types";

export type World = {
  id: WorldId;
  name: string;
  depth: string;
  blurb: string;
};

export const WORLDS: World[] = [
  {
    id: "soil",
    name: "表土层",
    depth: "浅",
    blurb: "先学会吃土、变长、顶石头。后面的题会要求你把身体拉得刚好。",
  },
  {
    id: "runnel",
    name: "渗水层",
    depth: "湿",
    blurb: "水只运石头。河越长、方向越多，越容易把石头冲进死角。",
  },
  {
    id: "nursery",
    name: "育卵层",
    depth: "软",
    blurb: "蛋要绕开裂缝，有时还得先开门。雏菊会把你弹过一段空地。",
  },
  {
    id: "shear",
    name: "剪断层",
    depth: "深",
    blurb: "一条虫不够用。剪刀、第二只虫、钥匙和锁会叠在一起。",
  },
];

export const TIERS = [
  { id: "1", name: "第一档", blurb: "认路、吃土、把石头从路上挪开。" },
  { id: "2", name: "第二档", blurb: "短河和近处的按钮。看清石头最后停在哪一格。" },
  { id: "3", name: "第三档", blurb: "身体要够长。吃下去的土会堵在身后。" },
  { id: "4", name: "第四档", blurb: "两枚金苹果，或一条必须绕开的裂缝。" },
  { id: "5", name: "第五档", blurb: "蛋要进门。雏菊会把你弹过你不想去的格子。" },
  { id: "6", name: "第六档", blurb: "钥匙、第二条虫，和更远的按钮。" },
  { id: "7", name: "第七档", blurb: "剪刀。一条虫留在按钮上，另一条才能过去。" },
  { id: "8", name: "第八档", blurb: "门更远，河更长，帽子还在岔路上。" },
  { id: "9", name: "第九档", blurb: "锁和剪刀叠在一起。先想谁留下。" },
  { id: "10", name: "第十档", blurb: "步数最长的一批。走错一步，土或石头就会封死退路。" },
] as const;

export const LEVELS: Level[] = assemble(BAKED).map((level) => ({
  ...level,
  par: PARS[level.id],
}));

export function levelsInTier(tier: string): Level[] {
  return LEVELS.filter((level) => level.rank === tier);
}

export function levelsIn(world: WorldId): Level[] {
  return LEVELS.filter((level) => level.world === world);
}

export function getLevel(id: string): Level | undefined {
  return LEVELS.find((level) => level.id === id);
}

export function nextLevelId(id: string): string | null {
  const index = LEVELS.findIndex((level) => level.id === id);
  if (index < 0) return null;
  return LEVELS[index + 1]?.id ?? null;
}
