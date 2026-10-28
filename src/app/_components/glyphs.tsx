function Shadow() {
  return <ellipse cx="20" cy="33" rx="12" ry="3.2" fill="#6b4428" opacity="0.18" />;
}

export function Rock() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <Shadow />
      <path d="M12 15c0-2 16-2 16 0v13c0 3-16 3-16 0z" fill="#c4894f" />
      <path d="M13 16c2 2 12 2 14 0v11c-2 2-12 2-14 0z" fill="#e0b56a" />
      <ellipse cx="20" cy="15" rx="8" ry="3" fill="#f0d08a" />
      <ellipse cx="20" cy="15" rx="4.6" ry="1.6" fill="#a56b32" />
      <rect x="12.2" y="19" width="15.6" height="2.1" rx="0.4" fill="#8d939a" />
      <rect x="12.2" y="24.2" width="15.6" height="2.1" rx="0.4" fill="#8d939a" />
      <path d="M15 16.2v12M20 16.2v12M25 16.2v12" stroke="#a56b32" strokeWidth="0.7" opacity="0.45" />
    </svg>
  );
}

export function Apple({ gold = false }: { gold?: boolean }) {
  if (gold) {
    return (
      <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
        <Shadow />
        <ellipse cx="20" cy="23" rx="9" ry="11.5" fill="#c4891a" />
        <ellipse cx="20" cy="22" rx="8" ry="10.5" fill="#ffd56a" />
        <ellipse cx="16.6" cy="18" rx="2.2" ry="3" fill="#fff6d0" opacity="0.9" />
        <path d="M20 11c1.2-3 4.2-3.6 5.6-1.4" fill="none" stroke="#a56b18" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <Shadow />
      <path d="M13 14c2 6 2 14 0 18 5-2 9-2 14 0 0-6 0-14 1-18-5 2-10 2-15 0z" fill="#67a63e" />
      <path d="M16 15c1 6 1 13-.2 16 3.4-1.2 7-1.2 10.4 0 .2-6 .2-13.2.6-16-3.6 1.4-7.4 1.4-10.8 0z" fill="#f2c14d" />
      <path d="M17.2 18h7.2M17 22h7.6M17.2 26h7" stroke="#e09a1c" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M20 9c2-3.4 6-3.2 7-.6" fill="none" stroke="#3f6d34" strokeWidth="1.6" strokeLinecap="round" />
      <ellipse cx="25" cy="11" rx="3.2" ry="1.6" fill="#8bc85a" transform="rotate(-30 25 11)" />
    </svg>
  );
}

export function ButtonPlate({ color, down }: { color: "red" | "blue"; down: boolean }) {
  const paint = color === "red" ? "#c4483a" : "#3d78b4";
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <ellipse cx="20" cy="26" rx="13" ry="6" fill="#6b4226" />
      <ellipse cx="20" cy={down ? 24.5 : 20} rx="9" ry="5.4" fill="#c4894f" />
      <ellipse cx="20" cy={down ? 24 : 19.2} rx="6.4" ry="3.6" fill={paint} />
      <ellipse cx="17.4" cy={down ? 22.6 : 17.8} rx="2.2" ry="1" fill="#fff" opacity="0.4" />
    </svg>
  );
}

export function OneWay({ dir }: { dir: string }) {
  const rotation = dir === "right" ? 0 : dir === "down" ? 90 : dir === "left" ? 180 : -90;
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden style={{ transform: `rotate(${rotation}deg)` }}>
      <rect x="6" y="15" width="28" height="10" rx="2" fill="#8a5434" />
      <rect x="8" y="17" width="24" height="2" fill="#c4894f" opacity="0.7" />
      <path d="M10 20h14M18 13l8 7-8 7" fill="none" stroke="#ffd56a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Lever({ on, color }: { on: boolean; color: "red" | "blue" }) {
  const paint = color === "red" ? "#c4483a" : "#3d78b4";
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <rect x="16" y="22" width="8" height="11" rx="2" fill="#6b4226" />
      <path d={on ? "M20 22 L29 12" : "M20 22 L11 12"} stroke={paint} strokeWidth="4" strokeLinecap="round" />
      <circle cx={on ? 29 : 11} cy="12" r="2.4" fill="#f0d08a" />
      <circle cx="20" cy="22" r="3" fill="#e6c36a" />
    </svg>
  );
}

export function Door({ open, color, flip = false }: { open: boolean; color: "red" | "blue"; flip?: boolean }) {
  const wood = color === "red" ? "#a84838" : "#3d6ea0";
  const edge = color === "red" ? "#6e2e24" : "#27486c";
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      {open ? (
        <>
          <rect x="3" y="6" width="7" height="28" rx="2" fill={wood} />
          <rect x="30" y="6" width="7" height="28" rx="2" fill={wood} />
          <path d="M5 10l3 6M32 10l3 6" stroke={edge} strokeWidth="1.2" opacity="0.45" />
        </>
      ) : (
        <>
          <rect x="7" y="5" width="26" height="30" rx="2" fill={edge} />
          <rect x="9" y="7" width="10" height="26" fill={wood} />
          <rect x="21" y="7" width="10" height="26" fill={wood} />
          <path d="M10 9l8 11-8 11M22 9l8 11-8 11" fill="none" stroke={edge} strokeWidth="1.3" opacity="0.55" />
          <rect x="18.2" y="18" width="3.6" height="5" rx="1" fill={flip ? "#c4483a" : "#ffd56a"} />
        </>
      )}
    </svg>
  );
}

