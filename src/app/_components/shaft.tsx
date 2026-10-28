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
          老母鸡 <span>Henyard</span>
        </p>
        <h1>带上小鸡。</h1>
        <p>
          十栏。新玩法只演示一次，后面是要动脑的题。已收好{" "}
          {save.cleared.length} / {LEVELS.length}。
        </p>
        {frontier ? (
          <button type="button" className="loam-go" onClick={() => onPlay(frontier)}>
            {save.cleared.length === 0 ? "从第一栏开始" : "接着走"}
          </button>
        ) : null}
      </header>
      {TIERS.map((tier, tierIndex) => {
        const levels = levelsInTier(tier.id);
        const done = levels.length > 0 && levels.every((level) => save.cleared.includes(level.id));
        const pens = ["#e7c98a", "#d7e4b4", "#f0d2a8", "#e8d7b0", "#f3cbb8", "#e6d7a2", "#d5ddb4", "#f2d7b0", "#e8c8a8", "#dce6c4"];
        const shade = pens[tierIndex] ?? "#e7c98a";
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
                          {clear ? " · 收好了" : open ? " · 可以走" : " · 还关着"}
                          {matched ? " · 最短" : ""}
                          {hat ? (hatted ? " · 草帽戴上了" : " · 有草帽") : ""}
                        </small>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
            {tier.id === "5" || tier.id === "10" ? (
              <button type="button" className="loam-rest" disabled={!done} onClick={() => onJigsaw(tier.id)}>
                {done ? "歇口气，拼图" : "这一栏都收好之后，可以拼图"}
                {save.jigsaws.includes(tier.id) ? " · 拼过了" : ""}
              </button>
            ) : null}
          </section>
        );
      })}
      <footer className="loam-foot">
        原创关卡、画面和声音。玩法是啄谷再排出、带上小鸡、推木桶、水渠、送蛋、栅门和篱剪分群。
      </footer>
    </div>
  );
}
