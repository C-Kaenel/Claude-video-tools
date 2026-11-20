// Herkunft: eigen (V-Video), geschrieben 2026-11-10, ohne Vorlage.
// Hanse-Welt (für V0005 und weitere Mittelalter-Videos): Hafen einer Hansestadt um 1400 (nach dem Vorbild Lübeck) –
// Backstein-Giebelhäuser mit Treppengiebel, Ladeluken und Windenbalken, Strasse und Kai aus Holz, Fluss mit Koggen
// (Rahsegel mit Streifen, Achter- und Vorderkastell), Tretradkran am Kai, Marktplatz vor der Marktkirche (Turm in
// Backsteingotik mit Uhr, offener Glockenstube und schwingender Glocke). Bewegung nur aus der Shot-Zeit (Segel, Fahnen, Kranrad, Last, Glocke, Möwen, Rauch).
//
//   Lageplan (Draufsicht, x nach rechts, z nach unten = Richtung Fluss; Kamera meist im Süden, Blick nach Norden):
//   z −82…−29                                   Kirche (Turm bei x 117, Langhaus dahinter)
//   z −30   ███ Häuser am Markt (x 60…111, 123…175) ███, quer: je ein Haus an der West- und Ostseite des Platzes
//   z −6,5  ████ Giebelhäuser (x −100…92) ████ | Marktplatz x 95…140 | ████ (x 142…200)
//   z  0    ═══════════ Strasse ═══════════════════════════════════════════════
//   z 3,5…10  Kai (vorn Pflaster, hinten Holz), Kran bei x 25, Poller, Fässer, Säcke
//   z 10…70   ~~~ Fluss ~~~ Koggen am Kai (z 14,5)          z 70 anderes Ufer
import * as THREE from "three";
import { Rng } from "../core/random";
import { Kit, archShape, extrude } from "./kit";
import type { V3 } from "../camera/rig";
import { blocks, brick, cobble, glass, planks, plaster, shade, stripes, tiles } from "./paint";
import { ground, street } from "./ground";
import { water, type WaterColors } from "./water";
import { cloud, tree, type CloudColors } from "./nature";
import { crates, stand } from "./props";
import { fackel, fahne, rauchsaeule, voegel, type Lebendig } from "./leben";
import type { WorldPalette } from "./palette";

export type HansePalette = {
  brick: string[]; glazed: string; mortar: string; plaster: string; trim: string; glass: string; door: string; hatch: string;
  roof: string; copper: string; bronze: string; hull: string; tar: string; sail: string; stripe: string; pirateSail: string;
  rope: string; quayWood: string; barrel: string; sack: string; cloth: string[]; flags: string[]; windowGlow: string;
  plasters: string[]; shutters: string[]; doors: string[]; roofs: string[]; niche: string; stone: string; timber: string;
  glazedBand: string; flowers: string[]; leaves: string;
};
export type HanseLook = { palette: WorldPalette; hanse: HansePalette; water: WaterColors; clouds: CloudColors; sunColor: string; lampGlow: number };

/** Kogge eines Shots. `weg`: fährt von `at` nach `nach` in t0…t1 (Film-Sekunden). `segel` voll (gesetzt) oder gerefft. */
export type KoggeDaten = { at: [number, number]; turn?: number; segel?: "voll" | "gerefft"; streifen?: string; schwarz?: boolean;
  weg?: { nach: [number, number]; t0: number; t1: number }; brace?: number };
/** Optionen der Hanse-Welt (Zeiten in Film-Sekunden). */
export type HanseOptions = {
  luken?: "zu" | "offen";                                            // Ladeluken am Haus des Kaufmanns (x 0)
  aufzug?: { t0: number; t1: number; art?: "fass" | "sack" }[];      // Last steigt am Windenbalken zur obersten Luke
  glocke?: [number, number];                                         // Glocke schwingt in diesem Zeitraum
  kranLast?: { t0: number; t1: number; von?: number; bis?: number }; // Fass am Kranseil (Höhe über dem Wasser)
  koggen?: KoggeDaten[];                                             // zusätzliche Koggen (z. B. fahrend, Piratenschiff)
  hafen?: boolean;                                                   // Koggen am Kai (Standard ja)
};

const WATER_Y = -1.2;
export const HANSE_HAUS_X = 0;          // Haus des Kaufmanns (Mitte der Fassade, z −6,5)
export const HANSE_KRAN: V3 = [25, 0.15, 8.6];
export const HANSE_KIRCHE_Z = -29;                      // Front des Kirchturms (Marktplatz z −6,5…−29)
export const HANSE_KRAN_ROLLE: V3 = [25, 10.2, 14.4];   // Rolle am Ende des Kranauslegers (Lastseil hängt hier)

export type HansePlace = { at: V3; wide: { pos: V3; look: V3 }; medium: { pos: V3; look: V3 }; note: string };
/** Benannte Orte der Hanse-Welt (Bibliothek B0064–B0067). */
export const HANSE_PLACES: Record<string, HansePlace> = {
  strasse: { at: [-20, 0, 0], note: "Strasse mit Backstein-Giebelhäusern (Treppengiebel) am Hafen",
    wide: { pos: [-14, 3.2, 8], look: [-26, 7, -4.4] }, medium: { pos: [-19, 1.7, 5], look: [-20, 1.8, -1] } },
  kaufmannshaus: { at: [0, 0.15, -4.8], note: "Haus des Kaufmanns (x 0): Dielentor, Ladeluken im Giebel, Windenbalken mit Seil",
    wide: { pos: [1.5, 2.6, 9], look: [0, 8, -4.4] }, medium: { pos: [0.6, 1.7, 0.6], look: [-0.6, 1.8, -4.6] } },
  kai: { at: [10, 0.15, 7], note: "Kai aus Holz mit Pollern, Fässern, Säcken; Koggen am Kai (z 14,5)",
    wide: { pos: [-6, 4, 5], look: [30, 4, 14] }, medium: { pos: [8, 1.7, 3.4], look: [11, 1.7, 8] } },
  kran: { at: [25, 0.15, 8.6], note: "Tretradkran am Kai, Ausleger über der Kogge (Rolle bei x 25, y 10,2, z 14,4)",
    wide: { pos: [18, 3, -1], look: [26, 6, 12] }, medium: { pos: [22, 2.4, 2.5], look: [25, 4, 9] } },
  markt: { at: [117, 0.15, -14], note: "Marktplatz mit Ständen, Tuch, Fässern und Fahnen vor der Kirche",
    wide: { pos: [114, 3, 6], look: [118, 9, -24] }, medium: { pos: [116, 1.7, -6], look: [117, 1.8, -12] } },
  kirche: { at: [117, 0.15, -29], note: "Turm der Marktkirche (Backsteingotik, Front bei z −29): Portal, Masswerkfenster, Uhr (y 25,5), offene Glockenstube mit Glocke (x 117, y 33,5–35,2, z −31,6), Schieferhelm bis y 62",
    wide: { pos: [115, 1.7, 14], look: [117, 21, -24] }, medium: { pos: [117, 34.2, -19], look: [117, 34.2, -26] } },
  fluss: { at: [20, -1.2, 40], note: "Fluss mit Koggen, Blick vom Kai übers Wasser zum anderen Ufer",
    wide: { pos: [10, 3.5, 8], look: [30, 3, 40] }, medium: { pos: [16, 2.2, 9], look: [24, 4, 20] } },
};

/** Bodenhöhe: Strasse 0, Gehsteig / Marktplatz / Kai 0,15 m, Wasser −1,2 m, anderes Ufer 0,15 m. */
export const hanseGroundAt = (x: number, z: number) => {
  if (z > 10 && z < 70) return WATER_Y;
  if (z >= 70) return 0.15;
  if (z >= 3.5) return 0.15;
  if (z <= -3.5) return 0.15;
  return 0;
};

// ---------------- Bauteile ----------------
const beam = (b: ReturnType<Kit["batch"]>, p0: V3, p1: V3, r: number, color: string) => {
  const a = new THREE.Vector3(...p0), c = new THREE.Vector3(...p1), d = c.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2);
  b.add(g, [0, 0, 0], color);
};

/** Spitzbogen-Form (gotisch), Ursprung unten Mitte. */
const pointed = (w: number, h: number) => {
  const s = new THREE.Shape(), r = w / 2, sh = h - w * 0.75;
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, sh);
  s.quadraticCurveTo(r, h - w * 0.2, 0, h); s.quadraticCurveTo(-r, h - w * 0.2, -r, sh); s.lineTo(-r, 0);
  return s;
};

