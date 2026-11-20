// Herkunft: eigen (V-Video), geschrieben 2026-11-16, ohne Vorlage.
// Bauten der Nord-Welt (Wikinger um 900): Langhaus mit Grassoden-Dach, gebauchten Wänden, Stützpfosten und Drachenköpfen am
// Giebel (drei Varianten, mit Innenraum: Langfeuer, Schlafbänke, Pfostenreihen), Grubenhaus, Bootsschuppen, Vorratsspeicher auf
// Pfosten, Schmiede-Unterstand, Flechtzaun, Palisade, Landesteg, Grabhügel, Steinschiff und Thingplatz. Ursprung jedes Baus =
// Mitte am Boden (y 0), Längsachse x, Vorderseite (Tür) nach +z.
import * as THREE from "three";
import { Rng } from "../core/random";
import { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { earth, flecht, grass, planks, plaster, rock, shade } from "./paint";
import type { NordPalette } from "./nord";

type B = ReturnType<Kit["batch"]>;
const ball = new THREE.IcosahedronGeometry(1, 2);
const deg = (r: number) => (r * 180) / Math.PI;

/** Farben der Bauten (Teil der Nord-Palette in den Tokens). */
export type NordBauFarben = { holz: string; holzDunkel: string; holzHell: string; bemalung: string[]; lehm: string; flecht: string;
  erde: string; stein: string; tuer: string; metall: string; fell: string[]; decken: string[]; rauch: string };
type NP = NordPalette & NordBauFarben;

// ---------------- Drachenkopf ----------------
/** Seitenriss eines geschnitzten Drachenkopfs (Länge 1, Blick nach +x): offenes Maul, Auge, eingerollter Kamm. */
const drachenForm = () => {
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(0.38, 0.04); s.quadraticCurveTo(0.7, 0.0, 0.96, 0.1);   // Unterkiefer
  s.lineTo(0.72, 0.17); s.lineTo(1.02, 0.25);                                       // Maul, Oberkiefer-Spitze
  s.quadraticCurveTo(0.86, 0.36, 0.62, 0.36);                                       // Schnauze
  s.quadraticCurveTo(0.5, 0.48, 0.42, 0.58);                                        // Stirn
  s.quadraticCurveTo(0.34, 0.74, 0.2, 0.7); s.quadraticCurveTo(0.1, 0.62, 0.22, 0.54);   // eingerollter Kamm
  s.quadraticCurveTo(0.12, 0.48, 0.06, 0.38); s.lineTo(0, 0.3);                     // Nacken
  s.closePath();
  return s;
};
/** Drachenkopf: Länge `l`, Blick in Richtung `dreh` (Grad um y, 0 = +x), Farbe Kopf, Akzent (Kamm, Zunge). Ursprung = Nacken unten. */
export const drachenkopf = (b: B, np: NP, at: V3, l: number, dreh: number, farbe: string, akzent: string) => {
  const d = l * 0.16;
  const geo = new THREE.ExtrudeGeometry(drachenForm(), { depth: d, bevelEnabled: true, bevelSize: l * 0.025, bevelThickness: l * 0.025, bevelSegments: 2, curveSegments: 10 });
  geo.translate(0, 0, -d / 2); geo.scale(l, l, 1);
  b.add(geo, at, farbe, undefined, [0, dreh, 0]);
  const a = (dreh * Math.PI) / 180, fx = Math.cos(a), fz = -Math.sin(a);   // Blickrichtung
  const p = (u: number, v: number, w = 0): V3 => [at[0] + fx * u * l + fz * w, at[1] + v * l, at[2] + fz * u * l - fx * w];
  for (const s of [-1, 1]) {   // Augen beidseits
    b.add(ball, p(0.56, 0.38, s * (d / 2 + l * 0.03)), "#ffffff", undefined, [0, 0, 0], [l * 0.06, l * 0.06, l * 0.035]);
    b.add(ball, p(0.58, 0.385, s * (d / 2 + l * 0.055)), "#1c1a22", undefined, [0, 0, 0], [l * 0.03, l * 0.035, l * 0.02]);
  }
  b.add(new THREE.BoxGeometry(l * 0.24, l * 0.035, d * 0.5), p(0.84, 0.15), akzent, undefined, [0, dreh, -12]);   // Zunge
  b.add(new THREE.BoxGeometry(l * 0.5, l * 0.045, d + l * 0.06), p(0.2, 0.08), akzent, undefined, [0, dreh, 8]);   // Halsband
};

// ---------------- Langhaus ----------------
export type LanghausArt = "gross" | "mittel" | "klein";
const LANGHAUS: Record<LanghausArt, { l: number; w: number; h: number; first: number; bauch: number; wand: "planken" | "rot" | "flecht"; drache: number }> = {
  gross: { l: 26, w: 7.5, h: 2.7, first: 7.2, bauch: 0.8, wand: "planken", drache: 0 },
  mittel: { l: 20, w: 6.5, h: 2.5, first: 6.4, bauch: 0.6, wand: "rot", drache: 1 },
  klein: { l: 15, w: 5.8, h: 2.3, first: 5.6, bauch: 0.45, wand: "flecht", drache: 2 },
};
/** Masse eines Langhauses (für Grundrisse, Kameras, Innenraum). */
export const langhausMasse = (art: LanghausArt) => LANGHAUS[art];

/**
 * Langhaus mit Grassoden-Dach (Grasbüschel, keine Blumen): gebauchte Längswände (Bootsform), schräge Stützpfosten aussen, Giebel mit gekreuzten Windbrettern
 * und Drachenköpfen, Tür in der Mitte der Vorderseite (+z) mit bemaltem Rahmen, Rauchloch mit Rauch (separat in der Welt).
 * Varianten: "gross" (26 m, Bohlen), "mittel" (20 m, rot gestrichene Bohlen), "klein" (15 m, Flechtwerk mit Lehm).
 * Innen: Langfeuer, Schlafbänke mit Fellen und Decken, zwei Pfostenreihen, Lehmboden. `innen` = Dach und Wände werfen keinen
 * Schatten (für Aufnahmen im Haus).
 */
export const langhaus = (kit: Kit, np: NP, art: LanghausArt, seed = 1, innen = false) => {
  const m = LANGHAUS[art], r = new Rng(seed * 31 + 7), b = kit.batch();
  const L = m.l, W = m.w, H = m.h, R = m.first, hw = W / 2;
  const bauch = (x: number) => hw + m.bauch * (1 - (2 * x / L) ** 2);   // halbe Breite an der Stelle x
  const holz = m.wand === "rot" ? np.bemalung[0] : np.holz;
  const wandTex = m.wand === "flecht" ? plaster(np.lehm) : planks(m.wand === "rot" ? shade(np.bemalung[0], 0.85) : np.holz, true);
  // Steinsockel
  for (const s of [-1, 1]) for (let x = -L / 2; x < L / 2; x += 0.9) b.add(ball, [x + 0.45, 0.12, s * bauch(x + 0.45)], np.stein, undefined, [0, r.range(0, 90), 0], [0.5, 0.22, 0.32]);
  // Längswände aus Abschnitten entlang der Bauchlinie (Tür vorn in der Mitte ausgespart)
  const TB = 1.5, TH = 2.1;
  const n = Math.round(L / 1.1);
  for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
    const x0 = -L / 2 + (L * i) / n, x1 = -L / 2 + (L * (i + 1)) / n, xm = (x0 + x1) / 2;
    const z0 = s * bauch(x0), z1 = s * bauch(x1), len = Math.hypot(x1 - x0, z1 - z0) + 0.04, ang = Math.atan2(z1 - z0, x1 - x0);
    const stueck = (a: number, e: number, y0: number, y1: number) => {   // Wandstück von x a bis e, Höhe y0…y1
      const za = s * bauch(a), ze = s * bauch(e), l2 = Math.hypot(e - a, ze - za) + 0.04, w2 = Math.atan2(ze - za, e - a);
      b.add(new THREE.BoxGeometry(l2, y1 - y0, 0.16), [(a + e) / 2, (y0 + y1) / 2, (za + ze) / 2], "#ffffff", wandTex, [0, -deg(w2), 0]);
    };
    if (s > 0 && x1 > -TB / 2 && x0 < TB / 2) {   // Abschnitt mit Tür: links und rechts davon ganze Höhe, darüber der Sturz
      if (x0 < -TB / 2) stueck(x0, -TB / 2, 0, H);
      if (x1 > TB / 2) stueck(TB / 2, x1, 0, H);
      stueck(Math.max(x0, -TB / 2), Math.min(x1, TB / 2), TH, H);
      continue;
    }
    b.add(new THREE.BoxGeometry(len, H, 0.16), [xm, H / 2, (z0 + z1) / 2], "#ffffff", wandTex, [0, -deg(ang), 0]);
    if (m.wand === "flecht" && i % 2 === 0) b.add(new THREE.BoxGeometry(0.16, H, 0.2), [x0, H / 2, z0], np.holzDunkel);   // Ständer im Lehm
  }
  // Tür: Rahmen bemalt, Bohlentür mit Eisenbändern (1 cm vor der Wandflucht)
  const zt = bauch(0);
  const rahmen = np.bemalung[(m.drache + 1) % np.bemalung.length];
  b.add(new THREE.BoxGeometry(0.2, TH + 0.2, 0.24), [-TB / 2 - 0.1, (TH + 0.2) / 2, zt], rahmen);
  b.add(new THREE.BoxGeometry(0.2, TH + 0.2, 0.24), [TB / 2 + 0.1, (TH + 0.2) / 2, zt], rahmen);
  b.add(new THREE.BoxGeometry(TB + 0.6, 0.24, 0.26), [0, TH + 0.12, zt], rahmen);
  b.add(new THREE.BoxGeometry(TB, TH, 0.08), [0, TH / 2, zt - 0.06], "#ffffff", planks(np.tuer, true));
  for (const y of [0.5, 1.6]) b.add(new THREE.BoxGeometry(TB * 0.9, 0.08, 0.04), [0, y, zt - 0.005], np.metall);
  b.teil("tuer", [TB, TH, 0.3], [0, TH / 2, zt]);
  // Giebelwände: Bohlen bis unter das Dach (Dreieck)
  const ueber = 0.9, zmax = hw + m.bauch + ueber;   // Dachtraufe aussen
  const dachY = (z: number) => R - (R - (H - 0.35)) * (Math.abs(z) / zmax);
  for (const sx of [-1, 1]) {
    const xg = sx * L / 2, zg = bauch(xg);
    for (let z = -zg; z < zg - 0.01; z += 0.35) {
      const zz = Math.min(z + 0.35, zg), zm = (z + zz) / 2, hh = Math.min(dachY(Math.abs(zm) + 0.2), R) - 0.15;
      b.add(new THREE.BoxGeometry(0.14, hh, zz - z + 0.02), [xg, hh / 2, zm], "#ffffff", planks(m.wand === "rot" ? shade(np.bemalung[0], 0.85) : np.holz, true));
    }
  }
  // Schräge Stützpfosten aussen an den Längswänden
  for (const s of [-1, 1]) for (let x = -L / 2 + 2; x <= L / 2 - 2; x += 3) {
    if (s > 0 && Math.abs(x) < 1.6) continue;
    const zw = s * bauch(x), zf = zw + s * 1.3, len = Math.hypot(1.3, H - 0.2);
    b.add(new THREE.CylinderGeometry(0.11, 0.14, len, 8), [x, (H - 0.2) / 2, (zw + zf) / 2], np.holzDunkel, undefined, [s * deg(Math.atan2(1.3, H - 0.2)), 0, 0]);
  }
  // Dach: Erdschicht (braun) und darauf Gras-Soden 6 cm höher (keine gemeinsame Ebene)
  const dl = L + 1.4, schr = Math.hypot(zmax, R - (H - 0.35)), neig = Math.atan2(R - (H - 0.35), zmax);
  for (const s of [-1, 1]) {
    const zc = s * zmax / 2, yc = (R + H - 0.35) / 2;
    b.add(new THREE.BoxGeometry(dl, 0.5, schr + 0.3), [0, yc, zc], "#ffffff", earth(np.erde), [s * deg(neig), 0, 0]);
    b.add(new THREE.BoxGeometry(dl - 0.25, 0.5, schr + 0.15), [0, yc + 0.06 / Math.cos(neig), zc], "#ffffff", grass(np.grass), [s * deg(neig), 0, 0]);
  }
  b.add(new THREE.CylinderGeometry(0.42, 0.42, dl - 0.25, 10), [0, R + 0.12, 0], "#ffffff", grass(shade(np.grass, 0.92)), [0, 0, 90]);   // First-Wulst
  for (let i = 0; i < Math.round(L * 1.4); i++) {   // Grasbüschel auf dem Dach (ohne Blumen)
    const x = r.range(-L / 2, L / 2), s = r.next() < 0.5 ? -1 : 1, u = r.range(0.1, 0.9), z = s * u * zmax, y = R - (R - (H - 0.35)) * u + 0.32;
    b.add(new THREE.ConeGeometry(0.2, 0.75, 5), [x, y + 0.1, z], shade(np.grass, r.range(0.85, 1.3)), undefined, [s * deg(neig) * 0.6, 0, 0]);
  }
  // Windbretter am Giebel: gekreuzt über dem First, Enden als Drachenköpfe (nach aussen)
  const dk = np.bemalung[m.drache % np.bemalung.length], ak = np.bemalung[(m.drache + 2) % np.bemalung.length];
  for (const sx of [-1, 1]) {
    const xb = sx * (dl / 2 + 0.08);
    for (const s of [-1, 1]) {
      const len = schr + 1.6;
      const zc = zmax / 2 - 0.6, yc = R - (R - (H - 0.35)) * (zc / zmax) + 0.42;   // knapp über der Dachfläche, über dem First gekreuzt
      b.add(new THREE.BoxGeometry(0.14, 0.3, len), [xb, yc, s * zc], dk, undefined, [s * deg(neig), 0, 0]);
    }
    drachenkopf(b, np, [xb + sx * 0.05, R + 0.75, 0], 2.4, sx > 0 ? 0 : 180, dk, ak);
  }
  // Innenraum: Lehmboden (4 cm über dem Gelände), Langfeuer, Schlafbänke mit Fellen/Decken, Pfostenreihen
  b.add(new THREE.BoxGeometry(L - 0.2, 0.08, (hw + m.bauch) * 2 - 0.3), [0, 0.0, 0], "#ffffff", earth(np.erde));
  const fl = L * 0.35;
  for (let x = -fl / 2; x <= fl / 2; x += 0.55) for (const s of [-1, 1]) b.add(ball, [x, 0.12, s * 0.7], np.stein, undefined, [0, r.range(0, 90), 0], [0.3, 0.16, 0.22]);
  for (const sx of [-1, 1]) b.add(ball, [sx * (fl / 2 + 0.3), 0.12, 0], np.stein, undefined, [0, 0, 0], [0.25, 0.16, 0.6]);
  b.add(new THREE.BoxGeometry(fl, 0.06, 1.1), [0, 0.07, 0], "#3a2a22");   // Asche
  for (const s of [-1, 1]) {
    const zb = s * (hw - 0.85);
    b.add(new THREE.BoxGeometry(L - 2.2, 0.5, 1.5), [0, 0.25, zb], "#ffffff", planks(np.holzHell));
    for (let x = -L / 2 + 2; x < L / 2 - 2; x += r.range(1.4, 2.2)) {
      if (s > 0 && Math.abs(x) < 1.4) continue;
      b.add(new THREE.BoxGeometry(r.range(0.9, 1.4), 0.08, 1.2), [x, 0.54, zb], r.pick(np.decken), undefined, [0, r.range(-6, 6), 0]);
      if (r.next() < 0.5) b.add(ball, [x + r.range(-0.3, 0.3), 0.62, zb], r.pick(np.fell), undefined, [0, r.range(0, 90), 0], [0.5, 0.1, 0.4]);
    }
    const ph = dachY(hw - 1.95) - 0.45;   // Pfosten enden unter dem Dach (sonst stechen sie oben heraus)
    for (let x = -L / 2 + 2.5; x < L / 2 - 1; x += 3.2) b.add(new THREE.CylinderGeometry(0.16, 0.18, ph, 10), [x, ph / 2, s * (hw - 1.95)], np.holzDunkel);
  }
  b.add(new THREE.BoxGeometry(L - 1, 0.24, 0.24), [0, R - 0.75, 0], np.holzDunkel);   // Firstbalken innen
  const g = b.build(`langhaus-${art}`);
  g.userData.occluder = false;   // Kameras dürfen ins Haus blicken (Innenraum)
  if (innen) g.traverse((o) => { (o as THREE.Mesh).castShadow = false; });
  return g;
};

