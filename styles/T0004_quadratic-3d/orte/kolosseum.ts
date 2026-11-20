// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Ort „Römisches Kolosseum“ (T0004): Ellipse aus 1-m-Säulen (Voxel) – Aussenring hinten vierstöckig mit Arkaden-Öffnungen
// und Gesimsen, vorne (zur Kamera) als Ruine niedrig; Sitzränge stufen sich zur Arena hinab; Arena halb mit Sand und
// Holzboden, halb offen mit dem Gitter der unterirdischen Gänge; aussen Pflaster, Pinien, Touristen. Alles aus Quadern.
import tokens from "../../../shared/design-tokens.json";
import { type Ort } from "../welt";

const R = tokens.color["quadratic-3d"].orte.kolosseum;
const AX = 11, AZ = 9;                 // Halbachsen der Ellipse (m)
const STOCK = 2.0;

/** Ellipsen-„Radius“ 0 (Mitte) … 1 (Aussenkante). */
const er = (x: number, z: number) => Math.sqrt((x / AX) ** 2 + (z / AZ) ** 2);
/** Wie stark der Bau an dieser Stelle zerfallen ist: 0 hinten (intakt) … 1 vorne (zur Kamera, Ruine). */
const ruine = (x: number, z: number) => Math.min(1, Math.max(0, ((x + z) / Math.SQRT2 / Math.hypot(x, z) + 0.15) * 1.6));

