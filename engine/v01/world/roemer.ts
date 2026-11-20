// Herkunft: eigen (V-Video), geschrieben 2026-11-18, ohne Vorlage.
// Römer-Welt (frühe Kaiserzeit): schnurgerade Römerstrasse (x = 0) mit gewölbtem Polygon-Pflaster, Randsteinen, Kies-Banketten und
// Seitengräben; Baustelle, an der man die Schichten im Schnitt sieht; Pinienallee, Meilenstein, Grabmäler, Wegstation; Felder und
// Weinberge; Fluss mit Steinbrücke; Forum mit Tempel, Säulenhallen, Triumphbogen und Goldenem Meilenstein (eigener Platz bei x 700).
// Bewegung nur aus der Shot-Zeit (Wasser, Lote der Groma, Feldzeichen, Ochsen, Feuer, Fahnen, Vögel).
//
//   Lageplan (Draufsicht, x nach rechts, z nach unten; Kamera meist im Süden, Blick nach Norden die Strasse entlang):
//   z  80…130   Wiese mit Fluchtstangen und Groma (die künftige Strasse ist abgesteckt)
//   z  21…76    Baustelle: Graben (−1,2 m), Schichten treppenartig (Steine bis z 64, Kies bis 54, Mörtel bis 44, Pflaster bis 36)
//               links Legionslager (x −14…−36), rechts Ochsenkarren, Stein- und Kieshaufen, Mörtelkasten, Werkzeug
//   z  16…−420  fertige Strasse mit Pinienallee (x ±8,5), Meilenstein (3,6, −14), Grabmäler (|x| 12…20, z −36…−120),
//               Wegstation (Front bei x 25, z −45…−16), Felder rechts (x 45…220), Weinberg links (x −32…−92)
//   z −134…−186 Fluss (Wasser −4,6 m) mit Steinbrücke (drei Bögen), dahinter Hügel und Berge mit einem Pass für die Strasse
//   x 670…730, z −98…0  Forum (Platz y 0,12): Tempel im Norden, Säulenhallen links und rechts, Triumphbogen im Süden (z 2)
import * as THREE from "three";
import { Rng } from "../core/random";
import { NOINK } from "../post/ink";
import { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { acker, blocks, earth, grass, kies, moertel, pflasterRoem, rock, rubble, shade, slabs } from "./paint";
import { water, type WaterColors } from "./water";
import { cloud, type CloudColors } from "./nature";
import { fahne, voegel, type Lebendig } from "./leben";
import type { WorldPalette } from "./palette";
import { bruecke, goldenerMeilenstein, grabmal, mansio, marktstand, meilenstein, saeulenhalle, stadthaus, statue, tempel, triumphbogen, zelt, type GrabArt } from "./roemer-bauten";
import { amphoren, fluchtstange, groma, kieshaufen, kochfeuer, korbKies, moertelkasten, ochse, ochsenkarren, scutumstaender, signum, stampfer, steinhaufen, vexillum, werkzeug } from "./roemer-requisiten";

export type RoemerPalette = {
  gras: string; grasFern: string; erde: string; erdeDunkel: string; acker: string[]; kies: string; kiesFuge: string; pflaster: string; pflasterFuge: string;
  randstein: string; statumen: string; statumenFuge: string; rudus: string; kalk: string; kiesel: string; fels: string;
  pinieStamm: string; pinie: string[]; zypresse: string[]; olive: string[]; oliveStamm: string; rebe: string[]; trauben: string; blumen: string[];
  marmor: string; marmorAder: string; travertin: string; putz: string[]; ziegel: string; holz: string; holzDunkel: string; gold: string; bronze: string;
  rot: string; rotDunkel: string; tuch: string[]; leder: string; zelt: string; zeltDunkel: string; amphore: string; korb: string; ochse: string;
  ochseDunkel: string; horn: string; heu: string; inschrift: string; eisen: string; wasser: string; fluss: WaterColors;
};
export type RoemerLook = { palette: WorldPalette; rp: RoemerPalette; clouds: CloudColors; sunColor: string };
/** Optionen der Römer-Welt. */
export type RoemerOptions = {
  voegel?: boolean;        // Vögel über Baustelle, Strasse und Forum (Standard ja)
  meilenZahl?: string;     // Zahl auf dem Meilenstein an der Landstrasse (Standard "XII")
};

export const ROEMER_FLUSS_Y = -4.6;
export const ROEMER_FORUM_Y = 0.12;
const FLUSS_Z = -160, BAU_Z0 = 21, BAU_Z1 = 76, STRASSE_Z0 = 36, STRASSE_Z1 = -700;
const BRUECKE = { z0: -186, z1: -134, boegen: [-172, -160, -148], r: 4.8, w: 6.7, top: 0.25 };
const FORUM = { x0: 670, x1: 730, z0: -98, z1: 0 };

const bump = (x: number, z: number, cx: number, cz: number, h: number, sx: number, sz = sx) =>
  h * Math.exp(-((x - cx) ** 2) / (2 * sx * sx) - ((z - cz) ** 2) / (2 * sz * sz));
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

const imGraben = (x: number, z: number) => Math.abs(x) < 3.6 && z > BAU_Z0 && z < BAU_Z1;
const anStrasse = (z: number) => z < BAU_Z0 - 0.5 && Math.abs(z - FLUSS_Z) > 30;
const imFeld = (x: number, z: number) => x > 45 && x < 220 && z < -8 && z > -140 && ((x - 45) % 40) > 3 && ((z + 8 + 400) % 33) > 3;
const imHof = (x: number, z: number) => x > 19 && x < 40 && z > -48 && z < -13;
const imLager = (x: number, z: number) => x > -40 && x < -10 && z > 30 && z < 74;

/** Höhe des Geländes: Hügel, die zur Strasse und zum Forum hin flach werden, Berge im Norden mit Pass, Fluss, Gräben, Baustelle. */
export const roemerHeight = (x: number, z: number) => {
  const ax = Math.abs(x);
  let h = 4.5 * Math.sin(x / 37 + 1) * Math.sin(z / 29) + 3 + bump(x, z, -90, 60, 9, 30) + bump(x, z, 80, 70, 8, 26) + bump(x, z, -120, -70, 10, 35)
    + bump(x, z, 140, -200, 14, 40) + bump(x, z, 780, -150, 26, 40) + bump(x, z, 600, -140, 18, 35) + bump(x, z, 820, 20, 16, 40);
  h += 12 * smooth(70, 200, ax) * (0.7 + 0.3 * Math.sin(z / 41));                                         // Hügel an den Seiten
  h += 46 * smooth(-280, -380, z) * (0.75 + 0.2 * Math.sin(x / 31) + 0.08 * Math.sin(x / 9)) * smooth(28, 110, ax);   // Berge mit Pass
  if (x < 450) h *= smooth(13, 55, ax);                                                                    // flach an der Strasse
  const fdx = Math.max(0, Math.abs(x - 700) - 45), fdz = Math.max(0, Math.abs(z + 50) - 62);
  h *= smooth(12, 70, Math.hypot(fdx, fdz));                                                              // flach ums Forum
  // Strassen-Profil: Bankette (Kies), Seitengräben
  if (anStrasse(z)) {
    if (ax < 4.25) h = ax > 2.9 ? 0.1 : 0;
    else if (ax < 6.4) h = -0.55 * (smooth(4.25, 4.75, ax) * smooth(6.4, 5.6, ax)) + h * smooth(5.6, 6.4, ax);
  }
  // Baustelle: Graben mit schrägen Wänden
  if (z > BAU_Z0 - 1 && z < BAU_Z1 + 1.5 && ax < 3.7) {
    const wand = Math.min(smooth(3.6, 3.0, ax), smooth(BAU_Z0, BAU_Z0 + 1.2, z), smooth(BAU_Z1 + 0.2, BAU_Z1 - 1.2, z));
    h = h * (1 - wand) - 1.2 * wand;
  }
  // Fluss (quer, bei z −160) mit Ufern; endet vor dem Forum
  const dz = Math.abs(z - FLUSS_Z), maske = smooth(34, 22, dz) * smooth(420, 380, x);
  const ufer = -7 + 7 * smooth(10, 26, dz) + 0.6 * Math.sin(x / 13) * smooth(10, 18, dz) * smooth(26, 18, dz);
  return h * (1 - maske) + ufer * maske;
};

// Gelände als Gitter mit eigenen Abständen: fein an der Strasse (0,4 m), an den Graben-Enden und am Fluss, sonst 4 m.
const achse = (teile: [number, number, number][]) => { const a: number[] = []; for (const [von, bis, s] of teile) for (let v = von; v < bis - 1e-6; v += s) a.push(+v.toFixed(3)); a.push(teile[teile.length - 1][1]); return a; };
const XS = achse([[-320, -16, 4], [-16, -8, 1], [-8, 8, 0.4], [8, 16, 1], [16, 900, 4]]);
const ZS = achse([[-700, -196, 4], [-196, -124, 1], [-124, 16, 4], [16, 26, 0.5], [26, 70, 2], [70, 80, 0.5], [80, 200, 4]]);
const NX = XS.length, NZ = ZS.length;
let HS: Float32Array | null = null;
const hoehen = () => {
  if (!HS) { HS = new Float32Array(NX * NZ); for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) HS[k * NX + i] = roemerHeight(XS[i], ZS[k]); }
  return HS;
};
const suche = (a: number[], v: number) => { let lo = 0, hi = a.length - 2; if (v <= a[0]) return 0; if (v >= a[hi]) return hi; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (a[m] <= v) lo = m; else hi = m - 1; } return lo; };
/** Höhe genau auf den gezeichneten Dreiecken (Gras, Bäume und Figuren sitzen darauf). */
const terrainAt = (x: number, z: number) => {
  const hs = hoehen(), i = suche(XS, x), k = suche(ZS, z);
  const fx = Math.min(1, Math.max(0, (x - XS[i]) / (XS[i + 1] - XS[i]))), fz = Math.min(1, Math.max(0, (z - ZS[k]) / (ZS[k + 1] - ZS[k])));
  const ha = hs[k * NX + i], hb = hs[(k + 1) * NX + i], hc = hs[(k + 1) * NX + i + 1], hd = hs[k * NX + i + 1];
  return fx + fz <= 1 ? ha + (hd - ha) * fx + (hb - ha) * fz : hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
};

