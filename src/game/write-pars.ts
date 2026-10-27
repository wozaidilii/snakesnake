import { writeFileSync } from "node:fs";

import { BAKED } from "./baked-levels";
import { parseLevel } from "./parse";
import { solve } from "./solver";
import { assemble } from "./twists";

const levels = assemble(BAKED);
const pars: Record<string, number> = {};
for (const level of levels) {
  const result = solve(parseLevel(level), {
    needHat: level.rows.some((row) => row.includes("H")),
    maxNodes: 30_000,
    maxMoves: 85,
  });
  if (!result.ok) {
    console.error(`无解 ${level.id} ${level.name} ${result.reason}`);
    process.exitCode = 1;
    continue;
  }
  pars[level.id] = result.moves;
}
const body = Object.entries(pars)
  .map(([id, moves]) => `  ${JSON.stringify(id)}: ${moves},`)
  .join("\n");
writeFileSync(
  new URL("./pars.ts", import.meta.url),
  `// 由 pnpm gen:pars 生成，是每一关求解器找到的最短步数。\nexport const PARS: Record<string, number> = {\n${body}\n};\n`,
);
console.log(`写下 ${Object.keys(pars).length} 关的最短步数`);