export const kolosseum: Ort = {
  name: "kolosseum", groesse: 24, oben: 4 * STOCK + 0.6, seed: 31,
  wege: [[[11.6, -4], [11.6, 4], [8, 10.5], [-3, 11.6]], [[-3.2, -0.6], [-0.6, -3.2]], [[-11.5, -6], [-6, -11.5]]],
  farben: ["#3d6c99", "#9c5a5a", "#7a8794"],
  baue: ({ b, bel, rng, h, Y, kacheln, wegeFrei }) => {
    const sand = (x: number, z: number) => er(x, z) < 0.45;
    const offen = (x: number, z: number) => sand(x, z) && x + z > 0.5;   // Arena-Boden fehlt (zur Kamera hin)
    kacheln((x, z) => {
      const r = er(x, z);
      if (offen(x, z)) return [R.tiefe, 0.05, true];
      if (sand(x, z)) return [x < -1.5 ? R.sand : R.holzBoden, 0.2];
      if (r < 1.02) return [rng.pick(R.travertin), 0.2, true];
      return [rng.pick(R.pflaster), 0.2];
    });
    wegeFrei();
    // Gänge unter der Arena (Gitter aus niedrigen Mauern, im offenen Teil sichtbar)
    for (let i = -h; i < h; i++) for (let j = -h; j < h; j++) {
      const x = i + 0.5, z = j + 0.5;
      if (!offen(x, z)) continue;
      if ((i % 2 === 0) || (j % 3 === 0)) b.box([1, 0.7, 1], [x, 0.05 + 0.35, z], rng.pick(R.travertin));
    }
    // Ring aus Mauer-Stücken entlang der Ellipse (gedrehte Quader): Aussenwand mit Arkaden, Innenwand, Sitzstufen
    const N = 48;
    const punkt = (a: number, s: number) => [Math.cos(a) * AX * s, Math.sin(a) * AZ * s] as const;
    const stueck = (k: number, s: number, fn: (len: number, mitte: readonly [number, number], grad: number, ru: number) => void) => {
      const a0 = (k / N) * Math.PI * 2, a1 = ((k + 1) / N) * Math.PI * 2;
      const p0 = punkt(a0, s), p1 = punkt(a1, s), m = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2] as const;
      const grad = (Math.atan2(-(p1[1] - p0[1]), p1[0] - p0[0]) * 180) / Math.PI;
      fn(Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 0.04, m, grad, ruine(m[0], m[1]));
    };
    // lokale Lage im Stück (u entlang, w quer nach aussen) → Welt
    const lage = (m: readonly [number, number], grad: number, u: number, w: number, y: number): [number, number, number] => {
      const g = (grad * Math.PI) / 180, tx = Math.cos(g), tz = -Math.sin(g);
      return [m[0] + tx * u - tz * w, y, m[1] + tz * u + tx * w];
    };
    for (let k = 0; k < N; k++) {
      // Aussenwand: hinten 4 Stockwerke (3 Arkaden + Attika), Übergang 2–3, vorne fehlt sie (Ruine)
      stueck(k, 1, (len, m, grad, ru) => {
        const stock = ru < 0.45 ? 4 : ru < 0.6 ? 3 : ru < 0.72 ? 2 : 0;
        for (let s = 0; s < stock; s++) {
          const y0 = Y + s * STOCK + (k % 2) * 0.006, f = rng.pick(R.travertin), oben = s === 3;   // Nachbar-Stücke 6 mm versetzt: Überlappungen nie deckungsgleich
          if (oben) { b.box([len, STOCK, 0.7], lage(m, grad, 0, 0, y0 + STOCK / 2), f, undefined, [0, grad, 0]); continue; }
          const pf = 0.38;   // Pfeiler an einem Ende, Öffnung daneben (Brüstung + Bogen-Sturz)
          b.box([pf, STOCK, 0.7], lage(m, grad, -len / 2 + pf / 2, 0, y0 + STOCK / 2), f, undefined, [0, grad, 0]);
          b.box([len - pf, 0.3, 0.7], lage(m, grad, pf / 2, 0, y0 + 0.15), f, undefined, [0, grad, 0]);
          b.box([len - pf, 0.5, 0.7], lage(m, grad, pf / 2, 0, y0 + STOCK - 0.25), f, undefined, [0, grad, 0]);
          b.box([len, 0.12, 0.84], lage(m, grad, 0, 0.04, y0 + STOCK - 0.05), R.travertin[0], undefined, [0, grad, 0]);   // Gesims (1 cm über dem Sturz: nicht deckungsgleich)
        }
        if (stock > 0 && stock < 4) b.box([len * 0.6, 0.5, 0.6], lage(m, grad, rng.range(-0.3, 0.3), 0, Y + stock * STOCK + 0.27), R.ziegel, undefined, [0, grad, 0]);
      });
      // Innenwand (niedriger), vorne als Ruine 1–2 Stockwerke
      stueck(k, 0.86, (len, m, grad, ru) => {
        const stock = ru < 0.55 ? 3 : ru < 0.8 ? 2 : 1;
        for (let s = 0; s < stock; s++) {
          const y0 = Y + s * STOCK + (k % 2) * 0.006, f = rng.pick(R.travertin);
          b.box([0.4, STOCK, 0.6], lage(m, grad, -len / 2 + 0.2, 0, y0 + STOCK / 2), f, undefined, [0, grad, 0]);
          b.box([len - 0.4, 0.5, 0.6], lage(m, grad, 0.2, 0, y0 + STOCK - 0.25), f, undefined, [0, grad, 0]);
          b.box([len - 0.4, 0.3, 0.6], lage(m, grad, 0.2, 0, y0 + 0.15), f, undefined, [0, grad, 0]);
        }
        if (k % 4 === 0) b.box([0.3, stock * STOCK * 0.6, 0.9], lage(m, grad, 0, -0.75, Y + stock * STOCK * 0.3), R.ziegel, undefined, [0, grad, 0]);   // Treppenmauer
      });
      // Sitzstufen von 0,8 (hoch) hinab zur Arena (0,47); vorne niedriger
      for (let st = 0; st < 6; st++) {
        const s = 0.8 - st * 0.055;
        stueck(k, s, (len, m, grad, ru) => {
          const hh = Math.max(0.3, (6 - st) * 0.62 * (1 - 0.5 * ru));
          b.box([len, hh, 0.5], lage(m, grad, 0, 0, Y + hh / 2), st % 2 ? R.travertin[1] : R.travertin[2], undefined, [0, grad, 0]);
        });
      }
    }
    // Arena-Rand (Podium)
    for (let k = 0; k < N; k++) stueck(k, 0.46, (len, m, grad) => b.box([len, 0.9, 0.3], lage(m, grad, 0, 0, Y + 0.45), R.ziegel, undefined, [0, grad, 0]));
    // aussen: Pinien (Schirm aus Quadern), Steinblöcke, Kiosk, Absperrung
    for (const [px, pz] of [[-11, 6.5], [10.5, -10.5], [7.5, -11], [-10.5, -10.5]]) {
      if (!bel.versuch(px, pz, 2, 2)) continue;
      b.box([0.35, 3.2, 0.35], [px, Y + 1.6, pz], tokens.color["quadratic-3d"].karte.stamm);
      b.box([2.6, 0.8, 2.6], [px, Y + 3.5, pz], R.pinie[0]); b.box([1.8, 0.5, 1.8], [px, Y + 4.1, pz], R.pinie[1]);
    }
    for (let k = 0; k < 10; k++) {
      const x = rng.range(-h + 1, h - 1), z = rng.range(-h + 1, h - 1);
      if (er(x, z) < 1.12 || !bel.versuch(x, z, 1.2, 1.2)) continue;
      b.box([1, 0.6, 0.7], [x, Y + 0.3, z], rng.pick(R.travertin)); b.box([0.5, 0.4, 0.5], [x + 0.2, Y + 0.8, z], rng.pick(R.travertin));
    }
    const [kx, kz] = [-9.6, 10.2];
    if (bel.versuch(kx, kz, 2, 2)) {
      b.box([1.8, 2.0, 1.4], [kx, Y + 1.0, kz], tokens.color["quadratic-3d"].karte.wand);
      b.box([2.2, 0.2, 1.8], [kx, Y + 2.1, kz], tokens.color["quadratic-3d"].karte.dach);
      b.box([0.06, 0.7, 1.0], [kx + 0.92, Y + 1.3, kz], tokens.color["quadratic-3d"].karte.wasser);
    }
    for (let k = 0; k < 8; k++) {   // Absperr-Pfosten mit Band vor der Ruine
      const a = 0.35 + k * 0.12, x = Math.cos(a) * AX * 1.12, z = Math.sin(a) * AZ * 1.12;
      if (bel.versuch(x, z, 0.4, 0.4)) b.box([0.1, 0.9, 0.1], [x, Y + 0.45, z], R.tiefe);
    }
  },
};