/** Fass (Holz, zwei Eisenreifen, Boden und Deckel), stehend oder liegend; Ursprung unten Mitte. */
const barrelGeo = (r = 0.36, h = 0.95) => {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 8; i++) { const v = i / 8; pts.push(new THREE.Vector2(r * (0.84 + 0.16 * Math.sin(v * Math.PI)), v * h)); }
  return new THREE.LatheGeometry(pts, 14);
};
const barrel = (b: ReturnType<Kit["batch"]>, hp: HansePalette, at: V3, lying = false, rot = 0) => {
  const r = 0.36, h = 0.95;
  const geo = barrelGeo(r, h);
  const cap = (y: number) => new THREE.CylinderGeometry(r * 0.86, r * 0.86, 0.03, 14).translate(0, y, 0);
  const parts = [geo, cap(0.015), cap(h - 0.015)];
  for (const p of parts) if (lying) { p.translate(0, -h / 2, 0); p.rotateZ(Math.PI / 2); p.translate(0, r, 0); }
  b.add(geo, at, "#ffffff", planks(hp.barrel, true), [0, rot, 0]);
  b.add(parts[1], at, shade(hp.barrel, 0.8), undefined, [0, rot, 0]);
  b.add(parts[2], at, shade(hp.barrel, 0.8), undefined, [0, rot, 0]);
  for (const v of [0.2, 0.8]) {
    const ring = new THREE.TorusGeometry(r * (0.84 + 0.16 * Math.sin(v * Math.PI)) + 0.01, 0.025, 6, 16).rotateX(Math.PI / 2);
    if (lying) { ring.translate(0, v * h - h / 2, 0); ring.rotateZ(Math.PI / 2); ring.translate(0, r, 0); } else ring.translate(0, v * h, 0);
    b.add(ring, at, "#3a3634", undefined, [0, rot, 0]);
  }
};
const sack = (b: ReturnType<Kit["batch"]>, hp: HansePalette, at: V3, rot = 0) => {
  b.add(new THREE.SphereGeometry(0.4, 10, 8), [at[0], at[1] + 0.32, at[2]], hp.sack, undefined, [0, rot, 0], [0.9, 0.8, 0.65]);
  b.add(new THREE.CylinderGeometry(0.06, 0.12, 0.18, 8), [at[0], at[1] + 0.72, at[2]], shade(hp.sack, 0.85));
};
const clothBolt = (b: ReturnType<Kit["batch"]>, color: string, at: V3, rot = 0) => {
  b.add(new THREE.CylinderGeometry(0.17, 0.17, 1.1, 12).rotateZ(Math.PI / 2), [at[0], at[1] + 0.17, at[2]], color, undefined, [0, rot, 0]);
};

/** Stapel Fässer, Säcke und Tuchballen (Ware) an einem Bodenpunkt. */
export const ware = (kit: Kit, hp: HansePalette, at: V3, art: "fass" | "saecke" | "tuch", n = 4, seed = 1, rot = 0) => {
  const b = kit.batch(), rng = new Rng(seed);
  for (let i = 0; i < n; i++) {
    const x = (i % 3) * 0.78 - 0.78, z = Math.floor(i / 3) * 0.8;
    if (art === "fass") { if (i === n - 1 && n > 3) barrel(b, hp, [0, 0, -0.4], true, 90); else barrel(b, hp, [x, 0, z], false, rng.range(0, 90)); }
    else if (art === "saecke") sack(b, hp, [x * 0.9, 0, z * 0.8], rng.range(0, 90));
    else for (let k = 0; k < 3; k++) clothBolt(b, hp.cloth[(i * 3 + k + seed) % hp.cloth.length], [x * 1.4, k * 0.33, z * 0.5], 0);
  }
  const g = b.build(`ware-${art}`); g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(rot); g.userData.protect = true;
  return g;
};

// ---------------- Giebelhaus ----------------
/** Giebelhaus: Wand Backstein, Putz oder Fachwerk; Giebel als Treppengiebel oder spitz; viele Einzelteile (Sockel, Gesimse,
 *  farbige Fensterläden, Blumenkästen, Tür mit Oberlicht, Wirtshausschild, Markise, Beischlag mit Bank, Maueranker, Kamin). */
export type GiebelSpec = { width: number; floors: 1 | 2; color: string; wall?: "brick" | "plaster" | "fachwerk"; gable?: "treppe" | "spitz";
  plasterGable?: boolean; door?: number | null; doorColor?: string; shutter?: string | null; roof?: string; band?: boolean;
  luken?: "zu" | "offen" | null; hatchColor?: string; hoist?: boolean; glow?: boolean; steps?: number; depth?: number;
  schild?: string | null; markise?: string | null; blumen?: boolean; bank?: boolean; kamin?: boolean;
  versatz?: number };   // m: Sockel und Gesimse so viel nach vorn (Nachbarhäuser abwechselnd, sonst flackern die Überstände)

/** Zufälliges, buntes Giebelhaus (fester Startwert). */
export const giebelZufall = (r: Rng, hp: HansePalette, w: number, night: boolean): GiebelSpec => {
  const wall = r.pick(["brick", "brick", "plaster", "plaster", "fachwerk"] as const);
  return { width: w, floors: r.pick([1, 2, 2] as const), wall, color: wall === "brick" ? r.pick(hp.brick) : r.pick(hp.plasters),
    gable: r.next() < 0.7 ? "treppe" : "spitz", plasterGable: wall === "brick" && r.next() < 0.25, band: r.next() < 0.5,
    door: r.next() < 0.85 ? r.pick([-1.6, 0, 1.6]) : null, doorColor: r.pick(hp.doors), shutter: r.next() < 0.8 ? r.pick(hp.shutters) : null,
    roof: r.pick(hp.roofs), luken: r.next() < 0.55 ? "zu" : null, hatchColor: r.pick(hp.shutters), hoist: r.next() < 0.4, glow: night && r.next() < 0.7,
    steps: r.pick([4, 5, 6]), schild: r.next() < 0.3 ? r.pick(hp.shutters) : null, markise: r.next() < 0.3 ? r.pick(hp.cloth) : null,
    blumen: r.next() < 0.6, bank: r.next() < 0.35, kamin: r.next() < 0.6 };
};

