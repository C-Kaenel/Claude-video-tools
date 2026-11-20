// Herkunft: eigen (V-Video), geschrieben 2026-11-16, ohne Vorlage.
// Nord-Welt (Wikinger um 900): Fjord mit steilen Felswänden und Bergen mit Schnee, eigenes Wasser, Kiesstrand mit Tang und
// Treibholz, Wiese mit Heidekraut und Wildblumen, Birken, Kiefern, Wacholder, Ebereschen, Findlinge, flache nordische Wolken,
// Möwen über dem Wasser. Verschneite Version mit `winter: true` (Schnee auf Wiese, Bäumen und Steinen, trockenes Gras, graue
// Wolken, Schneefall). Bewegung nur aus der Shot-Zeit (Wasser, Vögel, Schneeflocken).
//
//   Lageplan (Draufsicht, x nach rechts, z nach unten = Richtung Wasser; Kamera meist im Süden, Blick nach Norden):
//   z −115…−220   Bergkette mit Schnee und Graten (Gipfel bis ~90 m)
//   z −45…−110    Hügel mit Kiefern, Birken, Wacholder
//   z −45…0       Wiese (Dorfplatz x −120…120, flach, Höhe 0) mit Heidekraut und Blumen
//   z  0…16       Kiesstrand (fällt von 0 auf −2,4 m; Wasserlinie bei z ≈ 9), Tang und Treibholz
//   z  9…150      ~~~ Fjord ~~~ (Wasser −1,2 m)
//   z 135…160     gegenüberliegende Felswand (bis ~70 m), oben Schnee
//   |x| > 200     Berge schliessen den Fjord an beiden Enden
//   Dorf: grosses Langhaus (0, −28), mittleres (−38, −15), kleines (36, −17), Grubenhaus (−16, −5), Speicher (17, −6), Wege aus
//   Erde, Flechtzäune, Palisade hinten (z −44); Schmiede (−68, −10); Hafen: Landesteg x 70 (z 1…26), Bootsschuppen (95, −5);
//   Strand x −40…−15; Grabhügel (105, −36) mit Steinschiff (78, −42); Thingplatz (−100, −30).
import * as THREE from "three";
import { Rng } from "../core/random";
import { NOINK } from "../post/ink";
import { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { birkenrinde, earth, felswand, grass, kies, rock, schnee, shade } from "./paint";
import { water, type WaterColors } from "./water";
import type { CloudColors } from "./nature";
import { voegel, type Lebendig } from "./leben";
import type { WorldPalette } from "./palette";
import { bootsschuppen, flechtzaun, grabhuegel, grubenhaus, landesteg, langhaus, langhausMasse, palisade, schmiedeDach, speicher, steinschiff, thingplatz, type LanghausArt, type NordBauFarben } from "./nord-bauten";
import { rauchsaeule } from "./leben";
import { schiff, type SchiffArt, type SchiffModus } from "./nord-schiffe";
import { amboss, blasebalg, esse, feuerstelle, hackklotz, handmuehle, kessel, netzgestell, rabe, rabenfahneBau, runensteinBau, schaf, schildstaender, schnitzpfosten,
  speerstaender, stockfisch, vorraete, webstuhl, werkbank, ziege, type NordReqFarben } from "./nord-requisiten";
import { holzstapel, huehner } from "./props";
import { fackel } from "./leben";

/** Schiff eines Shots: Art, Ort [x, z], Drehung (Grad, 0 = Bug nach +x), Modus; `weg`: fährt nach `nach` in t0…t1 (Film-Sekunden). */
export type SchiffDaten = { art: SchiffArt; at: [number, number]; turn?: number; modus?: SchiffModus; streifen?: string;
  weg?: { nach: [number, number]; t0: number; t1: number } };

export type NordPalette = {
  grass: string; grassFar: string; heather: string[]; flowers: string[]; rock: string; rockDark: string; snow: string; snowShade: string;
  kies: string; kiesJoint: string; sand: string; tang: string[]; drift: string; driftDark: string;
  birkeRinde: string; birkeMal: string; birkeLaub: string[]; kiefer: string[]; kieferRinde: string; wacholder: string[];
  eberesche: string[]; beeren: string; findling: string; water: WaterColors; cloud: CloudColors;
  winterGras: string; winterWolke: CloudColors;
} & NordBauFarben & NordReqFarben;
export type NordLook = { palette: WorldPalette; nord: NordPalette; sunColor: string };
/** Optionen der Nord-Welt (Zeiten in Film-Sekunden). Bauten und Orte kommen in den nächsten Ausbaustufen dazu. */
export type NordOptions = {
  moewen?: boolean;
  winter?: boolean;      // verschneite Version: Schnee statt Wiese, Schneekappen auf Bäumen und Findlingen, graue Wolken
  schneefall?: boolean;  // fallende Flocken um die Kamera (Standard: an, wenn winter)
  innen?: boolean;       // Aufnahmen im grossen Langhaus: Dach und Wände werfen keinen Schatten (Innenraum hell)
  dorf?: boolean;        // Dorf, Hafen, Schmiede, Grabhügel, Thingplatz (Standard ja)
  schiffe?: SchiffDaten[];   // zusätzliche Schiffe (z. B. fahrend)
  hafen?: boolean;       // Schiffe am Steg, am Strand und auf dem Fjord (Standard ja)
};

export const NORD_WATER_Y = -1.2;

const bump = (x: number, z: number, cx: number, cz: number, h: number, sx: number, sz = sx) =>
  h * Math.exp(-((x - cx) ** 2) / (2 * sx * sx) - ((z - cz) ** 2) / (2 * sz * sz));
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Höhe des Geländes. Dorfwiese (|x| < 120, z −45…0) ist flach (0); der Strand fällt bis z 16 auf −2,4 m. */
export const nordHeight = (x: number, z: number) => {
  const ax = Math.abs(x);
  let nord = 5 * smooth(-45, -95, z) * (0.7 + 0.3 * Math.sin(x / 23));                                   // Hügel hinter dem Dorf
  nord += (bump(x, z, -70, -72, 6, 18) + bump(x, z, 80, -78, 7, 20)) * smooth(-45, -60, z);
  nord += 58 * smooth(-115, -175, z) * (0.75 + 0.2 * Math.sin(x / 41) + 0.08 * Math.sin(x / 13));      // Bergkette
  nord += 11 * Math.abs(Math.sin(x / 17 + z / 29)) * smooth(-110, -160, z);                             // Grate
  nord += bump(x, z, -60, -185, 28, 30) + bump(x, z, 95, -195, 32, 34) + bump(x, z, -185, -170, 24, 30) + bump(x, z, 210, -165, 22, 30);
  const strand = -2.4 * smooth(1, 16, z);
  const wand = 62 * smooth(135, 158, z) * (0.75 + 0.2 * Math.sin(x / 29) + 0.08 * Math.sin(x / 7))     // Felswand gegenüber
    + 8 * Math.abs(Math.sin(x / 13)) * smooth(140, 160, z);
  const ende = 70 * smooth(200, 285, ax) * (0.8 + 0.2 * Math.sin(z / 31));                              // Berge an den Fjord-Enden
  return nord * smooth(1, -1, z) + strand + wand + ende;
};

// Gelände als Raster (3 m); terrainAt liest genau die gezeichneten Dreiecke (Büschel, Bäume und Figuren sitzen darauf)
const T = { w: 690, d: 540, step: 3, cx: 0, cz: -30 };
const T_X0 = T.cx - T.w / 2, T_Z0 = T.cz - T.d / 2;
const terrainAt = (x: number, z: number) => {
  const gx = (x - T_X0) / T.step, gz = (z - T_Z0) / T.step, ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const hAt = (i: number, k: number) => nordHeight(T_X0 + i * T.step, T_Z0 + k * T.step);
  const ha = hAt(ix, iz), hb = hAt(ix, iz + 1), hc = hAt(ix + 1, iz + 1), hd = hAt(ix + 1, iz);
  return fx + fz <= 1 ? ha + (hd - ha) * fx + (hb - ha) * fz : hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
};
/** Bodenhöhe für Figuren und Requisiten: Gelände, über dem Fjord die Wasserfläche. */
export const nordGroundAt = (x: number, z: number) => Math.max(terrainAt(x, z), z > 8 && z < 150 ? NORD_WATER_Y : -99);

type Schicht = "gras" | "fels" | "schnee" | "kies" | "weg";
/** Wege aus festgetretener Erde im Dorf (Teil des Geländes, keine aufgelegte Fläche – nichts flackert). */
const aufWeg = (x: number, z: number) =>
  (Math.abs(x - 1.2 * Math.sin(z / 5)) < 1.4 && z > -24 && z < 1.5)                // vom grossen Langhaus zum Strand
  || (Math.abs(z + 8 + 1.5 * Math.sin(x / 9)) < 1.2 && x > -70 && x < 96)          // Querweg Schmiede – Dorf – Hafen
  || (Math.abs(x - 70) < 1.3 && z > -9 && z < 1.5);                               // zum Landesteg
let dorfAn = true;   // Wege nur, wenn das Dorf gebaut wird (vor dem Gelände gesetzt)
const schicht = (x: number, z: number): Schicht => {
  const h = nordHeight(x, z), e = 1.5;
  const steil = Math.hypot(nordHeight(x + e, z) - nordHeight(x - e, z), nordHeight(x, z + e) - nordHeight(x, z - e)) / (2 * e);
  if (h > 44 + 6 * Math.sin(x / 17) + 4 * Math.sin(z / 11)) return "schnee";
  if (z > 118 && h < 2.5) return "kies";                                     // heller Kiessaum am Fuss der Felswand
  if (steil > 0.6 || h > 18) return steil < 0.95 && h < 34 && Math.sin(x / 11) > -0.2 ? "gras" : "fels";   // grüne Absätze
  if (z > 0.5 || h < -0.3) return "kies";
  if (dorfAn && aufWeg(x, z)) return "weg";
  return "gras";
};

/** Gelände in fünf Schichten (Gras, Fels, Schnee, Kies, Weg): jede Schicht liegt dort, wo sie gilt, auf der Höhe; sonst 0,8 m tiefer
 *  (unter den anderen) – so berühren sich nie zwei Flächen in derselben Ebene (kein Flackern), die Grenzen sind gemalt-zackig. */
const gelaende = (kit: Kit, np: NordPalette, winter = false) => {
  const nx = T.w / T.step, nz = T.d / T.step, base = new THREE.PlaneGeometry(T.w, T.d, nx, nz).rotateX(-Math.PI / 2);
  const p = base.getAttribute("position"), art: Schicht[] = [], hs: number[] = [];
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + T.cx, z = p.getZ(i) + T.cz; art.push(schicht(x, z)); hs.push(nordHeight(x, z)); }
  const farbe: Record<Schicht, Parameters<Kit["mesh"]>> = {
    gras: [base, "#ffffff", winter ? schnee(np.snow, np.snowShade) : grass(np.grass)], fels: [base, "#ffffff", felswand(np.rock, np.rockDark, shade(np.grass, 0.8))],
    schnee: [base, "#ffffff", schnee(np.snow, np.snowShade)], kies: [base, "#ffffff", kies(np.kies, np.kiesJoint)],
    weg: [base, "#ffffff", winter ? schnee(shade(np.snow, 0.93), np.snowShade) : earth(np.erde)],
  };
  const g = new THREE.Group(); g.name = "gelaende";
  for (const s of Object.keys(farbe) as Schicht[]) {
    const geo = base.clone(), q = geo.getAttribute("position");
    // Weg und Gras im flachen Dorf nur 0,15 m versetzt: bei 0,8 m knickt die Grenze so steil, dass die Tusche-Linien sie als Strich zeichnen
    const flach = (i: number) => (s === "weg" || s === "gras") && (art[i] === "weg" || art[i] === "gras") && Math.abs(hs[i]) < 0.3;
    for (let i = 0; i < q.count; i++) q.setY(i, art[i] === s ? hs[i] : hs[i] - (flach(i) ? 0.15 : 0.8));
    geo.translate(T.cx, 0, T.cz); geo.computeVertexNormals();
    const m = kit.mesh(geo, farbe[s][1], farbe[s][2]); m.name = `gelaende-${s}`; g.add(m);
  }
  return g;
};

