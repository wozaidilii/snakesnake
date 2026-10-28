"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { playSound } from "~/game/audio";
import { activeIndex, add, at, applyFledge, applyMove, fledgeCandidates, goalsReady } from "~/game/engine";
import { LEVELS, WORLDS, getLevel, levelsIn } from "~/game/levels";
import { chapterProgress, continueJourney, recommendedLevel } from "~/game/progression";
import { parseLevel } from "~/game/parse";
import { emptySave, mergeSave, normalizeSave, sameSave, type DigSaveData } from "~/game/save";
import type { Dir, GameState, Level, Sound, StepResult } from "~/game/types";
import { api } from "~/trpc/react";
import { Board } from "./board";
import { Icon, Sprite, type SpriteName } from "./sprite";

const STORAGE_KEY = "loamly-dig-v1";
const LAST_LEVEL_KEY = "henyard-flock-level-v3";
const SOUND_KEY = "henyard-sound";
const FIRST = LEVELS[0]!;
const ARROWS: Record<Dir, string> = { up: "↑", down: "↓", left: "←", right: "→" };
const DIR_LABELS: Record<Dir, string> = { up: "向上", down: "向下", left: "向左", right: "向右" };
const DIFFICULTY = ["", "教学", "巧思", "进阶", "烧脑", "挑战"];

function persist(key: string, value: string): boolean {
  try { localStorage.setItem(key, value); return true; } catch { return false; }
}

function Modal({ title, onClose, children, className = "" }: { title: string; onClose: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = ref.current;
    node?.showModal();
    return () => { node?.close(); };
  }, []);
  return <dialog ref={ref} className={`farm-dialog ${className}`} aria-label={title} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="dialog-body"><button type="button" className="icon-button dialog-close" aria-label="关闭弹窗" onClick={onClose}><Icon name="close" /></button>{children}</div>
  </dialog>;
}

function Goal({ sprite, title, detail, done }: { sprite: SpriteName; title: string; detail: string; done: boolean }) {
  return <div className={`goal-row ${done ? "done" : ""}`}><Sprite name={sprite} /><span><strong>{title}</strong><small>{detail}</small></span><b>{done ? "✓" : "○"}</b></div>;
}

