// Herkunft: eigen (V-Video), geschrieben 2026-11-18, ohne Vorlage.
// Bauten der Wasserleitung (Römer-Wasser-Welt): Bogenwand (Arkade) als eine Form mit Bögen, offener Kanal (specus) mit
// fliessendem Wasser, dreistöckige Aquädukt-Brücke, lange Bogenreihe mit zwei Kanälen übereinander, Quellhaus, Tunnel im
// Querschnitt (Schächte, Haspel, Leiter, Öllampen), Siphon (Kopfbecken-Turm, Rohrbündel, Rohrbrücke), Klärbecken im Schnitt
// (trüb hinein, klar hinaus) und Wasserschloss (castellum divisorium) mit Fächer aus Bleirohren, Schiebern und Bronze-Düsen.
// Jeder Bau baut in lokalen Koordinaten; grosse Bauten sind `protect` (nie ausgeblendet, Hindernis für die Raum-Prüfung).
import * as THREE from "three";
import { Rng } from "../core/random";
import { Kit, archShape, extrude } from "./kit";
import type { V3 } from "../camera/rig";
import { blocks, brick, earth, erdschnitt, planks, rock, rubble, shade, slabs, tiles } from "./paint";
import { FlussUhr, becken, rinne, spritzer, tropfen, vorhang, type FlussFarben } from "./aqua-wasser";
import type { Lebendig } from "./leben";
import { flacker } from "./leben";
import type { RoemerPalette } from "./roemer";

export type AquaPalette = {
  wasser: FlussFarben; truebe: FlussFarben; klar: FlussFarben; kloake: FlussFarben; tiber: { near: string; mid: string; far: string }; see: { near: string; mid: string; far: string };
  tuff: string; tuffFuge: string; beton: string; ziegelwand: string; ziegelFuge: string; blei: string; bleiDunkel: string; bleiHell: string; sinter: string; schlamm: string;
  bronze: string; bronzeDunkel: string; kupferGruen: string; putzInnen: string[]; fresko: string; freskoGelb: string; freskoGruen: string; freskoBlau: string;
  mosaik: string[]; kacheln: string; kachelFuge: string; sand: string; schilf: string[]; stroh: string; lehm: string; flechtwerk: string;
  erdeSchnitt: string[]; felsSchnitt: string; muenze: string; rolle: string; rolleRand: string; regal: string; sirup: string; waesche: string[]; markise: string[];
  brot: string; glut: string; ofen: string; esel: string; eselHell: string; hund: string; taube: string; taubeHals: string;
  boot: string; bootRot: string; bootBlau: string; kernrohr: string; bohrkern: string[]; ruine: string; efeu: string[];
};
/** Werkzeug für die Bauten einer Zone: Baukasten, Farben, Wasser-Uhr, bewegte Teile sammeln, Teile in die Zone setzen. */
export type AquaCtx = { kit: Kit; ap: AquaPalette; rp: RoemerPalette; uhr: FlussUhr; lebt: (l: Lebendig) => Lebendig; st: <T extends THREE.Object3D>(o: T) => T; sun: string };

type B = ReturnType<Kit["batch"]>;
const ball = new THREE.IcosahedronGeometry(1, 2);
const ballGrob = new THREE.IcosahedronGeometry(1, 1);
const rad = THREE.MathUtils.degToRad;

/** Gruppe als festen Bau markieren (nie ausblenden, Hindernis für die Raum-Prüfung). */
export const fest = <T extends THREE.Object3D>(o: T, name?: string) => { if (name) o.name = name; o.userData.protect = true; o.userData.occluder = false; return o; };
/** Kleines Teil (Requisit): wird ausgeblendet, wenn es zwischen Kamera und Blickpunkt steht. */
export const klein = <T extends THREE.Object3D>(o: T, name?: string) => { if (name) o.name = name; o.userData.occluder = true; return o; };

const steinTex = (ap: AquaPalette) => blocks(ap.tuff, ap.tuffFuge);

// ---------------- Bogenwand ----------------
/** Bogenwand als Form (x nach rechts, y nach oben): von x0 bis x1, unten `base`, oben `top`, n Bögen, Bogenscheitel bei
 *  base + (top − base) · hoch; Pfeiler = (1 − weite) des Feldes. Ergebnis: in z (Dicke) mittig extrudiert. */
export const arkadeGeo = (x0: number, x1: number, base: number, top: number, n: number, dicke: number, o: { hoch?: number; weite?: number } = {}) => {
  const s = new THREE.Shape(), feld = (x1 - x0) / n, r = (feld * (o.weite ?? 0.64)) / 2, scheitel = base + (top - base) * (o.hoch ?? 0.82);
  const fuss = Math.max(base, scheitel - r);
  s.moveTo(x0, base);
  for (let i = 0; i < n; i++) {
    const cx = x0 + feld * (i + 0.5);
    s.lineTo(cx - r, base); s.lineTo(cx - r, fuss);
    s.absarc(cx, fuss, r, Math.PI, 0, true);
    s.lineTo(cx + r, base);
  }
  s.lineTo(x1, base); s.lineTo(x1, top); s.lineTo(x0, top); s.closePath();
  const g = extrude(s, dicke); g.translate(0, 0, -dicke / 2);
  return g;
};

/** Offener Kanal (specus) entlang x von x0 bis x1: Boden-Oberkante y, innen w breit, Wände h hoch und t dick; fliessendes Wasser
 *  (tiefe `tief`) von x0 nach x1. Mit `deckel` liegen Deckplatten darauf, ausser in den Lücken `offen` ([von, bis] in x). */