export const giebelhaus = (kit: Kit, hp: HansePalette, pal: WorldPalette, s: GiebelSpec) => {
  const W = s.width, D = s.depth ?? 14, H = 4.6 + 3 * s.floors, G = W * 0.95, N = s.steps ?? 5;
  const kind = s.wall ?? "brick";
  const b = kit.batch();
  const wall = kind === "brick" ? brick(s.color, hp.mortar) : plaster(s.color);
  const stone = hp.stone, niche = hp.niche, timber = hp.timber;
  b.box([W, H, D], [0, H / 2, -D / 2], "#ffffff", wall);
  // Dach (Satteldach, First quer zur Strasse) und Giebel vorn
  const roofColor = s.roof ?? hp.roof;
  const tri = new THREE.Shape([new THREE.Vector2(-W / 2 - 0.15, 0), new THREE.Vector2(W / 2 + 0.15, 0), new THREE.Vector2(0, G * 0.92)]);
  b.add(extrude(tri, D - 0.6), [0, H, -D], "#ffffff", tiles(roofColor));
  if (s.kamin) b.box([0.7, 2.2, 0.7], [W * 0.18, H + G * 0.55, -D * 0.55], "#ffffff", brick(shade(s.color, 0.85), hp.mortar));
  const gablePaint = s.plasterGable || kind !== "brick" ? plaster(kind === "brick" ? hp.plaster : s.color) : wall;
  if ((s.gable ?? "treppe") === "treppe") {
    const step = new THREE.Shape(), rise = G / N, run = W / 2 / N;
    step.moveTo(-W / 2, 0);
    for (let i = 0; i < N; i++) { step.lineTo(-W / 2 + i * run, (i + 1) * rise); step.lineTo(-W / 2 + (i + 1) * run, (i + 1) * rise); }
    for (let i = N - 1; i >= 0; i--) { step.lineTo(W / 2 - (i + 1) * run, (i + 1) * rise); step.lineTo(W / 2 - i * run, (i + 1) * rise); }
    step.lineTo(W / 2, 0); step.lineTo(-W / 2, 0);
    b.add(extrude(step, 0.6), [0, H, -0.5], "#ffffff", gablePaint);
    for (let i = 0; i < N; i++) for (const sx of [-1, 1]) {
      b.box([run * 0.7, 0.22, 0.72], [sx * (W / 2 - (i + 0.5) * run), H + (i + 1) * rise + 0.11, -0.2], stone);
      b.add(new THREE.SphereGeometry(0.13, 8, 6), [sx * (W / 2 - (i + 0.5) * run), H + (i + 1) * rise + 0.34, -0.2], stone);
    }
    b.box([0.5, 0.9, 0.5], [0, H + G + 0.45, -0.2], stone);
    b.add(new THREE.SphereGeometry(0.2, 10, 8), [0, H + G + 1.05, -0.2], hp.bronze);
  } else {
    const sp = new THREE.Shape([new THREE.Vector2(-W / 2, 0), new THREE.Vector2(W / 2, 0), new THREE.Vector2(0, G)]);
    b.add(extrude(sp, 0.6), [0, H, -0.5], "#ffffff", gablePaint);
    const L = Math.hypot(W / 2, G), ang = THREE.MathUtils.radToDeg(Math.atan2(G, W / 2));
    for (const sx of [-1, 1]) b.box([L + 0.3, 0.25, 0.3], [sx * W / 4, H + G / 2 + 0.1, 0.12], stone, undefined, [0, 0, -sx * ang]);
    b.add(new THREE.SphereGeometry(0.22, 10, 8), [0, H + G + 0.2, 0], hp.bronze);
  }
  // Sockel, Gesims unter dem Giebel, Gurtgesimse, farbige Glasurbänder
  const v = s.versatz ?? 0;
  b.box([W + 0.06, 0.65, 0.14 + v], [0, 0.32 + v, 0.07 + v / 2], "#ffffff", blocks(stone, shade(stone, 0.7)));
  b.box([W + 0.14, 0.28, 0.32 + v], [0, H - 0.05 + v, 0.14 + v / 2], stone);
  for (let fl = 1; fl <= s.floors; fl++) b.box([W + 0.08, 0.16, 0.2 + v], [0, 4.6 + (fl - 1) * 3 - 0.08 + v, 0.1 + v / 2], stone);
  if (s.band && kind === "brick") for (let fl = 0; fl <= s.floors; fl++) b.box([W + 0.02, 0.22, 0.04], [0, (fl === 0 ? 4.6 : 4.6 + fl * 3) - 0.45, 0.02], hp.glazedBand);
  // Fachwerk: Balken (braun) über dem Putz – Schwellen, Ständer, Streben
  if (kind === "fachwerk") {
    // Riegel 1 cm schmaler als das Haus (ragten sie hinaus, lägen sie beim Nachbarn deckungsgleich auf dessen Riegeln)
    for (let fl = 0; fl <= s.floors; fl++) b.box([W - 0.02, 0.2, 0.08], [0, fl === 0 ? 0.75 : 4.6 + (fl - 1) * 3, 0.04], timber);
    b.box([W - 0.02, 0.2, 0.08], [0, H - 0.25, 0.04], timber);
    const nPost = Math.max(3, Math.round(W / 1.3));
    // Ständer nie durch ein Fenster (Fensterspalten wie unten; sonst liegen Ständer- und Rahmenflächen deckungsgleich)
    const fCols = Math.max(2, Math.floor(W / 2.2)), fGap = W / fCols;
    for (let k = 0; k <= nPost; k++) {
      const px = -W / 2 + 0.08 + (k * (W - 0.16)) / nPost;
      if (Array.from({ length: fCols }, (_, c) => -W / 2 + fGap * (c + 0.5)).some((cx) => Math.abs(px - cx) < 0.95 / 2 + 0.2)) continue;
      b.box([0.16, H - 0.75, 0.07], [px, (H + 0.75) / 2, 0.035], timber);
    }
    for (let fl = 1; fl <= s.floors; fl++) for (const sx of [-1, 1]) b.box([0.14, 3.2, 0.04], [sx * (W / 2 - 0.55), 4.6 + (fl - 1) * 3 + 1.5, 0.03], timber, undefined, [0, 0, sx * 22]);   // Streben hinter Rahmen und Sprossen (Vorderseite 5 cm)
  }
  // Blendnischen im Giebel (weiss geputzte Spitzbögen) und Luken in der Mitte
  const cols = W >= 7 ? 3 : 2, cw = W / (cols + 1);
  const hatch = s.hatchColor ?? hp.hatch;
  for (let lv = 0; lv < 3; lv++) {
    const y0 = H + 0.4 + lv * (G * 0.27), half = (W / 2) * (1 - (y0 - H + 1.6) / G);
    for (let c = 0; c < cols; c++) {
      const cx = -W / 2 + cw * (c + 1);
      if (Math.abs(cx) + 0.5 > half || (s.luken && Math.abs(cx) < 0.75)) continue;
      b.add(extrude(pointed(0.62, Math.min(1.7, G * 0.22)), 0.04), [cx, y0, 0.11], kind === "brick" && !s.plasterGable ? niche : shade(s.color, 0.82));
      b.box([0.08, 0.45, 0.06], [cx, y0 + 0.5, 0.15], "#3a3634");                   // Maueranker
    }
    if (s.luken) {
      const ly = y0 + 0.1, lw = 1.05, lh = 1.3;
      b.box([lw + 0.2, lh + 0.2, 0.06], [0, ly + lh / 2, 0.12], stone);            // heller Rahmen
      if (s.luken === "zu") {
        b.box([lw, lh, 0.08], [0, ly + lh / 2, 0.17], "#ffffff", planks(hatch, true));
        b.box([lw * 0.9, 0.08, 0.04], [0, ly + lh * 0.3, 0.22], shade(hatch, 0.7)); b.box([lw * 0.9, 0.08, 0.04], [0, ly + lh * 0.72, 0.22], shade(hatch, 0.7));
      } else {
        b.box([lw, lh, 0.06], [0, ly + lh / 2, 0.16], "#6a4630");                   // Innenraum (warmes Holz)
        for (const sx of [-1, 1]) b.box([lw / 2, lh, 0.06], [sx * (lw / 2 + lw / 4 + 0.08), ly + lh / 2, 0.42], "#ffffff", planks(hatch, true), [0, sx * 70, 0]);
        if (lv === 0) { barrel(b, hp, [-0.2, ly - 0.02, 0.36], false, 10); sack(b, hp, [0.28, ly, 0.38], 0); }
        if (lv === 1) for (let k = 0; k < 3; k++) clothBolt(b, hp.cloth[k + 1], [0, ly + k * 0.32, 0.36], 0);
        if (lv === 2) { sack(b, hp, [-0.2, ly, 0.36], 30); sack(b, hp, [0.25, ly, 0.38], 70); }
      }
    }
  }
  // Fenster (Sprossen, farbige Läden, Bank, Blumenkasten), Tür mit hellem Bogen und Oberlicht
  const gb = kit.batch();
  const winCols = Math.max(2, Math.floor(W / 2.2)), gap = W / winCols;
  const doorX = s.door === null ? null : (s.door ?? 0);
  const flowers = hp.flowers;
  let fi = 0;
  for (let fl = 0; fl <= s.floors; fl++) {
    const y = fl === 0 ? 2.5 : 4.6 + (fl - 1) * 3 + 1.5;
    for (let c = 0; c < winCols; c++) {
      const cx = -W / 2 + gap * (c + 0.5);
      if (fl === 0 && doorX !== null && Math.abs(cx - doorX) < 2.05) continue;
      const ww = 0.95, wh = fl === 0 ? 1.4 : 1.3;
      b.teil("fenster", [ww + 0.18, wh + 0.18, 0.1], [cx, y, 0.05]);
      if (s.glow) gb.box([ww - 0.02, wh - 0.02, 0.02], [cx, y, 0.02], hp.windowGlow);   // Leuchtscheibe (eigenes Netz): 1 cm vor der Wand und 1 cm schmaler als der Rahmen, sonst flackern ihre Kanten
       else b.box([ww, wh, 0.02], [cx, y, 0.01], "#ffffff", glass(hp.glass));
      for (const dx of [-1, 1]) b.box([0.09, wh, 0.1], [cx + dx * (ww / 2 + 0.045), y, 0.05], hp.trim);   // zwischen den Querleisten (Ecken nicht doppelt)
      for (const dy of [-1, 1]) b.box([ww + 0.18, 0.09, 0.1], [cx, y + dy * (wh / 2 + 0.045), 0.05], hp.trim);
      b.box([0.05, wh, 0.05], [cx, y, 0.05], hp.trim); b.box([ww, 0.05, 0.07], [cx, y, 0.06], hp.trim);   // Quersprosse 1 cm vor der Längssprosse
      b.box([ww + 0.36, 0.1, 0.26], [cx, y - wh / 2 - 0.14, 0.13], stone);                         // Fensterbank
      if (kind === "brick") b.add(extrude(pointed(ww + 0.34, 0.5), 0.08), [cx, y + wh / 2 + 0.1, 0.03], stone);   // 1 cm vor dem Rahmen   // heller Entlastungsbogen
      if (s.shutter) for (const sx of [-1, 1]) {
        const lx = cx + sx * (ww / 2 + 0.09 + ww / 4 + 0.02);
        b.box([ww / 2 + 0.02, wh + 0.1, 0.05], [lx, y, 0.1], "#ffffff", planks(s.shutter, true));
        b.box([ww / 2 - 0.08, 0.07, 0.03], [lx, y + wh * 0.25, 0.14], shade(s.shutter, 1.3)); b.box([ww / 2 - 0.08, 0.07, 0.03], [lx, y - wh * 0.25, 0.14], shade(s.shutter, 1.3));
      }
      if (s.blumen && (fl > 0 || c % 2 === 0)) {
        b.box([ww + 0.1, 0.24, 0.24], [cx, y - wh / 2 - 0.31, 0.24], "#ffffff", planks(shade(hp.quayWood, 1.1)));
        for (let k = 0; k < 5; k++) b.add(new THREE.SphereGeometry(0.1, 8, 6), [cx - 0.4 + k * 0.2, y - wh / 2 - 0.12, 0.26], flowers[(fi + k) % flowers.length]);
        b.add(new THREE.SphereGeometry(0.16, 8, 6), [cx, y - wh / 2 - 0.16, 0.22], hp.leaves, undefined, [0, 0, 0], [3, 0.6, 0.8]);
        fi++;
      }
    }
  }
  if (doorX !== null) {
    const dc = s.doorColor ?? hp.door;
    b.teil("tuer", [2.5, 3.9, 0.1], [doorX, 1.95, 0.05]);
    b.add(extrude(archShape(1.9, 3.1), 0.06), [doorX, 0, 0.04], "#ffffff", planks(dc, true));
    b.add(extrude(pointed(2.5, 3.9), 0.05), [doorX, 0, 0.0], stone);
    b.box([1.2, 0.08, 0.04], [doorX, 1.2, 0.11], shade(dc, 0.7)); b.box([1.2, 0.08, 0.04], [doorX, 2.2, 0.11], shade(dc, 0.7));
    b.add(new THREE.TorusGeometry(0.12, 0.025, 6, 12), [doorX + 0.45, 1.5, 0.12], "#3a3634");
    b.box([2.6, 0.18, 0.7], [doorX, 0.09, 0.35], pal.stone, blocks(pal.stone, shade(pal.stone, 0.6)));
    if (s.markise) {
      b.box([2.9, 0.06, 1.3], [doorX, 4.05, 0.62], "#ffffff", stripes(s.markise, "#f6f1e3"), [-22, 0, 0]);
      for (const sx of [-1, 1]) b.box([0.04, 0.04, 1.2], [doorX + sx * 1.35, 3.85, 0.65], "#3a3634", undefined, [-35, 0, 0]);
    }
    const side = doorX <= 0 ? 1 : -1;
    if (s.schild) {   // Schild am Ausleger (quer zur Wand), bemalt mit einer goldenen Scheibe
      const sxp = doorX + side * 1.9;
      b.box([0.06, 0.06, 1.1], [sxp, 3.9, 0.55], "#3a3634");
      b.box([0.08, 0.7, 0.8], [sxp, 3.4, 0.75], s.schild);
      for (const dz of [-1, 1]) b.add(new THREE.CylinderGeometry(0.22, 0.22, 0.02, 14).rotateZ(Math.PI / 2), [sxp + dz * 0.05, 3.4, 0.75], hp.bronze);
    }
    if (s.bank && W >= 6.5) {   // Beischlag: steinerne Plattform mit Holzbank neben der Tür
      const bx = doorX + side * 2.05;
      if (Math.abs(bx) + 0.7 < W / 2) {
        b.box([1.4, 0.3, 1.0], [bx, 0.15, 0.5], "#ffffff", blocks(stone, shade(stone, 0.7)));
        b.box([1.2, 0.08, 0.4], [bx, 0.75, 0.45], shade(hp.quayWood, 1.1));
        for (const dx of [-0.5, 0.5]) b.box([0.08, 0.45, 0.35], [bx + dx, 0.52, 0.45], shade(hp.quayWood, 0.8));
      }
    }
  }
  const g = b.build("giebelhaus");
  if (s.glow) {
    const lit = gb.build("fensterlicht");
    lit.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = new THREE.MeshBasicMaterial({ color: new THREE.Color(hp.windowGlow).multiplyScalar(1.25), fog: true }); m.castShadow = false; } });
    g.add(lit);
  }
  // Windenbalken mit Rolle oben im Giebel
  if (s.hoist) {
    const hb = kit.batch(), hy = H + G * 0.82;
    hb.box([0.28, 0.28, 1.5], [0, hy, 0.6], "#ffffff", planks(hp.hatch));
    hb.add(new THREE.TorusGeometry(0.2, 0.05, 6, 14), [0, hy - 0.3, 1.2], "#3a3634");
    g.add(hb.build("windenbalken"));
    g.userData.hoistY = hy - 0.5;
  }
  g.userData.occluder = true;
  g.userData.house = { width: W, height: H + G, depth: D };
  return g;
};

