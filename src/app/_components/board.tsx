"use client";

import { useEffect, useRef, useState } from "react";

import { activeIndex, canSnip, doorIsOpen, goalsReady, isPressed, legalDirs } from "~/game/engine";
import type { Dir, GameState } from "~/game/types";
import {
  Apple,
  ButtonPlate,
  Crack,
  Daisy,
  Door,
  Egg,
  ExitMouth,
  FlowArrow,
  Hat,
  Lever,
  OneWay,
  Key,
  Lock,
  Nest,
  Rock,
  Scissors,
} from "./glyphs";

type Pt = { x: number; y: number };
type Track = { from: Pt[]; to: Pt[]; t0: number };

const SLIDE_MS = 150;

function align(from: Pt[], to: Pt[]): Pt[] {
  if (from.length === to.length) return from;
  if (to.length === from.length + 1 && from[0]) return [from[0], ...from];
  return to.map((point, index) => from[index] ?? point);
}

function facingDeg(dir: string): number {
  if (dir === "right") return 90;
  if (dir === "down") return 180;
  if (dir === "left") return -90;
  return 0;
}

function aimDeg(dx: number, dy: number): number {
  if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return 0;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 90 : -90;
  return dy >= 0 ? 180 : 0;
}

function HenArt({
  radius,
  active,
  stuck,
  carrying,
  hatted,
}: {
  radius: number;
  active: boolean;
  stuck: boolean;
  carrying: boolean;
  hatted: boolean;
}) {
  const eyeY = stuck ? 0.45 : 1.45;
  const pupilY = stuck ? -6.9 : -7.9;
  return (
    <g transform={`scale(${radius / 11})`}>
      <ellipse cx="0" cy="5" rx="11" ry="3.2" fill="#6b4428" opacity="0.18" />
      <ellipse cx="-5.4" cy="9.2" rx="2.7" ry="4.3" fill="#fffdf8" transform="rotate(-18 -5.4 9.2)" />
      <ellipse cx="0" cy="10.6" rx="2.8" ry="4.6" fill="#f4efe6" />
      <ellipse cx="5.4" cy="9.2" rx="2.7" ry="4.3" fill="#fffdf8" transform="rotate(18 5.4 9.2)" />
      <ellipse cx="0" cy="1" rx="9.2" ry="8.2" fill="#fffdf8" stroke="#e4d3bc" strokeWidth="0.8" />
      <ellipse cx="0" cy="3.1" rx="5.4" ry="3.8" fill="#f6f0e6" />
      <ellipse cx="-8.4" cy="2" rx="2.8" ry="4.3" fill="#f3ece3" stroke="#e4d3bc" strokeWidth="0.55" transform="rotate(-28 -8.4 2)" />
      <ellipse cx="8.4" cy="2" rx="2.8" ry="4.3" fill="#f3ece3" stroke="#e4d3bc" strokeWidth="0.55" transform="rotate(28 8.4 2)" />
      <path d="M-3.4 8.4l-1.4 2.6M-3.4 8.4l1 2.6M3.4 8.4l1.4 2.6M3.4 8.4l-.8 2.6" fill="none" stroke="#e39a2b" strokeWidth="1.15" strokeLinecap="round" />
      <circle cx="0" cy="-7.4" r="5.15" fill="#fffdf8" stroke="#e4d3bc" strokeWidth="0.8" />
      <path d="M-2.7-11.2c.35-2.3 1.55-2.7 1.85-.15.45-2.4 1.65-2.7 1.95.15.55-2.05 1.75-1.85 1.4.65-.9.85-3.9.75-5.2-.65z" fill="#d23b3b" />
      <path d="M-1.7-11.7 L0-15.4 L1.7-11.7 Z" fill="#f08a1a" />
      <ellipse cx="2.3" cy="-9.5" rx="1.15" ry="1.7" fill="#c43232" />
      <g className={stuck ? undefined : "is-blink"}>
        <ellipse cx="-1.9" cy="-7.5" rx="1.55" ry={eyeY} fill="#fff" />
        <ellipse cx="1.9" cy="-7.5" rx="1.55" ry={eyeY} fill="#fff" />
        <circle cx="-1.9" cy={pupilY} r="0.72" fill="#2a1c14" />
        <circle cx="1.9" cy={pupilY} r="0.72" fill="#2a1c14" />
        <circle cx="-2.3" cy="-8.2" r="0.32" fill="#fff" />
        <circle cx="1.5" cy="-8.2" r="0.32" fill="#fff" />
      </g>
      {carrying ? <ellipse cx="0" cy="-16.8" rx="2.4" ry="3" fill="#fff6ea" stroke="#e7c9a4" strokeWidth="0.6" /> : null}
      {hatted ? (
        <g>
          <ellipse cx="0" cy="-13.2" rx="6.6" ry="1.8" fill="#e6c36a" />
          <path d="M-3.1-13.2c.3-3.2 1.5-5 3.1-5s2.8 1.8 3.1 5z" fill="#f0d48a" />
          <path d="M-2.6-13.2h5.2" stroke="#b6402c" strokeWidth="0.9" />
        </g>
      ) : null}
      {active ? (
        <ellipse cx="0" cy="0.5" rx="13.6" ry="14.8" fill="none" stroke="#c9842a" strokeWidth="1.15" strokeDasharray="3.2 2.2" />
      ) : null}
    </g>
  );
}