const ball = new THREE.IcosahedronGeometry(1, 2);
const ballGrob = new THREE.IcosahedronGeometry(1, 1);
type B = ReturnType<Kit["batch"]>;

// ---------------- Bäume (in einen Batch; Ursprung = Fuss des Stamms) ----------------
/** Schneekappe auf einem Ballen (Mitte c, Radien rx/ry/rz): weisser flacher Ballen, der oben herausschaut. */
const kappe = (b: B, schnee: string | undefined, c: V3, rx: number, ry: number, rz = rx) => {
  if (schnee) b.add(ball, [c[0], c[1] + ry * 0.5, c[2]], schnee, undefined, [0, 0, 0], [rx * 0.97, ry * 0.68, rz * 0.97]);
};
/** Laub im Winter: mit Schnee bestäubt (Farbe zum Schnee hin gemischt, Anteil k). */
const bereift = (farbe: string, schnee: string | undefined, k: number) =>
  schnee ? "#" + new THREE.Color(farbe).lerp(new THREE.Color(schnee), k).getHexString() : farbe;

/** Birke: schlanker weisser Stamm mit schwarzen Strichen bis in die Krone, drei, vier Äste, lockere hellgrüne Krone aus kleinen
 *  Ballen entlang des leicht schrägen Stamms. `schnee` = Farbe der Schneekappen (verschneite Version). */