// ---------------- Kirche ----------------
/** Spitzbogen mit Versatz (Ursprung unten Mitte bei x0, y0) – für Öffnungen in Wänden. */
const bogen = (w: number, h: number, x0 = 0, y0 = 0) => {
  const s = new THREE.Path(), r = w / 2, sh = h - w * 0.75;
  s.moveTo(x0 - r, y0); s.lineTo(x0 + r, y0); s.lineTo(x0 + r, y0 + sh);
  s.quadraticCurveTo(x0 + r, y0 + h - w * 0.2, x0, y0 + h); s.quadraticCurveTo(x0 - r, y0 + h - w * 0.2, x0 - r, y0 + sh); s.lineTo(x0 - r, y0);
  return s;
};
/** Spitzbogen-Ring (Gewände): aussen ow × oh, innen iw × ih ab Höhe `bank` (Fenster: Steinbank unten, sonst flackert die
 *  Unterseite des Rings mit dem Glas; Portal: 0, die Unterkante liegt im Boden). */
const bogenRing = (ow: number, oh: number, iw: number, ih: number, bank = 0) => { const s = pointed(ow, oh); s.holes.push(bogen(iw, ih, 0, bank)); return s; };
/** Wand w × h mit einer Spitzbogen-Öffnung (Breite ow, Höhe oh, ab Höhe oy). */
const wandMitBogen = (w: number, h: number, ow: number, oh: number, oy: number) => {
  const s = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(w / 2, h), new THREE.Vector2(-w / 2, h)]);
  s.holes.push(bogen(ow, oh, 0, oy)); return s;
};

/**
 * Turm der Marktkirche in Backsteingotik (Front nach +z), dahinter das Langhaus.
 * Von unten nach oben: Sandstein-Sockel; gestuftes Spitzbogen-Portal (drei Lagen, die Eichentür füllt den inneren Bogen
 * ganz aus, Eisenbänder, Ringgriffe); Gesims; grosses Masswerkfenster (zwei Pfosten, Ring im Bogen) zwischen weissen
 * Blendnischen; Spitzbogenfries und Gesims; EINE Uhr (blaues Zifferblatt, goldene Zeiger) zwischen kleinen Blendnischen;
 * offene Glockenstube mit Schallöffnung auf jeder Seite – die Glocke hängt sichtbar am Glockenbalken im Turm und schwingt
 * (tick); Fries und Kranzgesims; vier Ecktürmchen und ein achteckiger Schieferhelm mit goldener Kugel und Kreuz.
 * Strebepfeiler (zweistufig) an den vorderen Ecken. Jede Lage liegt ≥ 2 cm vor der nächsten – nichts deckungsgleich.
 */
