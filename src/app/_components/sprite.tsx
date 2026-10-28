import type { CSSProperties } from "react";

const SPRITES = { hen: 0, chick: 1, berries: 2, egg: 3, nest: 4, filledNest: 5,
  barrel: 6, stone: 7, gate: 8, openGate: 9, plate: 10, pressedPlate: 11,
  corn: 12, flower: 13, sign: 14, grass: 15 } as const;
export type SpriteName = keyof typeof SPRITES;
// Optical crop bounds avoid neighboring pixels from the generated atlas.
const CROPS: Record<SpriteName, string> = {
  hen: "20 20 330 330", chick: "350 25 290 320", berries: "650 35 310 320", egg: "970 35 300 320",
  nest: "20 375 330 275", filledNest: "350 365 330 285", barrel: "680 350 280 300", stone: "980 350 290 300",
  gate: "20 665 330 255", openGate: "350 665 320 255", plate: "665 680 315 245", pressedPlate: "980 680 292 245",
  corn: "35 930 300 315", flower: "350 905 290 340", sign: "675 930 300 310", grass: "980 945 290 300",
};

export function Sprite({ name, className = "", style }: { name: SpriteName; className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={`sprite sprite-${name} ${className}`} style={style}>
    <svg viewBox={CROPS[name]} width="100%" height="100%" focusable="false"><image href="/art/farm-atlas.png" width="1280" height="1280" /></svg>
  </span>;
}

export function Icon({ name }: { name: "undo" | "restart" | "sound" | "mute" | "help" | "map" | "close" | "sun" | "arrow" }) {
  const paths = {
    undo: "M9 5 3 10l6 5M4 10h10a6 6 0 0 1 0 12",
    restart: "M20 9a8 8 0 1 0 0 7M20 3v6h-6",
    sound: "M3 9h4l5-4v16l-5-4H3ZM16 9a6 6 0 0 1 0 8M19 6a10 10 0 0 1 0 14",
    mute: "M3 9h4l5-4v16l-5-4H3ZM17 10l5 6m0-6-5 6",
    help: "M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 4M12 18v.2",
    map: "m3 5 6-2 6 3 6-2v16l-6 2-6-3-6 2ZM9 3v16m6-13v16",
    close: "m6 6 12 12M18 6 6 18",
    sun: "M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
    arrow: "M5 12h14m-6-6 6 6-6 6",
  };
  return <svg viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
