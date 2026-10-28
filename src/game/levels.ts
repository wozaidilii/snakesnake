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
    name: "谷场",
    depth: "院",
    blurb: "先学会啄谷、带上小鸡、推开木桶。后面的题会要求队伍刚好够长。",
  },
  {
    id: "runnel",
    name: "水渠",
    depth: "渠",
    blurb: "水渠只送木桶。渠越长、方向越多，越容易把木桶冲进死角。",
  },
  {
    id: "nursery",
    name: "孵窝",
    depth: "窝",
    blurb: "蛋要绕开泥坑，有时还得先开栅门。向日葵会把你弹过一段空地。",
  },
  {
    id: "shear",
    name: "篱笆",
    depth: "篱",
    blurb: "一只母鸡不够用。篱剪、第二只母鸡、钥匙和门闩会叠在一起。",
  },
];

export const TIERS = [
  { id: "1", name: "第一栏", blurb: "四个动作，每种只走一次：认路、啄谷、吃玉米、推开木桶。" },
  { id: "2", name: "第二栏", blurb: "短渠和近处的踏板。看清木桶最后停在哪一格。" },
  { id: "3", name: "第三栏", blurb: "小鸡要够多。啄下去的谷会堵在队尾。" },
  { id: "4", name: "第四栏", blurb: "两枚金蛋，或一条必须绕开的泥坑。" },
  { id: "5", name: "第五栏", blurb: "蛋要进栅门。向日葵会把你弹过你不想去的格子。" },
  { id: "6", name: "第六栏", blurb: "钥匙、第二只母鸡，和更远的踏板。" },
  { id: "7", name: "第七栏", blurb: "篱剪。一只母鸡留在踏板上，另一只才能过去。" },
  { id: "8", name: "第八栏", blurb: "栅门更远，水渠更长，草帽还在岔路上。" },
  { id: "9", name: "第九栏", blurb: "门闩和篱剪叠在一起。先想谁留下。" },
  { id: "10", name: "第十栏", blurb: "步数最长的一批。走错一步，谷或木桶就会封死退路。" },
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
