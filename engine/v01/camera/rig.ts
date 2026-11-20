// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Kamera eines Shots aus Daten: Schlüssel (wo, wohin, wie weit), Gleitfahrten, Schieben im Halt, Schnitte, Stösse, Rollen.

import { lerp, smoother } from "./ease";

export type V3 = [number, number, number];

/** Ein Kamera-Schlüssel. Der erste Schlüssel eines Shots ist die Startposition (at = 0). */
export type CameraKey = {
  at: number;          // Sekunden ab Shot-Anfang: hier beginnt die Fahrt (bzw. der Schnitt)
  pos: V3;             // Kamera-Position (Meter)
  look: V3;            // Blickpunkt
  fov?: number;        // senkrechter Sichtwinkel in Grad (Standard 40)
  roll?: number;       // Schräglage in Grad
  move?: number;       // Dauer der Gleitfahrt in Frames (Standard 24; 18–40 üblich)
  cut?: boolean;       // true = harter Sprung statt Fahrt
  push?: number;       // Schieben im anschliessenden Halt, Prozent pro Frame (Standard 0,2; 0 = aus)
};

/** Stoss: kurzes Zittern, wechselt jedes Frame die Richtung, klingt über `frames` ab. */
export type Kick = { at: number; amp?: number; frames?: number };

export type CameraPose = { pos: V3; look: V3; fov: number; roll: number };

const DEF = { fov: 40, roll: 0, move: 24, push: 0.2 };
const mix3 = (a: V3, b: V3, t: number): V3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/** Kamera in Frame `f` (Frames ab Shot-Anfang). */
export const cameraAt = (keys: CameraKey[], kicks: Kick[] | undefined, f: number, fps: number): CameraPose => {
  if (!keys.length) throw new Error("Shot ohne Kamera-Schlüssel");
  const k0 = keys[0];
  let pose: CameraPose = { pos: k0.pos, look: k0.look, fov: k0.fov ?? DEF.fov, roll: k0.roll ?? DEF.roll };
  let holdFrom = 0;          // Frame, ab dem der aktuelle Halt (mit Schieben) läuft
  let push = k0.push ?? DEF.push;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    const start = Math.round(k.at * fps);
    if (f < start) break;
    const target: CameraPose = { pos: k.pos, look: k.look, fov: k.fov ?? pose.fov, roll: k.roll ?? pose.roll };
    const from = applyPush(pose, push, start - holdFrom);   // dort war die Kamera beim Start der Fahrt
    if (k.cut) {
      pose = target; holdFrom = start;
    } else {
      const dur = k.move ?? DEF.move;
      const t = smoother((f - start) / dur);
      pose = { pos: mix3(from.pos, target.pos, t), look: mix3(from.look, target.look, t), fov: lerp(from.fov, target.fov, t), roll: lerp(from.roll, target.roll, t) };
      if (f >= start + dur) { pose = target; holdFrom = start + dur; } else { holdFrom = f; }
    }
    push = k.push ?? DEF.push;
  }
  pose = applyPush(pose, push, f - holdFrom);
  return applyKicks(pose, kicks ?? [], f, fps);
};

/** Schieben im Halt: Abstand zum Blickpunkt schrumpft pro Frame um `pct` Prozent. */
const applyPush = (p: CameraPose, pct: number, frames: number): CameraPose => {
  if (frames <= 0 || pct <= 0) return p;
  const k = Math.max(0.5, 1 - (pct / 100) * frames);
  return { ...p, pos: [p.look[0] + (p.pos[0] - p.look[0]) * k, p.look[1] + (p.pos[1] - p.look[1]) * k, p.look[2] + (p.pos[2] - p.look[2]) * k] };
};

/** Stösse: Blickpunkt springt seitlich/oben, Vorzeichen wechselt jedes Frame, Stärke nimmt linear ab. */
const applyKicks = (p: CameraPose, kicks: Kick[], f: number, fps: number): CameraPose => {
  let dx = 0, dy = 0;
  for (const k of kicks) {
    const s = Math.round(k.at * fps), n = k.frames ?? 7;
    if (f < s || f >= s + n) continue;
    const i = f - s, a = (k.amp ?? 0.06) * (1 - i / n) * (i % 2 === 0 ? 1 : -1);
    dx += a; dy += a * 0.6;
  }
  if (!dx && !dy) return p;
  const d = Math.hypot(p.look[0] - p.pos[0], p.look[2] - p.pos[2]) || 1;
  const rx = -(p.look[2] - p.pos[2]) / d, rz = (p.look[0] - p.pos[0]) / d; // Rechts-Richtung der Kamera
  return { ...p, look: [p.look[0] + rx * dx, p.look[1] + dy, p.look[2] + rz * dx] };
};
