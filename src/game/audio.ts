import type { Sound } from "./types";

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext;
  context ??= new Ctx();
  if (context.state === "suspended") void context.resume();
  return context;
}

function tone(
  freq: number,
  when: number,
  duration: number,
  type: OscillatorType,
  gain: number,
): void {
  const ctx = audio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  amp.gain.setValueAtTime(gain, when);
  amp.gain.exponentialRampToValueAtTime(0.001, when + duration);
  osc.connect(amp);
  amp.connect(ctx.destination);
  osc.start(when);
  osc.stop(when + duration);
}

export function playSound(sound: Sound): void {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  if (sound === "move") tone(180, now, 0.06, "sine", 0.03);
  else if (sound === "eat") tone(140, now, 0.09, "triangle", 0.04);
  else if (sound === "push") tone(90, now, 0.1, "square", 0.02);
  else if (sound === "grow") {
    tone(330, now, 0.08, "sine", 0.04);
    tone(440, now + 0.07, 0.1, "sine", 0.04);
  } else if (sound === "gold") {
    tone(523, now, 0.12, "triangle", 0.05);
    tone(659, now + 0.08, 0.16, "triangle", 0.04);
  } else if (sound === "splash") tone(420, now, 0.14, "sine", 0.03);
  else if (sound === "spring") tone(520, now, 0.12, "sine", 0.04);
  else if (sound === "cut") {
    tone(180, now, 0.05, "sawtooth", 0.02);
    tone(90, now + 0.04, 0.12, "square", 0.03);
  } else if (sound === "crack") tone(70, now, 0.16, "square", 0.03);
  else if (sound === "egg" || sound === "key" || sound === "hat" || sound === "lock") {
    tone(sound === "hat" ? 700 : 480, now, 0.1, "sine", 0.04);
  } else if (sound === "win") {
    [523, 659, 784, 1046].forEach((freq, index) => {
      tone(freq, now + index * 0.09, 0.2, "triangle", 0.04);
    });
  } else if (sound === "no") tone(110, now, 0.05, "sine", 0.02);
}

/** A short original hum. The worm just likes the sound of dirt. */
export function sing(): void {
  const ctx = audio();
  if (!ctx) return;
  const now = ctx.currentTime;
  [262, 294, 330, 392, 330, 262].forEach((freq, index) => {
    tone(freq, now + index * 0.13, 0.16, "sine", 0.045);
  });
}
