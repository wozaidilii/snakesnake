"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { doorIsOpen, goalsReady, isPressed, fledgeCandidates } from "~/game/engine";
import type { Cell, Dir, GameState, StepResult, WorldId } from "~/game/types";
import { Sprite, type SpriteName } from "./sprite";

type BoardAnimation = { sequence: number; step: StepResult };
function BoardEffects({ animation, width, height }: { animation: BoardAnimation | null; width: number; height: number }) {
  const [effects, setEffects] = useState<BoardAnimation[]>([]);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    if (!animation) { setEffects([]); timers.current.forEach(clearTimeout); timers.current.clear(); return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setEffects((current) => [...current.filter((event) => event.sequence !== animation.sequence).slice(-5), animation]);
    const timer = setTimeout(() => { setEffects((current) => current.filter((e) => e.sequence !== animation.sequence)); timers.current.delete(timer); }, 850);
    timers.current.add(timer);
  }, [animation]);
  useEffect(() => { const active = timers.current; return () => active.forEach(clearTimeout); }, []);
  return <>{effects.map(({ sequence, step }) => {
    const hen = step.state.worms.find((w) => w.id === step.state.activeId);
    const head = hen?.segments[0];
    const note = ({ gold: "+ 蓝李", grow: "+ 小伙伴", fledge: "长大啦", egg: hen?.carrying ? "抱稳啦" : "安顿好啦", win: "到家啦", hat: "+ 小草帽" } as Partial<Record<StepResult["sound"], string>>)[step.sound];
    return <span key={sequence} className="effect-event" aria-hidden="true">
      {step.ripples?.map((p) => <span key={`${p.x}-${p.y}`} className="water-ring" style={{ left: `${p.x * 100 / width}%`, top: `${p.y * 100 / height}%`, width: `${100 / width}%`, height: `${100 / height}%` }} />)}
      {head && note ? <><span className="board-feedback" style={{ left: `${(head.x + .5) * 100 / width}%`, top: `${head.y * 100 / height}%` }}>{note}</span><span className="happy-particles" style={{ left: `${(head.x + .5) * 100 / width}%`, top: `${(head.y + .5) * 100 / height}%` }}>{[0,1,2,3,4].map((i) => <Sprite key={i} name={i % 2 ? "feather" : "sparkles"} style={{ "--particle-x": `${(i - 2) * 19}px`, "--particle-y": `${-20 - (2 - i) ** 2 * 8}px`, "--particle-angle": `${i * 32}deg` } as CSSProperties} />)}</span></> : null}
    </span>;
  })}</>;
}

function label(cell: Cell): string {
  if (cell.fixture?.kind === "bridge") return cell.fixture.collapsed ? "荷叶已收起，撤销可恢复" : "荷叶桥，最后一位离开后收起";
  if (cell.terrain === "wall") return "木篱笆";
  if (cell.terrain === "water") return "水渠，鸡群不能进入";
  const pickup = cell.pickup?.kind;
  if (pickup) return ({ rock: "可推动的果箱", apple: "麦穗，增加一只小鸡", gold: "蓝李", egg: "待送回巢的蛋", key: "钥匙", hat: "纪念草帽" })[pickup];
  const fixture = cell.fixture?.kind;
  if (fixture) return ({ button: "陶土踏板", door: cell.fixture?.kind === "door" && cell.fixture.gate === "flip" ? "风铃门，同记号风铃切换开关" : "木栅门", lever: "风铃，母鸡每次踩入切换开关，小鸡经过不会触发", exit: "归巢小屋", nest: "送蛋的编篮", crack: "泥塘，带蛋时需要绕开", oneway: "单行道", daisy: "向日葵", roost: "育芽地，小鸡站上后可以离群长大", bridge: "荷叶桥", scissors: "分队点", lock: "锁" })[fixture];
  return "草地";
}

