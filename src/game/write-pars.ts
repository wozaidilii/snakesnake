import { writeFileSync } from "node:fs";

import { CAMPAIGN } from "./campaign";
import { parseLevel } from "./parse";
import { solve } from "./solver";

const levels = CAMPAIGN;
const pars: Record<string, number> = {};
for (const level of levels) {
  const result = solve(parseLevel(level), {
    maxNodes: 1_000_000,
    maxMoves: 150,
  });
  if (!result.ok) {
    console.error(`${result.reason === "budget" ? "搜索预算不足" : "已穷尽，未找到解"} ${level.id} ${level.name} ${result.reason}`);
    process.exitCode = 1;
    continue;
  }
  pars[level.id] = result.moves;
  console.log(`${level.id} ${level.name}: ${result.moves} 步 / ${result.nodes} 状态`);
}
if (process.exitCode) process.exit(1);
const body = Object.entries(pars)
  .map(([id, moves]) => `  ${JSON.stringify(id)}: ${moves},`)
  .join("\n");
writeFileSync(
  new URL("./pars.ts", import.meta.url),
  `// 由 pnpm gen:pars 生成，是每一关求解器找到的最短步数。\nexport const PARS: Record<string, number> = {\n${body}\n};\n`,
);
console.log(`写下 ${Object.keys(pars).length} 关的最短步数`);