// ---------------- kleine Bauten ----------------
/** Grubenhaus: kleine Hütte, Dach bis fast zum Boden (Grassoden), Bohlen-Giebel mit Tür vorn (+z). 4,5 × 3,5 m. */
export const grubenhaus = (kit: Kit, np: NP, seed = 1) => {
  const b = kit.batch(), L = 3.5, W = 4.5, R = 3.2, neig = Math.atan2(R - 0.4, W / 2 + 0.3), schr = Math.hypot(W / 2 + 0.3, R - 0.4);
  void seed;
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(schr + 0.2, 0.4, L + 0.8), [s * (W / 4 + 0.15), (R + 0.4) / 2, 0], "#ffffff", earth(np.erde), [0, 0, -s * deg(neig)]);
    b.add(new THREE.BoxGeometry(schr + 0.05, 0.4, L + 0.6), [s * (W / 4 + 0.15), (R + 0.4) / 2 + 0.06 / Math.cos(neig), 0], "#ffffff", grass(np.grass), [0, 0, -s * deg(neig)]);
  }
  for (const sz of [-1, 1]) for (let x = -W / 2 + 0.2; x < W / 2 - 0.2; x += 0.32) {   // Giebel-Dreiecke
    const hh = Math.max(0.3, R - 0.25 - (R - 0.4) * (Math.abs(x + 0.16) / (W / 2 + 0.3)));
    if (sz > 0 && Math.abs(x + 0.16) < 0.5 && hh > 1.8) { b.add(new THREE.BoxGeometry(0.33, hh - 1.8, 0.12), [x + 0.16, 1.8 + (hh - 1.8) / 2, sz * L / 2], "#ffffff", planks(np.holz, true)); continue; }
    b.add(new THREE.BoxGeometry(0.33, hh, 0.12), [x + 0.16, hh / 2, sz * L / 2], "#ffffff", planks(np.holz, true));
  }
  b.add(new THREE.BoxGeometry(1.0, 1.8, 0.06), [0, 0.9, L / 2 - 0.05], "#ffffff", planks(np.tuer, true));
  b.teil("tuer", [1, 1.8, 0.2], [0, 0.9, L / 2]);
  const g = b.build("grubenhaus"); g.userData.occluder = true; return g;
};