/** Oberkante der Strasse (Pflaster gewölbt, Randsteine) und der offenen Schichten in der Baustelle; sonst −99. */
const strasseAt = (x: number, z: number) => {
  const ax = Math.abs(x);
  if (z <= STRASSE_Z0 && z >= STRASSE_Z1) { if (ax <= 2.6) return 0.42 - 0.06 * (ax / 2.6) ** 2; if (ax <= 2.9) return 0.5; }
  if (z > STRASSE_Z0 && z <= 44 && ax < 2.8) return 0.1;
  if (z > 44 && z <= 54 && ax < 2.9) return -0.2;
  if (z > 54 && z <= 64 && ax < 3.0) return -0.6;
  return -99;
};
const imForum = (x: number, z: number) => x > FORUM.x0 - 2 && x < FORUM.x1 + 2 && z > FORUM.z0 - 2 && z < FORUM.z1 + 2;
/** Bodenhöhe für Figuren und Requisiten: Gelände, Strasse, offene Schichten, Forumsplatz, über dem Fluss die Wasserfläche. */
export const roemerGroundAt = (x: number, z: number) =>
  Math.max(terrainAt(x, z), strasseAt(x, z), imForum(x, z) ? ROEMER_FORUM_Y : -99, Math.abs(z - FLUSS_Z) < 20 && x < 380 ? ROEMER_FLUSS_Y : -99);

