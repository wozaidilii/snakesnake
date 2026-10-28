"use client";

import { useRef, type CSSProperties } from "react";
import { doorIsOpen, goalsReady, isPressed } from "~/game/engine";
import type { Cell, Dir, GameState } from "~/game/types";
import { Sprite, type SpriteName } from "./sprite";

function label(cell: Cell): string {
  if (cell.terrain === "wall") return "木篱笆";
  if (cell.terrain === "water") return "水渠，鸡群不能进入";
  const pickup = cell.pickup?.kind;
  if (pickup) return ({ rock: "可推动的木桶", apple: "玉米，增加一只小鸡", gold: "红浆果", egg: "待送回巢的蛋", key: "钥匙", hat: "纪念草帽" })[pickup];
  const fixture = cell.fixture?.kind;
  if (fixture) return ({ button: "石踏板", door: "木栅门", lever: "门闩，踩一次切换开关", exit: "回家的草窝", nest: "送蛋的小巢", crack: "泥塘，带蛋时需要绕开", oneway: "单行道", daisy: "向日葵", scissors: "分队点", lock: "锁" })[fixture];
  return "草地";
}

export function Board({ state, bonk, onMove, onFocusWorm }: {
  state: GameState; bonk: boolean; onMove: (dir: Dir) => void; onFocusWorm: (id: string) => void;
}) {
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const ready = goalsReady(state);
  return <div className={`farm-land world-${state.levelId} ${bonk ? "is-bonk" : ""}`}>
    <div className="land-corner corner-a"><Sprite name="flower" /></div>
    <div className="land-corner corner-b"><Sprite name="grass" /></div>
    <div className="farm-board" role="group" aria-label="农场棋盘，使用方向键或滑动移动" style={{ aspectRatio: `${state.width} / ${state.height}`, "--columns": state.width } as CSSProperties}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; }}
      onPointerUp={(event) => {
        const start = drag.current;
        drag.current = null;
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
        onMove(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? "right" : "left" : dy > 0 ? "down" : "up");
      }}>
      <div className="tile-grid" style={{ gridTemplateColumns: `repeat(${state.width}, 1fr)` }}>
        {state.cells.map((cell, i) => {
          const x = i % state.width, y = Math.floor(i / state.width);
          const edge = x === 0 || y === 0 || x === state.width - 1 || y === state.height - 1;
          const fixture = cell.fixture;
          const open = fixture?.kind === "door" && doorIsOpen(state, fixture);
          const pressed = fixture?.kind === "button" && isPressed(state, fixture.color);
          let sprite: SpriteName | undefined;
          if (fixture?.kind === "exit") sprite = "nest";
          if (fixture?.kind === "nest") sprite = fixture.filled ? "filledNest" : "nest";
          if (fixture?.kind === "door") sprite = open ? "openGate" : "gate";
          if (fixture?.kind === "button") sprite = pressed ? "pressedPlate" : "plate";
          if (fixture?.kind === "lever") sprite = "plate";
          if (fixture?.kind === "daisy") sprite = "flower";
          const pickup = cell.pickup;
          const item: SpriteName | undefined = pickup?.kind === "gold" ? "berries" : pickup?.kind === "apple" ? "corn" : pickup?.kind === "rock" ? "barrel" : pickup?.kind === "egg" ? "egg" : undefined;
          return <div key={i} title={label(cell)} data-cell={`${x},${y}`} data-kind={pickup?.kind ?? fixture?.kind ?? cell.terrain}
            className={`tile ${cell.terrain} ${edge ? "edge" : ""} ${cell.terrain === "wall" && (x === 0 || x === state.width - 1) ? "vertical-fence" : ""} ${fixture?.kind ?? ""} ${open || pressed ? "activated" : ""} ${fixture?.kind === "exit" && ready ? "home-ready" : ""} variation-${(x * 7 + y * 3) % 4}`}>
            {cell.terrain === "floor" && !fixture && !pickup && (x * 13 + y * 7) % 17 === 0 ? <span className="tiny-flower" aria-hidden="true">✿</span> : null}
            {cell.terrain === "wall" ? <div className="fence-art" aria-hidden="true"><i /><i /><b /><b /></div> : null}
            {cell.terrain === "water" ? <span className="flow" aria-hidden="true">{({ up: "↑", down: "↓", left: "←", right: "→" })[cell.flow ?? "right"]}</span> : null}
            {sprite ? <Sprite name={sprite} className="tile-fixture" /> : null}
            {fixture?.kind === "exit" ? <span className="home-label">回家</span> : null}
            {fixture?.kind === "nest" ? <span className="nest-marker">{fixture.filled ? "✓" : "蛋"}</span> : null}
            {fixture?.kind === "lever" ? <span className={`lever-arm ${state.flips[fixture.color] ? "is-on" : ""}`} /> : null}
            {fixture?.kind === "door" ? <span className={`gate-marker ${fixture.color}`}>{fixture.color === "red" ? "◆" : "●"}</span> : null}
            {fixture?.kind === "button" && fixture.color === "blue" ? <span className="plate-marker">●</span> : null}
            {item ? <Sprite name={item} className="tile-pickup" /> : null}
            {pickup?.kind === "hat" ? <span className="straw-hat" aria-hidden="true"><i /></span> : null}
          </div>;
        })}
      </div>
      <div className="flock-layer">
        {state.worms.flatMap((worm) => worm.segments.map((point, index) => {
          const ahead = worm.segments[index - 1];
          const facing = index === 0 ? worm.facing : ahead && ahead.x < point.x ? "left" : "right";
          const active = worm.id === state.activeId;
          const style: CSSProperties = { width: `${100 / state.width}%`, height: `${100 / state.height}%`, left: `${point.x * 100 / state.width}%`, top: `${point.y * 100 / state.height}%`, zIndex: 10 + point.y };
          return index === 0 ? <button type="button" key={`${worm.id}-${index}`} style={style} className={`bird mother ${active ? "is-active" : ""}`} aria-label={worm.id === "w0" ? "带队的母鸡" : "帮忙的母鸡，点击切换"}
            onPointerDown={(event) => event.stopPropagation()} onClick={() => onFocusWorm(worm.id)}>
            {active ? <span className="active-pointer" /> : null}
            <Sprite name="hen" className={facing === "left" ? "faces-left" : ""} />
            <span className={`heading heading-${worm.facing}`} />
            {worm.carrying ? <Sprite name="egg" className="carried-egg" /> : null}
            {state.worms.length > 1 ? <span className="hen-number">{worm.id === "w0" ? "1" : "2"}</span> : null}
          </button> : <div className="bird baby" key={`${worm.id}-${index}`} style={style}><Sprite name="chick" className={facing === "left" ? "faces-left" : ""} /></div>;
        }))}
      </div>
    </div>
    <div className="garden-path" aria-hidden="true"><Sprite name="grass" /><span>小脚印，慢慢走</span><Sprite name="stone" /><Sprite name="flower" /></div>
  </div>;
}