/** Bootsschuppen: lange Halle auf Pfosten, Bohlenwände an drei Seiten, offen zum Wasser (+z), Grassoden-Dach. 6 × 15 m. */
export const bootsschuppen = (kit: Kit, np: NP) => {
  const b = kit.batch(), W = 6, L = 15, H = 2.6, R = 5.2, neig = Math.atan2(R - H, W / 2 + 0.6), schr = Math.hypot(W / 2 + 0.6, R - H);
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(0.14, H, L), [s * W / 2, H / 2, 0], "#ffffff", planks(np.holz, true));
    for (let z = -L / 2; z <= L / 2; z += 2.5) b.add(new THREE.BoxGeometry(0.24, H, 0.24), [s * (W / 2 + 0.12), H / 2, z], np.holzDunkel);
    b.add(new THREE.BoxGeometry(schr + 0.3, 0.4, L + 1), [s * (W / 4 + 0.3), (R + H) / 2, 0], "#ffffff", earth(np.erde), [0, 0, -s * deg(neig)]);
    b.add(new THREE.BoxGeometry(schr + 0.15, 0.4, L + 0.8), [s * (W / 4 + 0.3), (R + H) / 2 + 0.06 / Math.cos(neig), 0], "#ffffff", grass(np.grass), [0, 0, -s * deg(neig)]);
  }
  for (let x = -W / 2; x < W / 2 - 0.01; x += 0.35) {   // Rückwand mit Giebel
    const hh = Math.min(R - 0.15, H + (R - H) * (1 - Math.abs(x + 0.17) / (W / 2 + 0.6)));
    b.add(new THREE.BoxGeometry(0.36, hh, 0.14), [x + 0.17, hh / 2, -L / 2], "#ffffff", planks(np.holz, true));
  }
  b.add(new THREE.BoxGeometry(W + 0.4, 0.3, 0.3), [0, H + 0.15, L / 2], np.holzDunkel);   // Torbalken vorn
  for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.16, R - H + 0.3, 0.16), [s * 1.2, H + (R - H) / 2, L / 2 + 0.2], np.bemalung[1], undefined, [0, 0, s * 25]);
  const g = b.build("bootsschuppen"); g.userData.occluder = false; return g;
};

