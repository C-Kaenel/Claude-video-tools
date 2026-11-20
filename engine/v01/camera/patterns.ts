// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Kamera-Muster: eine Einstellung relativ zu einem Motiv (Punkt am Boden + Blickrichtung zur Kamera).
// Die Werte der Muster stehen in der Bibliothek (library/kameras/); hier nur die Umrechnung in einen Kamera-Schlüssel.
import type { CameraKey, V3 } from "./rig";

export type CameraPattern = {
  name: string;
  distance: number;        // m vom Motiv
  height: number;          // Kamerahöhe in m
  side: number;            // seitlicher Versatz in m (+ = rechts vom Motiv aus Kamerasicht)
  lookHeight: number;      // Blickpunkt-Höhe am Motiv in m
  fov: number;
  focus: number;           // Tiefenschärfe-Stärke (px bei 1080)
  move?: { dx: number; dz: number; frames: number }; // optionale Fahrt (m, relativ, in Kamerarichtung/seitlich)
};

/** Kamera-Schlüssel für ein Motiv bei `at`; `facing` = Richtung (Grad um die Hochachse), in die das Motiv schaut (0 = +z). */
export const cameraFromPattern = (p: CameraPattern, at: V3, facing = 0, start = 0): CameraKey[] => {
  const a = (facing * Math.PI) / 180, fx = Math.sin(a), fz = Math.cos(a), rx = Math.cos(a), rz = -Math.sin(a);
  const pos: V3 = [at[0] + fx * p.distance + rx * p.side, at[1] + p.height, at[2] + fz * p.distance + rz * p.side];
  const look: V3 = [at[0], at[1] + p.lookHeight, at[2]];
  const keys: CameraKey[] = [{ at: start, pos, look, fov: p.fov }];
  if (p.move) keys.push({ at: start + 0.001, pos: [pos[0] - fx * p.move.dz + rx * p.move.dx, pos[1], pos[2] - fz * p.move.dz + rz * p.move.dx], look, fov: p.fov, move: p.move.frames });
  return keys;
};