const kirche = (kit: Kit, hp: HansePalette, at: V3) => {
  const b = kit.batch();
  const ziegel = hp.brick[0], wall = brick(ziegel, hp.mortar), dunkel = brick(shade(ziegel, 0.74), hp.mortar);
  const stein = hp.stone, putz = "#f2ece0", eiche = "#6b4528", eisen = "#2e2a28", gold = "#d9a62e", schiefer = "#4a5566";
  const TW = 9, H1 = 29, H2 = 8.4, TOP = H1 + H2, Z = -TW / 2;

  // Schaft und Sockel (Sockel vorne neben dem Portal, sonst rundum etwas zurück)
  b.box([TW, H1, TW], [0, H1 / 2, Z], "#ffffff", wall);
  b.box([TW + 0.3, 1.2, TW], [0, 0.6, Z - 0.15], "#ffffff", blocks(stein, shade(stein, 0.7)));
  for (const sx of [-1, 1]) b.box([1.5, 1.2, 0.3], [sx * 3.75, 0.6, 0.15], "#ffffff", blocks(stein, shade(stein, 0.7)));

  // Strebepfeiler an den vorderen Ecken, zweistufig mit Abdeckung
  for (const sx of [-1, 1]) {
    b.box([1.0, 16, 1.2], [sx * (TW / 2 + 0.3), 8, 0.2], "#ffffff", dunkel);
    b.add(new THREE.ConeGeometry(0.78, 0.9, 4), [sx * (TW / 2 + 0.3), 16.45, 0.2], stein, undefined, [0, 45, 0]);
    b.box([0.8, 12, 0.9], [sx * (TW / 2 + 0.25), 22, 0.1], "#ffffff", dunkel);
    b.add(new THREE.ConeGeometry(0.62, 0.8, 4), [sx * (TW / 2 + 0.25), 28.4, 0.1], stein, undefined, [0, 45, 0]);
  }

  // Portal: drei Lagen (aussen am weitesten vorn), Tür füllt den inneren Bogen 3,6 × 7,3 m
  b.add(extrude(bogenRing(6.0, 9.2, 5.0, 8.5), 0.5), [0, 0, 0], "#ffffff", dunkel);
  b.add(extrude(bogenRing(5.0, 8.5, 4.2, 7.9), 0.36), [0, 0, 0], "#ffffff", wall);
  b.add(extrude(bogenRing(4.2, 7.9, 3.6, 7.3), 0.22), [0, 0, 0], stein);
  b.add(extrude(pointed(3.6, 7.3), 0.05), [0, 0, 0.02], "#ffffff", planks(eiche, true));
  for (const sx of [-1, 1]) for (const y of [1.4, 3.3, 5.2]) b.box([1.4, 0.11, 0.03], [sx * 1.05, y, 0.085], eisen);
  b.box([0.05, 6.6, 0.03], [0, 3.3, 0.085], shade(eiche, 0.65));
  for (const sx of [-1, 1]) b.add(new THREE.TorusGeometry(0.17, 0.035, 8, 18), [sx * 0.32, 3.0, 0.12], eisen);

  // Gesimse rundum (Sandstein)
  for (const y of [10.2, 22.0, 28.75]) b.box([TW + 0.14, 0.3, TW + 0.14], [0, y, Z], stein);

  // Masswerkfenster mit Pfosten und Ring, daneben weisse Blendnischen
  const wy = 10.75;
  b.add(extrude(bogenRing(3.8, 10.1, 3.0, 9.4, 0.1), 0.25), [0, wy, 0], stein);
  b.add(extrude(pointed(3.0, 9.4), 0.02), [0, wy + 0.1, 0.03], "#ffffff", glass(hp.glass));
  for (const dx of [-0.5, 0.5]) b.box([0.12, 6.9, 0.1], [dx, wy + 0.1 + 3.45, 0.1], stein);
  b.add(new THREE.TorusGeometry(0.55, 0.07, 8, 24), [0, wy + 7.65, 0.1], stein);
  for (const sx of [-1, 1]) for (const k of [0, 1]) b.add(extrude(pointed(0.8, 8.2), 0.02), [sx * (2.55 + k * 1.05), 11.2, 0.02], putz);
  for (let x = -3.9; x <= 3.91; x += 0.6) b.add(extrude(pointed(0.42, 0.66), 0.02), [x, 21.15, 0.02], putz);   // Spitzbogenfries

  // EINE Uhr
  const cy = 25.4;
  b.add(new THREE.CylinderGeometry(1.75, 1.75, 0.12, 40), [0, cy, 0.06], stein, undefined, [90, 0, 0]);
  b.add(new THREE.CylinderGeometry(1.5, 1.5, 0.06, 40), [0, cy, 0.15], "#1f3a6b", undefined, [90, 0, 0]);
  for (let h = 0; h < 12; h++) { const a = (h / 12) * Math.PI * 2; b.box([0.1, h % 3 === 0 ? 0.36 : 0.24, 0.03], [Math.sin(a) * 1.22, cy + Math.cos(a) * 1.22, 0.195], gold, undefined, [0, 0, -h * 30]); }
  const zeiger = (len: number, breit: number, grad: number, z: number) => { const a = (grad * Math.PI) / 180; b.box([breit, len, 0.03], [Math.sin(a) * len * 0.42, cy + Math.cos(a) * len * 0.42, z], gold, undefined, [0, 0, -grad]); };
  zeiger(0.85, 0.13, 305, 0.225); zeiger(1.25, 0.08, 60, 0.26);
  b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), [0, cy, 0.29], gold, undefined, [90, 0, 0]);
  for (const sx of [-1, 1]) b.add(extrude(pointed(0.7, 2.6), 0.02), [sx * 3.1, cy - 1.3, 0.02], putz);

  // Glockenstube: vier Wände mit Schallöffnung, innen dunkel, Glockenbalken, Boden
  const wd = 0.7;
  b.add(extrude(wandMitBogen(TW, H2, 3.2, 6.4, 0.8), wd), [0, H1, -wd], "#ffffff", wall);
  b.add(extrude(wandMitBogen(TW, H2, 3.2, 6.4, 0.8), wd), [0, H1, -TW], "#ffffff", wall);
  for (const sx of [-1, 1]) b.add(extrude(wandMitBogen(TW - 2 * wd, H2, 2.6, 6.0, 1.0), wd), [sx > 0 ? TW / 2 - wd : -TW / 2, H1, Z], "#ffffff", wall, [0, 90, 0]);
  for (const [w, x, z, d] of [[TW - 2 * wd - 0.04, 0, -TW + wd + 0.03, 0.02], [0.02, TW / 2 - wd - 0.03, Z, TW - 2 * wd - 0.04], [0.02, -(TW / 2 - wd - 0.03), Z, TW - 2 * wd - 0.04]] as const)
    b.box([w, H2 - 0.1, d], [x, H1 + H2 / 2, z], "#3b2a1e");
  b.box([TW - 2 * wd - 0.1, 0.3, TW - 2 * wd - 0.1], [0, H1 + 0.15, Z], "#ffffff", planks(hp.quayWood));
  b.box([TW - 2 * wd - 0.12, 0.35, 0.35], [0, H1 + 6.45, -2.6], hp.timber);
  for (const sx of [-1, 1]) b.box([0.3, 6.0, 0.3], [sx * 2.4, H1 + 3.3, -2.6], hp.timber);   // Glockenstuhl-Pfosten

  // Fries, Kranzgesims, Ecktürmchen, Schieferhelm mit Kugel und Kreuz
  for (let x = -3.9; x <= 3.91; x += 0.6) b.add(extrude(pointed(0.42, 0.66), 0.02), [x, TOP - 0.95, 0.02], putz);
  b.box([TW + 0.5, 0.45, TW + 0.5], [0, TOP + 0.22, Z], stein);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const px = sx * (TW / 2 - 0.1), pz = Z + sz * (TW / 2 - 0.1);
    b.box([0.7, 2.6, 0.7], [px, TOP + 0.45 + 1.3, pz], "#ffffff", wall);
    b.add(new THREE.ConeGeometry(0.55, 1.9, 4), [px, TOP + 0.45 + 2.6 + 0.95, pz], schiefer, undefined, [0, 45, 0]);
    b.add(new THREE.SphereGeometry(0.13, 10, 8), [px, TOP + 0.45 + 2.6 + 2.0, pz], gold);
  }
  const helm = 24, hy = TOP + 0.45;
  b.add(new THREE.ConeGeometry(TW * 0.47, helm, 8), [0, hy + helm / 2, Z], "#ffffff", tiles(schiefer), [0, 22.5, 0]);
  b.add(new THREE.SphereGeometry(0.45, 14, 10), [0, hy + helm + 0.3, Z], gold);
  b.box([0.14, 1.8, 0.14], [0, hy + helm + 1.6, Z], gold);
  b.box([1.0, 0.14, 0.14], [0, hy + helm + 1.9, Z], gold);

  // Langhaus hinter dem Turm: Wände, Ziegeldach, Fenster an der Front neben dem Turm und an den Seiten
  const NW = 18, NH = 19, NL = 44, NZ = -TW;
  b.box([NW, NH, NL], [0, NH / 2, NZ - NL / 2], "#ffffff", wall);
  const tri = new THREE.Shape([new THREE.Vector2(-NW / 2 - 0.4, 0), new THREE.Vector2(NW / 2 + 0.4, 0), new THREE.Vector2(0, 11)]);
  b.add(extrude(tri, NL), [0, NH, NZ - NL], "#ffffff", tiles(hp.roof));
  for (const sx of [-1, 1]) {
    b.add(extrude(bogenRing(2.2, 9.6, 1.6, 8.9, 0.1), 0.2), [sx * 6.75, 5, NZ], stein);
    b.add(extrude(pointed(1.6, 8.9), 0.02), [sx * 6.75, 5.1, NZ + 0.03], "#ffffff", glass(hp.glass));
    for (let i = 0; i < 5; i++) b.add(extrude(pointed(2, 10), 0.06), [sx * (NW / 2 + 0.01), 5, NZ - 6 - i * 8], "#ffffff", glass(hp.glass), [0, sx * 90, 0]);
  }
  const g = b.build("kirche");
  g.position.set(...at);
  g.userData.occluder = true;

  // Glocke am Glockenbalken in der Glockenstube (sichtbar durch die Schallöffnung): Joch, Glocke (Drehprofil), Klöppel
  const bell = new THREE.Group(); bell.name = "glocke";
  const prof: THREE.Vector2[] = [[0, 0], [0.95, 0], [0.88, 0.12], [0.7, 0.5], [0.62, 1.1], [0.5, 1.45], [0.2, 1.6], [0, 1.62]].map(([x, y]) => new THREE.Vector2(x, y));
  const bm = kit.mesh(new THREE.LatheGeometry(prof, 18), hp.bronze); bm.position.y = -1.75; bell.add(bm);
  const kl = kit.mesh(new THREE.SphereGeometry(0.16, 10, 8), "#3a3634"); kl.position.y = -1.6; bell.add(kl);
  const yoke = kit.mesh(new THREE.BoxGeometry(2.2, 0.22, 0.3), hp.timber); bell.add(yoke);
  bell.position.set(0, H1 + 6.05, -2.6);
  g.add(bell);
  return { g, bell };
};

// ---------------- Kogge ----------------
/** Kogge: Rumpf (Seitenprofil), Deck, Achter- und Vorderkastell, Mast mit Rahsegel (voll: bauscht sich im Wind; gerefft:
 *  auf der Rah aufgerollt), Wanten, Ruder, Wimpel. Länge 18 m entlang x (Bug +x), Ursprung = Mitte an der Wasserlinie. */