function ChickArt({ radius }: { radius: number }) {
  return (
    <g transform={`scale(${radius / 11})`}>
      <ellipse cx="0" cy="4.2" rx="6.4" ry="2" fill="#6b4428" opacity="0.16" />
      <circle cx="0" cy="1" r="6.3" fill="#ffd24a" stroke="#e2b03a" strokeWidth="0.65" />
      <ellipse cx="0" cy="2.6" rx="3.5" ry="2.5" fill="#ffe9a0" />
      <ellipse cx="-5.4" cy="1.2" rx="1.7" ry="2.5" fill="#f2c043" transform="rotate(-28 -5.4 1.2)" />
      <ellipse cx="5.4" cy="1.2" rx="1.7" ry="2.5" fill="#f2c043" transform="rotate(28 5.4 1.2)" />
      <circle cx="0" cy="-4.4" r="3.55" fill="#ffe566" stroke="#e2b03a" strokeWidth="0.55" />
      <path d="M-1.15-6.6c.2-1.5.7-1.8 1.15-.2.35-1.5 1-1.6 1.15.15-.5.35-1.5.35-2.3.05z" fill="#f08a1a" />
      <path d="M-1.25-7 L0-9.6 L1.25-7 Z" fill="#f08a1a" />
      <circle cx="-1.25" cy="-4.55" r="0.62" fill="#2a1c14" />
      <circle cx="1.25" cy="-4.55" r="0.62" fill="#2a1c14" />
      <path d="M-2.2 6.2l-1 2M-2.2 6.2l.8 2M2.2 6.2l1 2M2.2 6.2l-.7 2" fill="none" stroke="#e39a2b" strokeWidth="0.9" strokeLinecap="round" />
    </g>
  );
}

function sample(track: Track, now: number): Pt[] {
  const raw = Math.min(1, (now - track.t0) / SLIDE_MS);
  const eased = 1 - (1 - raw) ** 3;
  return track.to.map((point, index) => {
    const start = track.from[index] ?? point;
    return {
      x: start.x + (point.x - start.x) * eased,
      y: start.y + (point.y - start.y) * eased,
    };
  });
}

