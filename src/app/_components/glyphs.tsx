function Shadow() {
  return <ellipse cx="20" cy="33" rx="12" ry="3.2" fill="#2a160e" opacity="0.22" />;
}

export function Rock() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <Shadow />
      <path d="M8 26c1-8 6-14 12-14s12 5 13 13c-2 4-7 7-13 7s-11-2-12-6z" fill="#6f675e" />
      <path d="M10 24c1-7 5-11 10-11 6 0 10 4 12 11-3 2-7 4-11 4s-9-1-11-4z" fill="#b7ad9f" />
      <path d="M14 18c2-2 5-3 8-1" fill="none" stroke="#efe8dc" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 25l4-3 3 4" fill="none" stroke="#5c554c" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Apple({ gold = false }: { gold?: boolean }) {
  const fill = gold ? "#ffcf4d" : "#ef4d4a";
  const shade = gold ? "#e09a1c" : "#c42d38";
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <Shadow />
      <path d="M20 13c3-6 9-6 11-3" fill="none" stroke="#3f6d34" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="26" cy="11" rx="5" ry="2.6" fill="#7cbc4e" transform="rotate(-28 26 11)" />
      <circle cx="20" cy="23" r="11" fill={shade} />
      <circle cx="19" cy="22" r="10" fill={fill} />
      <ellipse cx="15" cy="18" rx="3.4" ry="2.2" fill="#fff" opacity="0.55" />
      {gold ? <circle cx="27" cy="15" r="1.6" fill="#fff8df" /> : null}
    </svg>
  );
}

export function ButtonPlate({ color, down }: { color: "red" | "blue"; down: boolean }) {
  const paint = color === "red" ? "#ef4d4a" : "#3d86d6";
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <ellipse cx="20" cy="24" rx="13" ry="8" fill="#4a3428" />
      <ellipse cx="20" cy={down ? 23 : 20} rx="9" ry="6.5" fill={paint} />
      <ellipse cx="17" cy={down ? 21 : 18} rx="3" ry="1.6" fill="#fff" opacity="0.45" />
    </svg>
  );
}

export function OneWay({ dir }: { dir: string }) {
  const rotation = dir === "right" ? 0 : dir === "down" ? 90 : dir === "left" ? 180 : -90;
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden style={{ transform: `rotate(${rotation}deg)` }}>
      <rect x="6" y="16" width="28" height="8" rx="2" fill="#5c4636" />
      <path d="M10 20h16M20 13l8 7-8 7" fill="none" stroke="#ffd56a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Lever({ on, color }: { on: boolean; color: "red" | "blue" }) {
  const paint = color === "red" ? "#ef4d4a" : "#3d86d6";
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <rect x="16" y="22" width="8" height="10" rx="2" fill="#5c4636" />
      <path d={on ? "M20 22 L28 12" : "M20 22 L12 12"} stroke={paint} strokeWidth="4" strokeLinecap="round" />
      <circle cx="20" cy="22" r="3" fill="#ffd56a" />
    </svg>
  );
}

export function Door({ open, color, flip = false }: { open: boolean; color: "red" | "blue"; flip?: boolean }) {
  const wood = color === "red" ? "#a45b38" : "#3e6ea0";
  const edge = color === "red" ? "#6d3824" : "#27486c";
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      {open ? (
        <>
          <rect x="3" y="6" width="7" height="28" rx="2" fill={wood} />
          <rect x="30" y="6" width="7" height="28" rx="2" fill={wood} />
          <rect x="4" y="8" width="2" height="24" fill={edge} opacity="0.35" />
        </>
      ) : (
        <>
          <rect x="7" y="5" width="26" height="30" rx="3" fill={edge} />
          <rect x="9" y="7" width="10" height="26" rx="2" fill={wood} />
          <rect x="21" y="7" width="10" height="26" rx="2" fill={wood} />
          <rect x="18.2" y="18" width="3.6" height="5" rx="1" fill={flip ? "#ef4d4a" : "#ffd56a"} />
        </>
      )}
    </svg>
  );
}