export const birkeTeile = (b: B, np: NordPalette, at: V3, h = 8, seed = 1, schnee?: string) => {
  const r = new Rng(seed * 7 + 1), lean = r.range(-5, 5), st = h * 0.9, dick = 0.09 + h * 0.012, rinde = birkenrinde(np.birkeRinde, np.birkeMal);
  const k = Math.sin((lean * Math.PI) / 180);
  const achse = (y: number) => at[0] - k * (y - st / 2);   // x des Stamms in Höhe y (Drehung um die Stamm-Mitte)
  b.add(new THREE.CylinderGeometry(dick * 0.35, dick, st, 9), [at[0], at[1] + st / 2, at[2]], "#ffffff", rinde, [0, 0, lean]);
  for (let i = 0; i < 4; i++) {   // Äste schräg nach oben in die Krone
    const y = h * (0.5 + i * 0.09), a = (i * 2.1 + r.range(-0.3, 0.3)), l = h * 0.16;
    b.add(new THREE.CylinderGeometry(dick * 0.18, dick * 0.3, l, 6), [achse(y) + Math.cos(a) * l * 0.3, at[1] + y + l * 0.35, at[2] + Math.sin(a) * l * 0.3], "#ffffff", rinde, [0, -(a * 180) / Math.PI, 55]);
  }
  const gesetzt: [V3, number][] = [];
  for (let i = 0, n = r.int(13, 17); i < n; i++) {
    const y = h * r.range(0.5, 0.97), rr = h * r.range(0.055, 0.085), a = r.range(0, Math.PI * 2), d = h * r.range(0.03, 0.14) * (1.1 - (y / h - 0.5));
    const c: V3 = [achse(y) + Math.cos(a) * d, at[1] + y, at[2] + Math.sin(a) * d], farbe = bereift(shade(r.pick(np.birkeLaub), r.range(0.92, 1.08)), schnee, 0.55);
    // fast deckungsgleiche Ballen (Mitte < 0,3 r entfernt, ähnlich gross) weglassen – sonst flackern ihre Flächen
    if (gesetzt.some(([q, qr]) => Math.hypot(q[0] - c[0], q[1] - c[1], q[2] - c[2]) < 0.3 * rr && Math.abs(qr - rr) < 0.15 * rr)) continue;
    gesetzt.push([c, rr]);
    b.add(ball, c, farbe, undefined, [0, 0, 0], [rr, rr * 1.15, rr]);
    kappe(b, schnee, c, rr, rr * 1.15);
  }
};
/** Kiefer: hoher rotbrauner Stamm, oben flache dunkelgrüne Kronen-Polster (Schirm), zwei, drei Äste. */
export const kieferTeile = (b: B, np: NordPalette, at: V3, h = 12, seed = 1, schnee?: string) => {
  const r = new Rng(seed * 11 + 3), st = h * 0.82, dick = 0.14 + h * 0.016;
  b.add(new THREE.CylinderGeometry(dick * 0.6, dick, st, 9), [at[0], at[1] + st / 2, at[2]], np.kieferRinde);
  for (let i = 0, n = r.int(3, 5); i < n; i++) {
    const y = h * r.range(0.6, 0.97), a = r.range(0, Math.PI * 2), d = h * r.range(0, 0.16), rx = h * r.range(0.14, 0.22);
    const x = at[0] + Math.cos(a) * d, z = at[2] + Math.sin(a) * d;
    if (d > 0.5) b.add(new THREE.CylinderGeometry(dick * 0.25, dick * 0.35, d * 1.15, 6), [at[0] + Math.cos(a) * d / 2, at[1] + y - 0.3, at[2] + Math.sin(a) * d / 2], np.kieferRinde, undefined, [0, -(a * 180) / Math.PI, 70]);
    const dreh = r.range(0, 90);
    b.add(ball, [x, at[1] + y, z], shade(r.pick(np.kiefer), r.range(0.9, 1.1)), undefined, [0, dreh, 0], [rx, rx * 0.42, rx * 0.85]);
    if (schnee) b.add(ball, [x, at[1] + y + rx * 0.24, z], schnee, undefined, [0, dreh, 0], [rx * 0.88, rx * 0.22, rx * 0.74]);
  }
};
/** Wacholder: schmale dunkle Säule aus zwei bis drei gespitzten Ballen (1,5–3,5 m). */
export const wacholderTeile = (b: B, np: NordPalette, at: V3, h = 2.5, seed = 1, schnee?: string) => {
  const r = new Rng(seed * 13 + 5), c = r.pick(np.wacholder);
  b.add(ball, [at[0], at[1] + h * 0.38, at[2]], shade(c, 0.95), undefined, [0, 0, 0], [h * 0.22, h * 0.4, h * 0.22]);
  const dx = r.range(-0.08, 0.08);
  b.add(new THREE.ConeGeometry(h * 0.17, h * 0.55, 9), [at[0] + dx, at[1] + h * 0.72, at[2]], shade(c, 1.05));
  if (schnee) {   // Schnee auf der Spitze und auf der Schulter
    b.add(new THREE.ConeGeometry(h * 0.1, h * 0.26, 9), [at[0] + dx, at[1] + h * 0.89, at[2]], schnee);
    kappe(b, schnee, [at[0], at[1] + h * 0.38, at[2]], h * 0.22, h * 0.4);
  }
};
/** Eberesche: kleiner Baum mit runder hellgrüner Krone und roten Beerendolden. */
export const ebereschenTeile = (b: B, np: NordPalette, at: V3, h = 6, seed = 1, schnee?: string) => {
  const r = new Rng(seed * 17 + 7), st = h * 0.45, r0 = h * 0.27, rinde = shade(np.kieferRinde, 0.62), dick = 0.14 + h * 0.014;
  // Stamm reicht bis in den Mittelballen der Krone (sonst schwebt sie), drei Äste tragen die äusseren Ballen
  b.add(new THREE.CylinderGeometry(dick * 0.55, dick, st + r0 * 0.6, 9), [at[0], at[1] + (st + r0 * 0.6) / 2, at[2]], rinde);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + 0.4, l = r0 * 0.6;
    b.add(new THREE.CylinderGeometry(dick * 0.22, dick * 0.4, l, 6), [at[0] + Math.cos(a) * l * 0.25, at[1] + st + r0 * 0.35 + l * 0.3, at[2] + Math.sin(a) * l * 0.25], rinde, undefined, [0, -(a * 180) / Math.PI, 50]);
  }
  for (let i = 0, n = r.int(8, 10); i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r.range(-0.3, 0.3), d = i ? r0 * r.range(0.5, 0.8) : 0, rr = r0 * (i ? r.range(0.45, 0.6) : 0.8);
    const cx = at[0] + Math.cos(a) * d, cy = at[1] + st + r0 * (i ? r.range(0.55, 1.25) : 0.55), cz = at[2] + Math.sin(a) * d;
    b.add(ball, [cx, cy, cz], bereift(shade(r.pick(np.eberesche), r.range(0.92, 1.08)), schnee, 0.4), undefined, [0, 0, 0], [rr, rr * 0.9, rr]);
    kappe(b, schnee, [cx, cy, cz], rr, rr * 0.9);
    for (let k = 0; k < 4; k++) {   // Beerendolde auf der Kronen-Oberfläche (zur Seite und nach oben)
      const u = r.range(0, Math.PI * 2), v = r.range(0.1, 1.1), bx = cx + Math.cos(u) * Math.cos(v) * rr * 1.04, by = cy + Math.sin(v) * rr * 0.95, bz = cz + Math.sin(u) * Math.cos(v) * rr * 1.04;
      for (let j = 0; j < 7; j++) b.add(ballGrob, [bx + r.range(-0.16, 0.16), by + r.range(-0.12, 0.05), bz + r.range(-0.16, 0.16)], np.beeren, undefined, [0, 0, 0], [0.075, 0.075, 0.075]);
    }
  }
};
/** Findling: grosser runder Stein, halb im Boden, mit hellem Moos-Tupfen oben. */
export const findlingTeile = (b: B, np: NordPalette, at: V3, s = 1.6, seed = 1, schnee?: string) => {
  const r = new Rng(seed * 19 + 9);
  b.add(ballGrob, [at[0], at[1] + s * 0.25, at[2]], "#ffffff", rock(np.findling), [r.range(0, 40), r.range(0, 180), r.range(0, 30)], [s * r.range(1.1, 1.4), s * r.range(0.7, 0.9), s]);
  if (schnee) b.add(ball, [at[0] + s * 0.05, at[1] + s * 0.82, at[2] - s * 0.05], schnee, undefined, [0, 0, 0], [s * 0.8, s * 0.2, s * 0.65]);   // Schneehaube
  else b.add(ball, [at[0] + s * 0.1, at[1] + s * 0.8, at[2] - s * 0.1], shade(np.grass, 0.85), undefined, [0, 0, 0], [s * 0.45, s * 0.1, s * 0.4]);
};