export const kanal = (b: B, c: AquaCtx, x0: number, x1: number, y: number, z: number, o: { w?: number; h?: number; t?: number; tief?: number; deckel?: boolean; offen?: [number, number][]; farben?: FlussFarben; richtung?: 1 | -1 } = {}) => {
  const w = o.w ?? 1.1, h = o.h ?? 1.3, t = o.t ?? 0.45, L = x1 - x0, mx = (x0 + x1) / 2, putz = c.ap.sinter;
  b.box([L, 0.3, w + 2 * t + 0.04], [mx, y - 0.15, z], "#ffffff", steinTex(c.ap));
  for (const s of [-1, 1]) b.box([L, h, t], [mx, y + h / 2, z + s * (w / 2 + t / 2)], "#ffffff", steinTex(c.ap));
  b.box([L, 0.06, w], [mx, y + 0.03, z], putz);   // Kalkputz am Boden (opus signinum)
  if (o.deckel) {
    const offen = o.offen ?? [];
    for (let x = x0; x < x1 - 0.01; x += 1.2) {
      const xm = x + 0.6; if (offen.some(([a, e]) => xm > a && xm < e)) continue;
      b.box([1.16, 0.22, w + 2 * t + 0.16], [xm, y + h + 0.11, z], shade(c.ap.tuff, 0.92 + ((x * 7) % 3) * 0.04));
    }
  }
  const tief = o.tief ?? 0.5, dir = o.richtung ?? 1;
  const wy = y + 0.06 + tief;
  const m = rinne(c.uhr, o.farben ?? c.ap.wasser, [dir > 0 ? x0 : x1, wy, z], [dir > 0 ? x1 : x0, wy, z], w - 0.02, { tempo: 1.8 });
  return { wasser: m, wy };
};

// ---------------- Aquädukt-Brücke (drei Stockwerke) ----------------
/** Dreistöckige Brücke über ein Tal (entlang x, Mitte x 0): unten 5 grosse Bögen (über dem Fluss), Mitte 11, oben 40 kleine, darauf
 *  der offene Kanal mit Wasser (fliesst nach +x). `tal` = Talboden-Höhe; Fuss-Mauern reichen tief ins Gelände. */
export const aquaeduktBruecke = (c: AquaCtx, tal = -40) => {
  const tex = steinTex(c.ap), g = new THREE.Group();
  const stock: [number, number, number, number, number, number][] = [   // x0, x1, unten, oben, n, dicke
    [-54, 54, tal, tal + 19, 5, 6.2], [-80, 80, tal + 19, tal + 36, 11, 4.6], [-110, 110, tal + 36, tal + 43.2, 40, 3.2],
  ];
  stock.forEach(([x0, x1, u, o, n, d], i) => {
    const m = c.kit.mesh(arkadeGeo(x0, x1, u, o, n, d, { hoch: i === 2 ? 0.78 : 0.86, weite: i === 0 ? 0.66 : 0.62 }), "#ffffff", tex); m.name = `bruecke-stock-${i + 1}`; g.add(m);
    const b = c.kit.batch();
    b.box([x1 - x0 + 0.6, 0.5, d + 0.5], [(x0 + x1) / 2, o - 0.25, 0], shade(c.ap.tuff, 0.9));   // Gesims
    if (i > 0) {   // Fuss ausserhalb des unteren Stockwerks bis tief ins Gelände
      const [ux0, ux1] = [stock[i - 1][0], stock[i - 1][1]];
      for (const [a, e] of [[x0, ux0], [ux1, x1]]) b.box([e - a, u - (tal - 6), d - 0.1], [(a + e) / 2, (u + tal - 6) / 2, 0], "#ffffff", tex);
    }
    if (i === 0) b.box([x1 - x0, 6, d + 0.3], [0, tal - 3, 0], "#ffffff", tex);
    g.add(b.build(`bruecke-gesims-${i + 1}`));
  });
  // Kanal oben und als Mauer weiter bis 250 m zu beiden Seiten
  const top = tal + 43.2, kb = c.kit.batch();
  for (const [a, e] of [[-250, -110], [110, 250]]) kb.box([e - a, top - (tal + 30), 3.0], [(a + e) / 2, (top + tal + 30) / 2, 0], "#ffffff", tex);
  const k = kanal(kb, c, -250, 250, top + 0.3, 0, { w: 1.2, h: 1.5, t: 0.5, tief: 0.62 });
  g.add(kb.build("bruecke-kanal")); g.add(k.wasser);
  return { obj: fest(g, "aquaedukt-bruecke"), kanalY: k.wy };
};

// ---------------- Bogenreihe über die Felder ----------------
/** Lange Bogenreihe entlang x (Höhe `h`), von x0 bis x1, mit Kanal oben; im Bereich `doppelt` zwei Kanäle übereinander (unten
 *  geschlossen mit Lichtfenstern, durch die man Wasser sieht, oben offen). Am Anfang (`bau` = x) endet sie als Baustelle. */