/** Vorratsspeicher auf vier Pfosten (Steinplatten gegen Mäuse), Bohlen, Tür vorn (+z), Leiter, Grassoden-Dach. 2,8 × 2,4 m. */
export const speicher = (kit: Kit, np: NP) => {
  const b = kit.batch(), W = 2.8, D = 2.4, P = 1.2, H = 1.9, R = P + H + 1.2;
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.13, 0.16, P, 8), [x * (W / 2 - 0.2), P / 2, z * (D / 2 - 0.2)], np.holzDunkel);
    b.add(new THREE.CylinderGeometry(0.34, 0.34, 0.08, 10), [x * (W / 2 - 0.2), P + 0.04, z * (D / 2 - 0.2)], np.stein);
  }
  b.add(new THREE.BoxGeometry(W, H, D), [0, P + 0.08 + H / 2, 0], "#ffffff", planks(np.holzHell));
  b.add(new THREE.BoxGeometry(0.8, 1.4, 0.06), [0, P + 0.08 + 0.75, D / 2 + 0.03], "#ffffff", planks(np.tuer, true));
  b.teil("tuer", [0.8, 1.4, 0.1], [0, P + 0.83, D / 2]);
  const neig = Math.atan2(1.2, W / 2 + 0.4), schr = Math.hypot(W / 2 + 0.4, 1.2);
  for (const s of [-1, 1]) {
    b.add(new THREE.BoxGeometry(schr + 0.2, 0.3, D + 0.7), [s * (W / 4 + 0.2), P + 0.08 + H + 0.6, 0], "#ffffff", earth(np.erde), [0, 0, -s * deg(neig)]);
    b.add(new THREE.BoxGeometry(schr + 0.05, 0.3, D + 0.55), [s * (W / 4 + 0.2), P + 0.08 + H + 0.6 + 0.06 / Math.cos(neig), 0], "#ffffff", grass(np.grass), [0, 0, -s * deg(neig)]);
  }
  for (const z of [-1, 1]) for (let x = -W / 2; x < W / 2 - 0.01; x += 0.35) {   // Giebel-Dreiecke
    const hh = 1.15 * (1 - Math.abs(x + 0.17) / (W / 2 + 0.2));
    if (hh > 0.05) b.add(new THREE.BoxGeometry(0.36, hh, 0.1), [x + 0.17, P + 0.08 + H + hh / 2, z * (D / 2 - 0.02)], "#ffffff", planks(np.holzHell, true));
  }
  b.add(new THREE.BoxGeometry(0.3, 0.12, 1.9), [0.6, P / 2 + 0.1, D / 2 + 0.75], np.holz, undefined, [-38, 0, 0]);   // Stiege
  void R;
  const g = b.build("speicher"); g.userData.occluder = true; return g;
};