/** Ein einzelner Baum als eigene Gruppe (Sichtlinien-Teilnehmer, für Szenen-Requisiten). */
export const nordBaum = (kit: Kit, np: NordPalette, art: "birke" | "kiefer" | "wacholder" | "eberesche" | "findling", at: V3, h?: number, seed = 1, schnee?: string) => {
  const b = kit.batch(), o: V3 = [0, 0, 0];
  if (art === "birke") birkeTeile(b, np, o, h ?? 8, seed, schnee);
  else if (art === "kiefer") kieferTeile(b, np, o, h ?? 12, seed, schnee);
  else if (art === "wacholder") wacholderTeile(b, np, o, h ?? 2.5, seed, schnee);
  else if (art === "eberesche") ebereschenTeile(b, np, o, h ?? 6, seed, schnee);
  else findlingTeile(b, np, o, h ?? 1.6, seed, schnee);
  const g = b.build(art); g.position.set(...at); g.userData.occluder = art !== "wacholder";
  return g;
};

// ---------------- Wiese und Strand ----------------
/** Wiese: Grasbüschel, Heidekraut-Polster und Wildblumen (ohne Tusche, wie gemalt; Kulisse – fehlt in der Prüf-Ebene "karten"). */
const wiese = (kit: Kit, np: NordPalette, frei: (x: number, z: number) => boolean, seed: number, winter = false) => {
  const b = kit.batch(), r = new Rng(seed);
  const halm = new THREE.ConeGeometry(0.075, 1, 5), bluete = new THREE.IcosahedronGeometry(1, 0);
  const TOENE = [0.9, 1, 1.1, 1.2, 1.3].map((k) => shade(winter ? np.winterGras : np.grass, k)), HEIDE = np.heather;
  for (let i = 0; i < 9000; i++) {
    const x = r.range(-125, 125), z = r.range(-60, -0.5);
    if (!frei(x, z) || schicht(x, z) !== "gras") continue;
    if (winter && r.next() < 0.75) continue;   // im Winter nur vereinzelt trockene Halme
    const y = terrainAt(x, z) - 0.03, roll = winter ? 0.5 : r.next(), rot = r.range(0, 180);
    if (roll < 0.22) {   // Heidekraut: Polster aus kleinen lila Ballen
      const c = r.pick(HEIDE), s = r.range(0.2, 0.35);
      b.add(ballGrob, [x, y + s * 0.15, z], shade(np.grass, 0.78), undefined, [0, rot, 0], [s * 0.9, s * 0.35, s * 0.75]);   // grüner Polster
      for (let k = 0; k < 7; k++) b.add(ballGrob, [x + r.range(-s, s) * 0.8, y + s * 0.3 + r.range(0, 0.12), z + r.range(-s, s) * 0.6], shade(c, r.range(0.9, 1.18)), undefined, [0, rot, 0], [s * 0.22, s * 0.3, s * 0.22]);
      continue;
    }
    const hgt = r.range(0.25, 0.48), ti = Math.floor(r.next() * 4);
    for (let k = 0; k < 3; k++) {
      const a = (k - 1) * 0.35 + r.range(-0.1, 0.1), hh = hgt * (k === 1 ? 1 : 0.8);
      b.add(halm, [x + Math.sin(a) * hh * 0.25 + (k - 1) * 0.04, y + hh / 2, z], TOENE[k === 1 ? ti + 1 : ti], undefined, [0, rot, THREE.MathUtils.radToDeg(-a)], [1, hh, 1]);
    }
    if (roll > 0.82) {   // Wildblume
      const by = y + hgt + 0.06, fc = r.pick(np.flowers);
      b.add(halm, [x + 0.1, y + (hgt + 0.06) / 2, z + 0.03], TOENE[1], undefined, [0, 0, 0], [0.4, hgt + 0.06, 0.4]);
      b.add(bluete, [x + 0.1, by, z + 0.03], fc, undefined, [0, rot, 0], [0.1, 0.08, 0.1]);
      b.add(bluete, [x + 0.1, by + 0.02, z + 0.03], "#ffd23a", undefined, [0, 0, 0], [0.04, 0.04, 0.04]);
    }
  }
  const g = b.build("wiese");
  g.traverse((o) => { o.layers.set(NOINK); (o as THREE.Mesh).castShadow = false; });
  g.userData.kulisse = true;
  return g;
};