type Schicht = "gras" | "erde" | "kies" | "acker" | "fels";
const schicht = (x: number, z: number, h: number): Schicht => {
  const ax = Math.abs(x);
  if (imGraben(x, z)) return "erde";
  if (anStrasse(z) && ax > 2.7 && ax < 4.3) return "kies";
  if (h < -2.6) return "kies";                                            // Flussbett
  if (h > 24 + 5 * Math.sin(x / 17)) return "fels";
  if (imFeld(x, z)) return "acker";
  if (imHof(x, z) || imLager(x, z)) return "erde";
  if (Math.abs(z + 29.5) < 1.4 && x > 6 && x < 25) return "erde";
  return "gras";
};

/** Gelände in fünf Schichten: jede liegt dort, wo sie gilt, auf der Höhe, sonst etwas tiefer (unter den anderen) – nie zwei Flächen
 *  in derselben Ebene. Die Absenkung richtet sich nach der Gitterweite (fein = wenig, damit keine steilen Knicke Tusche-Striche geben), dazu fest 2 cm je Schicht. */
const gelaende = (kit: Kit, rp: RoemerPalette) => {
  const hs = hoehen(), n = NX * NZ, art: Schicht[] = new Array(n), senk = new Float32Array(n);
  for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
    const j = k * NX + i; art[j] = schicht(XS[i], ZS[k], hs[j]);
    const dx = Math.min(XS[Math.min(i + 1, NX - 1)] - XS[i] || 4, XS[i] - XS[Math.max(i - 1, 0)] || 4), dzz = Math.min(ZS[Math.min(k + 1, NZ - 1)] - ZS[k] || 4, ZS[k] - ZS[Math.max(k - 1, 0)] || 4);
    senk[j] = Math.min(0.8, 0.3 * Math.min(dx, dzz) + 0.1 * Math.max(dx, dzz));   // lange Zellen: mehr, sonst schneiden sich zwei Schichten sehr flach (Flackern)
  }
  const idx: number[] = [];
  for (let k = 0; k < NZ - 1; k++) for (let i = 0; i < NX - 1; i++) {
    const a = k * NX + i, b = (k + 1) * NX + i, c = (k + 1) * NX + i + 1, d = k * NX + i + 1;
    idx.push(a, b, d, b, c, d);
  }
  const farbe: Record<Schicht, Parameters<Kit["mesh"]>[2]> = {
    gras: grass(rp.gras), erde: earth(rp.erde), kies: kies(rp.kies, rp.kiesFuge), acker: acker(rp.acker), fels: rock(rp.fels),
  };
  const g = new THREE.Group(); g.name = "gelaende";
  (Object.keys(farbe) as Schicht[]).forEach((s, li) => {   // li: jede fremde Schicht anders tief, damit keine zwei deckungsgleich sind
    if (!art.includes(s)) return;
    const pos = new Float32Array(n * 3);
    for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) { const j = k * NX + i; pos[j * 3] = XS[i]; pos[j * 3 + 1] = art[j] === s ? hs[j] : hs[j] - senk[j] * (1 + 0.25 * li) - 0.02 * (li + 1); pos[j * 3 + 2] = ZS[k]; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const m = kit.mesh(geo, "#ffffff", farbe[s]); m.name = `gelaende-${s}`; g.add(m);
  });
  return g;
};