export const kogge = (kit: Kit, hp: HansePalette, o: { segel?: "voll" | "gerefft"; streifen?: string; schwarz?: boolean; brace?: number; phase?: number } = {}): Lebendig & { deckY: number } => {
  const g = new THREE.Group(); g.name = "kogge";
  const b = kit.batch(), hull = o.schwarz ? "#3a2e2a" : hp.hull, wood = planks(hull), B = 5.8, ph = o.phase ?? 0;
  const prof = new THREE.Shape();
  prof.moveTo(-8.6, 3.1); prof.lineTo(-8.0, -1.4); prof.quadraticCurveTo(-7.4, -2.0, -5.5, -2.0); prof.lineTo(5.6, -2.0);
  prof.quadraticCurveTo(7.6, -1.8, 9.8, 3.4); prof.quadraticCurveTo(0.5, 2.0, -8.6, 3.1);
  b.add(extrude(prof, B), [0, 0, -B / 2], "#ffffff", wood);
  b.box([16.6, 0.1, B + 0.06], [0.4, 0.55, 0], shade(hull, 0.65));                 // Scheuerleiste (Wasserlinie)
  b.box([16.0, 0.1, B + 0.06], [0.6, 1.6, 0], shade(hull, 0.65));
  b.box([14.8, 0.12, B - 0.3], [0.3, 2.25, 0], "#ffffff", planks(shade(hull, 1.15)));   // Deck
  // Achterkastell (Plattform mit Brüstung) und Vorderkastell
  b.box([4.4, 2.2, B + 0.3], [-6.4, 3.9, 0], "#ffffff", planks(shade(hull, 1.08)));
  b.box([4.6, 0.6, B + 0.5], [-6.4, 5.3, 0], shade(hull, 0.8));
  for (let i = 0; i < 6; i++) b.box([0.12, 0.9, 0.12], [-8.4 + i * 0.8, 6.0, B / 2 + 0.2], shade(hull, 0.6));
  b.box([4.6, 0.12, 0.12], [-6.4, 6.45, B / 2 + 0.2], shade(hull, 0.6));
  b.box([2.6, 1.4, B - 0.4], [8.0, 4.0, 0], "#ffffff", planks(shade(hull, 1.08)));
  b.box([0.35, 3.0, 0.45], [-8.75, 0.6, 0], shade(hull, 0.7));                     // Ruder
  // Mast, Rah, Wanten
  const MH = 17;
  b.add(new THREE.CylinderGeometry(0.2, 0.3, MH, 10), [0.6, 2.2 + MH / 2, 0], shade(hp.hatch, 1.1));
  b.add(new THREE.CylinderGeometry(0.55, 0.45, 0.9, 10), [0.6, 2.2 + MH - 1.2, 0], shade(hp.hatch, 0.9));   // Mastkorb
  for (const sz of [-1, 1]) for (const dx of [-1.6, -0.5, 0.6]) beam(b, [0.6, 2.2 + MH - 2, 0], [0.6 + dx, 2.3, sz * (B / 2)], 0.03, hp.rope);
  beam(b, [0.6, 2.2 + MH - 2, 0], [9.6, 3.6, 0], 0.035, hp.rope);
  g.add(b.build("rumpf"));
  // Rah und Segel drehen zusammen um den Mast (gebrasst, damit man das Segel von der Seite sieht)
  const rig = new THREE.Group(); rig.position.set(0.6, 0, 0); rig.rotation.y = THREE.MathUtils.degToRad(90 - (o.brace ?? 35));
  const yardY = 2.2 + MH - 2.6, SW = 10, SH = 9.5;
  const rb = kit.batch();
  rb.add(new THREE.CylinderGeometry(0.14, 0.14, SW + 1.2, 8).rotateZ(Math.PI / 2), [0, yardY, 0], shade(hp.hatch, 1.1));
  let tick = (_t: number) => {};
  if ((o.segel ?? "gerefft") === "gerefft") {
    rb.add(new THREE.CylinderGeometry(0.42, 0.42, SW, 10).rotateZ(Math.PI / 2), [0, yardY - 0.4, 0.1], o.schwarz ? hp.pirateSail : hp.sail);
    for (let i = -2; i <= 2; i++) rb.add(new THREE.TorusGeometry(0.44, 0.04, 5, 10).rotateY(Math.PI / 2), [i * 2.1, yardY - 0.4, 0.1], hp.rope);
    rig.add(rb.build("rah"));
  } else {
    rig.add(rb.build("rah"));
    const geo = new THREE.PlaneGeometry(SW, SH, 12, 10); geo.translate(0, yardY - 0.2 - SH / 2, 0.15);
    const base = Float32Array.from(geo.getAttribute("position").array as Float32Array);
    const paint = o.schwarz ? undefined : stripes(hp.sail, o.streifen ?? hp.stripe);
    const mat = kit.mat(o.schwarz ? hp.pirateSail : "#ffffff", paint); mat.side = THREE.DoubleSide;   // nur Segel nutzen dieses Material (nicht klonen: Textur-Shader)
    // Streifen senkrecht: UV aus x (6 Streifen je 7,5 m)
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (base[i * 3] + SW / 2) / 7.5, (base[i * 3 + 1]) / 7.5);
    const sail = new THREE.Mesh(geo, mat); sail.castShadow = true; rig.add(sail);
    if (!o.schwarz) {   // Zeichen auf dem Segel (Kreuz), leicht vor dem Tuch
      const cb = kit.batch();
      cb.box([0.9, 4.2, 0.02], [0, yardY - 0.2 - SH / 2, 0], "#ffffff");
      cb.box([3.6, 0.9, 0.02], [0, yardY - 0.2 - SH / 2 + 0.6, 0], "#ffffff");
      const cross = cb.build("segelzeichen"); rig.add(cross);
      (rig.userData as { cross?: THREE.Object3D }).cross = cross;
    }
    tick = (t: number) => {
      const p = geo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], u = x / (SW / 2), v = (yardY - 0.2 - y) / SH;
        const bulge = 1.6 * (1 - u * u * 0.8) * Math.sin(Math.min(1, v) * Math.PI * 0.85) + 0.08 * Math.sin(t * 2.3 + u * 2 + ph) * v;
        p.setZ(i, 0.15 + bulge);
      }
      p.needsUpdate = true; geo.computeVertexNormals();
      const cr = (rig.userData as { cross?: THREE.Object3D }).cross;
      if (cr) cr.position.z = 0.17 + 1.6 * Math.sin(0.5 * Math.PI * 0.85) + 0.06;
    };
  }
  g.add(rig);
  // Wimpel oben am Mast
  const wimpel = fahne(kit, [0.6, 2.2 + MH, 0], o.schwarz ? "#1c1c22" : hp.stripe, { h: 1.6, w: 2.6, turn: 180, phase: ph, rand: o.schwarz ? undefined : "#f4f0e6" });
  g.add(wimpel.obj);
  return { obj: g, deckY: 2.25, tick: (t) => { tick(t); wimpel.tick(t); g.position.y = WATER_Y + 0.06 * Math.sin(t * 1.1 + ph); g.rotation.x = 0.012 * Math.sin(t * 0.9 + ph); } };
};

// ---------------- Tretradkran ----------------
/** Hafenkran: Holzhaus auf Steinsockel, darin das Tretrad (dreht sich), Ausleger zum Wasser (+z) mit Rolle und Lastseil.
 *  Ursprung = Mitte am Boden. */
const tretradkran = (kit: Kit, hp: HansePalette, pal: WorldPalette, at: V3) => {
  const b = kit.batch(), wood = hp.quayWood, S = 5.6, H = 7;
  b.box([S + 0.6, 0.9, S + 0.6], [0, 0.45, 0], "#ffffff", blocks(pal.quay, shade(pal.quay, 0.6)));
  for (const x of [-S / 2, S / 2]) for (const z of [-S / 2, S / 2]) b.box([0.35, H, 0.35], [x, 0.9 + H / 2, z], shade(wood, 0.8));
  for (const x of [-S / 2, S / 2]) b.box([0.12, H * 0.55, S], [x, 0.9 + H * 0.72, 0], "#ffffff", planks(wood, true));   // Seitenwände oben
  for (const z of [-S / 2, S / 2]) b.box([S + 0.3, 0.3, 0.3], [0, 0.9 + H, z], shade(wood, 0.7));
  const tri = new THREE.Shape([new THREE.Vector2(-S / 2 - 0.5, 0), new THREE.Vector2(S / 2 + 0.5, 0), new THREE.Vector2(0, 2.6)]);
  b.add(extrude(tri, S + 0.8), [0, 0.9 + H, -S / 2 - 0.4], "#ffffff", tiles(hp.roof));
  // Ausleger schräg zum Wasser
  const top: V3 = [0, 0.9 + H + 1.6, 0];
  beam(b, top, [HANSE_KRAN_ROLLE[0] - at[0], HANSE_KRAN_ROLLE[1] + 0.4, HANSE_KRAN_ROLLE[2] - at[2]], 0.2, shade(wood, 0.9));
  beam(b, [0, 0.9 + H, S / 2], [0, HANSE_KRAN_ROLLE[1] - 1.2, HANSE_KRAN_ROLLE[2] - at[2] - 2], 0.15, shade(wood, 0.9));
  b.add(new THREE.TorusGeometry(0.3, 0.07, 8, 16), [HANSE_KRAN_ROLLE[0] - at[0], HANSE_KRAN_ROLLE[1] + 0.25, HANSE_KRAN_ROLLE[2] - at[2]], "#3a3634", undefined, [0, 90, 0]);
  const g = b.build("kran");
  // Tretrad: Ring, Speichen, Lauffläche – dreht sich um die z-Achse
  const wheel = new THREE.Group(); wheel.position.set(0, 0.9 + 2.5, 0);
  const wb = kit.batch(), R = 2.3;
  for (const z of [-0.8, 0.8]) wb.add(new THREE.TorusGeometry(R, 0.1, 8, 32), [0, 0, z], shade(wood, 0.9));
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; for (const z of [-0.8, 0.8]) beam(wb, [0, 0, z], [Math.cos(a) * R, Math.sin(a) * R, z], 0.06, shade(wood, 0.8)); }
  for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; wb.box([0.22, 0.08, 1.7], [Math.cos(a) * R, Math.sin(a) * R, 0], wood, undefined, [0, 0, (a * 180) / Math.PI]); }
  wb.add(new THREE.CylinderGeometry(0.22, 0.22, 2.2, 10).rotateX(Math.PI / 2), [0, 0, 0], shade(wood, 0.7));
  wheel.add(wb.build("tretrad"));
  g.add(wheel);
  g.position.set(...at);
  g.userData.protect = true;
  return { g, wheel };
};

