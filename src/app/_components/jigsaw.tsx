"use client";

import { useMemo, useState } from "react";

function Picture() {
  return (
    <>
      <rect width="300" height="300" fill="#d7b48a" />
      <rect y="210" width="300" height="90" fill="#6e4428" />
      <path d="M20 40c30 20 10 50 40 40M250 30c-20 30 10 40-20 70" fill="none" stroke="#3d6b34" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="168" cy="150" rx="78" ry="36" fill="#e07a45" transform="rotate(-18 168 150)" />
      <ellipse cx="168" cy="156" rx="48" ry="16" fill="#f6d3b4" transform="rotate(-18 168 156)" />
      <circle cx="214" cy="132" r="28" fill="#e07a45" />
      <circle cx="204" cy="126" r="5" fill="#fffaf3" />
      <circle cx="224" cy="126" r="5" fill="#fffaf3" />
      <circle cx="206" cy="127" r="2.2" fill="#24170f" />
      <circle cx="226" cy="127" r="2.2" fill="#24170f" />
      <circle cx="78" cy="92" r="16" fill="#d64545" />
      <path d="M78 78c6-10 16-8 16-2" fill="none" stroke="#3d6b34" strokeWidth="3" />
      <ellipse cx="250" cy="188" rx="18" ry="8" fill="#fffaf0" />
      <circle cx="250" cy="188" r="5" fill="#f0c14a" />
    </>
  );
}

function shuffled(): number[] {
  const order = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = order[index];
    const other = order[swap];
    if (current === undefined || other === undefined) continue;
    order[index] = other;
    order[swap] = current;
  }
  const solved = order.every((piece, index) => piece === index);
  return solved ? [1, 0, 2, 3, 4, 5, 6, 7, 8] : order;
}

export function Jigsaw({
  worldName,
  onBack,
  onSolved,
}: {
  worldName: string;
  onBack: () => void;
  onSolved: () => void;
}) {
  const initial = useMemo(shuffled, []);
  const [order, setOrder] = useState(initial);
  const [picked, setPicked] = useState<number | null>(null);
  const solved = order.every((piece, index) => piece === index);

  function choose(index: number) {
    if (solved) return;
    if (picked === null) {
      setPicked(index);
      return;
    }
    if (picked === index) {
      setPicked(null);
      return;
    }
    setOrder((current) => {
      const next = [...current];
      const left = next[picked];
      const right = next[index];
      if (left === undefined || right === undefined) return current;
      next[picked] = right;
      next[index] = left;
      return next;
    });
    setPicked(null);
  }

  return (
    <section className="loam-jigsaw">
      <header className="loam-top">
        <button type="button" onClick={onBack}>
          回到竖井
        </button>
        <div>
          <p className="loam-kicker">{worldName}</p>
          <h1>歇一会儿，拼一张图</h1>
        </div>
      </header>
      <p className="loam-hint">点两块交换位置。拼好的是一只自己画的壤虫，不是别的游戏的画面。</p>
      <div className="loam-pieces">
        {order.map((piece, index) => {
          const col = piece % 3;
          const row = Math.floor(piece / 3);
          return (
            <button
              key={index}
              type="button"
              className={picked === index ? "is-picked" : ""}
              onClick={() => choose(index)}
              aria-label={`拼图第 ${index + 1} 块`}
            >
              <svg viewBox={`${col * 100} ${row * 100} 100 100`}>
                <Picture />
              </svg>
            </button>
          );
        })}
      </div>
      {solved ? (
        <div className="loam-card">
          <h2>拼好了</h2>
          <p>可以继续往下挖。</p>
          <button type="button" onClick={onSolved}>
            收起来
          </button>
        </div>
      ) : null}
    </section>
  );
}