// ---------------- Strasse und Baustelle ----------------
/** Fertige Strasse (z 36 … −700): gewölbtes Polygon-Pflaster, Randsteine; in der Baustelle die offenen Schichten treppenartig. */
const strasse = (kit: Kit, rp: RoemerPalette, seed: number) => {
  const g = new THREE.Group(); g.name = "strasse";
  const s = new THREE.Shape(), W = 2.65, L = STRASSE_Z0 - STRASSE_Z1;
  s.moveTo(-W, -0.1); s.lineTo(W, -0.1);
  for (let i = 0; i <= 20; i++) { const x = W - (i / 20) * 2 * W; s.lineTo(x, 0.42 - 0.06 * (Math.min(Math.abs(x), 2.6) / 2.6) ** 2); }
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: L, bevelEnabled: false, curveSegments: 2 }); geo.translate(0, 0, STRASSE_Z1);
  const pfl = kit.mesh(geo, "#ffffff", pflasterRoem(rp.pflaster, rp.pflasterFuge)); pfl.name = "pflaster"; pfl.userData.occluder = false; g.add(pfl);
  const b = kit.batch(), rs = blocks(rp.randstein, shade(rp.randstein, 0.72));
  for (const sx of [-1, 1]) b.box([0.3, 0.65, L + 0.06], [sx * 2.75, 0.175, (STRASSE_Z0 + STRASSE_Z1) / 2], "#ffffff", rs);
  // offene Schichten (verschieden breit, jede 2 cm in die untere gesenkt): Steine, Kies, Kalkmörtel
  b.box([6.0, 0.65, 46], [0, -0.925, 41], "#ffffff", rubble(rp.statumen, rp.statumenFuge));
  b.box([5.8, 0.42, 36], [0, -0.41, 36], "#ffffff", kies(rp.rudus, rp.kiesFuge));
  b.box([5.6, 0.32, 26], [0, -0.06, 31], "#ffffff", moertel(rp.kalk, rp.kiesel));
  const r = new Rng(seed * 31 + 7), st = rubble(rp.statumen, rp.statumenFuge);
  for (let i = 0; i < 70; i++) {   // grosse Steine der untersten Lage schauen heraus
    const x = r.range(-2.7, 2.7), z = r.range(54.6, 63.6);
    b.add(new THREE.IcosahedronGeometry(1, 1), [x, -0.62, z], "#ffffff", st, [r.range(0, 90), r.range(0, 180), 0], [r.range(0.2, 0.3), r.range(0.1, 0.15), r.range(0.18, 0.28)]);
  }
  for (let i = 0; i < 26; i++) {   // lose Steine im leeren Graben
    const x = r.range(-2.6, 2.6), z = r.range(65, 73.5);
    b.add(new THREE.IcosahedronGeometry(1, 1), [x, -1.2, z], "#ffffff", st, [r.range(0, 90), r.range(0, 180), 0], [r.range(0.18, 0.3), r.range(0.12, 0.2), r.range(0.16, 0.26)]);
  }
  const bau = b.build("strassen-schichten"); bau.userData.occluder = false; g.add(bau);
  return g;
};

// ---------------- Bäume (Ursprung = Fuss des Stamms) ----------------
type B = ReturnType<Kit["batch"]>;
const ball = new THREE.IcosahedronGeometry(1, 2);
const ballGrob = new THREE.IcosahedronGeometry(1, 1);
/** Pinie (Schirmpinie): hoher, leicht schräger Stamm, oben ein breiter flacher Schirm aus Polstern. */
export const pinieTeile = (b: B, rp: RoemerPalette, at: V3, h = 12, seed = 1) => {
  const r = new Rng(seed * 7 + 2), lean = r.range(-6, 6), st = h * 0.8, dick = 0.16 + h * 0.014, k = Math.sin((lean * Math.PI) / 180);
  b.add(new THREE.CylinderGeometry(dick * 0.6, dick, st, 9), [at[0], at[1] + st / 2, at[2]], rp.pinieStamm, undefined, [0, 0, lean]);
  const top: V3 = [at[0] - k * st / 2 * 1.0, at[1] + st, at[2]], w = h * 0.38;
  for (let i = 0; i < 2; i++) {   // Äste
    const a = i * 2.6 + r.range(0, 1), l = w * 0.7;
    b.add(new THREE.CylinderGeometry(dick * 0.25, dick * 0.4, l, 6), [top[0] + Math.cos(a) * l * 0.35, top[1] - 0.2, top[2] + Math.sin(a) * l * 0.35], rp.pinieStamm, undefined, [0, -(a * 180) / Math.PI, 65]);
  }
  b.add(ball, [top[0], top[1] + h * 0.05, top[2]], shade(rp.pinie[0], 0.95), undefined, [0, r.range(0, 90), 0], [w, h * 0.1, w * 0.9]);
  for (let i = 0, n = r.int(5, 7); i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r.range(-0.3, 0.3), d = w * r.range(0.35, 0.65), rr = w * r.range(0.38, 0.5);
    b.add(ball, [top[0] + Math.cos(a) * d, top[1] + h * r.range(0.08, 0.14), top[2] + Math.sin(a) * d], shade(r.pick(rp.pinie), r.range(0.92, 1.1)), undefined, [0, r.range(0, 90), 0], [rr, h * 0.075, rr * 0.85]);
  }
};
/** Zypresse: schmale, hohe dunkle Säule mit Spitze. */
export const zypresseTeile = (b: B, rp: RoemerPalette, at: V3, h = 10, seed = 1) => {
  const r = new Rng(seed * 13 + 4), c = r.pick(rp.zypresse), w = h * 0.09;
  b.add(new THREE.CylinderGeometry(0.1, 0.14, h * 0.15, 6), [at[0], at[1] + h * 0.07, at[2]], rp.pinieStamm);
  b.add(ball, [at[0], at[1] + h * 0.42, at[2]], c, undefined, [0, 0, 0], [w, h * 0.34, w]);
  b.add(ball, [at[0] + r.range(-0.05, 0.05), at[1] + h * 0.6, at[2]], shade(c, 1.08), undefined, [0, 0, 0], [w * 0.85, h * 0.3, w * 0.85]);
  b.add(new THREE.ConeGeometry(w * 0.6, h * 0.25, 9), [at[0], at[1] + h * 0.86, at[2]], shade(c, 1.12));
};
/** Olivenbaum: knorriger kurzer Stamm (zwei Äste), silbergrüne lockere Krone. */
export const oliveTeile = (b: B, rp: RoemerPalette, at: V3, h = 5, seed = 1) => {
  const r = new Rng(seed * 17 + 6), st = h * 0.42, dick = 0.18 + h * 0.03;
  b.add(new THREE.CylinderGeometry(dick * 0.7, dick, st, 8), [at[0], at[1] + st / 2, at[2]], rp.oliveStamm, undefined, [r.range(-6, 6), 0, r.range(-8, 8)]);
  for (let i = 0; i < 2; i++) b.add(new THREE.CylinderGeometry(dick * 0.35, dick * 0.55, st * 0.8, 7), [at[0] + (i ? 0.35 : -0.35), at[1] + st * 1.15, at[2]], rp.oliveStamm, undefined, [0, 0, i ? -28 : 28]);
  for (let i = 0, n = r.int(7, 10); i < n; i++) {
    const a = r.range(0, Math.PI * 2), d = h * r.range(0.05, 0.28), rr = h * r.range(0.14, 0.22);
    b.add(ball, [at[0] + Math.cos(a) * d, at[1] + h * r.range(0.62, 0.92), at[2] + Math.sin(a) * d], shade(r.pick(rp.olive), r.range(0.92, 1.08)), undefined, [0, 0, 0], [rr, rr * 0.75, rr]);
  }
};
/** Ein einzelner Baum als eigene Gruppe (Sichtlinien-Teilnehmer, für Szenen-Requisiten). */
export const roemerBaum = (kit: Kit, rp: RoemerPalette, art: "pinie" | "zypresse" | "olive", at: V3, h?: number, seed = 1) => {
  const b = kit.batch(), o: V3 = [0, 0, 0];
  if (art === "pinie") pinieTeile(b, rp, o, h ?? 12, seed); else if (art === "zypresse") zypresseTeile(b, rp, o, h ?? 10, seed); else oliveTeile(b, rp, o, h ?? 5, seed);
  const g = b.build(art); g.position.set(...at); g.userData.occluder = true;
  return g;
};