export const bogenreihe = (c: AquaCtx, x0: number, x1: number, h: number, doppelt: [number, number] = [x0, x0]) => {
  const tex = steinTex(c.ap), g = new THREE.Group(), feld = 6.4, n = Math.round((x1 - x0) / feld);
  const m = c.kit.mesh(arkadeGeo(x0, x0 + n * feld, -1, h, n, 2.6, { hoch: 0.8, weite: 0.66 }), "#ffffff", tex); m.name = "bogenreihe-boegen"; g.add(m);
  const xe = x0 + n * feld, b = c.kit.batch();
  b.box([xe - x0 + 0.4, 0.4, 3.0], [(x0 + xe) / 2, h - 0.2, 0], shade(c.ap.tuff, 0.9));
  // einfacher Kanal ausserhalb des Doppel-Bereichs
  const wasser: THREE.Object3D[] = [];
  for (const [a, e] of (doppelt[1] - doppelt[0] < 1 ? [[x0, xe]] : [[x0, doppelt[0]], [doppelt[1], xe]])) if (e - a > 1) wasser.push(kanal(b, c, a, e, h + 0.3, 0, { w: 1.0, h: 1.2, t: 0.4, tief: 0.5 }).wasser);
  // Doppel: unterer Kanal geschlossen (Fenster), oberer offen
  const [d0, d1] = doppelt, L = d1 - d0, hu = 1.5;
  if (L < 1) { g.add(b.build("bogenreihe-kanal")); wasser.forEach((w) => g.add(w)); return fest(g, "bogenreihe"); }
  b.box([L, 0.3, 2.3], [(d0 + d1) / 2, h + 0.15, 0], "#ffffff", tex);
  for (const s of [-1, 1]) for (let x = d0; x < d1 - 0.01; x += 4) {
    b.box([2.6, hu, 0.42], [x + 1.3, h + 0.3 + hu / 2, s * 0.86], "#ffffff", tex);                    // Mauer
    b.box([1.4, 0.45, 0.42], [x + 3.3, h + 0.3 + hu - 0.225, s * 0.86], "#ffffff", tex);               // Sturz über dem Fenster
    b.box([1.4, 0.4, 0.42], [x + 3.3, h + 0.3 + 0.2, s * 0.86], "#ffffff", tex);                       // Brüstung
  }
  b.box([L, 0.36, 2.2], [(d0 + d1) / 2, h + 0.3 + hu + 0.18, 0], "#ffffff", tex);                       // Decke = Boden des oberen
  wasser.push(rinne(c.uhr, c.ap.wasser, [d0, h + 0.85, 0], [d1, h + 0.85, 0], 1.25, { tempo: 1.6 }));
  wasser.push(kanal(b, c, d0, d1, h + 0.3 + hu + 0.36, 0, { w: 0.95, h: 1.1, t: 0.36, tief: 0.48 }).wasser);
  g.add(b.build("bogenreihe-kanal")); wasser.forEach((w) => g.add(w));
  return fest(g, "bogenreihe");
};

/** Unfertiger Bogen mit Lehrgerüst (Holzbogen, auf dem die Steine liegen) und Baugerüst. Ursprung = Mitte am Boden, Bogen entlang x. */
export const baustelleBogen = (c: AquaCtx, h: number) => {
  const tex = steinTex(c.ap), b = c.kit.batch(), holz = c.rp.holz;
  b.box([2.2, h * 0.7 + 0.2, 2.6], [-3.2, h * 0.35 - 0.1, 0], "#ffffff", tex); b.box([2.2, h * 0.45 + 0.2, 2.6], [3.2, h * 0.225 - 0.1, 0], "#ffffff", tex);   // zwei Pfeiler, rechts halb
  // Lehrgerüst: Holzbogen zwischen den Pfeilern
  const s = archShape(4.2, h * 0.7 + 0.1), inner = archShape(3.8, h * 0.7 - 0.1); s.holes.push(inner);
  b.add(extrude(s, 0.3), [0, -0.1, 0.9], holz); b.add(extrude(archShape(4.2, h * 0.7 + 0.1), 0.3), [0, -0.1, -1.2], holz);
  for (let i = 0; i < 5; i++) { const a = (i / 4) * Math.PI; b.box([0.2, 0.2, 2.5], [Math.cos(a) * 2.0, h * 0.7 - 2.1 + Math.sin(a) * 2.0, 0], holz); }
  for (let i = 0; i < 4; i++) { const a = rad(160 - i * 22); b.box([0.9, 0.55, 2.2], [Math.cos(a) * 2.45, h * 0.7 - 2.1 + Math.sin(a) * 2.45 + 0.1, 0], "#ffffff", tex, [0, 0, (a * 180) / Math.PI - 90]); }
  // Gerüst aus Stangen und Brettern um den rechten Pfeiler
  for (const x of [1.6, 4.8]) for (const z of [-1.9, 1.9]) b.add(new THREE.CylinderGeometry(0.07, 0.08, h + 1.7, 6), [x, (h + 1.5) / 2 - 0.1, z], c.rp.holzDunkel);
  for (const y of [2.2, 4.4, 6.6]) { if (y > h) continue; b.box([3.6, 0.08, 4.2], [3.2, y, 0], "#ffffff", planks(holz)); for (const z of [-1.9, 1.9]) b.box([3.4, 0.08, 0.08], [3.2, y + 0.9, z], c.rp.holzDunkel); }
  for (let y = 0.5; y < h; y += 0.55) b.box([0.5, 0.06, 0.08], [5.25, y, 1.9], c.rp.holzDunkel);   // Leitersprossen
  for (const x of [5.0, 5.5]) b.add(new THREE.CylinderGeometry(0.04, 0.04, h + 0.2, 5), [x, h / 2 - 0.1, 1.9], c.rp.holzDunkel);
  return fest(b.build("baustelle-bogen"));
};

