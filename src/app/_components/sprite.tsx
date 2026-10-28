import { useId, type CSSProperties } from "react";

const SPRITES = { hen: 0, chick: 1, berries: 2, egg: 3, nest: 4, filledNest: 5,
  barrel: 6, stone: 7, gate: 8, openGate: 9, plate: 10, pressedPlate: 11,
  corn: 12, flower: 13, sign: 14, grass: 15 } as const;
const EXTRA = {
  bell: "20 20 315 330", bellOn: "340 20 310 330", bridge: "650 100 320 260", ripple: "980 120 280 240",
  bellGate: "20 390 310 280", openBellGate: "335 390 325 280", henHappy: "665 360 320 310", chickHappy: "1025 410 215 260",
  wateringCan: "20 670 310 285", gardenBadge: "335 700 300 250", eggBasket: "650 675 310 295", sailboat: "980 680 285 280",
  chimeBadge: "80 950 190 300", lotusLantern: "330 960 310 285", sparkles: "660 990 270 240", feather: "980 990 280 240",
} as const;
export type SpriteName = keyof typeof SPRITES | keyof typeof EXTRA;
// Optical crop bounds avoid neighboring pixels from the generated atlas.
const CROPS: Record<SpriteName, string> = {
  ...EXTRA,
  hen: "20 30 340 350", chick: "380 130 240 245", berries: "665 150 290 230", egg: "985 165 245 220",
  nest: "20 440 315 225", filledNest: "345 440 310 225", barrel: "665 410 285 255", stone: "970 450 280 220",
  gate: "20 685 320 250", openGate: "345 685 330 250", plate: "680 725 280 195", pressedPlate: "965 735 285 190",
  corn: "25 950 310 295", flower: "350 960 300 285", sign: "645 955 330 295", grass: "965 995 285 260",
};

export function Sprite({ name, className = "", style }: { name: SpriteName; className?: string; style?: CSSProperties }) {
  const clipId = useId();
  const [x, y, width, height] = CROPS[name].split(" ");
  return <span aria-hidden="true" className={`sprite sprite-${name} ${className}`} style={style}>
    <svg viewBox={CROPS[name]} width="100%" height="100%" focusable="false">
      <defs><clipPath id={clipId}><rect x={x} y={y} width={width} height={height} /></clipPath></defs>
      <image href={name in EXTRA ? "/art/farm-expansion-v3.png" : "/art/farm-atlas-v2.png"} width="1280" height="1280" clipPath={`url(#${clipId})`} />
    </svg>
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