// ---------------- Wiese, Weinberg ----------------
/** Wiese: Grasbüschel und Blumen nahe den Orten (ohne Tusche, Kulisse). */
const wiese = (kit: Kit, rp: RoemerPalette, frei: (x: number, z: number) => boolean, seed: number) => {
  const b = kit.batch(), r = new Rng(seed);
  const halm = new THREE.ConeGeometry(0.075, 1, 5), bluete = new THREE.IcosahedronGeometry(1, 0), TOENE = [0.88, 1, 1.1, 1.2, 1.3].map((k) => shade(rp.gras, k));
  const felder: [number, number, number, number, number][] = [[-45, 45, -130, 130, 9000], [640, 770, -130, 40, 3500]];
  for (const [x0, x1, z0, z1, n] of felder) for (let i = 0; i < n; i++) {
    const x = r.range(x0, x1), z = r.range(z0, z1), hh = roemerHeight(x, z);
    if (!frei(x, z) || schicht(x, z, hh) !== "gras") continue;
    const y = terrainAt(x, z) - 0.03, rot = r.range(0, 180), hgt = r.range(0.25, 0.5), ti = Math.floor(r.next() * 4);
    for (let k = 0; k < 3; k++) {
      const a = (k - 1) * 0.35 + r.range(-0.1, 0.1), hk = hgt * (k === 1 ? 1 : 0.8);
      b.add(halm, [x + Math.sin(a) * hk * 0.25 + (k - 1) * 0.04, y + hk / 2, z], TOENE[k === 1 ? ti + 1 : ti], undefined, [0, rot, THREE.MathUtils.radToDeg(-a)], [1, hk, 1]);
    }
    if (r.next() > 0.8) {
      const fc = r.pick(rp.blumen);
      b.add(halm, [x + 0.1, y + (hgt + 0.06) / 2, z + 0.03], TOENE[1], undefined, [0, 0, 0], [0.4, hgt + 0.06, 0.4]);
      b.add(bluete, [x + 0.1, y + hgt + 0.06, z + 0.03], fc, undefined, [0, rot, 0], [0.1, 0.08, 0.1]);
    }
  }
  const g = b.build("wiese");
  g.traverse((o) => { o.layers.set(NOINK); (o as THREE.Mesh).castShadow = false; });
  g.userData.kulisse = true;
  return g;
};
/** Weinberg: Reihen aus Pfählen mit Draht, Reben als grüne Polster mit blauen Trauben. */
const weinberg = (kit: Kit, rp: RoemerPalette, seed: number) => {
  const b = kit.batch(), r = new Rng(seed);
  for (let x = -34; x > -92; x -= 2.6) for (let z = -26; z > -110; z -= 2.2) {
    const y = terrainAt(x, z);
    b.add(new THREE.CylinderGeometry(0.04, 0.05, 1.5, 5), [x, y + 0.7, z], rp.holzDunkel);
    b.add(ball, [x, y + 1.05, z - 1.1], shade(r.pick(rp.rebe), r.range(0.9, 1.1)), undefined, [0, 0, 0], [0.42, 0.42, 1.05]);
    if (r.next() < 0.45) b.add(ballGrob, [x + (r.next() < 0.5 ? 0.38 : -0.38), y + 0.82, z - r.range(0.5, 1.6)], rp.trauben, undefined, [0, 0, 0], [0.09, 0.14, 0.09]);
  }
  const g = b.build("weinberg"); g.userData.kulisse = true;
  return g;
};