// ---------------- Quellhaus ----------------
/** Quellhaus (Brunnenstube): kleines Steinhaus mit Satteldach, vorn ein Rundbogen, aus dem das Wasser in ein Becken fällt;
 *  vom Becken läuft der Kanal (nach +z). Ursprung = Mitte des Hauses am Boden, Front nach +z. */
export const quellhaus = (c: AquaCtx) => {
  const b = c.kit.batch(), tex = rubble(c.ap.tuff, c.ap.tuffFuge), g = new THREE.Group();
  const W = 4.6, D = 3.8, H = 3.0;
  b.box([W, H, 0.5], [0, H / 2, -D / 2 + 0.25], "#ffffff", tex);
  for (const s of [-1, 1]) b.box([0.5, H, D], [s * (W / 2 - 0.25), H / 2, 0], "#ffffff", tex);
  const front = new THREE.Shape(); front.moveTo(-W / 2, 0); front.lineTo(W / 2, 0); front.lineTo(W / 2, H); front.lineTo(-W / 2, H); front.closePath();
  const tor = archShape(1.6, 2.1); front.holes.push(new THREE.Path(tor.getPoints(16).map((p) => new THREE.Vector2(p.x, p.y + 0.0001 + 0.4))));
  b.add(extrude(front, 0.5), [0, 0, D / 2 - 0.5], "#ffffff", tex);
  const dach = new THREE.Shape(); dach.moveTo(-W / 2 - 0.4, 0); dach.lineTo(W / 2 + 0.4, 0); dach.lineTo(0, 1.5); dach.closePath();
  const dg = extrude(dach, D + 0.8); dg.translate(0, 0, -(D + 0.8) / 2); b.add(dg, [0, H, 0], "#ffffff", tiles(c.rp.ziegel));
  b.box([W - 1.0, 0.3, D - 1.0], [0, 0.15, 0], shade(c.ap.tuff, 0.8));
  b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 8), [0, 0.95, D / 2 - 0.2], c.ap.bronze, undefined, [90, 0, 0]);   // Auslauf
  // Becken davor
  b.box([3.2, 0.7, 0.35], [0, 0.35, D / 2 + 2.25], "#ffffff", tex);
  for (const s of [-1, 1]) b.box([0.35, 0.7, 2.2], [s * 1.6 + s * 0.175, 0.35, D / 2 + 1.25], "#ffffff", tex);
  b.box([2.9, 0.12, 2.0], [0, 0.0, D / 2 + 1.15], shade(c.ap.tuff, 0.7));
  g.add(b.build("quellhaus"));
  g.add(becken(c.uhr, c.ap.klar, [0, 0.52, D / 2 + 1.15], 3.18, 1.98, 0, { tempo: 0.6 }));
  g.add(c.uhr && c.lebt(spritzer([0, 0.53, D / 2 + 0.55], { n: 8, kraft: 0.3, weite: 0.5, seed: 11 })).obj);
  g.add(rinneStrahl(c, [0, 0.95, D / 2 + 0.1], [0, 0.55, D / 2 + 0.55]));
  return fest(g, "quellhaus");
};
/** Kurzer, dicker Wasserstrahl (Auslauf → Becken). */
export const rinneStrahl = (c: AquaCtx, a: V3, e: V3, r = 0.07) => {
  const A = new THREE.Vector3(...a), E = new THREE.Vector3(...e), m = A.clone().lerp(E, 0.5); m.y = Math.max(A.y, E.y) + 0.05;
  const k = new THREE.QuadraticBezierCurve3(A, m, E), L = k.getLength(), geo = new THREE.TubeGeometry(k, 10, r, 8, false), uv = geo.getAttribute("uv");
  const f = new Float32Array(uv.count * 2); for (let i = 0; i < uv.count; i++) { f[i * 2] = Math.abs(uv.getY(i) - 0.5) * 2; f[i * 2 + 1] = uv.getX(i) * L * 4; }
  geo.setAttribute("fluss", new THREE.BufferAttribute(f, 2));
  const mesh = new THREE.Mesh(geo, c.uhr.mat(c.ap.klar, 3.2, 1.8)); mesh.name = "fluss-strahl"; mesh.userData.occluder = false;
  return mesh;
};

// ---------------- Tunnel im Querschnitt ----------------
/** Tunnel im Schnitt: Erdblock x −60…60, z 0…−40, Oberfläche y 0; der Tunnel (y −13…−10,4) läuft entlang x, drei Schächte
 *  (x −30, 0, 30) reichen hinauf; im Tunnel der Kanal mit Wasser, Öllampen, Leiter im mittleren Schacht, Haspeln oben. */
