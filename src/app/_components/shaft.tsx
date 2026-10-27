"use client";

import { LEVELS, TIERS, WORLDS, levelsInTier } from "~/game/levels";
import type { DigSaveData } from "~/game/save";
import type { Level } from "~/game/types";

function unlocked(level: Level, cleared: string[]): boolean {
  const index = LEVELS.findIndex((item) => item.id === level.id);
  if (index <= 0) return true;
  const previous = LEVELS[index - 1];
  return previous ? cleared.includes(previous.id) : false;
}

export function Shaft({
  save,
  onPlay,
  onJigsaw,
}: {
  save: DigSaveData;
  onPlay: (id: string) => void;
  onJigsaw: (tier: string) => void;
}) {
  const frontier = LEVELS.find((level) => !save.cleared.includes(level.id))?.id ?? LEVELS.at(-1)?.id;

  return (
    <div className="loam-shaft">
      <header className="loam-hero">
        <p className="loam-mark">
          壤虫 <span>Loamly</span>
        </p>
        <h1>往下挖。</h1>
        <p>
          十档，每档 20 关。金苹果、第二条虫、剪刀和锁会一层层叠上来。已挖通{" "}
          {save.cleared.length} / {LEVELS.length}。
        </p>
        {frontier ? (
          <button type="button" className="loam-go" onClick={() => onPlay(frontier)}>
            {save.cleared.length === 0 ? "从第一口开始" : "继续往下"}
          </button>
        ) : null}
      </header>
      {TIERS.map((tier, tierIndex) => {
        const levels = levelsInTier(tier.id);
        const done = levels.length > 0 && levels.every((level) => save.cleared.includes(level.id));
        const shade = `hsl(28 ${48 - tierIndex * 3}% ${62 - tierIndex * 4}%)`;
        return (
          <section key={tier.id} className="loam-stratum" style={{ ["--stratum" as string]: shade }}>
            <div className="loam-stratum-copy">
              <p>{tier.id} / 10</p>
              <h2>{tier.name}</h2>
              <p>{tier.blurb}</p>
            </div>
            <ol>
              {levels.map((level) => {
                const open = unlocked(level, save.cleared);
                const clear = save.cleared.includes(level.id);
                const hat = level.rows.some((row) => row.includes("H"));
                const hatted = save.hats.includes(`${level.id}-hat`);
                const record = save.best.find((item) => item.id === level.id);
                const matched = record !== undefined && level.par !== undefined && record.moves <= level.par;
                return (
                  <li key={level.id}>
                    <button
                      type="button"
                      className={`loam-hole${open ? " is-open" : " is-locked"}${clear ? " is-done" : ""}${level.id === frontier ? " is-current" : ""}`}
                      disabled={!open}
                      onClick={() => onPlay(level.id)}
                    >
                      <span className="loam-mouth" aria-hidden />
                      <span>
                        <strong>{level.name}</strong>
                        <small>
                          {WORLDS.find((item) => item.id === level.world)?.name ?? ""}
                          {clear ? " · 挖通了" : open ? " · 可以钻" : " · 还埋着"}
                          {matched ? " · 最短" : ""}
                          {hat ? (hatted ? " · 帽子戴上了" : " · 有帽子") : ""}
                        </small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {tier.id === "5" || tier.id === "10" ? (
              <button type="button" className="loam-rest" disabled={!done} onClick={() => onJigsaw(tier.id)}>
                {done ? "歇口气，拼图" : "这一档都挖通之后，可以拼图"}
                {save.jigsaws.includes(tier.id) ? " · 拼过了" : ""}
              </button>
            ) : null}
          </section>
        );
      })}
      <footer className="loam-foot">
        原创关卡、画面和声音。玩法是吃土再排出、变长、推石头、水流、运蛋、滑门和剪刀分身。
      </footer>
    </div>
  );
}