/** Strand: Tang-Streifen an der Wasserlinie (flache dunkelgrüne/braune Bänder) und gebleichtes Treibholz. */
const strand = (kit: Kit, np: NordPalette, seed: number) => {
  const tang = kit.batch(), holz = kit.batch(), r = new Rng(seed);
  for (let x = -190; x < 190; x += r.range(0.6, 1.6)) for (let k = 0; k < 3; k++) {
    const xx = x + r.range(-0.4, 0.4), z = r.range(6.8, 8.6), y = terrainAt(xx, z) + 0.02;
    tang.add(ball, [xx, y, z], r.pick(np.tang), undefined, [0, r.range(-40, 40), 0], [r.range(0.25, 0.6), 0.04, r.range(0.05, 0.12)]);
  }
  for (let i = 0; i < 26; i++) {
    const x = r.range(-180, 180), z = r.range(2, 6), y = terrainAt(x, z), l = r.range(1.4, 3.6), d = r.range(0.1, 0.22), rot = r.range(0, 180);
    holz.add(new THREE.CylinderGeometry(d * 0.8, d, l, 8), [x, y + d * 0.7, z], r.next() < 0.5 ? np.drift : np.driftDark, undefined, [0, rot, 90]);
    if (r.next() < 0.6) {   // Aststummel
      const a = (rot * Math.PI) / 180, k = r.range(-0.3, 0.3) * l;
      holz.add(new THREE.CylinderGeometry(d * 0.3, d * 0.45, l * 0.3, 6), [x + Math.cos(a) * k, y + d * 1.2, z - Math.sin(a) * k], np.drift, undefined, [0, rot, 40]);
    }
  }
  const g = new THREE.Group(); g.name = "strand";
  const t = tang.build("tang"); t.traverse((o) => { (o as THREE.Mesh).castShadow = false; }); g.add(t, holz.build("treibholz"));
  return g;
};

/** Nordische Wolke: flach und breit, zwei Lagen (unten lang gezogen, oben einzelne Ballen); oben hell, unten bläulich. */
export const wolkeNord = (colors: CloudColors, at: V3, scale = 1, seed = 1) => {
  const r = new Rng(seed + 909);
  const mat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: { uLit: { value: new THREE.Color(colors.lit) }, uMid: { value: new THREE.Color(colors.mid) }, uShade: { value: new THREE.Color(colors.shade) } },
    vertexShader: `varying float vUp; void main(){ vUp = normalize(mat3(modelMatrix) * normal).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uLit; uniform vec3 uMid; uniform vec3 uShade; varying float vUp;
      void main(){ vec3 c = vUp > 0.05 ? mix(uMid, uLit, smoothstep(0.05, 0.5, vUp)) : mix(uShade, uMid, smoothstep(-0.7, 0.05, vUp)); gl_FragColor = vec4(c, 1.0); }`,
  });
  const g = new THREE.Group(); g.name = "wolke";
  const n = r.int(6, 9);
  for (let i = 0; i < n; i++) {   // untere Lage: lange flache Ballen
    const m = new THREE.Mesh(ball, mat), rr = scale * r.range(5, 8);
    m.scale.set(rr * 2.4, rr * 0.45, rr * 1.2);
    m.position.set((i - n / 2) * scale * 9 + r.range(-3, 3) * scale, r.range(-1, 1) * scale, r.range(-4, 4) * scale);
    m.layers.set(NOINK); g.add(m);
  }
  for (let i = 0; i < 3; i++) {   // obere Lage: einzelne Quellen
    const m = new THREE.Mesh(ball, mat), rr = scale * r.range(4, 6.5);
    m.scale.set(rr * 1.3, rr * 0.8, rr);
    m.position.set(r.range(-n * 3, n * 3) * scale, rr * 0.5, r.range(-3, 3) * scale);
    m.layers.set(NOINK); g.add(m);
  }
  g.position.set(...at);
  return g;
};

/** Schneefall: Flocken in einem Würfel um die Kamera, fest in der Welt (die Kamera fährt durch sie hindurch), fallen langsam
 *  und pendeln; jedes Bild nur aus Zeit und Kamera-Lage gerechnet. Ohne Tusche, Kulisse. */
const schneefall = (farbe: string, n = 3600, kante = 36) => {
  const r = new Rng(77), base = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { base[i * 4] = r.range(0, kante); base[i * 4 + 1] = r.range(0, kante); base[i * 4 + 2] = r.range(0, kante); base[i * 4 + 3] = r.range(0, 6.28); }
  const geo = new THREE.BufferGeometry(), pos = new Float32Array(n * 3);
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const rund = document.createElement("canvas"); rund.width = rund.height = 32;   // runde Flocke statt Quadrat
  const g2 = rund.getContext("2d")!; g2.fillStyle = "#ffffff"; g2.beginPath(); g2.arc(16, 16, 14, 0, Math.PI * 2); g2.fill();
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: farbe, size: 0.12, sizeAttenuation: true, fog: true, map: new THREE.CanvasTexture(rund), alphaTest: 0.5 }));
  pts.name = "schneefall"; pts.frustumCulled = false; pts.layers.set(NOINK); pts.userData.kulisse = true;
  const wrap = (v: number, c: number) => c - kante / 2 + ((((v - (c - kante / 2)) % kante) + kante) % kante);
  const tick = (t: number, cam: THREE.Vector3) => {
    for (let i = 0; i < n; i++) {
      const ph = base[i * 4 + 3];
      pos[i * 3] = wrap(base[i * 4] + 0.35 * Math.sin(t * 0.9 + ph) + t * 0.4, cam.x);
      pos[i * 3 + 1] = wrap(base[i * 4 + 1] - t * (0.9 + 0.3 * Math.sin(ph)), cam.y);
      pos[i * 3 + 2] = wrap(base[i * 4 + 2] + 0.35 * Math.cos(t * 0.7 + ph), cam.z);
    }
    geo.getAttribute("position").needsUpdate = true;
  };
  return { obj: pts, tick };
};