export const TUNNEL = { y0: -13, y1: -10.2, tiefe: 2.8, schaechte: [-30, 0, 30], sw: 1.6, x0: -60, x1: 60, unten: -22 };
export const tunnelSchnitt = (c: AquaCtx) => {
  const g = new THREE.Group(), T = TUNNEL, b = c.kit.batch(), ap = c.ap;
  const erde = erdschnitt(ap.erdeSchnitt, ap.felsSchnitt), fels = rock(ap.felsSchnitt);
  const box = (x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, p = erde) => b.box([x1 - x0, y1 - y0, z1 - z0], [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2], "#ffffff", p);
  box(T.x0, T.x1, T.unten, T.y0, -40, 0);                                            // unter dem Tunnel
  box(T.x0, T.x1, T.y0, 0, -40, -T.tiefe);                                            // hinter dem Tunnel (Rückwand)
  const xs = [T.x0, ...T.schaechte.flatMap((x) => [x - T.sw / 2, x + T.sw / 2]), T.x1];
  for (let i = 0; i < xs.length; i += 2) box(xs[i], xs[i + 1], T.y1, 0, -T.tiefe, 0);   // zwischen den Schächten über dem Tunnel
  for (const x of T.schaechte) box(x - T.sw / 2, x + T.sw / 2, T.y1, 0, -T.tiefe - 0.5, -T.tiefe + 0.0001 - 0.0001);   // (Rückwand im Schacht)
  for (const x of [T.x0 - 0.0, T.x1]) { const s = x < 0 ? -1 : 1; box(x + (s < 0 ? -0.5 : 0), x + (s < 0 ? 0 : 0.5), T.y0, T.y1, -T.tiefe, 0, fels); }
  // Tunnel-Ausbau: Gewölbe-Rippen, Boden mit Kanal-Wangen
  for (let x = T.x0 + 3; x < T.x1 - 2; x += 6) b.box([0.3, 0.2, T.tiefe - 0.02], [x, T.y1 - 0.12, -T.tiefe / 2], shade(ap.felsSchnitt, 0.75));
  for (const z of [-0.35, -T.tiefe + 0.75]) b.box([T.x1 - T.x0, 0.55, 0.28], [0, T.y0 + 0.275, z - 0.14], "#ffffff", rubble(ap.tuff, ap.tuffFuge));
  b.box([T.x1 - T.x0, 0.05, T.tiefe - 0.04], [0, T.y0 + 0.025, -T.tiefe / 2], ap.sinter);
  // Grasnarbe als dünner Streifen an der Schnittkante (das Gelände liegt dahinter auf y 0)
  b.box([T.x1 - T.x0 + 0.02, 0.5, 1.08], [0, -0.13, -0.52], "#ffffff", earth(c.rp.erde));
  g.add(b.build("tunnel-schnitt"));
  g.add(rinne(c.uhr, ap.wasser, [T.x0, T.y0 + 0.42, -T.tiefe / 2 - 0.2], [T.x1, T.y0 + 0.42, -T.tiefe / 2 - 0.2], T.tiefe - 1.2, { tempo: 1.5 }));
  // Öllampen in Nischen (flackern), Tropfen von der Decke
  const lampen: [number, number][] = [[-46, -T.tiefe + 0.2], [-16, -T.tiefe + 0.2], [14, -T.tiefe + 0.2], [44, -T.tiefe + 0.2]];
  lampen.forEach(([x, z], i) => c.lebt(oellampeLicht(c, [x, T.y0 + 1.6, z], i * 1.7)));
  [-40, -22, 8, 22, 51].forEach((x, i) => c.lebt(tropfen([x, T.y0 + 0.42, -T.tiefe / 2 + 0.1], T.y1 - T.y0 - 0.45, { phase: i * 0.31, tempo: 0.55 + i * 0.05 })));
  return { obj: fest(g, "tunnel"), lampen };
};
/** Öllampe (Ton) mit kleiner flackernder Flamme und Lichthof; als Teil der Welt (Wand-Nische). */
export const oellampeLicht = (c: AquaCtx, at: V3, phase = 0): Lebendig => {
  const g = new THREE.Group(), b = c.kit.batch();
  b.box([0.34, 0.06, 0.3], [0, -0.06, 0], shade(c.ap.felsSchnitt, 0.8));
  b.add(ball, [0, 0.04, 0], c.ap.lehm, undefined, [0, 0, 0], [0.12, 0.06, 0.08]);
  b.add(new THREE.ConeGeometry(0.03, 0.08, 6), [0.11, 0.06, 0], c.ap.lehm, undefined, [0, 0, -70]);
  g.add(b.build("oellampe"));
  const fl = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.12, 8), new THREE.MeshBasicMaterial({ color: new THREE.Color("#ffd04a").multiplyScalar(1.15), fog: true }));
  fl.position.set(0.14, 0.14, 0); g.add(fl);
  const hof = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8), new THREE.MeshBasicMaterial({ color: "#ffb347", fog: true, transparent: true, opacity: 0.3, depthWrite: false }));
  hof.position.copy(fl.position); g.add(hof);
  g.position.set(...at); g.name = "oellampe";
  return { obj: g, tick: (t) => { const f = flacker(t, phase); fl.scale.set(1, 0.7 + 0.6 * f, 1); hof.scale.setScalar(0.8 + 0.4 * f); (hof.material as THREE.MeshBasicMaterial).opacity = 0.18 + 0.25 * f; } };
};