export function ExitMouth({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <ellipse cx="20" cy="22" rx="15" ry="12" fill="#3a2618" />
      <ellipse cx="20" cy="22" rx="11" ry="8.5" fill={open ? "#1a100c" : "#5a3b28"} />
      {open ? (
        <ellipse cx="20" cy="23" rx="6" ry="4" fill="#ffd56a" opacity="0.9" />
      ) : (
        <ellipse cx="20" cy="22" rx="6" ry="4" fill="#2c1c12" />
      )}
    </svg>
  );
}

export function Daisy() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <Shadow />
      {Array.from({ length: 8 }, (_, index) => (
        <ellipse
          key={index}
          cx="20"
          cy="13"
          rx="3.4"
          ry="7"
          fill="#fffdf8"
          transform={`rotate(${index * 45} 20 22)`}
        />
      ))}
      <circle cx="20" cy="22" r="5" fill="#ffb703" />
      <circle cx="18.4" cy="20.6" r="1.4" fill="#fff6d0" />
    </svg>
  );
}

export function Scissors() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <circle cx="13" cy="28" r="5" fill="#dfe7ee" stroke="#8ea0b0" strokeWidth="1.5" />
      <circle cx="27" cy="28" r="5" fill="#dfe7ee" stroke="#8ea0b0" strokeWidth="1.5" />
      <path d="M16 25 L30 8" stroke="#f4f7fb" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 25 L10 8" stroke="#c5d0db" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Egg() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <Shadow />
      <ellipse cx="20" cy="22" rx="9" ry="12" fill="#d9c3b0" />
      <ellipse cx="20" cy="21" rx="8" ry="11" fill="#fff6ea" />
      <ellipse cx="17" cy="17" rx="2.4" ry="3" fill="#fff" opacity="0.8" />
      <circle cx="23" cy="24" r="1.1" fill="#e7b5a0" />
    </svg>
  );
}

export function Nest({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <ellipse cx="20" cy="26" rx="14" ry="6" fill="#6a4128" />
      <path d="M8 24c3 3 6 1 9 3s6 0 8 2 5-1 8-3" fill="none" stroke="#c4894f" strokeWidth="2" />
      <path d="M10 22c4-3 16-3 20 1" fill="none" stroke="#8a5a32" strokeWidth="2" />
      {filled ? <ellipse cx="20" cy="20" rx="6" ry="8" fill="#fff6ea" /> : null}
    </svg>
  );
}

export function Crack() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <path d="M6 30 L15 20 L13 18 L22 8 L19 19 L30 14 L22 32 Z" fill="#1c120e" opacity="0.72" />
    </svg>
  );
}

export function Key() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <circle cx="14" cy="16" r="7" fill="#ffe08a" stroke="#c4891a" strokeWidth="2" />
      <circle cx="14" cy="16" r="2.4" fill="#6a4128" />
      <path d="M20 18h12l-2 4h-3l-2-3h-2l-1 3h-2z" fill="#ffe08a" />
    </svg>
  );
}

export function Lock() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <rect x="10" y="18" width="20" height="15" rx="3" fill="#e7eef5" />
      <path d="M15 18v-5a5 5 0 0 1 10 0v5" fill="none" stroke="#e7eef5" strokeWidth="3" />
      <circle cx="20" cy="25" r="2" fill="#6a4128" />
    </svg>
  );
}

export function Hat() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <ellipse cx="20" cy="27" rx="15" ry="4.5" fill="#2f6a34" />
      <path d="M12 24c1-8 4-12 8-12s7 4 8 12z" fill="#67b85a" />
      <ellipse cx="17" cy="16" rx="3" ry="1.5" fill="#e9ffd8" opacity="0.7" />
    </svg>
  );
}

export function FlowArrow({ dir }: { dir: string }) {
  const rotation = dir === "right" ? 0 : dir === "down" ? 90 : dir === "left" ? 180 : -90;
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph loam-flow" aria-hidden style={{ transform: `rotate(${rotation}deg)` }}>
      <path d="M7 20h22M22 11l9 9-9 9" fill="none" stroke="#f3fbff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
