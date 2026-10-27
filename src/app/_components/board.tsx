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

const PALETTE = [
  { body: "#ff7b66", belly: "#ffe4d4", cheek: "#ff5d78" },
  { body: "#73b85d", belly: "#e9f8d4", cheek: "#ff5d78" },
  { body: "#54a8d8", belly: "#e4f6ff", cheek: "#ff5d78" },
  { body: "#e58cba", belly: "#ffe6f3", cheek: "#ff5d78" },
];

type Pt = { x: number; y: number };
type Track = { from: Pt[]; to: Pt[]; t0: number };

const SLIDE_MS = 150;

function beadsAlong(points: Pt[], step: number): Pt[] {
  const first = points[0];
  if (!first) return [];
  if (points.length === 1) return [];
  const out: Pt[] = [];
  for (let index = 0; index < points.length - 1; index++) {
    const from = points[index];
    const to = points[index + 1];
    if (!from || !to) continue;
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const count = Math.max(1, Math.round(distance / step));
    for (let stepIndex = 0; stepIndex < count; stepIndex++) {
      const t = stepIndex / count;
      out.push({
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
      });
    }
  }
  return out;
}

function align(from: Pt[], to: Pt[]): Pt[] {
  if (from.length === to.length) return from;
  if (to.length === from.length + 1 && from[0]) return [from[0], ...from];
  return to.map((point, index) => from[index] ?? point);
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
        aria-label="壤虫的洞穴"
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
          {state.worms.map((worm, index) => {
            const track = tracks.current.get(worm.id);
            const body = track
              ? sample(track, now)
              : worm.segments.map((seg) => ({
                  x: seg.x * size + size / 2,
                  y: seg.y * size + size / 2,
                }));
            const head = body[0];
            if (!head) return null;
            const radius = size * 0.36;
            const paint = PALETTE[index % PALETTE.length] ?? PALETTE[0]!;
            const activeWorm = worm.id === state.activeId;
            const look = worm.facing;
            const pupilX = look === "left" ? -1 : look === "right" ? 1 : 0;
            const pupilY = look === "up" ? -1 : look === "down" ? 1 : stuck && activeWorm ? 0.35 : 0;
            const eye = stuck && activeWorm ? 0.28 : 0.22;
            const pupil = stuck && activeWorm ? 0.14 : 0.09;
            const sliding = track ? now - track.t0 < SLIDE_MS : false;
            const stretch = sliding ? 1.06 : 1;
            const beads = beadsAlong(body, radius * 0.62);
            return (
              <g key={worm.id}>
                {beads.map((bead, beadIndex) => (
                  <g key={beadIndex}>
                    <circle cx={bead.x} cy={bead.y + 3} r={radius * 0.96} fill="#2a160e" opacity="0.14" />
                    <circle cx={bead.x} cy={bead.y} r={radius * 0.98} fill={paint.body} />
                    <ellipse cx={bead.x} cy={bead.y + radius * 0.22} rx={radius * 0.46} ry={radius * 0.28} fill={paint.belly} opacity="0.9" />
                    <circle cx={bead.x - radius * 0.28} cy={bead.y - radius * 0.32} r={radius * 0.28} fill="#fff" opacity="0.16" />
                  </g>
                ))}
                <g
                  transform={`translate(${head.x} ${head.y}) scale(${stretch} ${2 - stretch})`}
                  style={{ pointerEvents: "auto", cursor: "pointer" }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    onFocusWorm(worm.id);
                  }}
                >
                  <circle cy="3" r={radius * 1.05} fill="#2a160e" opacity="0.16" />
                  {body.length === 1 ? (
                    <ellipse
                      cx={look === "left" ? radius * 0.55 : look === "right" ? -radius * 0.55 : 0}
                      cy={look === "up" ? radius * 0.55 : look === "down" ? -radius * 0.55 : 0}
                      rx={look === "up" || look === "down" ? radius * 0.62 : radius * 0.78}
                      ry={look === "up" || look === "down" ? radius * 0.78 : radius * 0.62}
                      fill={paint.body}
                    />
                  ) : null}
                  <circle r={radius * 1.16} fill={paint.body} />
                  <ellipse cx={-radius * 0.32} cy={-radius * 0.4} rx={radius * 0.42} ry={radius * 0.26} fill="#fff" opacity="0.28" />
                  <ellipse
                    cx={look === "left" ? -radius * 0.72 : look === "right" ? radius * 0.72 : 0}
                    cy={look === "up" ? -radius * 0.72 : look === "down" ? radius * 0.72 : radius * 0.15}
                    rx={radius * 0.34}
                    ry={radius * 0.26}
                    fill={paint.body}
                  />
                  <ellipse cy={radius * 0.22} rx={radius * 0.7} ry={radius * 0.42} fill={paint.belly} />
                  <path
                    d={`M ${-radius * 0.16} ${radius * 0.42} Q 0 ${radius * 0.58} ${radius * 0.16} ${radius * 0.42}`}
                    fill="none"
                    stroke="#6a3030"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                  <ellipse cx={-radius * 0.42} cy={radius * 0.28} rx={radius * 0.16} ry={radius * 0.1} fill={paint.cheek} opacity="0.85" />
                  <ellipse cx={radius * 0.42} cy={radius * 0.28} rx={radius * 0.16} ry={radius * 0.1} fill={paint.cheek} opacity="0.85" />
                  <g className={stuck && activeWorm ? undefined : "is-blink"}>
                    <circle cx={-radius * 0.34} cy={-radius * 0.08} r={radius * eye} fill="#fffdf8" />
                    <circle cx={radius * 0.34} cy={-radius * 0.08} r={radius * eye} fill="#fffdf8" />
                    <circle cx={-radius * 0.34 + pupilX * radius * 0.08} cy={-radius * 0.08 + pupilY * radius * 0.08} r={radius * pupil} fill="#24170f" />
                    <circle cx={radius * 0.34 + pupilX * radius * 0.08} cy={-radius * 0.08 + pupilY * radius * 0.08} r={radius * pupil} fill="#24170f" />
                    <circle cx={-radius * 0.38} cy={-radius * 0.14} r={radius * 0.035} fill="#fff" />
                    <circle cx={radius * 0.3} cy={-radius * 0.14} r={radius * 0.035} fill="#fff" />
                  </g>
                  {activeWorm ? (
                    <circle r={radius * 1.28} fill="none" stroke="#fff6df" strokeWidth="2.5" opacity="0.9" />
                  ) : null}
                  {worm.carrying ? <ellipse cy={-radius * 1.35} rx="7" ry="9" fill="#fff6ea" /> : null}
                  {state.hats.length > 0 && activeWorm ? (
                    <g transform={`translate(${-radius * 0.7} ${-radius * 1.55}) scale(${radius / 18})`}>
                      <ellipse cx="12" cy="16" rx="14" ry="4" fill="#2f6a34" />
                      <path d="M4 14c1-8 4-12 8-12s7 4 8 12z" fill="#67b85a" />
                    </g>
                  ) : null}
                  {stuck && activeWorm ? (
                    <text x={radius * 1.15} y={-radius * 0.8} className="loam-bubble">
                      …
                    </text>
                  ) : null}
                  {singing && activeWorm ? (
                    <text x={radius * 1.1} y={-radius * 0.9} className="loam-bubble">
                      ♪
                    </text>
                  ) : null}
                </g>
              </g>
            );
          })}
        </svg>
      </div>
      </div>
    </div>
  );
}