// ---------------- Siphon ----------------
/** Turm mit offenem Becken oben (Kopf- oder Empfangsbecken), Höhe h; Ursprung = Mitte am Boden. */
export const beckenTurm = (c: AquaCtx, h: number, seed = 1) => {
  const b = c.kit.batch(), tex = blocks(c.ap.tuff, c.ap.tuffFuge), g = new THREE.Group();
  b.box([4.4, h, 4.4], [0, h / 2, 0], "#ffffff", tex);
  for (const [w, d, x, z] of [[4.8, 0.4, 0, -2.2], [4.8, 0.4, 0, 2.2], [0.4, 4.0, -2.2, 0], [0.4, 4.0, 2.2, 0]] as const) b.box([w, 1.0, d], [x, h + 0.5, z], "#ffffff", tex);
  b.box([4.9, 0.22, 4.9], [0, h - 0.4, 0], shade(c.ap.tuff, 0.88));
  g.add(b.build(`beckenturm-${seed}`));
  g.add(becken(c.uhr, c.ap.wasser, [0, h + 0.62, 0], 3.98, 3.98, 90, { tempo: 0.8 }));
  return fest(g, "beckenturm");
};
/** Bündel aus Bleirohren entlang eines Pfades (Punkte in Weltlage der Zone), 3 × 3 Rohre, je mit Muffen-Ringen. */
export const rohrbuendel = (c: AquaCtx, pfad: V3[], o: { n?: number; r?: number; abstand?: number } = {}) => {
  const n = o.n ?? 3, r = o.r ?? 0.16, a = o.abstand ?? 0.38, g = new THREE.Group();
  const kurve = new THREE.CatmullRomCurve3(pfad.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.1);
  const L = kurve.getLength(), seg = Math.max(8, Math.round(L / 1.5));
  const pts = kurve.getSpacedPoints(seg), tan = pts.map((_, i) => kurve.getTangentAt(i / seg));
  for (let ix = 0; ix < n; ix++) for (let iy = 0; iy < n; iy++) {
    const dz = (ix - (n - 1) / 2) * a, dy = (iy - (n - 1) / 2) * a;
    const p = pts.map((q, i) => { const t = tan[i], side = new THREE.Vector3(-t.z, 0, t.x).normalize(); return q.clone().add(side.multiplyScalar(dz)).add(new THREE.Vector3(0, dy + a * (n - 1) / 2 + r, 0)); });
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p), seg * 2, r, 8, false);
    const m = c.kit.mesh(geo, shade(c.ap.blei, 0.94 + ((ix + iy) % 3) * 0.04)); m.name = "bleirohr"; g.add(m);
  }
  const b = c.kit.batch();   // Steinsättel alle 6 m
  for (let s = 0; s <= L; s += 6) { const q = kurve.getPointAt(s / L), t = kurve.getTangentAt(s / L); b.box([0.55, 0.32, n * a + 0.5], [q.x, q.y + 0.1, q.z], shade(c.ap.tuff, 0.85), undefined, [0, -(Math.atan2(t.z, t.x) * 180) / Math.PI, 0]); }
  g.add(b.build("rohr-saettel"));
  return fest(g, "rohrbuendel");
};

// ---------------- Klärbecken im Schnitt ----------------
/** Klärbecken (piscina limaria) im Schnitt, Ursprung = Mitte am Boden, Schnittfläche nach +z: zwei Kammern; links kommt trübes
 *  Wasser von oben herein, Schlamm setzt sich am Boden ab, über die Zwischenwand fliesst klares Wasser in die rechte Kammer und
 *  rechts durch die Wand hinaus. Breite 12 (x), Tiefe 6 (z), Höhe 6. */
export const KLAER = { W: 12, D: 6, H: 6, boden: 0.6, wand: 0.5 };
export const klaerbecken = (c: AquaCtx) => {
  const K = KLAER, b = c.kit.batch(), tex = blocks(c.ap.tuff, c.ap.tuffFuge), schnitt = rubble(c.ap.beton, shade(c.ap.beton, 0.7)), g = new THREE.Group(), ap = c.ap;
  b.box([K.W, K.boden, K.D], [0, K.boden / 2, 0], "#ffffff", schnitt);
  b.box([K.W, K.H, K.wand], [0, K.H / 2, -K.D / 2 + K.wand / 2], "#ffffff", tex);                         // Rückwand
  for (const s of [-1, 1]) b.box([K.wand, K.H, K.D - K.wand], [s * (K.W / 2 - K.wand / 2), K.H / 2, K.wand / 2], "#ffffff", tex);
  b.box([0.4, K.H - 2.2, K.D - K.wand - 0.05], [0.2, K.boden + (K.H - 2.2) / 2, K.wand / 2 - 0.025], "#ffffff", schnitt);   // Zwischenwand (Überlauf oben)
  // Schnittkanten: dunkle Rahmen an der offenen Front
  for (const x of [-K.W / 2 + K.wand / 2, K.W / 2 - K.wand / 2]) b.box([K.wand + 0.06, K.H + 0.06, 0.06], [x, K.H / 2, K.D / 2 + 0.02], shade(ap.beton, 0.55));
  b.box([K.W + 0.06, K.boden + 0.06, 0.06], [0, K.boden / 2, K.D / 2 + 0.02], shade(ap.beton, 0.55));
  // Schlamm am Boden der linken Kammer
  for (let i = 0; i < 9; i++) b.add(ball, [-K.W / 2 + 1 + i * 0.6, K.boden, -1.2 + ((i * 37) % 10) / 4], ap.schlamm, undefined, [0, i * 30, 0], [0.75, 0.32, 0.9]);
  // Rohr hinaus (rechts) und Zulauf (links oben)
  b.add(new THREE.CylinderGeometry(0.35, 0.35, 1.4, 12), [K.W / 2 + 0.3, K.H - 1.9, 0], ap.bleiDunkel, undefined, [0, 0, 90]);
  g.add(b.build("klaerbecken"));
  // Wasser: links trüb (Front als Fläche im Schnitt + Oberfläche), rechts klar
  const kam = (x0: number, x1: number, y1: number, f: FlussFarben, name: string) => {
    g.add(becken(c.uhr, f, [(x0 + x1) / 2, y1, -K.wand / 2 + 0.25], x1 - x0, K.D - K.wand - 0.5, 90, { tempo: 0.5 }));
    const v = vorhang(c.uhr, f, [(x0 + x1) / 2, y1, K.D / 2 - 0.02], x1 - x0, y1 - K.boden, 0, { tempo: 0.25, neig: 0 }); v.name = name; g.add(v);
  };
  kam(-K.W / 2 + K.wand, 0, K.H - 1.4, ap.truebe, "wasser-truebe");
  kam(0.4, K.W / 2 - K.wand, K.H - 1.7, ap.klar, "wasser-klar");
  g.add(vorhang(c.uhr, ap.truebe, [-K.W / 2 + 1.4, K.H + 0.6, -0.5], 1.0, 1.95, 0, { tempo: 3.2, neig: 0.15 }));   // Zulauf fällt hinein
  g.add(c.lebt(spritzer([-K.W / 2 + 1.4, K.H - 1.38, -0.2], { n: 10, kraft: 0.4, weite: 0.7, farbe: ap.truebe.glanz, ring: ap.truebe.hell, seed: 21 })).obj);
  g.add(vorhang(c.uhr, ap.klar, [0.2, K.H - 1.4 - 0.01, 0.5], 0.4, 0.31, 90, { tempo: 2.4, neig: 0.1 }));        // Überlauf
  return fest(g, "klaerbecken");
};