export function Board({ state, biome, bonk, animation, onMove, onFocusWorm, onFledge }: {
  biome: WorldId;
  state: GameState; bonk: boolean; animation: { sequence: number; step: StepResult } | null; onFledge: (index?: number) => void; onMove: (dir: Dir) => void; onFocusWorm: (id: string) => void;
}) {
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const ready = goalsReady(state);
  const boardRef = useRef<HTMLDivElement>(null);
  const lastState = useRef(state);
  const tapWorm = useRef<string | null>(null);
  const tapChick = useRef<number | null>(null);
  useLayoutEffect(() => {
    const previous = lastState.current;
    lastState.current = state;
    if (!animation || animation.step.state !== state || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const running: Animation[] = [];
    for (const motion of animation.step.motion ?? []) {
      const node = boardRef.current?.querySelector<HTMLElement>(`[data-crate="${motion.id}"]`);
      if (node) running.push(node.animate(motion.path.map((p) => ({ left: `${p.x * 100 / state.width}%`, top: `${p.y * 100 / state.height}%` })), { duration: Math.min(520, 130 * (motion.path.length - 1)), easing: "ease-in-out" }));
    }
    state.worms.forEach((worm) => worm.segments.forEach((point, index) => {
      const old = previous.worms.find((w) => w.id === worm.id)?.segments[index];
      if (old?.x === point.x && old?.y === point.y) return;
      const node = boardRef.current?.querySelector<HTMLElement>(`[data-bird="${worm.id}-${index}"] > .sprite:first-of-type`);
      if (!node) return;
      const growing = animation.step.sound === "fledge" && index === 0 && !old;
      running.push(node.animate(growing ? [{ scale: ".6", opacity: .6, rotate: "-8deg" }, { scale: "1.13", opacity: 1, rotate: "4deg" }, { scale: "1", rotate: "0deg" }] : [{ translate: "0 0", scale: "1.03 .97" }, { translate: "0 -8%", scale: ".98 1.03" }, { translate: "0 0", scale: "1" }], { duration: growing ? 420 : 145, easing: "cubic-bezier(.25,.7,.3,1)" }));
    }));
    return () => running.forEach((a) => a.cancel());
  }, [state, animation]);
  return <div className={`farm-land biome-${biome} ${state.won ? "is-celebrating" : ""} ${bonk ? "is-bonk" : ""}`}>
    <div ref={boardRef} className="farm-board" role="group" aria-label="农场棋盘，使用方向键或滑动移动" style={{ aspectRatio: `${state.width} / ${state.height}`, "--columns": state.width } as CSSProperties}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const target = event.target as HTMLElement;
        tapWorm.current = target.closest<HTMLElement>("[data-worm]")?.dataset.worm ?? null;
        const chick = target.closest<HTMLElement>("[data-fledge]")?.dataset.fledge;
        tapChick.current = chick === undefined ? null : Number(chick);
        drag.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerCancel={() => { drag.current = null; }}
      onPointerUp={(event) => {
        const start = drag.current;
        drag.current = null;
        if (!start || start.id !== event.pointerId) return;
        const dx = event.clientX - start.x, dy = event.clientY - start.y;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) { if (tapChick.current !== null) onFledge(tapChick.current); else if (tapWorm.current) onFocusWorm(tapWorm.current); return; }
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
          if (fixture?.kind === "exit") sprite = "sign";
          if (fixture?.kind === "nest") sprite = fixture.filled ? "filledNest" : "nest";
          if (fixture?.kind === "door") sprite = fixture.gate === "flip" ? open ? "openBellGate" : "bellGate" : open ? "openGate" : "gate";
          if (fixture?.kind === "button") sprite = pressed ? "pressedPlate" : "plate";
          if (fixture?.kind === "lever") sprite = state.flips[fixture.color] ? "bellOn" : "bell";
          if (fixture?.kind === "bridge") sprite = fixture.collapsed ? "ripple" : "bridge";
          if (fixture?.kind === "daisy" || fixture?.kind === "roost") sprite = "flower";
          const pickup = cell.pickup;
          const item: SpriteName | undefined = pickup?.kind === "gold" ? "berries" : pickup?.kind === "apple" ? "corn" : pickup?.kind === "egg" ? "egg" : undefined;
          return <div key={i} title={label(cell)} data-cell={`${x},${y}`} data-kind={pickup?.kind ?? fixture?.kind ?? cell.terrain}
            className={`tile ${cell.terrain} ${edge ? "edge" : ""} ${cell.terrain === "wall" && (x === 0 || x === state.width - 1) ? "vertical-fence" : ""} ${fixture?.kind ?? ""} ${fixture?.kind === "roost" && fixture.used ? "roost-used" : ""} ${fixture?.kind === "nest" && fixture.filled ? "nest-filled" : ""} ${open || pressed ? "activated" : ""} ${fixture?.kind === "exit" && ready ? "home-ready" : ""} variation-${(x * 7 + y * 3) % 4}`}>
            {cell.terrain === "floor" && !fixture && !pickup && (x * 13 + y * 7) % 17 === 0 ? <span className="tiny-flower" aria-hidden="true">✿</span> : null}
            {cell.terrain === "wall" ? <div className="fence-art" aria-hidden="true"><i /><i /><b /><b /></div> : null}
            {cell.terrain === "water" && cell.flow ? <span className="flow" aria-hidden="true">{({ up: "↑", down: "↓", left: "←", right: "→" })[cell.flow]}</span> : null}
            {sprite ? <Sprite name={sprite} className="tile-fixture" /> : null}
            {fixture?.kind === "exit" ? <span className="home-label">回家</span> : null}
            {fixture?.kind === "nest" ? <span className="nest-marker">{fixture.filled ? "✓" : "蛋"}</span> : null}
            {fixture?.kind === "roost" ? <span className="roost-marker">{fixture.used ? "✓" : "芽"}</span> : null}
            {fixture?.kind === "lever" ? <span className={`bell-marker ${fixture.color}`}>{fixture.color === "red" ? "☀" : "☾"}{state.flips[fixture.color] ? "· 开" : "· 关"}</span> : null}
            {fixture?.kind === "door" ? <span className={`gate-marker ${fixture.color}`}>{fixture.color === "red" ? "☀" : "☾"}</span> : null}
            {fixture?.kind === "button" && fixture.color === "blue" ? <span className="plate-marker">☾</span> : null}
            {item ? <Sprite name={item} className="tile-pickup" /> : null}
            {pickup?.kind === "hat" ? <span className="straw-hat" aria-hidden="true"><i /></span> : null}
          </div>;
        })}
      </div>
      <div className="props-layer" aria-hidden="true">{state.cells.map((cell, i) => cell.pickup?.kind === "rock" ? <div key={cell.pickup.id ?? i} data-crate={cell.pickup.id} className="moving-crate" style={{ width: `${100 / state.width}%`, height: `${100 / state.height}%`, left: `${i % state.width * 100 / state.width}%`, top: `${Math.floor(i / state.width) * 100 / state.height}%` }}><Sprite name="barrel" /></div> : null)}</div>
      <div className="flock-layer">
        {state.worms.flatMap((worm) => worm.segments.map((point, index) => {
          const ahead = worm.segments[index - 1];
          const facing = index === 0 ? worm.facing : ahead && ahead.x < point.x ? "left" : "right";
          const active = worm.id === state.activeId;
          const canGrow = active && fledgeCandidates(state, state.worms.indexOf(worm)).includes(index);
          const style: CSSProperties = { width: `${100 / state.width}%`, height: `${100 / state.height}%`, left: `${point.x * 100 / state.width}%`, top: `${point.y * 100 / state.height}%`, zIndex: 10 + point.y };
          return index === 0 ? <button type="button" key={`${worm.id}-${index}`} data-bird={`${worm.id}-${index}`} data-worm={worm.id} style={style} className={`bird mother ${worm.id !== "w0" ? "grown-hen" : ""} ${active ? "is-active" : ""}`} aria-label={worm.id === "w0" ? "带队的母鸡" : "帮忙的母鸡，点击切换"}
            onClick={(event) => { if (event.detail === 0) onFocusWorm(worm.id); }}>
            {active ? <span className="active-pointer" /> : null}
            <Sprite name={state.won ? "henHappy" : "hen"} className={facing === "left" ? "faces-left" : ""} />
            <span className={`heading heading-${worm.facing}`} />
            {worm.carrying ? <Sprite name="egg" className="carried-egg" /> : null}
            {state.worms.length > 1 ? <span className="hen-number">{Number(worm.id.slice(1)) + 1}</span> : null}
          </button> : <button type="button" data-bird={`${worm.id}-${index}`} data-fledge={canGrow ? index : undefined} className={`bird baby ${canGrow ? "can-fledge" : ""}`} key={`${worm.id}-${index}`} style={style} disabled={!canGrow} aria-label={canGrow ? `让第 ${index} 只小鸡离群长大` : "跟随的小鸡"} onClick={(event) => { if (event.detail === 0 && canGrow) onFledge(index); }}><Sprite name={state.won ? "chickHappy" : "chick"} className={facing === "left" ? "faces-left" : ""} />{canGrow ? <span className="fledge-badge">F</span> : null}</button>;
        }))}
      </div>
      <BoardEffects animation={animation} width={state.width} height={state.height} />
    </div>
  </div>;
}
