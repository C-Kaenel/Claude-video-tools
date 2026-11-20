// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Zufall mit festem Startwert: gleicher Startwert = gleiche Zahlenfolge, auf jedem Rechner. Nie Math.random() im Motor.

/** Mischt eine ganze Zahl zu einer gut verteilten 32-Bit-Zahl (Integer-Hash). */
const mix32 = (x: number) => {
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
};

/** Zahl 0..1 aus beliebig vielen ganzen Zahlen (z. B. Figur-Nummer, Variante) – ohne Zustand. */
export const hash01 = (...keys: number[]) => {
  let h = 0x9e3779b9;
  for (const k of keys) h = mix32(h ^ Math.round(k * 1000));
  return h / 4294967296;
};

/** Zufallsgenerator mit Zustand für längere Folgen (Texturen, Menschenmengen). */
export class Rng {
  private s: number;
  constructor(seed: number) { this.s = mix32(Math.round(seed) + 0x632be5ab); }
  next() { this.s = mix32(this.s + 0x9e3779b9); return this.s / 4294967296; }
  range(a: number, b: number) { return a + (b - a) * this.next(); }
  int(a: number, b: number) { return Math.floor(this.range(a, b + 1)); }
  pick<T>(list: readonly T[]) { return list[Math.floor(this.next() * list.length)]; }
}