/** Schmiede-Unterstand: Grassoden-Dach auf sechs Pfosten, niedrige Rückwand aus Bohlen, offen nach vorn (+z). 6 × 4,5 m. */
export const schmiedeDach = (kit: Kit, np: NP) => {
  const b = kit.batch(), W = 6, D = 4.5, H = 2.6, R = 4;
  for (const x of [-W / 2, 0, W / 2]) for (const z of [-D / 2, D / 2]) b.add(new THREE.CylinderGeometry(0.15, 0.18, z < 0 ? R - 0.3 : H, 8), [x, (z < 0 ? R - 0.3 : H) / 2, z], np.holzDunkel);
  b.add(new THREE.BoxGeometry(W + 0.2, 1.4, 0.14), [0, 0.7, -D / 2 - 0.1], "#ffffff", planks(np.holz, true));
  const neig = Math.atan2(R - H, D), schr = Math.hypot(D + 1, R - H);
  b.add(new THREE.BoxGeometry(W + 1.2, 0.35, schr), [0, (R + H) / 2, 0], "#ffffff", earth(np.erde), [deg(neig), 0, 0]);
  b.add(new THREE.BoxGeometry(W + 1, 0.35, schr - 0.15), [0, (R + H) / 2 + 0.06 / Math.cos(neig), 0], "#ffffff", grass(np.grass), [deg(neig), 0, 0]);
  const g = b.build("schmiede"); g.userData.occluder = false; return g;
};