// ---------------- Wasserschloss ----------------
/** Wasserschloss (castellum divisorium), Ursprung = Mitte am Boden: Ziegelbau ohne Dach mit niedriger Front (Blick hinein), in der
 *  Mitte das Becken, hinten drei Ausläufe mit Schiebern (Holzbretter in Nuten); hinter der Rückwand fächern 12 Bleirohre aus.
 *  `dicke` = Index der Düse, die zu dick ist (glänzt golden). Ergebnis: Gruppe + Lage der Ausläufe (für Rohre und Schieber). */
export const wasserschloss = (c: AquaCtx, o: { dicke?: number } = {}) => {
  const b = c.kit.batch(), tex = brick(c.ap.ziegelwand, c.ap.ziegelFuge), g = new THREE.Group(), ap = c.ap;
  const W = 8, D = 7, H = 4.2;
  b.box([W, H, 0.5], [0, H / 2, -D / 2 + 0.25], "#ffffff", tex);
  for (const s of [-1, 1]) b.box([0.5, H * 0.8, D - 0.5], [s * (W / 2 - 0.25), H * 0.4, 0.25], "#ffffff", tex);
  b.box([W, 1.0, 0.5], [0, 0.5, D / 2 - 0.25], "#ffffff", tex);                                                // niedrige Front
  b.box([W + 0.3, 0.25, 0.7], [0, H + 0.12, -D / 2 + 0.25], shade(ap.tuff, 0.9));
  b.box([W - 1, 0.2, D - 1], [0, 0.1, 0], "#ffffff", slabs(ap.tuff, ap.tuffFuge));
  // Becken in der Mitte (rund), drei Rinnen zu den Ausläufen
  b.add(new THREE.CylinderGeometry(1.7, 1.75, 0.9, 32, 1, true), [0, 0.65, 0.4], ap.sinter);
  b.add(new THREE.TorusGeometry(1.72, 0.14, 8, 32), [0, 1.1, 0.4], shade(ap.tuff, 0.95), undefined, [90, 0, 0]);
  const aus = [-2.2, 0, 2.2];
  for (const x of aus) {
    b.box([0.7, 0.5, 2.1], [x * 0.75, 0.95, -1.95], ap.sinter);
    for (const s of [-1, 1]) b.box([0.12, 1.5, 0.2], [x + s * 0.5, 1.6, -D / 2 + 0.62], shade(ap.tuff, 0.7));   // Nuten
  }
  g.add(b.build("wasserschloss"));
  g.add(becken(c.uhr, ap.wasser, [0, 1.02, 0.4], 3.36, 3.36, 0, { rund: true, tempo: 0.7 }));
  aus.forEach((x, i) => {
    g.add(rinne(c.uhr, ap.wasser, [x * 0.2, 1.12, -1.1], [x * 0.95, 1.12, -2.95], 0.5, { tempo: 2.2 }));
    c.lebt(schieber(c, g, [x, 1.0, -D / 2 + 0.62], 0.35 + 0.1 * i, i));
  });
  // Rohrfächer hinter der Rückwand: 12 Rohre aus drei Ausläufen
  const rohre = new THREE.Group(); rohre.name = "rohrfaecher";
  const d = c.kit.batch();
  for (let i = 0; i < 12; i++) {
    const aus3 = aus[Math.floor(i / 4)], a = rad(-70 + i * (140 / 11)), L = 9 + (i % 3) * 2.5;
    const p0 = new THREE.Vector3(aus3 + ((i % 4) - 1.5) * 0.28, 0.7 + (i % 2) * 0.3, -D / 2 - 0.05);
    const p1 = p0.clone().add(new THREE.Vector3(Math.sin(a) * 2.5, -0.45, -Math.cos(a) * 2.5));
    const p2 = new THREE.Vector3(p0.x + Math.sin(a) * L, 0.12, p0.z - Math.cos(a) * L);
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([p0, p1, p2]), 24, i === (o.dicke ?? 5) ? 0.12 : 0.085, 8, false);
    const m = c.kit.mesh(geo, shade(ap.blei, 0.9 + (i % 3) * 0.06)); rohre.add(m);
    const dn = i === (o.dicke ?? 5);
    d.add(new THREE.CylinderGeometry(dn ? 0.2 : 0.11, dn ? 0.24 : 0.12, dn ? 0.42 : 0.26, 12), [p0.x, p0.y, p0.z - (dn ? 0.18 : 0.1)], dn ? ap.bronze : ap.bronzeDunkel, undefined, [90, 0, 0]);   // Bronze-Düse (calix)
  }
  rohre.add(d.build("duesen"));
  g.add(rohre);
  return { obj: fest(g, "wasserschloss"), aus };
};
/** Schieber: Holzbrett in den Nuten, das sich langsam hebt und senkt (zeigt: man kann den Zufluss drosseln). */
const schieber = (c: AquaCtx, g: THREE.Group, at: V3, phase: number, i: number): Lebendig => {
  const b = c.kit.batch(); b.box([0.88, 0.9, 0.08], [0, 0.45, 0], "#ffffff", planks(c.rp.holz, true)); b.add(new THREE.CylinderGeometry(0.035, 0.035, 0.8, 6), [0, 1.2, 0], c.rp.eisen);
  b.box([0.3, 0.06, 0.06], [0, 1.6, 0], c.rp.eisen);
  const s = b.build(`schieber-${i}`); s.position.set(...at); g.add(s);
  return { obj: s, tick: (t) => { s.position.y = at[1] + 0.25 + 0.25 * Math.sin(t * 0.7 + phase * 6); } };
};

