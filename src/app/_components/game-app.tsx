"use client";

import { useEffect, useRef, useState } from "react";

import { playSound, sing } from "~/game/audio";
import { activeIndex, applyMove, applySnip, canSnip } from "~/game/engine";
import { WORLDS, getLevel, nextLevelId } from "~/game/levels";
import { parseLevel } from "~/game/parse";
import { emptySave, mergeSave, normalizeSave, sameSave, type DigSaveData } from "~/game/save";
import type { Dir, GameState, Level } from "~/game/types";
import { api } from "~/trpc/react";
import { Board } from "./board";
import { Jigsaw } from "./jigsaw";
import { Shaft } from "./shaft";

const STORAGE_KEY = "loamly-dig-v1";

type View = "shaft" | "play" | "jigsaw";

function readLocal(): DigSaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeSave(JSON.parse(raw) as unknown) : emptySave;
  } catch {
    return emptySave;
  }
}

export function GameApp() {
  const query = api.dig.get.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const sync = api.dig.sync.useMutation();
  const [booted, setBooted] = useState(false);
  const [save, setSave] = useState<DigSaveData>(emptySave);
  const [view, setView] = useState<View>("shaft");
  const [level, setLevel] = useState<Level | null>(null);
  const [state, setState] = useState<GameState | null>(null);
  const [past, setPast] = useState<GameState[]>([]);
  const [jigsawWorld, setJigsawWorld] = useState("5");
  const [shake, setShake] = useState(false);
  const [bonk, setBonk] = useState(false);
  const [singing, setSinging] = useState(false);

  const viewRef = useRef(view);
  const stateRef = useRef(state);
  const pastRef = useRef(past);
  const levelRef = useRef(level);
  viewRef.current = view;
  stateRef.current = state;
  pastRef.current = past;
  levelRef.current = level;

  function commit(next: DigSaveData) {
    setSave(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    sync.mutate(next);
  }
  const commitRef = useRef(commit);
  commitRef.current = commit;
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    setSave(readLocal());
    setBooted(true);
  }, []);

  useEffect(() => {
    if (!query.data) return;
    setSave((current) => {
      const merged = mergeSave(current, query.data);
      if (sameSave(merged, current)) return current;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  }, [query.data]);

  useEffect(() => {
    if (!state?.won || !level) return;
    const prior = saveRef.current.best.find((item) => item.id === level.id);
    const bestMoves = prior ? Math.min(prior.moves, state.moves) : state.moves;
    const next = mergeSave(saveRef.current, {
      cleared: [level.id],
      hats: state.hats,
      jigsaws: [],
      best: [{ id: level.id, moves: bestMoves }],
    });
    if (sameSave(next, saveRef.current)) return;
    commitRef.current(next);
  }, [state?.won, state?.hats, level]);

  function play(id: string) {
    const found = getLevel(id);
    if (!found) return;
    const fresh = parseLevel(found);
    levelRef.current = found;
    stateRef.current = fresh;
    pastRef.current = [];
    viewRef.current = "play";
    setLevel(found);
    setState(fresh);
    setPast([]);
    setView("play");
  }

  function remember(next: GameState, sound: Parameters<typeof playSound>[0]) {
    const current = stateRef.current;
    if (!current) return;
    const stack = [...pastRef.current, current].slice(-200);
    pastRef.current = stack;
    stateRef.current = next;
    setPast(stack);
    setState(next);
    playSound(sound);
    if (sound === "cut") {
      setShake(true);
      window.setTimeout(() => setShake(false), 240);
    }
  }

  function move(dir: Dir) {
    const current = stateRef.current;
    if (!current || current.won || current.lost || viewRef.current !== "play") return;
    const step = applyMove(current, activeIndex(current), dir);
    if (!step) {
      playSound("no");
      setBonk(true);
      window.setTimeout(() => setBonk(false), 140);
      return;
    }
    remember(step.state, step.sound);
  }

  function undo() {
    const previous = pastRef.current.at(-1);
    if (!previous) return;
    const stack = pastRef.current.slice(0, -1);
    pastRef.current = stack;
    stateRef.current = previous;
    setPast(stack);
    setState(previous);
    playSound("move");
  }

  function restart() {
    const found = levelRef.current;
    if (!found) return;
    const current = stateRef.current;
    if (current) {
      const stack = [...pastRef.current, current].slice(-200);
      pastRef.current = stack;
      setPast(stack);
    }
    const fresh = parseLevel(found);
    stateRef.current = fresh;
    setState(fresh);
  }

  function snip() {
    const current = stateRef.current;
    if (!current || current.won || current.lost) return;
    const step = applySnip(current, activeIndex(current));
    if (!step) {
      playSound("no");
      return;
    }
    remember(step.state, step.sound);
  }

  function swap() {
    const current = stateRef.current;
    if (!current || current.worms.length < 2) return;
    const index = activeIndex(current);
    const next = current.worms[(index + 1) % current.worms.length];
    if (!next) return;
    const switched = { ...current, activeId: next.id };
    stateRef.current = switched;
    setState(switched);
  }

  function hum() {
    sing();
    setSinging(true);
    window.setTimeout(() => setSinging(false), 900);
  }

  const actions = useRef({ move, undo, restart, snip, swap, hum });
  actions.current = { move, undo, restart, snip, swap, hum };

  useEffect(() => {
    let held: Dir | null = null;
    let timer: number | null = null;
    const stop = () => {
      held = null;
      if (timer !== null) window.clearInterval(timer);
      timer = null;
    };
    const start = (dir: Dir) => {
      if (held === dir) return;
      stop();
      held = dir;
      actions.current.move(dir);
      timer = window.setInterval(() => actions.current.move(dir), 145);
    };
    function dirFromKey(key: string): Dir | null {
      const lower = key.toLowerCase();
      if (key === "ArrowUp" || lower === "w") return "up";
      if (key === "ArrowDown" || lower === "s") return "down";
      if (key === "ArrowLeft" || lower === "a") return "left";
      if (key === "ArrowRight" || lower === "d") return "right";
      return null;
    }
    function onKey(event: KeyboardEvent) {
      if (viewRef.current !== "play") return;
      const dir = dirFromKey(event.key);
      if (dir) {
        event.preventDefault();
        if (!event.repeat) start(dir);
        return;
      }
      const key = event.key.toLowerCase();
      if (key === " " || key === "tab") event.preventDefault();
      if (event.repeat) return;
      if (key === "z" || key === "u" || key === "backspace") actions.current.undo();
      else if (key === "r") actions.current.restart();
      else if (key === " ") actions.current.snip();
      else if (key === "tab" || key === "q" || key === "e") actions.current.swap();
      else if (key === "g") actions.current.hum();
      else if (key === "escape") setView("shaft");
    }
    function onUp(event: KeyboardEvent) {
      if (dirFromKey(event.key) === held) stop();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    window.addEventListener("blur", stop);
    return () => {
      stop();
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", stop);
    };
  }, []);

  if (!booted) {
    return (
      <main className="loam-app">
        <p className="loam-loading">正在扒开表土…</p>
      </main>
    );
  }

  if (view === "jigsaw") {
    return (
      <main className="loam-app">
        <Jigsaw
          worldName={jigsawWorld === "10" ? "第十档" : "第五档"}
          onBack={() => setView("shaft")}
          onSolved={() => {
            commitRef.current(
              mergeSave(saveRef.current, { cleared: [], hats: [], jigsaws: [jigsawWorld], best: [] }),
            );
            setView("shaft");
          }}
        />
      </main>
    );
  }

  if (view === "shaft" || !level || !state) {
    return (
      <main className="loam-app">
        <Shaft
          save={save}
          onPlay={play}
          onJigsaw={(world) => {
            setJigsawWorld(world);
            setView("jigsaw");
          }}
        />
      </main>
    );
  }

  const world = WORLDS.find((item) => item.id === level.world);
  const upcoming = nextLevelId(level.id);
  const hatOnMap = level.rows.some((row) => row.includes("H"));
  const wormNo = activeIndex(state) + 1;

  const snippable = canSnip(state, activeIndex(state));

  return (
    <main className="loam-app is-play">
      <header className="loam-playbar">
        <button type="button" className="loam-icon" onClick={() => setView("shaft")} aria-label="回到竖井">
          ←
        </button>
        <div className="loam-play-title">
          <p className="loam-kicker">
            {world?.name}
            {state.worms.length > 1 ? ` · 虫 ${wormNo}/${state.worms.length}` : ""}
            {` · 第 ${state.moves} 步`}
          </p>
          <h1>{level.name}</h1>
          <p className="loam-hint">{level.hint}</p>
        </div>
        <div className="loam-play-actions">
          {state.worms.length > 1 ? (
            <button type="button" className="loam-icon" onClick={swap} aria-label="换一条虫">
              换
            </button>
          ) : null}
          <button type="button" className="loam-icon" onClick={undo} aria-label="撤销">
            ↩
          </button>
          <button type="button" className="loam-icon" onClick={restart} aria-label="重来">
            ↻
          </button>
        </div>
      </header>
      <div className="loam-stage">
        <Board
          state={state}
          shake={shake}
          bonk={bonk}
          singing={singing}
          onMove={move}
          onFocusWorm={(id) => {
            const current = stateRef.current;
            if (!current) return;
            const switched = { ...current, activeId: id };
            stateRef.current = switched;
            setState(switched);
          }}
        />
        {snippable ? (
          <button type="button" className="loam-snip" onClick={snip}>
            剪开
          </button>
        ) : null}
      </div>
      <div className="loam-touch" aria-label="方向">
        <button type="button" className="loam-up" onClick={() => move("up")} aria-label="向上">
          ↑
        </button>
        <button type="button" onClick={() => move("left")} aria-label="向左">
          ←
        </button>
        <button type="button" onClick={() => move("down")} aria-label="向下">
          ↓
        </button>
        <button type="button" onClick={() => move("right")} aria-label="向右">
          →
        </button>
      </div>
      {state.won ? (
        <div className="loam-card" role="dialog" aria-label="过关">
          <h2>洞口开了</h2>
          <p>
            {level.name}挖通了。
            {level.par ? `最短 ${level.par} 步，你用了 ${state.moves} 步。` : `用了 ${state.moves} 步。`}
            {level.par && state.moves <= level.par ? "和最短一样短。" : ""}
            {hatOnMap && state.hats.length === 0 ? "这层的帽子还在土里。" : ""}
          </p>
          <div className="loam-card-actions">
            {hatOnMap && state.hats.length === 0 ? (
              <button type="button" onClick={restart}>
                再挖一次
              </button>
            ) : null}
            {upcoming ? (
              <button type="button" onClick={() => play(upcoming)}>
                继续往下
              </button>
            ) : (
              <button type="button" onClick={() => setView("shaft")}>
                回到竖井
              </button>
            )}
          </div>
        </div>
      ) : null}
      {state.lost === "egg" ? (
        <div className="loam-card" role="dialog" aria-label="蛋碎了">
          <h2>蛋裂了</h2>
          <p>这枚蛋接不回去。撤销刚才那一步，或者重来。</p>
          <div className="loam-card-actions">
            <button type="button" onClick={undo}>
              撤销
            </button>
            <button type="button" onClick={restart}>
              重来
            </button>
          </div>
        </div>
      ) : null}
      {state.lost === "dead" ? (
        <div className="loam-card" role="dialog" aria-label="没有虫了">
          <h2>没有虫了</h2>
          <p>剪得太干净。撤销，或者重来。</p>
          <div className="loam-card-actions">
            <button type="button" onClick={undo}>
              撤销
            </button>
            <button type="button" onClick={restart}>
              重来
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
