"use client";

import { useMemo, useState } from "react";

function Picture() {
  return (
    <>
      <rect width="300" height="300" fill="#f6e7c4" />
      <circle cx="246" cy="48" r="28" fill="#f0c14a" />
      <rect x="18" y="78" width="92" height="70" fill="#b6402c" />
      <path d="M12 78 L64 42 L116 78" fill="#6e2e24" />
      <rect x="48" y="104" width="28" height="44" fill="#f0d7a4" />
      <rect y="188" width="300" height="112" fill="#d7e4a4" />
      <path d="M0 210h300M0 236h300M0 262h300" stroke="#c5d48a" strokeWidth="8" />
      <path d="M24 150c18-28 8-40 22-58M70 160c10-20 28-16 24-40" fill="none" stroke="#6e8b54" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="176" cy="176" rx="46" ry="28" fill="#fffdf8" />
      <circle cx="214" cy="158" r="18" fill="#fffdf8" />
      <path d="M204 146c2-8 8-10 10-2 3-8 9-8 10 0" fill="#d23b3b" />
      <path d="M228 158l14 4-14 4z" fill="#f08a1a" />
      <circle cx="210" cy="156" r="2.2" fill="#2a1c14" />
      <circle cx="118" cy="196" r="14" fill="#ffd24a" />
      <circle cx="132" cy="184" r="8" fill="#ffe566" />
      <path d="M136 180l6 2-6 2z" fill="#f08a1a" />
      <circle cx="86" cy="214" r="12" fill="#ffd24a" />
      <circle cx="96" cy="204" r="7" fill="#ffe566" />
      <ellipse cx="250" cy="228" rx="16" ry="20" fill="#fff8ee" />
      <ellipse cx="246" cy="220" rx="4" ry="5" fill="#fff" opacity="0.8" />
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
          回到农庄
        </button>
        <div>
          <p className="loam-kicker">{worldName}</p>
          <h1>歇一会儿，拼一张图</h1>
        </div>
      </header>
      <p className="loam-hint">点两块交换位置。拼好的是谷场上的白母鸡和黄小鸡。</p>
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
          <p>可以接着去下一栏。</p>
          <button type="button" onClick={onSolved}>
            收起来
          </button>
        </div>
      ) : null}
    </section>
  );
}