/** Brunnen-Ziehwerk mit Haspel: zwei Stützen, Walze mit Kurbel (dreht), Seil mit Eimer (geht auf und ab). Tiefe `tief` unter dem
 *  Haspel. Ursprung = Mitte am Boden; Haspel entlang x. */
export const haspel = (c: AquaCtx, at: V3, tief: number, o: { turn?: number; phase?: number; tempo?: number } = {}): Lebendig => {
  const g = new THREE.Group(), b = c.kit.batch(), holz = c.rp.holz, hd = c.rp.holzDunkel, H = 1.2;
  for (const x of [-0.8, 0.8]) { b.box([0.14, H + 0.2, 0.14], [x, (H + 0.2) / 2, 0], hd); b.box([0.14, 0.14, 0.9], [x, 0.07, 0], hd, undefined, [0, 0, 0]); }
  g.add(b.build("haspel-gestell"));
  const walze = new THREE.Group(); walze.position.y = H;
  const wb = c.kit.batch(); wb.add(new THREE.CylinderGeometry(0.16, 0.16, 1.5, 12), [0, 0, 0], holz, undefined, [0, 0, 90]);
  wb.box([0.06, 0.45, 0.06], [0.92, -0.2, 0], hd); wb.add(new THREE.CylinderGeometry(0.035, 0.035, 0.3, 6), [1.0, -0.42, 0], hd, undefined, [0, 0, 90]);
  walze.add(wb.build("walze")); g.add(walze);
  const seilGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 5); seilGeo.translate(0, -0.5, 0);
  const seil = c.kit.mesh(seilGeo, "#7a5a3a"); seil.position.set(0, H - 0.16, 0.0); g.add(seil);
  const eb = c.kit.batch(); eb.add(new THREE.CylinderGeometry(0.2, 0.16, 0.34, 12), [0, -0.17, 0], holz, planks(holz, true)); eb.add(new THREE.TorusGeometry(0.2, 0.02, 5, 14), [0, 0, 0], c.rp.eisen, undefined, [90, 0, 0]);
  const eimer = eb.build("eimer"); g.add(eimer);
  g.position.set(...at); g.rotation.y = rad(o.turn ?? 0); g.name = "haspel";
  const tempo = o.tempo ?? 0.18, ph = o.phase ?? 0;
  return { obj: klein(g), tick: (t) => {
    const u = 0.5 - 0.5 * Math.cos((t * tempo + ph) * Math.PI * 2), l = 0.4 + u * tief;
    walze.rotation.x = l / 0.16;
    seil.scale.y = l; eimer.position.y = H - 0.16 - l;
  } };
};

/** Feuer unter dem Ofen/der Feuerstelle aus mehreren Flammen + Glut-Kugeln (ohne Rauch). */
export const glutFeuer = (at: V3, o: { w?: number; groesse?: number; phase?: number; farbe?: string } = {}): Lebendig => {
  const g = new THREE.Group(), w = o.w ?? 1, gr = o.groesse ?? 1, ph = o.phase ?? 0;
  const rng = new Rng(Math.round(ph * 100) + 3), mats = ["#ff7a1f", "#ffb02e", "#ffe066"].map((f) => new THREE.MeshBasicMaterial({ color: new THREE.Color(f).multiplyScalar(1.1), fog: true }));
  const fl = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(new THREE.ConeGeometry(0.14 * gr, 0.5 * gr, 7), mats[i % 3]); m.position.set(rng.range(-w / 2, w / 2), 0.2 * gr, rng.range(-0.15, 0.15)); g.add(m); return { m, ph: rng.range(0, 6) }; });
  const glut = new THREE.Mesh(new THREE.BoxGeometry(w + 0.2, 0.1, 0.5), new THREE.MeshBasicMaterial({ color: o.farbe ?? "#ff5a1a", fog: true })); glut.position.y = 0.05; g.add(glut);
  g.position.set(...at); g.name = "glutfeuer";
  return { obj: g, tick: (t) => { for (const f of fl) { const k = flacker(t, f.ph + ph); f.m.scale.set(1, 0.6 + 0.8 * k, 1); f.m.position.y = (0.2 + 0.1 * k) * gr; } } };
};

export { steinTex as aquaStein };