/** Ort der Römer-Welt: Boden, Totale, Halbnah (Kamera-Vorschläge). */
export type RoemerPlace = { at: V3; wide: { pos: V3; look: V3 }; medium: { pos: V3; look: V3 }; note: string };
export const ROEMER_PLACES: Record<string, RoemerPlace> = {
  strassenbau: { at: [0, 0, 46], note: "Baustelle: Graben mit Schichten im Schnitt (Steine z 54…64, Kies 44…54, Mörtel 36…44, Pflaster bis 36), Lager links, Ochsenkarren rechts",
    wide: { pos: [15, 7.5, 86], look: [0, -0.6, 44] }, medium: { pos: [6.2, 1.5, 61], look: [0, -0.5, 50] } },
  vermessung: { at: [0, 0, 96], note: "Wiese vor der Baustelle: Groma (1,4, 96), Fluchtstangen bei z 84, 104, 124 auf der künftigen Linie",
    wide: { pos: [10, 3.5, 118], look: [1.5, 1.2, 99] }, medium: { pos: [4.6, 1.6, 101.8], look: [2.2, 1.6, 97.6] } },
  lager: { at: [-24, 0, 52], note: "Legionslager: Lederzelte, Feldzeichen (Vexillum, Signum, Adler), Schildständer, Kochfeuer",
    wide: { pos: [-6, 4.5, 74], look: [-24, 1.2, 50] }, medium: { pos: [-8.5, 1.7, 48], look: [-12.5, 2, 43] } },
  landstrasse: { at: [0, 0, -20], note: "Schnurgerade Strasse bis zum Horizont, Pinienallee, Meilenstein (3,6, −14), Grabmäler, Wegstation rechts",
    wide: { pos: [6.5, 5, 14], look: [0, 1.2, -130] }, medium: { pos: [-1.5, 1.9, -2], look: [3.0, 1.5, -14.6] } },
  meilenstein: { at: [3.6, 0, -14], note: "Meilenstein mit Inschrift (MP XII) am Strassenrand, Schrift zur Strasse (−x)",
    wide: { pos: [-0.5, 2.4, -4], look: [3.0, 1.4, -14.6] }, medium: { pos: [0.4, 1.85, -10.4], look: [3.1, 1.45, -13.9] } },
  graeber: { at: [0, 0, -70], note: "Gräberstrasse: Turmgrab, Rundgrab, Altar, Stelen zwischen Pinien und Zypressen",
    wide: { pos: [5, 4, -24], look: [0, 2, -80] }, medium: { pos: [-2.5, 1.9, -42], look: [-12.6, 2.3, -45.4] } },
  mansio: { at: [25, 0, -30], note: "Wegstation (mansio): Haus mit Säulenvorhalle, Stall mit Heu, Brunnen, Trog; Front bei x 25",
    wide: { pos: [6, 4.5, -8], look: [23.5, 3, -30] }, medium: { pos: [14, 1.7, -22], look: [24, 1.8, -29] } },
  bruecke: { at: [0, 0, -160], note: "Steinbrücke mit drei Bögen über den Fluss, die Strasse läuft gerade darüber",
    wide: { pos: [34, 5, -124], look: [0, -2, -160] }, medium: { pos: [12, 0.2, -142], look: [0, -1.8, -160] } },
  forum: { at: [700, ROEMER_FORUM_Y, -45], note: "Forum: Tempel (Norden), Säulenhallen mit Läden, Triumphbogen (Süden), Marktstände, Statuen, Goldener Meilenstein (692, −64)",
    wide: { pos: [712, 6, -6], look: [700, 7, -72] }, medium: { pos: [697, 1.8, -53], look: [692.6, 2.6, -62.2] } },
  "goldener-meilenstein": { at: [692, ROEMER_FORUM_Y, -64], note: "Goldener Meilenstein vor der Tempeltreppe",
    wide: { pos: [700, 3.5, -46], look: [692, 3, -66] }, medium: { pos: [694.5, 1.7, -58.5], look: [692.4, 2.8, -62.3] } },
};

/** Grundrisse (Mitte x/z, halbe Breite/Tiefe): dort keine Gräser und Bäume. */
const GRUNDRISSE: [number, number, number, number][] = [
  [0, 48, 9.5, 30], [31, -30, 9, 17], [-24, 52, 16, 23], [700, -50, 37, 53], [0, -160, 8, 30],
  [-15, -46, 2.4, 2.4], [17, -60, 3.4, 3.4], [-13, -78, 1.8, 1.6], [12.5, -36, 1, 1], [-12, -95, 1, 1], [16, -104, 2.4, 2.4], [-18, -118, 3.4, 3.4],
  [653, -48, 7, 52], [747, -48, 7, 52], [700, -112, 46, 7],   // Stadthäuser ums Forum
];
const frei = (x: number, z: number) => !GRUNDRISSE.some(([cx, cz, hx, hz]) => Math.abs(x - cx) < hx && Math.abs(z - cz) < hz) && !(anStrasse(z) && Math.abs(x) < 4.3);