// ---------------- Zäune, Steg ----------------
/** Flechtzaun entlang eines Linienzugs (Pfosten alle ~1 m, Ruten-Flechtwerk), Höhe h. */
export const flechtzaun = (kit: Kit, np: NP, pfad: [number, number][], groundAt: (x: number, z: number) => number, h = 1.1) => {
  const b = kit.batch();
  for (let i = 0; i < pfad.length - 1; i++) {
    const [ax, az] = pfad[i], [bx, bz] = pfad[i + 1], len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
    const xm = (ax + bx) / 2, zm = (az + bz) / 2, y = groundAt(xm, zm);
    b.add(new THREE.BoxGeometry(len, h, 0.1), [xm, y + h / 2 + 0.05, zm], "#ffffff", flecht(np.flecht), [0, -deg(ang), 0]);
    for (let k = 0; k <= Math.ceil(len); k++) {
      const u = k / Math.ceil(len), x = ax + (bx - ax) * u, z = az + (bz - az) * u;
      b.add(new THREE.CylinderGeometry(0.06, 0.07, h + 0.35, 6), [x, groundAt(x, z) + (h + 0.35) / 2, z], np.holzDunkel);
    }
  }
  const g = b.build("flechtzaun"); g.userData.occluder = false; return g;
};
/** Palisade: angespitzte Stämme (Ø 0,4 m, h m) dicht an dicht entlang eines Linienzugs. */
export const palisade = (kit: Kit, np: NP, pfad: [number, number][], groundAt: (x: number, z: number) => number, h = 3.2) => {
  const b = kit.batch(), r = new Rng(17);
  for (let i = 0; i < pfad.length - 1; i++) {
    const [ax, az] = pfad[i], [bx, bz] = pfad[i + 1], len = Math.hypot(bx - ax, bz - az), n = Math.ceil(len / 0.42);
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n, x = ax + (bx - ax) * u, z = az + (bz - az) * u, y = groundAt(x, z), hh = h * r.range(0.92, 1.06);
      const c = shade(np.holz, r.range(0.85, 1.05));
      b.add(new THREE.CylinderGeometry(0.2, 0.21, hh, 8), [x, y + hh / 2 - 0.2, z], c);
      b.add(new THREE.ConeGeometry(0.2, 0.5, 8), [x, y + hh - 0.2 + 0.25, z], shade(c, 0.9));
    }
  }
  const g = b.build("palisade"); g.userData.occluder = false; return g;
};
/** Landesteg: Bohlen auf Pfählen vom Strand (z0) ins Wasser (z1) bei x, Breite w; Deck auf Höhe y. */
export const landesteg = (kit: Kit, np: NP, x: number, z0: number, z1: number, w = 2.6, y = 0.25) => {
  const b = kit.batch(), len = z1 - z0;
  b.add(new THREE.BoxGeometry(w, 0.14, len), [x, y, z0 + len / 2], "#ffffff", planks(np.holzHell));
  for (let z = z0 + 1; z <= z1; z += 2.4) for (const s of [-1, 1]) {
    b.add(new THREE.CylinderGeometry(0.15, 0.17, 4.2, 8), [x + s * (w / 2 + 0.05), y + 0.35 - 2.1, z], np.holzDunkel);   // Pfahl ragt 0,35 m über das Deck
  }
  for (let z = z0 + 3; z <= z1; z += 4.8) b.add(new THREE.CylinderGeometry(0.16, 0.2, 0.6, 8), [x + w / 2 - 0.2, y + 0.37, z], np.holzDunkel);   // Poller
  const g = b.build("landesteg"); g.userData.occluder = false; return g;
};