/** Ort der Nord-Welt: Boden, Totale, Halbnah (Kamera-Vorschläge). */
export type NordPlace = { at: V3; wide: { pos: V3; look: V3 }; medium: { pos: V3; look: V3 }; note: string };
export const NORD_PLACES: Record<string, NordPlace> = {
  langschiff: { at: [74.6, 0, 14], note: "Langschiff am Landesteg (Bug nach −z, Drachenkopf, Schilde, Segel gerefft)",
    wide: { pos: [86, 4, 2], look: [74, 2, 15] }, medium: { pos: [70.5, 1.9, 5], look: [74, 1.5, 9] } },
  knorr: { at: [65.2, 0, 15], note: "Handelsschiff (Knorr) am Landesteg mit Ladung",
    wide: { pos: [56, 4.5, 3], look: [65, 1.5, 15] }, medium: { pos: [61, 2.6, 7], look: [65, 1.2, 12] } },
  dorf: { at: [0, 0, -14], note: "Dorf: drei Langhäuser mit Grassoden-Dach und Drachenköpfen, Grubenhaus, Speicher, Wege, Zäune, Palisade",
    wide: { pos: [8, 6, 14], look: [0, 3, -22] }, medium: { pos: [3, 1.7, -11], look: [0, 1.6, -20.5] } },
  langhaus: { at: [0, 0, -23.4], note: "Grosses Langhaus (26 m): Tür mit bemaltem Rahmen bei z −23,4, Drachenköpfe an beiden Giebeln",
    wide: { pos: [-14, 3, -7], look: [-2, 4, -24] }, medium: { pos: [2.5, 1.7, -16], look: [0, 1.7, -22] } },
  "langhaus-rot": { at: [-38, 0, -11], note: "Mittleres Langhaus (20 m, rot gestrichene Bohlen), davor Grubenhaus und Flechtzaun",
    wide: { pos: [-24, 3, 4], look: [-36, 2.6, -13] }, medium: { pos: [-35, 1.7, -4.5], look: [-38, 1.8, -10.5] } },
  "langhaus-lehm": { at: [36, 0, -13], note: "Kleines Langhaus (15 m, Flechtwerk mit Lehm), davor Speicher auf Pfosten und Flechtzaun",
    wide: { pos: [22, 3, 4], look: [34, 2.6, -14] }, medium: { pos: [34, 1.7, -6.5], look: [36, 1.8, -12.6] } },
  "langhaus-innen": { at: [0, 0, -28], note: "Im grossen Langhaus (nord: { innen: true }): Langfeuer, Schlafbänke mit Decken und Fellen, Pfostenreihen",
    wide: { pos: [-11, 2, -26.6], look: [8, 1.2, -28.4] }, medium: { pos: [-3.5, 1.6, -26.4], look: [1.5, 0.7, -29] } },
  schmiede: { at: [-68, 0, -10], note: "Schmiede-Unterstand mit Grassoden-Dach am Querweg",
    wide: { pos: [-59, 3, 3], look: [-68, 2, -10] }, medium: { pos: [-66, 1.6, -3], look: [-68, 1.2, -8.5] } },
  hafen: { at: [70, 0, 8], note: "Hafen: Landesteg ins Wasser (x 70, z 1…26) mit Langschiff (x 74,6) und Knorr (x 65,2), Bootsschuppen (95, −5)",
    wide: { pos: [48, 4, 1], look: [76, 2, 18] }, medium: { pos: [65.5, 1.8, 3], look: [70, 0.8, 12] } },
  strand: { at: [-28, 0, 5], note: "Kiesstrand mit Tang und Treibholz, ein Langschiff auf den Kies gezogen (−30, 7), Blick aufs Wasser",
    wide: { pos: [-30, 3.2, -7], look: [-28, 0, 20] }, medium: { pos: [-26, 1.6, 1], look: [-29, 0, 6] } },
  grabhuegel: { at: [105, 0, -36], note: "Grabhügel (Radius 9 m, 4 m hoch) mit Steinschiff daneben (78, −42)",
    wide: { pos: [114, 3.2, -12], look: [104, 2.5, -24.5] }, medium: { pos: [108, 1.7, -21], look: [105, 2, -26] } },
  thingplatz: { at: [-100, 0, -30], note: "Thingplatz: Ring aus 12 Steinen, Sprecherstein, Bänke aus Stämmen",
    wide: { pos: [-92, 4, -12], look: [-100, 1, -30] }, medium: { pos: [-95.5, 1.7, -19.5], look: [-100, 1, -27] } },
  fjord: { at: [0, 0, 4], note: "Kiesstrand am Fjord, Blick übers Wasser zur Felswand mit Schnee",
    wide: { pos: [0, 3.2, 1], look: [0, 18, 120] }, medium: { pos: [-6, 1.6, 2], look: [-2, 0.6, 9] } },
  wiese: { at: [0, 0, -20], note: "Wiese mit Heidekraut und Wildblumen, dahinter Hügel mit Kiefern und die Berge",
    wide: { pos: [0, 4, 6], look: [0, 16, -150] }, medium: { pos: [8, 1.6, -8], look: [8, 0.9, -18] } },
};

/** Bauten des Dorfs: Art, Mitte [x, z], Drehung (Grad um y). */
const HAEUSER: { art: LanghausArt; x: number; z: number; dreh: number }[] = [
  { art: "gross", x: 0, z: -28, dreh: 0 }, { art: "mittel", x: -38, z: -15, dreh: 8 }, { art: "klein", x: 36, z: -17, dreh: -8 },
];
/** Grundrisse (Mitte, halbe Länge/Breite inkl. Rand, Drehung) – dort keine Gräser, Steine, Bäume. */
const GRUNDRISSE: [number, number, number, number, number][] = [
  ...HAEUSER.map((h): [number, number, number, number, number] => { const m = langhausMasse(h.art); return [h.x, h.z, m.l / 2 + 1.6, m.w / 2 + m.bauch + 1.8, h.dreh]; }),
  [-16, -5, 3, 2.6, 0], [17, -6, 2.4, 2.8, 0], [-68, -10, 4.2, 3.4, 0], [84, -1.8, 4.5, 1, 0], [57, -1.2, 2, 0.6, 0], [10, -12, 1.2, 1.2, 0], [95, -5, 3.8, 8.4, 0], [105, -36, 10, 10, 0], [78, -42, 9.5, 3.5, 0], [-100, -30, 8, 8, 0],
];
export const nordFrei = (x: number, z: number) => !GRUNDRISSE.some(([cx, cz, hx, hz, d]) => {
  const a = (d * Math.PI) / 180, dx = x - cx, dz = z - cz, u = dx * Math.cos(a) - dz * Math.sin(a), v = dx * Math.sin(a) + dz * Math.cos(a);
  return Math.abs(u) < hx && Math.abs(v) < hz;
}) && !aufWeg(x, z);