export function Board({
  state,
  shake,
  bonk,
  singing,
  burst,
  onMove,
  onFocusWorm,
}: {
  state: GameState;
  shake: boolean;
  bonk: boolean;
  singing: boolean;
  burst: { id: number; kind: string } | null;
  onMove: (dir: Dir) => void;
  onFocusWorm: (id: string) => void;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(64);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const tracks = useRef(new Map<string, Track>());
  const points = useRef(new Map<string, Pt[]>());
  const prevSize = useRef(size);
  const [, setTick] = useState(0);

  useEffect(() => {
    const node = frameRef.current;
    if (!node) return;
    const measure = () => {
      const rect = node.getBoundingClientRect();
      const next = Math.floor(
        Math.min((rect.width - 64) / state.width, (rect.height - 64) / state.height, 84),
      );
      setSize(Math.max(28, next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [state.width, state.height]);

  useEffect(() => {
    const resized = prevSize.current !== size;
    prevSize.current = size;
    const now = performance.now();
    const alive = new Set<string>();
    let moving = false;
    for (const worm of state.worms) {
      alive.add(worm.id);
      const goal = worm.segments.map((seg) => ({
        x: seg.x * size + size / 2,
        y: seg.y * size + size / 2,
      }));
      const current = points.current.get(worm.id);
      const from =
        current && !resized
          ? align(
              sample(
                tracks.current.get(worm.id) ?? { from: current, to: current, t0: now - SLIDE_MS },
                now,
              ),
              goal,
            )
          : goal;
      tracks.current.set(worm.id, { from, to: goal, t0: resized ? now - SLIDE_MS : now });
      if (from.some((point, index) => point.x !== goal[index]?.x || point.y !== goal[index]?.y)) {
        moving = true;
      }
      points.current.set(worm.id, goal);
    }
    for (const id of [...tracks.current.keys()]) {
      if (!alive.has(id)) tracks.current.delete(id);
    }
    if (!moving) {
      setTick((value) => value + 1);
      return;
    }
    let frame = 0;
    const step = () => {
      const time = performance.now();
      let again = false;
      for (const track of tracks.current.values()) {
        if (time - track.t0 < SLIDE_MS) again = true;
      }
      setTick((value) => value + 1);
      if (again) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [state, size]);

  const selected = activeIndex(state);
  const active = state.worms[selected];
  const stuck = legalDirs(state, selected).length === 0 && !canSnip(state, selected);
  const now = performance.now();

  function stepToward(x: number, y: number) {
    const head = active?.segments[0];
    if (!head) return;
    const occupant = state.worms.find((worm) =>
      worm.segments.some((seg) => seg.x === x && seg.y === y),
    );
    if (occupant && occupant.id !== active?.id) {
      onFocusWorm(occupant.id);
      return;
    }
    const dx = x - head.x;
    const dy = y - head.y;
    if (dx === 0 && dy === 0) return;
    if (Math.abs(dx) >= Math.abs(dy)) onMove(dx > 0 ? "right" : "left");
    else onMove(dy > 0 ? "down" : "up");
  }

  return (
    <div className="loam-frame" ref={frameRef}>
      <div className={`loam-crust${shake ? " is-shake" : ""}${bonk ? " is-bonk" : ""}`}>
      <div
        ref={boardRef}
        className="loam-board"
        style={{ width: size * state.width, height: size * state.height }}
        onPointerDown={(event) => {
          drag.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerUp={(event) => {
          const start = drag.current;
          drag.current = null;
          if (!start || !boardRef.current) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.hypot(dx, dy) >= 26) {
            onMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
            return;
          }
          const rect = boardRef.current.getBoundingClientRect();
          const x = Math.floor((event.clientX - rect.left) / size);
          const y = Math.floor((event.clientY - rect.top) / size);
          if (x < 0 || y < 0 || x >= state.width || y >= state.height) return;
          stepToward(x, y);
        }}
        role="application"
        aria-label="谷场"
      >
        <div className="loam-grid" style={{ gridTemplateColumns: `repeat(${state.width}, ${size}px)` }}>
          {state.cells.map((cell, index) => {
            const x = index % state.width;
            const y = Math.floor(index / state.width);
            const pressed = cell.fixture?.kind === "button" ? isPressed(state, cell.fixture.color) : false;
            const doorOpen = cell.fixture?.kind === "door" ? doorIsOpen(state, cell.fixture) : false;
            return (
              <div
                key={`${x}-${y}`}
                className={`loam-cell loam-${cell.terrain} v${(x * 5 + y * 3) % 4}${cell.terrain === "water" ? ` is-${cell.flow ?? "right"}` : ""}${cell.fixture?.kind === "exit" && goalsReady(state) ? " is-lit" : ""}${cell.pickup?.kind === "gold" ? " is-prize" : ""}`}
                style={{ width: size, height: size }}
              >
                {cell.terrain === "dirt" ? <span className="loam-mound" /> : null}
                {cell.terrain === "wall" ? <span className="loam-clod" /> : null}
                {cell.terrain === "water" && cell.flow ? <FlowArrow dir={cell.flow} /> : null}
                {cell.fixture?.kind === "button" ? <ButtonPlate color={cell.fixture.color} down={pressed} /> : null}
                {cell.fixture?.kind === "door" ? (
                  <Door open={doorOpen} color={cell.fixture.color} flip={cell.fixture.gate === "flip"} />
                ) : null}
                {cell.fixture?.kind === "oneway" ? <OneWay dir={cell.fixture.dir} /> : null}
                {cell.fixture?.kind === "lever" ? (
                  <Lever color={cell.fixture.color} on={state.flips[cell.fixture.color]} />
                ) : null}
                {cell.fixture?.kind === "exit" ? <ExitMouth open={goalsReady(state)} /> : null}
                {cell.fixture?.kind === "daisy" ? <Daisy /> : null}
                {cell.fixture?.kind === "scissors" ? <Scissors /> : null}
                {cell.fixture?.kind === "crack" ? <Crack /> : null}
                {cell.fixture?.kind === "nest" ? <Nest filled={cell.fixture.filled} /> : null}
                {cell.fixture?.kind === "lock" ? <Lock /> : null}
                {cell.pickup?.kind === "rock" ? <Rock /> : null}
                {cell.pickup?.kind === "apple" ? <Apple /> : null}
                {cell.pickup?.kind === "gold" ? <Apple gold /> : null}
                {cell.pickup?.kind === "egg" ? <Egg /> : null}
                {cell.pickup?.kind === "key" ? <Key /> : null}
                {cell.pickup?.kind === "hat" ? <Hat /> : null}
              </div>
            );
          })}
        </div>
        {burst ? (
          <div className="loam-pops" key={burst.id}>
            {Array.from({ length: 6 }, (_, index) => (
              <span
                key={index}
                className={`loam-pop is-${burst.kind}`}
                style={{
                  left: (active?.segments[0]?.x ?? 0) * size + size / 2,
                  top: (active?.segments[0]?.y ?? 0) * size + size / 2,
                  ["--dx" as string]: `${Math.cos((index / 6) * Math.PI * 2) * 28}px`,
                  ["--dy" as string]: `${Math.sin((index / 6) * Math.PI * 2) * 22 - 8}px`,
                }}
              />
            ))}
          </div>
        ) : null}
        <svg className="loam-worms" width={size * state.width} height={size * state.height}>
          <defs>
            <filter id="loam-grain">
              <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="4" />
            </filter>
          </defs>
          <rect width="100%" height="100%" filter="url(#loam-grain)" opacity="0.07" style={{ pointerEvents: "none" }} />
          {state.worms.map((worm) => {
            const track = tracks.current.get(worm.id);
            const body = track
              ? sample(track, now)
              : worm.segments.map((seg) => ({
                  x: seg.x * size + size / 2,
                  y: seg.y * size + size / 2,
                }));
            const head = body[0];
            if (!head) return null;
            const radius = size * 0.34;
            const activeWorm = worm.id === state.activeId;
            const sliding = track ? now - track.t0 < SLIDE_MS : false;
            const rot = facingDeg(worm.facing);
            return (
              <g key={worm.id}>
                {body.slice(1).map((point, chickIndex) => {
                  const prev = body[chickIndex] ?? point;
                  return (
                    <g
                      key={chickIndex}
                      transform={`translate(${point.x} ${point.y + (chickIndex % 2 === 0 ? -1 : 1)}) rotate(${aimDeg(prev.x - point.x, prev.y - point.y)})`}
                    >
                      <ChickArt radius={radius * 0.82} />
                    </g>
                  );
                })}
                <g
                  transform={`translate(${head.x} ${head.y}) rotate(${rot}) scale(${sliding ? 0.96 : 1} ${sliding ? 1.05 : 1})`}
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    onFocusWorm(worm.id);
                  }}
                >
                  <HenArt
                    radius={radius}
                    active={activeWorm}
                    stuck={stuck && activeWorm}
                    carrying={worm.carrying}
                    hatted={state.hats.length > 0 && activeWorm}
                  />
                </g>
                {stuck && activeWorm ? (
                  <text x={head.x + radius * 0.9} y={head.y - radius * 0.9} className="loam-bubble">
                    …
                  </text>
                ) : null}
                {singing && activeWorm ? (
                  <text x={head.x + radius * 0.85} y={head.y - radius} className="loam-bubble">
                    ♪
                  </text>
                ) : null}
              </g>
            );
          })}
        </svg>
      </div>
      </div>
    </div>
  );
}