export const roemer = (kit: Kit, look: RoemerLook, seed = 1, opt: RoemerOptions = {}) => {
  const rp = look.rp, root = new THREE.Group(); root.name = "roemer";
  const leben: Lebendig[] = [], lebt = (l: Lebendig) => { root.add(l.obj); leben.push(l); return l; };
  const r = new Rng(seed * 61), st = (o: THREE.Object3D) => { root.add(o); return o; };
  const y = (x: number, z: number): V3 => [x, roemerGroundAt(x, z), z];

  root.add(gelaende(kit, rp));
  root.add(strasse(kit, rp, seed));
  const fluss = water(rp.fluss, [700, 40], [30, ROEMER_FLUSS_Y, FLUSS_Z], look.sunColor);
  root.add(fluss.mesh);
  const br = bruecke(kit, rp, BRUECKE.z1 - BRUECKE.z0, BRUECKE.w, BRUECKE.boegen.map((z) => z - (BRUECKE.z0 + BRUECKE.z1) / 2), BRUECKE.r, -7.6);
  br.position.set(0, BRUECKE.top, (BRUECKE.z0 + BRUECKE.z1) / 2); st(br);
  root.add(wiese(kit, rp, frei, seed * 7));
  root.add(weinberg(kit, rp, seed * 9));

  // Bäume: Pinienallee, Zypressen bei den Gräbern, Pinien und Oliven auf den Hügeln (ein Batch), Bäume an den Orten einzeln
  const wald = kit.batch();
  for (let z = 16; z > -420; z -= 16) {
    if (Math.abs(z - FLUSS_Z) < 34) continue;
    for (const sx of [-1, 1]) { if (sx > 0 && z < -10 && z > -52) continue; pinieTeile(wald, rp, [sx * 8.5 + r.range(-0.3, 0.3), terrainAt(sx * 8.5, z) - 0.05, z + r.range(-1, 1)], r.range(11, 14), Math.round(z * sx)); }
  }
  for (let i = 0; i < 520; i++) {
    const x = r.range(-300, 300), z = r.range(-330, 190), h = roemerHeight(x, z);
    if (Math.abs(x) < 26 || !frei(x, z) || schicht(x, z, h) !== "gras" || h < -1 || (x < -28 && x > -96 && z < -20 && z > -114)) continue;
    const k = r.next(), yy = terrainAt(x, z) - 0.08;
    if (k < 0.45) pinieTeile(wald, rp, [x, yy, z], r.range(9, 14), i); else if (k < 0.7) zypresseTeile(wald, rp, [x, yy, z], r.range(7, 12), i); else oliveTeile(wald, rp, [x, yy, z], r.range(3.5, 5.5), i);
  }
  for (let i = 0; i < 120; i++) {   // ums Forum
    const x = r.range(610, 800), z = r.range(-190, 50), h = roemerHeight(x, z);
    if (!frei(x, z) || (x > 636 && x < 766 && z > -122 && z < 14) || h > 30) continue;
    const yy = terrainAt(x, z) - 0.08;
    if (r.next() < 0.6) pinieTeile(wald, rp, [x, yy, z], r.range(10, 14), 900 + i); else zypresseTeile(wald, rp, [x, yy, z], r.range(8, 12), 900 + i);
  }
  root.add(wald.build("wald"));
  const einzeln: ["pinie" | "zypresse" | "olive", number, number, number][] = [
    ["zypresse", -10.5, -40, 9], ["zypresse", -11, -52, 10], ["zypresse", 14.5, -66, 9.5], ["zypresse", -10.8, -84, 8.5], ["zypresse", 13.5, -98, 10],
    ["zypresse", -14, -112, 9], ["olive", 14, 28, 5], ["olive", 18, 40, 4.5], ["pinie", 16, 64, 13], ["zypresse", 12, 76, 9], ["olive", -12, 82, 4.8],
    ["pinie", -14, 100, 12], ["zypresse", 15, 110, 10], ["olive", 44, -18, 5], ["zypresse", 13, -128, 9],
  ];
  einzeln.forEach(([art, x, z, h], i) => st(roemerBaum(kit, rp, art, [x, terrainAt(x, z) - 0.05, z], h, 300 + i)));

  // Landstrasse: Meilenstein, Grabmäler, Wegstation
  st(meilenstein(kit, rp, y(3.6, -14), -90, opt.meilenZahl ?? "XII"));
  const GRAEBER: [GrabArt, number, number, number][] = [["turm", -15, -46, 90], ["rund", 17, -60, -90], ["altar", -13, -78, 90], ["stele", 12.5, -36, -90],
    ["stele", -12, -95, 90], ["turm", 16, -104, -90], ["rund", -18, -118, 90]];
  GRAEBER.forEach(([art, x, z, t], i) => st(grabmal(kit, rp, art, y(x, z), t, i + 1)));
  const ms = mansio(kit, rp); ms.position.set(32, terrainAt(32, -30), -30); ms.rotation.y = -Math.PI / 2; st(ms);
  ([[27.5, -44, 200], [29, -41.5, 10]] as const).forEach(([x, z, t], i) => lebt(ochse(kit, rp, y(x, z), t, i * 1.3, i === 1)));

  // Baustelle: Ochsenkarren, Haufen, Mörtel, Werkzeug, Stampfer, Körbe; Vermessung davor
  lebt(ochsenkarren(kit, rp, y(6.8, 52), 90, 0.4));
  st(steinhaufen(kit, rp, y(-6.4, 60), 1.1, 1)); st(steinhaufen(kit, rp, y(7.2, 64), 0.9, 2));
  st(kieshaufen(kit, rp, y(-6.6, 48))); st(kieshaufen(kit, rp, y(7.4, 41), 0.8));
  st(moertelkasten(kit, rp, y(-6.2, 38.5), 90)); st(werkzeug(kit, rp, y(-6.4, 30), 90)); st(stampfer(kit, rp, y(5.6, 31), -90));
  const koerbe = kit.batch(); for (const [x, z] of [[4.4, 45], [4.8, 46.2], [-4.4, 56], [-4.6, 66.5], [4.3, 70]] as const) korbKies(koerbe, rp, y(x, z));
  const kb = koerbe.build("koerbe"); st(kb);
  for (const z of [84, 104, 124]) st(fluchtstange(kit, rp, y(0, z)));
  lebt(groma(kit, rp, y(1.4, 96), 30, 0.3));

  // Legionslager: Zelte in Reihen, Feldzeichen, Schildständer, Kochfeuer
  for (let i = 0; i < 4; i++) for (let k = 0; k < 3; k++) st(zelt(kit, rp, y(-18 - k * 6.5, 36 + i * 9.5), 90));
  lebt(vexillum(kit, rp, y(-12, 44), 90, 0.2)); st(signum(kit, rp, y(-12, 41.8), 90)); st(signum(kit, rp, y(-12, 46.4), 90, true));
  st(scutumstaender(kit, rp, y(-14.6, 54), 90)); st(scutumstaender(kit, rp, y(-14.6, 64), 90));
  lebt(kochfeuer(kit, rp, y(-27.5, 50), 0.6)); st(amphoren(kit, rp, y(-30, 46), 0, 5, 2));

  // Forum
  const fy = ROEMER_FORUM_Y, fb = kit.batch();
  fb.box([FORUM.x1 - FORUM.x0, 0.4, FORUM.z1 - FORUM.z0], [(FORUM.x0 + FORUM.x1) / 2, fy - 0.2, (FORUM.z0 + FORUM.z1) / 2], "#ffffff", slabs(rp.travertin, shade(rp.travertin, 0.78)));
  fb.box([3.2, 0.36, 3.0], [700, fy + 0.1, -71.5], shade(rp.travertin, 0.9));   // Altar vor der Tempeltreppe
  const platz = fb.build("forum-platz"); platz.userData.occluder = false; st(platz);
  const tp = tempel(kit, rp); tp.position.set(700, fy, -86); st(tp);
  for (const [x, t] of [[FORUM.x0 + 1.5, 90], [FORUM.x1 - 1.5, -90]] as const) { const h = saeulenhalle(kit, rp, 52, x > 700 ? 2 : 1); h.position.set(x, fy, -44); h.rotation.y = THREE.MathUtils.degToRad(t); st(h); }
  const tb = triumphbogen(kit, rp); tb.position.set(700, fy, -2); st(tb);
  st(goldenerMeilenstein(kit, rp, [692, fy, -64], 20));
  ([[686, -32, 30, false], [714, -32, -30, false], [684, -56, 60, true], [716, -56, -60, true]] as const).forEach(([x, z, t, bz]) => st(statue(kit, rp, [x, fy, z], t, bz)));
  ([[680, -20, 90, 1], [680, -28, 90, 2], [720, -22, -90, 3], [720, -40, -90, 4], [706, -14, 0, 5]] as const).forEach(([x, z, t, s]) => st(marktstand(kit, rp, [x, fy, z], t, s)));
  st(amphoren(kit, rp, [677.5, fy, -36], 90, 6, 3)); st(amphoren(kit, rp, [722.5, fy, -31], -90, 6, 4));
  ([[693, -71], [707, -71], [690.5, -9], [709.5, -9]] as const).forEach(([x, z], i) => lebt(fahne(kit, [x, fy, z], rp.tuch[i % 2 ? 0 : 1], { h: 5.5, w: 1.6, rand: rp.gold, turn: 200 + i * 10, phase: i * 0.8 })));
  const HAEUSER: [number, number, number, number, number][] = [
    [652, -90, 9, 10, 3], [654, -74, 11, 9, 4], [652, -58, 9, 11, 3], [654, -40, 10, 9, 4], [652, -22, 9, 10, 2], [654, -6, 11, 9, 3],
    [748, -92, 10, 9, 4], [746, -76, 9, 11, 3], [748, -58, 11, 10, 4], [746, -40, 9, 9, 2], [748, -24, 10, 11, 3], [746, -6, 9, 9, 3],
    [676, -112, 12, 9, 3], [690, -114, 10, 9, 4], [712, -114, 11, 9, 3], [726, -112, 10, 10, 4], [662, -110, 10, 10, 2], [740, -110, 9, 9, 3],
  ];
  HAEUSER.forEach(([x, z, w, d, s], i) => { const h = stadthaus(kit, rp, w, d, s, i + 1); h.position.set(x, terrainAt(x, z) - 0.05, z); st(h); });

  // Wolken über Strasse und Forum, Vögel
  for (const [cx, cz] of [[0, -60], [700, -50]] as const) for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + r.range(-0.2, 0.2), d = r.range(200, 290);
    root.add(cloud(look.clouds, [cx + Math.cos(a) * d, r.range(70, 140), cz + Math.sin(a) * d], r.range(1.4, 2.2), i + (cx ? 40 : 3)));
  }
  if (opt.voegel !== false) {
    lebt(voegel([0, 22, 40], { n: 6, radius: 18, tempo: 0.07, seed: 3, farbe: "#3a3540" }));
    lebt(voegel([10, 26, -80], { n: 5, radius: 22, tempo: 0.06, seed: 4, farbe: "#3a3540" }));
    lebt(voegel([700, 30, -60], { n: 7, radius: 20, tempo: 0.08, seed: 5, farbe: "#f4f2ec" }));
  }

  const tick = (time: number, cam: THREE.Camera, sunDir?: THREE.Vector3) => {
    fluss.tick(time, cam, sunDir);
    for (const l of leben) l.tick(time);
  };
  return { root, tick, groundAt: roemerGroundAt };
};