export const nord = (kit: Kit, look: NordLook, seed = 1, opt: NordOptions = {}, start = 0) => {
  const np = look.nord;
  const root = new THREE.Group(); root.name = "nord";
  const leben: Lebendig[] = [];
  const lebt = (l: Lebendig) => { root.add(l.obj); leben.push(l); return l; };
  const r = new Rng(seed * 53), winter = !!opt.winter, sn = winter ? np.snow : undefined, wolken = winter ? np.winterWolke : np.cloud;

  const dorf = opt.dorf !== false;
  dorfAn = dorf;
  root.add(gelaende(kit, np, winter));
  const fjord = water(np.water, [700, 160], [0, NORD_WATER_Y, 88], look.sunColor);
  root.add(fjord.mesh);
  root.add(wiese(kit, np, dorf ? nordFrei : () => true, seed * 7, winter));
  root.add(strand(kit, np, seed * 9));

  // Wald auf den Hügeln (ein Batch, kein Sichtlinien-Teilnehmer) und einzelne Bäume am Rand der Wiese
  const wald = kit.batch();
  const setz = (x: number, z: number) => { const y = terrainAt(x, z); return schicht(x, z) === "gras" || schicht(x, z) === "fels" ? y : null; };
  for (let i = 0; i < 260; i++) {
    const x = r.range(-200, 200), z = r.range(-115, -48), y = setz(x, z);
    if (y === null || y > 22) continue;
    const k = r.next();
    if (k < 0.55) kieferTeile(wald, np, [x, y - 0.1, z], r.range(9, 15), i, sn);
    else if (k < 0.85) birkeTeile(wald, np, [x, y - 0.1, z], r.range(7, 11), i, sn);
    else wacholderTeile(wald, np, [x, y - 0.05, z], r.range(1.8, 3.4), i, sn);
  }
  for (let i = 0; i < 40; i++) {   // Findlinge auf Wiese, Hügeln und Strand
    const x = r.range(-190, 190), z = r.range(-90, 5), y = terrainAt(x, z);
    if ((Math.abs(x) < 45 && z > -40) || (dorf && !nordFrei(x, z))) continue;   // Dorfplatz und Bauten frei
    findlingTeile(wald, np, [x, y - 0.3, z], r.range(0.8, 2.4), i, sn);
  }
  root.add(wald.build("wald"));
  const rand: [string, number, number, number][] = [   // Bäume am Rand der Wiese (einzeln, Sichtlinien-Teilnehmer)
    ["birke", -58, -28, 9], ["birke", -64, -33, 8], ["birke", -52, -36, 10], ["eberesche", -40, -40, 6], ["wacholder", -46, -24, 2.6],
    ["birke", 55, -30, 9], ["kiefer", 66, -38, 13], ["eberesche", 48, -41, 5.5], ["wacholder", 60, -22, 2.2], ["wacholder", 40, -27, 3],
    ["birke", -88, -18, 8.5], ["kiefer", 92, -16, 12], ["eberesche", 80, -8, 6],
  ];
  rand.forEach(([art, x, z, h], i) => root.add(nordBaum(kit, np, art as "birke", [x, terrainAt(x, z) - 0.05, z], h, 100 + i, sn)));

  // Dorf, Hafen, Schmiede, Grabhügel, Thingplatz
  if (dorf) {
    const setzBau = (o: THREE.Object3D, x: number, z: number, dreh = 0, name?: string) => {
      o.position.set(x, terrainAt(x, z), z); o.rotation.y = (dreh * Math.PI) / 180; if (name) o.name = name; root.add(o); return o;
    };
    HAEUSER.forEach((h, i) => {
      setzBau(langhaus(kit, np, h.art, i + 1, opt.innen === true && h.art === "gross"), h.x, h.z, h.dreh, `langhaus-${h.art}`);
      const m = langhausMasse(h.art), a = (h.dreh * Math.PI) / 180, ox = m.l * 0.22;   // Rauch aus dem Rauchloch am First
      lebt(rauchsaeule(kit, [h.x + Math.cos(a) * ox, m.first + 0.3, h.z - Math.sin(a) * ox], { hoehe: 10, dicke: 0.6, wind: [3, 1], n: 8, tempo: 0.1, farbe: np.rauch, phase: i * 0.3 }));
    });
    lebt(rauchsaeule(kit, [0, 0.12, -28], { feuer: 1.1, hoehe: 5.5, dicke: 0.35, wind: [0.4, 0], n: 6, tempo: 0.14, farbe: np.rauch, phase: 0.7 }));   // Langfeuer im grossen Haus
    setzBau(grubenhaus(kit, np, 1), -16, -5, 0, "grubenhaus");
    setzBau(speicher(kit, np), 17, -6, 0, "speicher");
    setzBau(schmiedeDach(kit, np), -68, -10, 0, "schmiede");
    setzBau(bootsschuppen(kit, np), 95, -5, 0, "bootsschuppen");
    root.add(landesteg(kit, np, 70, 1, 26));
    setzBau(grabhuegel(kit, np, 9, 4), 105, -36, 0, "grabhuegel");
    setzBau(steinschiff(kit, np, 17), 78, -42, 0, "steinschiff");
    setzBau(thingplatz(kit, np, 7), -100, -30, 0, "thingplatz");
    root.add(flechtzaun(kit, np, [[-52, -6], [-52, -24], [-30, -27], [-24, -24]], terrainAt));   // Garten beim mittleren Haus
    root.add(flechtzaun(kit, np, [[24, -5], [24, -10], [48, -10], [50, -24]], terrainAt));
    root.add(flechtzaun(kit, np, [[8, -3], [12, -3], [12, -10], [22, -10]], terrainAt));
    root.add(palisade(kit, np, [[-62, -44], [-30, -46], [0, -46.5], [30, -46], [62, -44]], terrainAt));
  }

  // Ausstattung des Dorfs: Requisiten an ihren Orten, Tiere auf der Wiese, Feuer, Fahnen, Raben
  if (dorf) {
    const y = (x: number, z: number): V3 => [x, terrainAt(x, z), z];
    const leb = (l: Lebendig) => lebt(l), st = (o: THREE.Object3D) => root.add(o);
    // Schmiede
    leb(esse(kit, np, y(-68, -11.2), 0, 0.3)); st(amboss(kit, np, y(-66.2, -9.4), -20)); st(blasebalg(kit, np, y(-70.2, -11), 0));
    st(werkbank(kit, np, y(-70.5, -7.6), 90)); st(schildstaender(kit, np, y(-63.4, -12.6), -10));
    // vor dem grossen Langhaus
    st(vorraete(kit, np, y(-6, -20.6), 10, 1)); leb(kessel(kit, np, y(6.5, -18.5), 0.6)); st(webstuhl(kit, np, y(-10, -21), 5));
    st(schildstaender(kit, np, y(10.5, -20.4), -5)); st(speerstaender(kit, np, y(14.5, -20.6), -8));
    st(schnitzpfosten(kit, np, y(-2.6, -19.5), 0)); st(schnitzpfosten(kit, np, y(4, -19.5), 0));
    for (const x of [-1.9, 1.9]) leb(fackel(kit, y(x, -22.2), { h: 2.0, phase: x }));
    // Dorfplatz, Höfe
    leb(feuerstelle(kit, np, y(10, -12), { phase: 0.2 })); st(handmuehle(kit, np, y(-31, -6.2), 20)); st(hackklotz(kit, np, y(-25, -3.8), 0));
    st(holzstapel(kit, look.palette, y(-27.5, -2.8), 10, 3)); st(vorraete(kit, np, y(30, -9.2), -20, 2)); st(werkbank(kit, np, y(42, -9.6), 0));
    st(huehner(kit, look.palette, y(-20, -14), 5, 4)); st(huehner(kit, look.palette, y(22, -13), 4, 5));
    st(runensteinBau(kit, np, y(5, -2.4), 0)); leb(rabe(kit, np, [5, terrainAt(5, -2.4) + 2.6, -2.4], -30, 0.4));
    // Hafen und Strand
    st(stockfisch(kit, np, y(82, -1.8), 0, 1)); st(stockfisch(kit, np, y(86.5, -1.8), 0, 2)); st(netzgestell(kit, np, y(57, -1.2), 8));
    st(vorraete(kit, np, y(66.4, -1.6), 0, 3));
    for (const [x, z, f] of [[68.4, 0.6, 0], [-12, -21, 1], [-94, -22.5, 2], [-106, -22.5, 0]] as const) leb(rabenfahneBau(kit, np, y(x, z), np.fahne[f], { turn: 200, phase: x * 0.1 }));
    // Thingplatz: Fackeln, Rabe auf dem Sprecherstein
    for (const [x, z] of [[-93.5, -26], [-106.5, -26]] as const) leb(fackel(kit, y(x, z), { h: 2.2, phase: x }));
    leb(rabe(kit, np, [-100, terrainAt(-100, -30) + 0.45, -30], 120, 1.1));
    // Tiere: Schafe und Ziegen auf der Wiese
    ([[28, -34, 20], [31, -36.5, 200], [25, -37, 70], [33, -33, -40], [-74, -36, 160], [-77, -33, 30], [-71, -32.5, -80]] as const).forEach(([x, z, t], i) => leb(schaf(kit, np, y(x, z), t, i * 0.9)));
    ([[52, -4.5, 160], [54.5, -6.5, 20], [57, -4, -60]] as const).forEach(([x, z, t], i) => leb(ziege(kit, np, y(x, z), t, i * 1.3, i + 1)));
    lebt(voegel([10, 24, -40], { n: 5, radius: 14, tempo: 0.07, farbe: np.rabe, seed: 9, groesse: 1.3 }));   // Raben kreisen über dem Dorf
  }

  // Schiffe: am Landesteg ein Langschiff und eine Knorr, eins auf den Strand gezogen, eins segelt, eins rudert auf dem Fjord
  const smooth01 = (v: number) => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t); };
  const schiffe: { l: ReturnType<typeof schiff>; d: SchiffDaten }[] = [];
  const setzSchiff = (d: SchiffDaten, i: number) => {
    const l = schiff(kit, np, d.art, d.modus ?? "liegen", { streifen: d.streifen, phase: i * 1.7, seed: i + 1 });
    const strandY = (d.modus === "strand") ? terrainAt(d.at[0], d.at[1]) + (d.art === "knorr" ? 1.0 : 0.75) : NORD_WATER_Y;
    const hull = new THREE.Group(); hull.add(l.obj); hull.position.set(d.at[0], strandY, d.at[1]); hull.rotation.y = THREE.MathUtils.degToRad(d.turn ?? 0);
    hull.name = `schiff-${d.art}-${i}`; root.add(hull); leben.push(l); schiffe.push({ l: { ...l, obj: hull }, d });
  };
  const STANDARD: SchiffDaten[] = opt.hafen === false ? [] : [
    { art: "langschiff", at: [74.6, 14], turn: 90, modus: "liegen" }, { art: "knorr", at: [65.2, 15], turn: 90, modus: "liegen", streifen: np.bemalung[1] },
    { art: "langschiff", at: [-30, 7], turn: 100, modus: "strand", streifen: np.bemalung[3] },
    { art: "langschiff", at: [-40, 62], turn: 12, modus: "segeln" }, { art: "langschiff", at: [70, 95], turn: 192, modus: "rudern", streifen: np.bemalung[1] },
  ];
  [...STANDARD, ...(opt.schiffe ?? [])].forEach((d, i) => setzSchiff(d, i));

  // Wolken: tief an den Bergen und hoch rundum (in jedem Bild Wolken am Himmel)
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + r.range(-0.2, 0.2), d = r.range(230, 300);
    root.add(wolkeNord(wolken, [Math.cos(a) * d, r.range(80, 120), Math.sin(a) * d], r.range(1.3, 1.9), i + 1));
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + r.range(-0.15, 0.15), d = r.range(200, 290);
    root.add(wolkeNord(wolken, [Math.cos(a) * d, r.range(130, 175), Math.sin(a) * d], r.range(1.8, 2.6), 40 + i));
  }
  for (const [x, y, z] of [[-140, 72, -190], [60, 80, -205], [160, 70, 175], [-80, 74, 175]] as const)   // Wolkenbänder an den Bergen
    root.add(wolkeNord(wolken, [x, y, z], 1.2, Math.round(x)));
  const flocken = winter && opt.schneefall !== false ? schneefall(np.snow) : null;
  if (flocken) root.add(flocken.obj);
  if (opt.moewen !== false && !winter) { lebt(voegel([0, 14, 30], { n: 7, radius: 16, tempo: 0.08, farbe: "#f4f2ec", seed: 5 })); lebt(voegel([-60, 18, 50], { n: 5, radius: 20, tempo: 0.07, farbe: "#f4f2ec", seed: 6 })); }

  const tick = (time: number, cam: THREE.Camera, sunDir?: THREE.Vector3) => {
    fjord.tick(time, cam, sunDir);
    for (const l of leben) l.tick(time);
    flocken?.tick(time, cam.position);
    const film = time + start;
    for (const { l, d } of schiffe) if (d.weg) {
      const u = smooth01((film - d.weg.t0) / (d.weg.t1 - d.weg.t0));
      l.obj.position.x = d.at[0] + (d.weg.nach[0] - d.at[0]) * u; l.obj.position.z = d.at[1] + (d.weg.nach[1] - d.at[1]) * u;
    }
  };
  return { root, tick, groundAt: nordGroundAt };
};