export function GameApp() {
  const query = api.dig.get.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const sync = api.dig.sync.useMutation();
  const [save, setSave] = useState<DigSaveData>(emptySave);
  const [level, setLevel] = useState<Level>(FIRST);
  const [state, setState] = useState<GameState>(() => parseLevel(FIRST));
  const [past, setPast] = useState<GameState[]>([]);
  const [booted, setBooted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [localSaved, setLocalSaved] = useState(true);
  const [overlay, setOverlay] = useState<"map" | "help" | "journal" | null>(null);
  const [hints, setHints] = useState(0);
  const [bonk, setBonk] = useState(false);
  const [notice, setNotice] = useState("用方向键，带小鸡们出发吧。");
  const [celebrationReady, setCelebrationReady] = useState(false);
  const [dismissResult, setDismissResult] = useState(false);
  const [animation, setAnimation] = useState<{ sequence: number; step: StepResult } | null>(null);
  const animationId = useRef(0);
  const inputTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queuedDirection = useRef<Dir | null>(null);
  const stateRef = useRef(state), pastRef = useRef(past), saveRef = useRef(save);
  stateRef.current = state; pastRef.current = past; saveRef.current = save;
  const bonkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      const local = normalizeSave(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as unknown);
      setSave((current) => mergeSave(current, local));
      setMuted(localStorage.getItem(SOUND_KEY) === "off");
      const id = localStorage.getItem(LAST_LEVEL_KEY);
      const previous = id ? getLevel(id) : undefined;
      const selected = previous ?? getLevel(recommendedLevel(local) ?? FIRST.id) ?? FIRST;
      setLevel(selected); setState(parseLevel(selected));
    } catch { /* A blocked storage area never prevents playing. */ }
    setBooted(true);
    return () => { if (bonkTimer.current) clearTimeout(bonkTimer.current); clearInput(); };
  }, []);

  useEffect(() => {
    if (!query.data || !booted) return;
    setSave((current) => {
      const merged = mergeSave(current, query.data);
      if (sameSave(merged, current)) return current;
      persist(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  }, [query.data, booted]);

  useEffect(() => {
    if (!state.won) return;
    const next = mergeSave(saveRef.current, { cleared: [state.levelId], hats: state.hats, jigsaws: [], best: [{ id: state.levelId, moves: state.moves }] });
    if (sameSave(next, saveRef.current)) return;
    saveRef.current = next;
    setSave(next);
    setLocalSaved(persist(STORAGE_KEY, JSON.stringify(next)));
    sync.mutate(next);
  // Mutation identity is not a gameplay dependency.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.won, state.levelId, state.moves, state.hats]);

  useEffect(() => {
    setCelebrationReady(false);
    if (!state.won) return;
    const timer = setTimeout(() => setCelebrationReady(true), window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 900);
    return () => clearTimeout(timer);
  }, [state.won, state.levelId]);

  function sound(kind: Sound) { if (!muted) playSound(kind); }
  function clearInput() {
    if (inputTimer.current) clearTimeout(inputTimer.current);
    inputTimer.current = null;
    queuedDirection.current = null;
  }
  useEffect(() => {
    clearInput();
    window.addEventListener("blur", clearInput);
    return () => window.removeEventListener("blur", clearInput);
  }, [overlay]);
  function accept(step: StepResult, current: GameState) {
    const history = [...pastRef.current, current];
    pastRef.current = history; stateRef.current = step.state;
    setPast(history); setState(step.state); setAnimation({ sequence: ++animationId.current, step });
    setDismissResult(false); sound(step.sound);
    const duration = step.sound === "fledge" ? 420 : Math.max(145, ...((step.motion ?? []).map((m) => Math.min(520, (m.path.length - 1) * 130))));
    inputTimer.current = setTimeout(() => {
      inputTimer.current = null;
      const next = queuedDirection.current; queuedDirection.current = null;
      if (next) actions.current.move(next);
    }, duration);
  }
  function play(id: string) {
    const found = getLevel(id);
    if (!found) return;
    clearInput(); setAnimation(null);
    const fresh = parseLevel(found);
    stateRef.current = fresh; pastRef.current = [];
    setLevel(found); setState(fresh); setPast([]); setHints(0); setOverlay(null); setDismissResult(false);
    setNotice(found.insight ?? found.hint);
    persist(LAST_LEVEL_KEY, id);
  }
  function move(dir: Dir) {
    const current = stateRef.current;
    if (current.won || current.lost || overlay || !booted) return;
    if (inputTimer.current) { queuedDirection.current = dir; return; }
    const step = applyMove(current, activeIndex(current), dir);
    if (!step) {
      sound("no"); setBonk(true);
      const head = current.worms[activeIndex(current)]?.segments[0];
      const cell = head ? at(current, add(head, dir)) : undefined;
      setNotice(cell?.fixture?.kind === "bridge" && cell.fixture.collapsed ? "荷叶已经收起了。可以撤销，重新安排过桥的顺序。" : cell?.terrain === "water" ? "鸡群不能下水。果箱可以借水流漂到下游。"
        : cell?.fixture?.kind === "exit" ? "先收齐蓝李、送好鸡蛋，再由 1 号领队回家。"
        : cell?.fixture?.kind === "door" ? cell.fixture.gate === "flip" ? "这是风铃门：母鸡踩入同记号的风铃，会切换开关。" : "门还没有开。留一位伙伴或一个果箱压住同记号的踏板。"
        : cell?.pickup?.kind === "rock" ? "这个方向推不动。果箱不能拉，也不能推上篮子、小屋或另一只伙伴。"
        : cell?.pickup?.kind === "egg" ? "一次只能抱一枚蛋，先把手里的送进空篮子。"
        : "这里被篱笆或伙伴挡住了。试着留出转身的空间，也可以撤销。 ");
      if (bonkTimer.current) clearTimeout(bonkTimer.current);
      bonkTimer.current = setTimeout(() => setBonk(false), 180);
      return;
    }
    accept(step, current);
    const feedback: Partial<Record<Sound, string>> = {
      hat: "捡到一顶纪念草帽，通关后就能带进手记。",
      bell: "叮铃！同记号的铃铛门换了开关，离开风铃也会记住。", bridge: "最后一位已经离开，荷叶轻轻收起了。",
      gold: "一簇蓝李，收好啦。", grow: "新的小伙伴加入了队伍。", push: "果箱往前挪了一格。",
      splash: "果箱顺着水流漂到了下游。", egg: step.state.worms.some((w) => w.carrying) ? "轻轻抱好，带它回编篮。" : "鸡蛋已经安稳地放进编篮。",
      crack: "蛋不小心裂了。撤销一步，再换条干燥的小路。", win: "收获带回家啦，伙伴们辛苦了。", lock: "门闩换了一个方向。",
    };
    setNotice(feedback[step.sound] ?? (goalsReady(step.state) ? "收获齐了，带 1 号母鸡走进写着「回家」的小屋。" : "小鸡们正跟着你的脚印。"));
  }
  function fledge(index?: number) {
    if (overlay || !booted) return;
    const current = stateRef.current;
    const step = applyFledge(current, activeIndex(current), index);
    if (!step) { setNotice("先让小鸡站上发光的育芽地，再按 F 或点选它。每块育芽地只能用一次。"); return; }
    clearInput(); accept(step, current);
    setNotice(`小鸡长大成了 ${Number(step.state.activeId.slice(1)) + 1} 号领队，已切换到新队伍。按 Q 返回原队。`);
  }
  function undo() {
    clearInput(); setAnimation(null);
    const previous = pastRef.current.at(-1);
    if (!previous) return;
    const history = pastRef.current.slice(0, -1);
    pastRef.current = history; stateRef.current = previous;
    setPast(history); setState(previous); setDismissResult(false); setNotice("回到上一步。慢慢想，不着急。"); sound("move");
  }
  function restart() {
    clearInput(); setAnimation(null);
    const fresh = parseLevel(level);
    const history = [...pastRef.current, stateRef.current];
    pastRef.current = history; stateRef.current = fresh;
    setPast(history); setState(fresh); setDismissResult(false); setNotice("重新出发。刚才的重来也可以撤销。");
  }
  function focus(id: string) {
    if (stateRef.current.won || stateRef.current.lost || overlay) return;
    clearInput(); setAnimation(null);
    const next = { ...stateRef.current, activeId: id };
    stateRef.current = next; setState(next);
  }
  function swap() {
    const current = stateRef.current;
    const next = current.worms[(activeIndex(current) + 1) % current.worms.length];
    if (next) focus(next.id);
  }
  const actions = useRef({ move, undo, restart, swap, fledge, blocked: false });
  actions.current = { move, undo, restart, swap, fledge, blocked: !!overlay || ((state.won && celebrationReady || !!state.lost) && !dismissResult) };
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && (event.target.matches("input, textarea, select") || event.target.isContentEditable)) return;
      if (actions.current.blocked) return;
      const key = event.key.toLowerCase();
      const dirs: Record<string, Dir> = { arrowup: "up", w: "up", arrowdown: "down", s: "down", arrowleft: "left", a: "left", arrowright: "right", d: "right" };
      const dir = dirs[key];
      if (dir) { event.preventDefault(); if (!event.repeat) actions.current.move(dir); }
      else if (key === "z" || key === "backspace") { event.preventDefault(); if (!event.repeat) actions.current.undo(); }
      else if (key === "r" && !event.repeat) actions.current.restart();
      else if (key === "q" && !event.repeat) actions.current.swap();
      else if (key === "f" && !event.repeat) { event.preventDefault(); actions.current.fledge(); }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, []);

  const world = WORLDS.find((item) => item.id === level.world)!;
  const chapter = levelsIn(level.world);
  const index = LEVELS.findIndex((item) => item.id === level.id);
  const totalBerries = level.rows.join("").split("G").length - 1;
  const remainingBerries = state.cells.filter((cell) => cell.pickup?.kind === "gold").length;
  const totalEggs = level.rows.join("").split("E").length - 1;
  const delivered = state.cells.filter((cell) => cell.fixture?.kind === "nest" && cell.fixture.filled).length;
  const completed = LEVELS.filter((item) => save.cleared.includes(item.id)).length;
  const upcoming = continueJourney(level.id, save);
  const recommended = recommendedLevel(save);
  const progress = chapterProgress(level.world, save);
  const sideQuest = chapter.find((l) => l.challenge && l.id !== level.id && !save.cleared.includes(l.id));
  const record = save.best.find((item) => item.id === level.id);
  const hintList = level.hints ?? [level.hint];
  const hasBarrel = level.rows.some((row) => row.includes("R"));
  const hasPlate = level.rows.some((row) => /[Bb]/.test(row));
  const hasBell = level.rows.some((row) => /[Pp]/.test(row));
  const hasBridge = level.rows.some((row) => row.includes("~"));
  const showResult = (state.won && celebrationReady || !!state.lost) && !dismissResult;
  const canFledge = fledgeCandidates(state, activeIndex(state)).length > 0;
  const hasRoost = level.rows.some((row) => row.includes("S"));

  return <main className="henyard-app">
    <header className="site-header">
      <a className="brand" href="/" aria-label="咕咕归巢首页"><Sprite name="hen" /><span><strong>咕咕归巢</strong><small>H E N Y A R D</small></span></a>
      <span className="header-caption">一小片田园，一点点巧思。</span>
      <nav className="header-actions" aria-label="游戏菜单">
        <button type="button" className="text-button" aria-label="农场地图" onClick={() => setOverlay("map")}><Icon name="map" /><span>农场地图</span></button>
        <button type="button" className="icon-button journal-button" aria-label="农场手记" onClick={() => setOverlay("journal")}><Sprite name="wateringCan" /></button>
        <button type="button" className="icon-button" aria-label={muted ? "开启声音" : "关闭声音"} aria-pressed={!muted} onClick={() => { setMuted(!muted); persist(SOUND_KEY, muted ? "on" : "off"); }}><Icon name={muted ? "mute" : "sound"} /></button>
        <button type="button" className="icon-button help-button" aria-label="玩法说明" onClick={() => setOverlay("help")}><Icon name="help" /></button>
      </nav>
    </header>

    <section className="welcome"><span className="eyebrow"><span /> A LITTLE FARM, A LITTLE WONDER</span><h1>慢慢走，<em>一起回家。</em></h1><p>带上毛茸茸的小伙伴，把田野里的小小收获带回家。</p></section>

    <div className="game-layout">
      <aside className="journey-panel" aria-label="章节与关卡">
        <div className="section-heading"><span>农场漫游</span><small>{completed} / {LEVELS.length}</small></div>
        <div className="journey-progress"><span style={{ width: `${completed / LEVELS.length * 100}%` }} /></div>
        <div className="chapter-list">{WORLDS.map((item) => <button key={item.id} type="button" className={`chapter-button ${item.id === world.id ? "selected" : ""}`} aria-pressed={item.id === world.id} onClick={() => play(recommendedLevel(save, item.id) ?? levelsIn(item.id)[0]!.id)}><Sprite name={item.icon} /><span><small>CHAPTER {item.depth}</small><strong>{item.name}</strong></span><span className="chapter-chevron">{chapterProgress(item.id, save).earned ? "✓" : "›"}</span></button>)}</div>
        <div className="chapter-lessons"><p>{world.subtitle}</p><ol>{chapter.map((item, i) => <li key={item.id}><button type="button" className={`level-button ${item.id === level.id ? "current" : ""}`} aria-current={item.id === level.id ? "step" : undefined} onClick={() => play(item.id)}><span className={`level-dot ${save.cleared.includes(item.id) ? "cleared" : ""}`}>{save.cleared.includes(item.id) ? "✓" : String(i + 1).padStart(2, "0")}</span><span>{item.name}</span>{item.challenge ? <small className="challenge-dot" title="选修挑战">✧</small> : null}</button></li>)}</ol></div>
        <button type="button" className="journal-link" onClick={() => setOverlay("journal")}><Sprite name={world.souvenir} /><span>{progress.earned ? world.reward : `本章纪念 · ${progress.done}/${progress.total}`}<small>{progress.earned ? "已放进农场手记" : "完成本章主线即可收藏"}</small></span></button>
        <div className="sidebar-note"><Sprite name="grass" /><p>没有倒计时，也不用赶路。<br />卡住时，去别处逛逛也很好。</p></div>
      </aside>

      <section className="play-panel" aria-label="当前关卡">
        <div className="level-heading"><div className="level-number">{String(index + 1).padStart(2, "0")}</div><div><div className="level-kicker">{world.name}<span> / </span>{level.tutorial ? "教学 · 认识规则" : `${DIFFICULTY[level.difficulty ?? 2]} · ${"◆".repeat((level.difficulty ?? 2) - 1)}`}</div><h2>{level.name}</h2></div><div className="move-counter"><strong>{state.moves}</strong><span>步</span></div></div>
        <div className="board-surround"><div className="weather-note"><Icon name="sun" /><span>宜 · 出门散步</span><span className="flock-count"><Sprite name="chick" />{state.worms.reduce((n, w) => n + w.segments.length, 0)} 位成员 · {state.worms.length} 支队伍</span></div>
          <Board key={level.id} biome={level.world} state={state} bonk={bonk} animation={animation} onMove={move} onFocusWorm={focus} onFledge={fledge} />
        </div>
        <div className="control-dock"><div className="directions" aria-label="移动控制">{(["up", "down", "left", "right"] as Dir[]).map((dir) => <button key={dir} type="button" className="direction-button" onClick={() => move(dir)} aria-label={DIR_LABELS[dir]} disabled={!booted || state.won || !!state.lost}>{ARROWS[dir]}</button>)}</div><div className="dock-divider" /><button type="button" className="tool-button" onClick={undo} disabled={!past.length} aria-label="撤销一步"><Icon name="undo" /><span>撤销</span></button><button type="button" className="tool-button" onClick={restart} aria-label="重新开始本关"><Icon name="restart" /><span>重来</span></button>{state.worms.length > 1 ? <button type="button" className="tool-button" onClick={swap} aria-label="切换母鸡"><Sprite name="hen" /><span>换队</span></button> : null}</div>
        {hasRoost ? <div className="flock-tools"><button type="button" className={`fledge-button ${canFledge ? "ready" : ""}`} onClick={() => fledge()} disabled={!canFledge || state.won || !!state.lost}><Sprite name="flower" /><span>离群长大 <kbd>F</kbd></span></button><span>{canFledge ? "点发光的小鸡也可以分队" : state.worms.length > 1 ? `当前：${Number(state.activeId.slice(1)) + 1} 号领队 · 点击母鸡或按 Q 换队` : "让小鸡站在育芽地上"}</span></div> : null}
        <p className="keyboard-tip"><kbd>↑ ↓ ← →</kbd> 或 <kbd>W A S D</kbd> 移动 <span>·</span> <kbd>Z</kbd> 撤销 <span>·</span> <kbd>R</kbd> 重来 {state.worms.length > 1 ? <><span>·</span><kbd>Q</kbd> 换队</> : null}</p>
        <p className="touch-tip">轻点方向按钮，或在草地上滑动</p>
        <div className="status-line" role="status" aria-live="polite"><span />{notice}</div>
      </section>

      <aside className="field-notes" aria-label="目标与提示">
        <section className="paper-card objectives"><span className="card-pin" /><p className="eyebrow">TODAY’S LITTLE QUEST</p><h3>今日的小任务</h3><Goal sprite="berries" title="收集蓝李" detail={`${totalBerries - remainingBerries} / ${totalBerries} 簇已收好`} done={remainingBerries === 0} />{totalEggs > 0 ? <Goal sprite="egg" title="把鸡蛋送回编篮" detail={`${delivered} / ${totalEggs} 枚已安顿`} done={delivered === totalEggs} /> : null}<Goal sprite="sign" title="主队带着收获归巢" detail={goalsReady(state) ? "带队母鸡可以回家啦" : "收好所有任务后回家"} done={state.won} /><p className="quest-footer">{record ? `最好记录 ${record.moves} 步 · 今天也慢慢来` : "每一次小小的发现，都值得开心。"}</p></section>
        <section className="field-tip"><div className="tip-heading"><Sprite name="chick" /><h3>田野小贴士</h3></div><p>{level.insight}</p><button type="button" className="hint-button" onClick={() => setHints((n) => Math.min(hintList.length, n + 1))} disabled={hints >= hintList.length}>{hints === 0 ? "给我一点小提示" : hints < hintList.length ? "再说得具体一点" : "提示都在这里啦"}<span>{hints === 0 ? "＋" : `${hints} / ${hintList.length}`}</span></button>{hints > 0 ? <ol className="hint-list" aria-live="polite">{hintList.slice(0, hints).map((hint, i) => <li key={hint}><small>线索 {i + 1}</small>{hint}</li>)}</ol> : <small className="hint-caption">先自己试试，灵感随时在这里。</small>}</section>
        <section className="field-guide"><h3>在这片田野里</h3>{hasBell ? <div><Sprite name="bell" /><span>母鸡踩铃切换开关；小鸡经过不触发</span></div> : null}{hasBridge ? <div><Sprite name="bridge" /><span>最后一位离开，荷叶桥才收起</span></div> : null}<div><Sprite name="hen" /><span>你走一步，小鸡跟一步</span></div>{hasRoost ? <div><Sprite name="flower" /><span>小鸡站上育芽地，按 F 长大分队</span></div> : null}{hasBarrel ? <div><Sprite name="barrel" /><span>果箱只能推，不能拉</span></div> : null}{hasPlate ? <div><Sprite name="plate" /><span>压住踏板，打开同记号的门</span></div> : <div><Sprite name="berries" /><span>蓝李要全部带回家</span></div>}{totalEggs > 0 ? <div><Sprite name="filledNest" /><span>斑点蛋送编篮，泥塘要绕开</span></div> : <div><Sprite name="corn" /><span>吃到麦穗，多一只小鸡</span></div>}</section>
      </aside>
    </div>
    <footer className="site-footer"><span>HENYARD <i>✦</i> 小小农场，大大的好奇心</span><span>{!localSaved ? "浏览器未能保存进度" : sync.isError || query.isError ? "进度已保存在这台设备" : "进度自动保存"}<b className="save-dot" /></span></footer>

    {overlay === "map" ? <Modal title="农场地图" onClose={() => setOverlay(null)} className="map-dialog"><p className="eyebrow">YOUR LITTLE JOURNEY</p><h2>想去哪里走走？</h2><p>{LEVELS.length} 道谜题，{WORLDS.length} 段旅程。主线循序渐进，✧ 选修挑战随时回来。所有关卡都可以自由探索。</p>{recommended ? <button type="button" className="recommended-route" onClick={() => play(recommended)}><Sprite name="chickHappy" /><span><small>接着这一点好奇心</small>{getLevel(recommended)?.name}</span><Icon name="arrow" /></button> : <p>农场的每一处都留下了你的脚印。手记里还可以查看最短路线纪念。</p>}<div className="map-chapters">{WORLDS.map((item) => <section key={item.id}><h3><Sprite name={item.icon} />{item.depth} · {item.name}</h3><p>{item.blurb}</p><div>{levelsIn(item.id).map((l) => <button type="button" key={l.id} className={l.id === level.id ? "chosen" : ""} onClick={() => play(l.id)}><b>{String(LEVELS.indexOf(l) + 1).padStart(2, "0")}</b><span>{l.name}<small>{l.tutorial ? "教学" : `${l.challenge ? "✧ 选修" : DIFFICULTY[l.difficulty ?? 2]} ${"◆".repeat((l.difficulty ?? 2) - 1)}`}</small></span>{save.cleared.includes(l.id) ? "✓" : "›"}</button>)}</div></section>)}</div></Modal> : null}
    {overlay === "journal" ? <Modal title="农场手记" onClose={() => setOverlay(null)} className="map-dialog"><p className="eyebrow">LITTLE THINGS TO REMEMBER</p><h2>每一段散步，都有纪念。</h2><p>完成一章的主线，收藏一件小纪念。选修挑战和最短路线可以慢慢来；使用提示不会扣掉奖励。</p><div className="souvenir-grid">{WORLDS.map((item) => { const entry = chapterProgress(item.id, save); return <section key={item.id} className={entry.earned ? "souvenir earned" : "souvenir"}><Sprite name={item.souvenir} /><small>{item.depth} · {item.name}</small><h3>{item.reward}</h3><p>{entry.earned ? "已经收藏 · " : "主线 "}{entry.done} / {entry.total}{entry.perfect ? " · ✧ 全章巧思" : ""}</p><div className="souvenir-meter"><span style={{ width: `${entry.done / entry.total * 100}%` }} /></div><p className="souvenir-detail">最短路线 {entry.mastered} / {levelsIn(item.id).length} · 选修完成 {entry.challenges}</p><button type="button" onClick={() => play(recommendedLevel(save, item.id) ?? levelsIn(item.id)[0]!.id)}>{entry.earned ? "再去走走" : "继续这段旅程"} ›</button></section>; })}</div><p>路边草帽：{save.hats.filter((id) => LEVELS.some((l) => id === `${l.id}-hat`)).length} / {LEVELS.filter((l) => l.rows.join("").includes("H")).length} 顶。散步时可以顺路找找，它们不影响通关。</p></Modal> : null}
    {overlay === "help" ? <Modal title="玩法说明" onClose={() => setOverlay(null)}><Sprite name="hen" className="dialog-mascot" /><p className="eyebrow">A FIELD GUIDE</p><h2>跟着妈妈，一起回家。</h2><p>用方向键、WASD、屏幕按钮，或在棋盘滑动。每次只走一格，小鸡会沿着脚印跟随。</p><div className="help-rules"><Goal sprite="berries" title="收齐蓝李" detail="蓝李全部收好，才可以回家。" done={false} /><Goal sprite="corn" title="带上新伙伴" detail="麦穗让队伍变长；留一点转身的空间。" done={false} /><Goal sprite="plate" title="帮忙留门" detail="母鸡、小鸡、果箱都能压踏板。栅门会等队伍通过。" done={false} /><Goal sprite="flower" title="离群长大" detail="让小鸡站上育芽地，按 F 或点选它：它和身后的伙伴组成新队。每块地只用一次，伙伴不会减少。Q 或点母鸡换队，只有 1 号可以结束本关。" done={false} /><Goal sprite="egg" title="照顾鸡蛋" detail="一次抱一枚，送进标有「蛋」的编篮。抱蛋时避开泥塘。" done={false} /><Goal sprite="bell" title="风铃记得开关" detail="母鸡每次踩入风铃，就切换同记号的铃铛门；离开不复原，小鸡经过不触发。铃铛门与踏板门各自独立。" done={false} /><Goal sprite="bridge" title="给荷叶留点力气" detail="最后一只鸟或果箱离开后，桥面收起成水。站在上面的伙伴不会掉落；撤销能恢复桥面。" done={false} /><Goal sprite="sign" title="结束散步" detail="完成任务后，让带队的 1 号母鸡走进「回家」小屋。" done={false} /></div><p className="help-foot">Z 撤销 · R 重来 · F 离群长大 · Q 切换母鸡（或直接点选）<br />重来也能撤销。没有时间限制，可以随时换一关。</p><button type="button" className="primary-button" onClick={() => setOverlay(null)}>知道啦，去散步 <Icon name="arrow" /></button></Modal> : null}
    {showResult && !overlay ? <Modal title={state.won ? "平安归巢" : "再试一条小路"} onClose={() => setDismissResult(true)}><div className="result-art"><Sprite name={state.won ? "filledNest" : "egg"} /><Sprite name={state.won ? "henHappy" : "hen"} /><Sprite name={state.won ? "chickHappy" : "chick"} /></div><p className="eyebrow">{state.won ? "HOME, SWEET HOME" : "TAKE YOUR TIME"}</p><h2>{state.won ? "分工合作，收获满满。" : "没关系，再试一条小路。"}</h2><p>{state.won ? `「${level.name}」的收获已经带回家，今天走了 ${state.moves} 步。` : "蛋在泥塘里磕裂了。撤销刚刚那一步，试着从干燥的草地绕过去。"}</p>{state.won ? <>{state.hats.length ? <p className="result-record">草帽也带回来啦，已经记进农场手记。</p> : null}<div className="result-discovery"><small>这次的小发现</small><p>{level.insight}</p></div><p className="result-record">{level.par && state.moves <= level.par ? "✧ 恰到好处！你找到了最短路线。" : level.par ? `还想再琢磨一下？这关存在 ${level.par} 步的路线。` : "这份发现，已经记在农场手记里了。"}</p>{progress.earned ? <button type="button" className="chapter-reward" onClick={() => setOverlay("journal")}><Sprite name={world.souvenir} /><span>本章纪念：{world.reward}<small>已经放进手记 · 点开看看</small></span></button> : <p className="result-record">这段旅程：主线 {progress.done} / {progress.total} · 继续探索会带回{world.reward}。</p>}{sideQuest ? <button type="button" className="optional-quest" onClick={() => play(sideQuest.id)}>✧ 想多想一会儿：{sideQuest.name}（选修）</button> : null}{!upcoming ? <p>{completed === LEVELS.length ? `${LEVELS.length} 道谜题都完成啦，也可以回头挑战更少步数。` : "这是最后一关。地图上还有没完成的谜题，可以随时回去探索。"}</p> : null}<div className="dialog-actions"><button type="button" onClick={restart}>再散步一次</button><button type="button" className="primary-button" onClick={() => upcoming ? play(upcoming) : setOverlay("map")}>{upcoming ? "去下一片小天地" : "看看农场地图"}<Icon name="arrow" /></button></div></> : <div className="dialog-actions"><button type="button" onClick={restart}>重新出发</button><button type="button" className="primary-button" onClick={undo}>撤销一步 <Icon name="undo" /></button></div>}</Modal> : null}
  </main>;
}