// ---------------- Welt ----------------
export const hanse = (kit: Kit, look: HanseLook, seed = 1, opt: HanseOptions = {}, start = 0) => {
  const pal = look.palette, hp = look.hanse, night = look.lampGlow > 1.5;
  const root = new THREE.Group(); root.name = "hanse";
  const add = <T extends THREE.Object3D>(o: T) => { root.add(o); return o; };
  const leben: Lebendig[] = [];
  const lebt = (l: Lebendig) => { root.add(l.obj); leben.push(l); return l; };
  const rng = new Rng(seed * 41);

  // Boden: Pflaster nördlich, Strasse, Kai (vorn Pflaster, hinten Holz), anderes Ufer
  add(ground(kit, pal, "cobble", [700, 219.5], [0, 0.15, -116.25]));   // endet an der Häuserfront (z −6,5), kein Überlappen mit dem Gehsteig
  add(street(kit, pal, { from: -260, to: 260, z: 0, road: 7, walk: 3, sides: [-1] }));
  add(ground(kit, pal, "cobble-light", [520, 3.5], [0, 0.15, 5.25], 0.15));
  add(ground(kit, pal, "planks", [520, 3], [0, 0.15, 8.5], 0.15));
  { const qb = kit.batch();   // Bollwerk: senkrechte Bohlen und Pfähle bis ins Wasser
    qb.box([520, 3.2, 0.4], [0, 0.12 - 1.6, 10.05], "#ffffff", planks(shade(hp.quayWood, 0.8), true));   // 3 cm unter dem Kai-Belag
    for (let x = -255; x <= 255; x += 3) qb.box([0.34, 3.4, 0.34], [x, -1.5, 10.3], shade(hp.quayWood, 0.6));
    for (let x = -100; x <= 160; x += 9) qb.add(new THREE.CylinderGeometry(0.18, 0.22, 0.7, 10), [x, 0.5, 9.5], shade(hp.quayWood, 0.55));   // Poller
    add(qb.build("bollwerk")); }
  add(ground(kit, pal, "cobble", [700, 60], [0, 0.15, 100]));
  { const ob = kit.batch(); ob.box([700, 2.4, 0.6], [0, -1.07, 70], "#ffffff", planks(shade(hp.quayWood, 0.8), true)); add(ob.build("ufer")); }
  const river = water(look.water, [700, 60], [0, WATER_Y, 40], look.sunColor);
  add(river.mesh);

  // Giebelhäuser: Zeile Nord (z −6,5), unterbrochen vom Marktplatz; das Haus des Kaufmanns bei x 0
  const row = (from: number, to: number, z: number, s: number) => {
    let x = from;
    const r = new Rng(s);
    let k = 0;
    while (to - x > 3) {
      let w = r.pick([6.5, 7, 7.5, 8, 9]);
      if (to - x - w < 6.5) w = to - x;
      const spec = { ...giebelZufall(r, hp, w, night), versatz: k++ % 2 ? 0.012 : 0 };
      const h = giebelhaus(kit, hp, pal, spec), cx = x + w / 2;
      h.position.set(cx, 0.15, z); h.name = `giebelhaus-${Math.round(cx)}`;
      add(h);
      if (r.next() < 0.35) lebt(rauchsaeule(kit, [cx + w * 0.25, 4.6 + 3 * spec.floors + 5.5, z - 6], { hoehe: 9, dicke: 0.5, wind: [3, 1], n: 8, tempo: 0.12, farbe: "#d8d2c8", phase: r.next() }));
      x += w + 0.02;
    }
  };
  row(-200, HANSE_HAUS_X - 4.02, -6.5, seed * 11);
  { const h = giebelhaus(kit, hp, pal, { width: 8, floors: 2, color: hp.brick[0], wall: "brick", band: true, door: -1.6, doorColor: hp.doors[0], shutter: hp.shutters[0], roof: hp.roofs[0],
      luken: opt.luken ?? "zu", hatchColor: hp.shutters[1], hoist: true, glow: night, blumen: true, kamin: true });
    h.position.set(HANSE_HAUS_X, 0.15, -6.5); h.name = "haus-kaufmann"; add(h);
    lebt(rauchsaeule(kit, [HANSE_HAUS_X + 2, 18, -12], { hoehe: 9, dicke: 0.5, wind: [3, 1], n: 8, tempo: 0.12, farbe: "#d8d2c8", phase: 0.4 })); }
  row(HANSE_HAUS_X + 4.02, 92, -6.5, seed * 11 + 1);
  row(142, 230, -6.5, seed * 13);
  // Häuser am Markt (Front 1 m hinter dem Turm, 7,9 m tief, damit sie das Langhaus nicht berühren): bis an den Turm und weit
  // nach Westen/Osten, damit man vom Platz nirgends ins Leere sieht. Hinter den Querhäusern (x < 93, x > 141) ohne Vorbauten
  // (Bank, Markise, Schild, Windenbalken), sonst stecken diese in den Querhäusern.
  const marktZeile = (from: number, to: number, s: number) => {
    let x = from; const r = new Rng(s); let k = 0;
    while (to - x > 3) {
      let w = r.pick([6.5, 7, 7.5, 8, 9]);
      if (to - x - w < 6.5) w = to - x;
      const cx = x + w / 2, aussen = cx - w / 2 < 93.2 || cx + w / 2 > 140.8;
      const spec = { ...giebelZufall(r, hp, w, night), depth: 7.9, versatz: k++ % 2 ? 0.012 : 0, ...(aussen ? { bank: false, markise: null, schild: null, hoist: false } : {}) };
      const h = giebelhaus(kit, hp, pal, spec);
      h.position.set(cx, 0.15, HANSE_KIRCHE_Z - 1); h.name = `giebelhaus-${Math.round(cx)}`; add(h);
      x += w + 0.02;
    }
  };
  marktZeile(60, 111.2, seed * 17);
  marktZeile(122.8, 175, seed * 19);
  // Querhäuser an der West- und Ostseite des Platzes, zwischen der Zeile Nord (hinten z −20,5) und den Häusern am Markt
  for (const [x, dreh, s] of [[92.6, 90, 23], [141.4, -90, 29]] as const) {
    const h = giebelhaus(kit, hp, pal, { ...giebelZufall(new Rng(seed * s), hp, 9, night), floors: 2, depth: 8, bank: false, markise: null, schild: null, hoist: false });
    h.position.set(x, 0.15, -25.15); h.rotation.y = THREE.MathUtils.degToRad(dreh); h.name = `giebelhaus-quer-${Math.round(x)}`; add(h);
  }
  // Marktplatz mit Ständen, Ware, Fahnen; Kirche dahinter
  const ch = kirche(kit, hp, [117, 0.15, HANSE_KIRCHE_Z]);
  add(ch.g);
  const standAt: [number, number, number][] = [[103, -14, 0], [110, -11, 0], [118, -14, 0], [126, -11, 0], [133, -14, 0], [106, -22, 0], [128, -22, 0]];
  standAt.forEach(([x, z, t], i) => {
    add(stand(kit, pal, [x, 0.15, z], t));
    add(ware(kit, hp, [x + 1.6, 0.15, z + 0.6], i % 3 === 0 ? "tuch" : i % 3 === 1 ? "fass" : "saecke", 3, i + 3));
    lebt(fahne(kit, [x - 1.25, 0.15, z + 0.5], hp.flags[i % hp.flags.length], { h: 3.6, w: 1.2, turn: 200 + i * 7, phase: i * 0.9 }));
  });
  add(crates(kit, pal, [98, 0.15, -6], 15));
  for (const [x, z, h] of [[98.5, -18, 7], [136.5, -18, 7.5], [-62, 8.3, 6.5], [-14, 8.3, 6], [52, 8.3, 6.5], [88, 8.3, 6]] as const) add(tree(kit, pal, [x, 0.15, z], h, Math.round(x)));
  { // Hafenturm am Westende des Kais: runder Backsteinturm mit Kegeldach, Zinnenkranz und Fahne
    const tb = kit.batch(), tx = -96, tz = 6.5;
    tb.add(new THREE.CylinderGeometry(3.2, 3.5, 16, 20), [tx, 8, tz], "#ffffff", brick(hp.brick[2], hp.mortar));
    tb.add(new THREE.CylinderGeometry(3.7, 3.7, 0.6, 20), [tx, 16.2, tz], hp.stone);
    tb.add(new THREE.ConeGeometry(3.9, 7, 20), [tx, 20, tz], "#ffffff", tiles(hp.roofs[3]));
    for (const y of [5, 10.5]) tb.add(extrude(pointed(1, 2), 0.05), [tx, y, tz + 3.35], shade(hp.glass, 0.8));
    tb.add(extrude(archShape(1.6, 2.6), 0.06), [tx, 0, tz + 3.45], "#ffffff", planks(hp.doors[1], true));
    const tw = add(tb.build("hafenturm")); tw.userData.occluder = true;
    lebt(fahne(kit, [tx, 23.4, tz], hp.flags[0], { h: 3, w: 2, turn: 200, rand: "#f4f0e6", phase: 0.3 }));
  }

  // Kai: Kran, Ware, Fässer, Säcke; Koggen am Kai
  const kran = tretradkran(kit, hp, pal, HANSE_KRAN);
  add(kran.g);
  for (const [x, art, n, s] of [[-40, "fass", 5, 1], [-22, "saecke", 4, 2], [-8, "fass", 4, 3], [8, "tuch", 3, 4], [16, "saecke", 5, 5], [33, "fass", 6, 6], [46, "saecke", 4, 7], [60, "fass", 5, 8], [78, "tuch", 3, 9]] as const)
    add(ware(kit, hp, [x, 0.15, 6.4 + (s % 2) * 0.8], art, n, s, (s * 23) % 40 - 20));
  const koggen: { l: Lebendig & { deckY: number }; d: KoggeDaten }[] = [];
  const setzKogge = (d: KoggeDaten, i: number) => {
    const k = kogge(kit, hp, { segel: d.segel, streifen: d.streifen, schwarz: d.schwarz, brace: d.brace, phase: i * 1.3 });
    k.obj.position.set(d.at[0], WATER_Y, d.at[1]); k.obj.rotation.y = THREE.MathUtils.degToRad(d.turn ?? 0);
    lebt(k); koggen.push({ l: k, d });
  };
  if (opt.hafen !== false) [{ at: [-34, 14.6] as [number, number], streifen: hp.stripe }, { at: [24, 14.6] as [number, number], streifen: "#2f5fb3" }, { at: [66, 14.6] as [number, number], streifen: "#3f8a4a" },
    { at: [8, 44] as [number, number], turn: 12 }, { at: [-70, 40] as [number, number], turn: -8 }].forEach((d, i) => setzKogge(d, i));
  [{ at: [-78, 30] as [number, number], turn: 8 }, { at: [-118, 42] as [number, number], turn: -10, streifen: "#2f5fb3" }, { at: [-150, 30] as [number, number], turn: 4, streifen: "#3f8a4a" }].forEach((d, i) => setzKogge(d, i + 20));   // auf Reede
  (opt.koggen ?? []).forEach((d, i) => setzKogge(d, i + 10));
  { const gp = kit.batch(); gp.box([1.0, 0.08, 5.2], [-30, 1.2, 11.6], "#ffffff", planks(hp.quayWood), [-26, 0, 0]); add(gp.build("laufplanke")); }

  // Last am Kranseil (Fass), Last am Windenbalken des Kaufmannshauses
  const seilMat = kit.mat(hp.rope);
  const lastB = kit.batch(); barrel(lastB, hp, [0, 0, 0]); const kranFass = add(lastB.build("kranlast"));
  const kranSeil = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, -0.5, 0), seilMat));
  kranSeil.position.set(HANSE_KRAN_ROLLE[0], HANSE_KRAN_ROLLE[1], HANSE_KRAN_ROLLE[2]);
  const haus = root.getObjectByName("haus-kaufmann")!;
  const hoistY = (haus.userData.hoistY as number) + 0.15;
  const hoistZ = -6.5 + 1.2;
  const aufzugObj = (opt.aufzug ?? []).map((a) => {
    const ab = kit.batch(); if ((a.art ?? "sack") === "fass") barrel(ab, hp, [0, 0, 0]); else sack(ab, hp, [0, 0, 0]);
    const o = add(ab.build("aufzuglast")); o.position.set(HANSE_HAUS_X, 0.15, hoistZ + 0.1);
    return { a, o };
  });
  const hausSeil = add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, -0.5, 0), seilMat));
  hausSeil.position.set(HANSE_HAUS_X, hoistY, hoistZ + 0.1);

  // Leben: Möwen über dem Hafen, Fackeln am Abend, Fahnen am Kai
  lebt(voegel([10, 16, 18], { n: 7, radius: 15, tempo: 0.08, farbe: "#f4f2ec", seed: 5 }));
  lebt(voegel([60, 18, 22], { n: 6, radius: 18, tempo: 0.07, farbe: "#f4f2ec", seed: 6 }));
  lebt(voegel([118, 34, -30], { n: 6, radius: 12, tempo: 0.1, seed: 7 }));
  for (const [x, i] of [[-48, 0], [12, 1], [40, 2], [88, 3]] as const) lebt(fahne(kit, [x, 0.15, 9.3], hp.flags[i], { h: 5, w: 1.8, turn: 190 + i * 8, phase: i * 1.4, rand: "#f4f0e6" }));
  if (night) for (const [x, z] of [[-3.4, -5.6], [0.2, -5.6], [-20, 9.2], [18, 9.2], [34, 9.2], [52, 9.2], [104, -8], [130, -8]] as const) lebt(fackel(kit, [x, 0.15, z], { h: 2.1, phase: x }));

  // anderes Ufer: niedrige Speicher und Bäume
  for (let i = 0; i < 18; i++) {
    const x = -238 + i * 22 + rng.range(-3, 3);
    const h = giebelhaus(kit, hp, pal, { ...giebelZufall(rng, hp, rng.pick([8, 9, 10]), false), floors: 1, door: 0, luken: "zu", depth: 10, bank: false, markise: null, schild: null });
    h.position.set(x, 0.15, 74); h.rotation.y = Math.PI; h.name = `speicher-${i}`; h.userData.occluder = false; add(h);
    add(tree(kit, pal, [x + 11, 0.15, 73], rng.range(5.5, 7), 80 + i));
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng.range(-0.2, 0.2), d = rng.range(260, 340);
    root.add(cloud(look.clouds, [Math.cos(a) * d, rng.range(55, 95), Math.sin(a) * d], rng.range(1.2, 1.9), i + 1));
  }
  // zweite, höhere Wolkenschicht rundum: auch über Dächern und Türmen stehen in jedem Bild Wolken am Himmel
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rng.range(-0.15, 0.15), d = rng.range(210, 300);
    root.add(cloud(look.clouds, [Math.cos(a) * d, rng.range(85, 150), Math.sin(a) * d], rng.range(1.9, 2.8), 40 + i));
  }

  const smooth = (v: number) => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t); };
  const tick = (time: number, cam: THREE.Camera, sunDir?: THREE.Vector3) => {
    river.tick(time, cam, sunDir);
    const film = time + start;
    for (const l of leben) l.tick(time);
    for (const { l, d } of koggen) if (d.weg) {
      const u = smooth((film - d.weg.t0) / (d.weg.t1 - d.weg.t0));
      l.obj.position.x = d.at[0] + (d.weg.nach[0] - d.at[0]) * u; l.obj.position.z = d.at[1] + (d.weg.nach[1] - d.at[1]) * u;
    }
    kran.wheel.rotation.z = -time * 0.5;
    // Kranlast: hängt über der Kogge, steigt in t0…t1
    const kl = opt.kranLast, ky = kl ? (kl.von ?? 2.6) + ((kl.bis ?? 7.5) - (kl.von ?? 2.6)) * smooth((film - kl.t0) / (kl.t1 - kl.t0)) : 3.2;
    kranFass.position.set(HANSE_KRAN_ROLLE[0], ky, HANSE_KRAN_ROLLE[2]);
    kranFass.rotation.y = 0.3 * Math.sin(time * 0.8);
    kranSeil.scale.y = Math.max(1e-3, HANSE_KRAN_ROLLE[1] - ky - 0.95);
    // Aufzug am Haus: Last steigt von der Strasse zur obersten Luke
    let seilBis = 0.9;
    for (const { a, o } of aufzugObj) {
      const u = smooth((film - a.t0) / (a.t1 - a.t0));
      const y = 0.15 + (hoistY - 1.6 - 0.15) * u;
      o.position.y = y; o.rotation.y = 0.25 * Math.sin(time * 1.3);
      o.scale.setScalar(film > a.t1 + 0.4 ? 1e-4 : 1);   // in der Luke verschwunden (nie unsichtbar schalten)
      if (film >= a.t0 - 0.5 && film <= a.t1 + 0.4) seilBis = y + 0.9;
    }
    hausSeil.scale.y = Math.max(1e-3, hoistY - seilBis);
    // Glocke
    const gl = opt.glocke, ring = gl && film >= gl[0] - 0.3 && film <= gl[1] + 0.8 ? Math.min(1, (film - gl[0] + 0.3) / 0.5) * Math.min(1, (gl[1] + 0.8 - film) / 0.8) : 0;
    ch.bell.rotation.x = 0.75 * ring * Math.sin(time * Math.PI * 1.6);
  };
  return { root, tick, groundAt: hanseGroundAt };
};
