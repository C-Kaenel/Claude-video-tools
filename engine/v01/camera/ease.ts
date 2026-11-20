// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Kurven für weiche Bewegungen (Standard-Mathematik).

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** weich anfahren und bremsen (3x² − 2x³) */
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
/** noch weicher (6x⁵ − 15x⁴ + 10x³): Standard für Kamerafahrten */
export const smoother = (x: number) => { const u = clamp01(x); return u * u * u * (u * (u * 6 - 15) + 10); };
/** schnell los, sanft aus */
export const easeOut = (x: number) => 1 - (1 - clamp01(x)) ** 3;
/** Aufploppen mit leichtem Überschwingen (für Karten, Sprechblasen) */
export const pop = (x: number) => {
  const u = clamp01(x);
  return 1 + 2.4 * (u - 1) ** 3 + 1.4 * (u - 1) ** 2;
};