export function ExitMouth({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <path d="M6 14h28v18H6z" fill="#6b4226" />
      <path d="M6 14l14-8 14 8" fill="#8a5434" />
      <rect x="11" y="16" width="18" height="16" rx="1" fill={open ? "#ffd56a" : "#4a301c"} />
      {open ? (
        <>
          <circle cx="20" cy="23" r="4.2" fill="#fff6d0" />
          <path d="M16.5 24.5c1.6 1.6 5.4 1.6 7 0" fill="none" stroke="#e09a1c" strokeWidth="1.2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M13 19h14M13 23h14M13 27h14" stroke="#8a5434" strokeWidth="1.3" />
          <circle cx="24" cy="24" r="1.3" fill="#e6c36a" />
        </>
      )}
    </svg>
  );
}

export function Daisy() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <Shadow />
      <path d="M20 22v10" stroke="#3f6d34" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 28c-5 1-6 4-3 5" fill="none" stroke="#67b85a" strokeWidth="1.8" strokeLinecap="round" />
      {Array.from({ length: 10 }, (_, index) => (
        <ellipse
          key={index}
          cx="20"
          cy="12"
          rx="2.6"
          ry="6.2"
          fill="#f2c14d"
          transform={`rotate(${index * 36} 20 20)`}
        />
      ))}
      <circle cx="20" cy="20" r="4.6" fill="#8a5434" />
      <circle cx="18.8" cy="18.8" r="1.3" fill="#c4894f" />
    </svg>
  );
}

export function Scissors() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <circle cx="13" cy="28" r="5" fill="#e6c36a" stroke="#8a5434" strokeWidth="1.5" />
      <circle cx="27" cy="28" r="5" fill="#e6c36a" stroke="#8a5434" strokeWidth="1.5" />
      <path d="M16 25 L30 8" stroke="#d7dde3" strokeWidth="3" strokeLinecap="round" />
      <path d="M24 25 L10 8" stroke="#b7c0c8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Egg() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <Shadow />
      <ellipse cx="20" cy="22" rx="9" ry="12" fill="#e7d3bc" />
      <ellipse cx="20" cy="21" rx="8" ry="11" fill="#fff8ee" />
      <ellipse cx="17" cy="17" rx="2.4" ry="3" fill="#fff" opacity="0.85" />
      <circle cx="23" cy="24" r="1.1" fill="#f0c9b0" />
    </svg>
  );
}

export function Nest({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <ellipse cx="20" cy="26" rx="14" ry="6.2" fill="#c4894f" />
      <ellipse cx="20" cy="25" rx="11" ry="4.2" fill="#e6c36a" />
      <path d="M8 24c3 3 6 1 9 3s6 0 8 2 5-1 8-3" fill="none" stroke="#8a5434" strokeWidth="1.6" />
      <path d="M10 22c4-3 16-3 20 1" fill="none" stroke="#a56b32" strokeWidth="1.6" />
      {filled ? <ellipse cx="20" cy="20" rx="6" ry="8" fill="#fff8ee" /> : null}
    </svg>
  );
}

export function Crack() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <path d="M7 24c3-7 7 1 11-5 3 7 6 1 9 3 2 6-2 10-8 11-8 0-14-3-12-9z" fill="#6b4226" opacity="0.9" />
      <path d="M12 24c3-3 5 1 8-1 2 3 4 1 7 2" fill="none" stroke="#3a2418" strokeWidth="1.4" strokeLinecap="round" />
      <ellipse cx="18" cy="26" rx="3" ry="1.4" fill="#8a5434" opacity="0.7" />
    </svg>
  );
}

export function Key() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <circle cx="14" cy="16" r="7" fill="#e6c36a" stroke="#a56b18" strokeWidth="2" />
      <circle cx="14" cy="16" r="2.4" fill="#6b4226" />
      <path d="M20 18h12l-2 4h-3l-2-3h-2l-1 3h-2z" fill="#e6c36a" />
    </svg>
  );
}

export function Lock() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <rect x="10" y="18" width="20" height="15" rx="2" fill="#8d939a" />
      <path d="M15 18v-5a5 5 0 0 1 10 0v5" fill="none" stroke="#d7dde3" strokeWidth="3" />
      <rect x="12" y="20" width="16" height="3" fill="#6b4226" opacity="0.35" />
      <circle cx="20" cy="26" r="2" fill="#6b4226" />
    </svg>
  );
}

export function Hat() {
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph" aria-hidden>
      <ellipse cx="20" cy="27" rx="15" ry="4.2" fill="#c9a24a" />
      <path d="M12 25c1-8 4-12 8-12s7 4 8 12z" fill="#f0d48a" />
      <path d="M13 24h14" stroke="#b6402c" strokeWidth="2.2" strokeLinecap="round" />
      <ellipse cx="17" cy="16" rx="2.4" ry="1.2" fill="#fff6d0" opacity="0.7" />
    </svg>
  );
}

export function FlowArrow({ dir }: { dir: string }) {
  const rotation = dir === "right" ? 0 : dir === "down" ? 90 : dir === "left" ? 180 : -90;
  return (
    <svg viewBox="0 0 40 40" className="loam-glyph loam-flow" aria-hidden style={{ transform: `rotate(${rotation}deg)` }}>
      <path d="M7 20h22M22 11l9 9-9 9" fill="none" stroke="#fff8ee" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