// ---------------- Grabhügel, Steinschiff, Thingplatz ----------------
/** Grabhügel: runder Grashügel (Radius r, Höhe h; Fuss 0,6 m im Boden), mit Heidekraut und einem Stein oben. */
export const grabhuegel = (kit: Kit, np: NP, r = 9, h = 4, seed = 1) => {
  const b = kit.batch(), g0 = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), rng = new Rng(seed * 5 + 3);
  b.add(g0, [0, -0.6, 0], "#ffffff", grass(shade(np.grass, 0.95)), [0, 0, 0], [r, h + 0.6, r]);
  for (let i = 0; i < 60; i++) {   // Heidekraut auf dem Hügel
    const a = rng.range(0, Math.PI * 2), u = rng.range(0.1, 0.92), x = Math.cos(a) * u * r, z = Math.sin(a) * u * r;
    const y = -0.6 + (h + 0.6) * Math.sqrt(Math.max(0, 1 - u * u));
    b.add(ball, [x, y + 0.05, z], rng.pick(np.heather), undefined, [0, 0, 0], [0.35, 0.18, 0.3]);
  }
  b.add(ball, [0.4, h - 0.1, -0.3], "#ffffff", rock(np.stein), [0, 20, 0], [0.9, 0.7, 0.6]);
  const g = b.build("grabhuegel"); g.userData.occluder = true; return g;
};
/** Steinschiff: aufrechte Steine im Umriss eines Schiffs (Länge l), an Bug und Heck die höchsten. */
export const steinschiff = (kit: Kit, np: NP, l = 16) => {
  const b = kit.batch(), r = new Rng(23), n = 18;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2, x = Math.cos(t) * l / 2, z = Math.sin(t) * l * 0.16 * Math.abs(Math.sin(t)) ** 0.4 * Math.sign(Math.sin(t));
    const ende = Math.abs(Math.cos(t)) > 0.97, hh = ende ? 2.2 : r.range(0.9, 1.4);
    b.add(new THREE.BoxGeometry(0.55, hh, 0.4), [x, hh / 2 - 0.15, z * 1.6], "#ffffff", rock(np.stein), [r.range(-5, 5), deg(t), r.range(-5, 5)]);
  }
  const g = b.build("steinschiff"); g.userData.occluder = false; return g;
};
/** Thingplatz: Ring aus 12 aufrechten Steinen (Radius r), in der Mitte ein flacher Sprecherstein, zwei Bänke aus Stämmen. */
export const thingplatz = (kit: Kit, np: NP, r = 7) => {
  const b = kit.batch(), rng = new Rng(31);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2, hh = rng.range(1.6, 2.4);
    b.add(new THREE.BoxGeometry(0.7, hh, 0.45), [Math.cos(a) * r, hh / 2 - 0.15, Math.sin(a) * r], "#ffffff", rock(np.stein), [0, -deg(a) + 90, rng.range(-4, 4)]);
  }
  b.add(new THREE.CylinderGeometry(1.1, 1.3, 0.6, 9), [0, 0.15, 0], "#ffffff", rock(np.stein));
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.28, 0.3, 4, 10), [s * 3.2, 0.25, 2.5], np.holz, undefined, [0, s * 30, 90]);
  const g = b.build("thingplatz"); g.userData.occluder = false; return g;
};
