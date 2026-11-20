// Herkunft: eigen (V-Video), geschrieben 2026-11-18, ohne Vorlage.
// Römer-Wasser-Welt („aqua“): der Weg des Wassers nach Rom in zwölf Zonen nebeneinander (Mitte jeder Zone bei x = k · 600, eigenes
// Gelände ±260 m, dazwischen flacher Boden im Nebel). Gebaut werden nur die Zonen nahe an den Kameras des Shots – so bleibt jede
// Einstellung schnell. Alle Bewegung kommt aus der Shot-Zeit (fliessendes Wasser, Spritzer, Dampf, Feuer, Rauch, Haspeln, Tiere,
// Wäsche, Markisen, Vögel, Wolken stehen).
//
//   k  Zone         Inhalt (lokale Lage: x nach rechts, z nach Süden; Kamera meist im Süden, Blick nach Norden)
//   0  quelle       Quellhaus (0, −8) am Hang, Becken, Kanal nach +x (z −4,95), Felsen, Esel
//   1  bruecke      Tal (Boden −40) mit Fluss entlang z, dreistöckige Aquädukt-Brücke bei z −30, Schafe, Schilf
//   2  bogenreihe   Bogenreihe z −35 (x −200…260, h 9,5, Doppelkanal x −40…80), Baustelle x −206 mit Tretkran, Bauernhof (30, 20),
//                   Weinberg x 60…120 mit geheimem Rohr vom Pfeiler x 62,4, Vermessung (Chorobates, Latte, Groma) bei z 25
//   3  tunnel       Erdblock im Schnitt (Front z 0, Tunnel y −13…−10,2), Grube davor (Boden −21), Schächte mit Haspeln, Bauer mit Pflug
//   4  siphon       Tal (Boden −22) mit Bach, Kopfturm x −72, Empfangsturm x 72, Rohrbündel über die Rohrbrücke (venter) x ±15
//   5  wasserwerk   Zulauf-Bogenreihe entlang z bei x −34,6, Klärbecken (−30, −20), Wasserschloss (30, −10) mit Rohrfächer, Wasserverkauf
//   6  strasse      Stadtstrasse z −90…60: Löwenbrunnen (4,2, −6) läuft über, Bäckerei mit gehobenen Platten, Taberna, Gemüsestand,
//                   Trittsteine, Wäsche, Markisen, Hund, Tauben; Platz mit Zierbrunnen (0, −68)
//   7  thermen      Thermen (aqua-thermen.ts), Palästra, Heizofen, Latrine (x −62…−46)
//   8  cloaca       Tiber (Wasser −4, z −38…−2), Kai im Norden mit dem Mund der Cloaca Maxima (0, −38), Boote, Brücke x 60, Stadt, Tempel
//   9  fruehrom     frühes Rom: Rundhütten, Ziehbrunnen, Zisterne, Fluss bei z −40 mit Schilf, Pfad
//  10  innen        Innenräume (aqua-thermen.ts): Büro x −30, Küche −10, Werkstatt 10, Atrium 34
//  11  heute        Ruinen-Bogenreihe z −10 mit Efeu, See im Norden (Wasser −1,5), Forschungsboot, Bohrkern-Tisch
import * as THREE from "three";
import { Rng } from "../core/random";
import { NOINK } from "../post/ink";
import { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { acker, blocks, earth, grass, kies, planks, rock, rubble, shade, slabs, tiles } from "./paint";
import { water } from "./water";
import { cloud, type CloudColors } from "./nature";
import { voegel, type Lebendig } from "./leben";
import type { WorldPalette } from "./palette";
import type { NordPalette } from "./nord";
import { oliveTeile, pinieTeile, zypresseTeile, type RoemerPalette } from "./roemer";
import { bruecke, marktstand, stadthaus, tempel, amphore } from "./roemer-bauten";
import { groma, ochse } from "./roemer-requisiten";
import { schaf, ziege } from "./nord-requisiten";
import { FlussUhr, becken, rinne, spritzer, strahl, vorhang } from "./aqua-wasser";
import {
  KLAER, TUNNEL, aquaeduktBruecke, arkadeGeo, baustelleBogen, beckenTurm, bogenreihe, fest, glutFeuer, haspel, kanal, klaerbecken, klein, quellhaus,
  rohrbuendel, tunnelSchnitt, wasserschloss, type AquaCtx, type AquaPalette,
} from "./aqua-bauten";
import {
  bleirohre, bohrkernTisch, brote, chorobates, deckplatten, esel, forschungsboot, grabwerkzeug, hund, kruege, leiter, loewenbrunnen, markise,
  nivellierlatte, pflug, pfloecke, schilf, tauben, tretkran, waescheleine, wasserverkauf, zierbrunnen,
} from "./aqua-requisiten";
import { innenBoden, innenraeume, latrine, thermen, thermenBoden } from "./aqua-thermen";

export type AquaLook = { palette: WorldPalette; ap: AquaPalette; rp: RoemerPalette; np: NordPalette; clouds: CloudColors; sunColor: string };
/** Optionen der Wasser-Welt. */
export type AquaOptions = {
  voegel?: boolean;          // Vögel über den Zonen im Freien (Standard ja)
  zonen?: AquaZone[];        // diese Zonen immer bauen (sonst nur die nahe an den Kameras)
  ueberlauf?: boolean;       // Löwenbrunnen läuft über (Standard ja)
  dickeDuese?: number;       // Index der zu dicken Düse im Wasserschloss (0…11, Standard 5)
};
export const AQUA_ZONEN = ["quelle", "bruecke", "bogenreihe", "tunnel", "siphon", "wasserwerk", "strasse", "thermen", "cloaca", "fruehrom", "innen", "heute"] as const;
export type AquaZone = (typeof AQUA_ZONEN)[number];
export const AQUA_ZONE_ABSTAND = 600;
const ZX = (z: AquaZone) => AQUA_ZONEN.indexOf(z) * AQUA_ZONE_ABSTAND;

const glatt = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
const buckel = (x: number, z: number, cx: number, cz: number, h: number, s: number) => h * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / (2 * s * s));
/** 1 innerhalb des Rechtecks, weich auf 0 über `r` Meter ausserhalb. */
const rechteck = (x: number, z: number, x0: number, x1: number, z0: number, z1: number, r = 4) => {
  const dx = Math.max(0, x0 - x, x - x1), dz = Math.max(0, z0 - z, z - z1), d = Math.hypot(dx, dz);
  return r > 0 ? glatt(r, 0, d) : d > 0 ? 0 : 1;   // r 0 = harte Kante (glatt teilte sonst durch 0)
};
/** Rand jeder Zone: Gelände läuft auf 0 aus (trifft den flachen Boden zwischen den Zonen). */
const rand = (x: number, z: number) => glatt(252, 205, Math.max(Math.abs(x), Math.abs(z)));
const welle = (x: number, z: number, a = 1) => a * (Math.sin(x / 31 + 1) * Math.sin(z / 27) + 0.5 * Math.sin(x / 13 + z / 17));

type WCtx = AquaCtx & { np: NordPalette; dicke?: number; ueberlauf?: boolean };
type Schicht = "gras" | "erde" | "kies" | "acker" | "fels";
type ZonenDef = {
  hoehe: (x: number, z: number) => number;
  schicht: (x: number, z: number, h: number) => Schicht;
  /** eigener Boden (Bauten, Wasser, Tunnel): Zahl ersetzt das Gelände (`ersetzt`) oder zählt als Maximum mit ihm; −99 = keiner. */
  boden?: (x: number, z: number) => number; ersetzt?: boolean;
  /** dort Gras und Bäume */ frei: (x: number, z: number) => boolean;
  baeume?: number; wiese?: [number, number, number, number, number][];
  baue: (c: WCtx, z: ZonenWerk) => void;
  aussen?: boolean;
  /** dort kein Gelände (Mitte eines Gitter-Vierecks, lokal), z. B. vor einem Schnitt */ loch?: (x: number, z: number) => boolean;
};
type ZonenWerk = { y: (x: number, z: number) => V3; terrain: (x: number, z: number) => number; wasser: (w: { mesh: THREE.Mesh; tick: (t: number, cam: THREE.Camera, sun?: THREE.Vector3) => void }) => void };

// ---------------- Gelände-Gitter (gleich für alle Zonen, lokal) ----------------
const achse = (teile: [number, number, number][]) => { const a: number[] = []; for (const [von, bis, s] of teile) for (let v = von; v < bis - 1e-6; v += s) a.push(+v.toFixed(3)); a.push(teile[teile.length - 1][1]); return a; };
const XS = achse([[-260, -60, 4], [-60, -40, 2], [-40, 40, 1], [40, 60, 2], [60, 260, 4]]);
const ZS = XS;
const NX = XS.length, NZ = ZS.length;
const HS = new Map<AquaZone, Float32Array>();
const hoehen = (z: AquaZone) => {
  let hs = HS.get(z);
  if (!hs) { const f = ZONEN[z].hoehe; hs = new Float32Array(NX * NZ); for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) hs[k * NX + i] = f(XS[i], ZS[k]); HS.set(z, hs); }
  return hs;
};
const suche = (a: number[], v: number) => { let lo = 0, hi = a.length - 2; if (v <= a[0]) return 0; if (v >= a[hi]) return hi; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (a[m] <= v) lo = m; else hi = m - 1; } return lo; };
const terrainAt = (zone: AquaZone, x: number, z: number) => {
  if (Math.abs(x) > 260 || Math.abs(z) > 260) return 0;
  const hs = hoehen(zone), i = suche(XS, x), k = suche(ZS, z);
  const fx = Math.min(1, Math.max(0, (x - XS[i]) / (XS[i + 1] - XS[i]))), fz = Math.min(1, Math.max(0, (z - ZS[k]) / (ZS[k + 1] - ZS[k])));
  const ha = hs[k * NX + i], hb = hs[(k + 1) * NX + i], hc = hs[(k + 1) * NX + i + 1], hd = hs[k * NX + i + 1];
  return fx + fz <= 1 ? ha + (hd - ha) * fx + (hb - ha) * fz : hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
};
const zoneVon = (x: number): { zone: AquaZone | null; lx: number } => {
  const k = Math.round(x / AQUA_ZONE_ABSTAND), lx = x - k * AQUA_ZONE_ABSTAND;
  return { zone: k >= 0 && k < AQUA_ZONEN.length && Math.abs(lx) <= 262 ? AQUA_ZONEN[k] : null, lx };
};
/** Boden für Figuren und Requisiten (Weltlage). */
export const aquaGroundAt = (x: number, z: number) => {
  const { zone, lx } = zoneVon(x);
  if (!zone) return -0.3;
  const def = ZONEN[zone], t = terrainAt(zone, lx, z), b = def.boden ? def.boden(lx, z) : -99;
  return b > -99 && def.ersetzt ? b : Math.max(t, b);
};

const gelaende = (kit: Kit, rp: RoemerPalette, ap: AquaPalette, zone: AquaZone) => {
  const def = ZONEN[zone], hs = hoehen(zone), n = NX * NZ, art: Schicht[] = new Array(n), senk = new Float32Array(n);
  for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
    const j = k * NX + i; art[j] = def.schicht(XS[i], ZS[k], hs[j]);
    const dx = Math.min(XS[Math.min(i + 1, NX - 1)] - XS[i] || 4, XS[i] - XS[Math.max(i - 1, 0)] || 4), dzz = Math.min(ZS[Math.min(k + 1, NZ - 1)] - ZS[k] || 4, ZS[k] - ZS[Math.max(k - 1, 0)] || 4);
    senk[j] = Math.min(0.8, 0.3 * Math.min(dx, dzz) + 0.1 * Math.max(dx, dzz));
  }
  const idx: number[] = [];
  for (let k = 0; k < NZ - 1; k++) for (let i = 0; i < NX - 1; i++) {
    if (def.loch && def.loch((XS[i] + XS[i + 1]) / 2, (ZS[k] + ZS[k + 1]) / 2)) continue;
    const a = k * NX + i, b = (k + 1) * NX + i, c = (k + 1) * NX + i + 1, d = k * NX + i + 1; idx.push(a, b, d, b, c, d);
  }
  const farbe: Record<Schicht, Parameters<Kit["mesh"]>[2]> = {
    gras: grass(rp.gras), erde: earth(rp.erde), kies: kies(rp.kies, rp.kiesFuge), acker: acker(rp.acker), fels: rock(zone === "tunnel" ? ap.felsSchnitt : rp.fels),
  };
  const g = new THREE.Group(); g.name = "gelaende";
  (Object.keys(farbe) as Schicht[]).forEach((s, li) => {
    if (!art.includes(s)) return;
    const pos = new Float32Array(n * 3);
    for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) { const j = k * NX + i; pos[j * 3] = XS[i]; pos[j * 3 + 1] = art[j] === s ? hs[j] : hs[j] - senk[j] * (1 + 0.25 * li) - 0.02 * (li + 1); pos[j * 3 + 2] = ZS[k]; }
    // nur Dreiecke mit mindestens einem eigenen Punkt (ganz abgesenkte liegen unsichtbar unter der oberen Schicht – und
    // täuschen weit vom Ursprung der Raum-Prüfung deckungsgleiche Flächen vor)
    const eigen: number[] = [];
    for (let t = 0; t < idx.length; t += 3) if (art[idx[t]] === s || art[idx[t + 1]] === s || art[idx[t + 2]] === s) eigen.push(idx[t], idx[t + 1], idx[t + 2]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setIndex(eigen); geo.computeVertexNormals();
    const m = kit.mesh(geo, "#ffffff", farbe[s]); m.name = `gelaende-${s}`; m.userData.occluder = false; g.add(m);
  });
  return g;
};

// ---------------- Pflanzen ----------------
type B = ReturnType<Kit["batch"]>;
const ball = new THREE.IcosahedronGeometry(1, 2);
const ballGrob = new THREE.IcosahedronGeometry(1, 1);
const wiese = (kit: Kit, rp: RoemerPalette, zone: AquaZone, felder: [number, number, number, number, number][], seed: number) => {
  const def = ZONEN[zone], b = kit.batch(), r = new Rng(seed);
  const halm = new THREE.ConeGeometry(0.075, 1, 5), bluete = new THREE.IcosahedronGeometry(1, 0), TOENE = [0.88, 1, 1.1, 1.2, 1.3].map((k) => shade(rp.gras, k));
  for (const [x0, x1, z0, z1, n] of felder) for (let i = 0; i < n; i++) {
    const x = r.range(x0, x1), z = r.range(z0, z1), hh = def.hoehe(x, z);
    if (!def.frei(x, z) || def.schicht(x, z, hh) !== "gras") continue;
    const y = terrainAt(zone, x, z) - 0.03, rot = r.range(0, 180), hgt = r.range(0.25, 0.5), ti = Math.floor(r.next() * 4);
    for (let k = 0; k < 3; k++) {
      const a = (k - 1) * 0.35 + r.range(-0.1, 0.1), hk = hgt * (k === 1 ? 1 : 0.8);
      b.add(halm, [x + Math.sin(a) * hk * 0.25 + (k - 1) * 0.04, y + hk / 2, z], TOENE[k === 1 ? ti + 1 : ti], undefined, [0, rot, THREE.MathUtils.radToDeg(-a)], [1, hk, 1]);
    }
    if (r.next() > 0.8) {
      b.add(halm, [x + 0.1, y + (hgt + 0.06) / 2, z + 0.03], TOENE[1], undefined, [0, 0, 0], [0.4, hgt + 0.06, 0.4]);
      b.add(bluete, [x + 0.1, y + hgt + 0.06, z + 0.03], r.pick(rp.blumen), undefined, [0, rot, 0], [0.1, 0.08, 0.1]);
    }
  }
  const g = b.build("wiese");
  g.traverse((o) => { o.layers.set(NOINK); (o as THREE.Mesh).castShadow = false; });
  g.userData.kulisse = true;
  return g;
};
const wald = (kit: Kit, rp: RoemerPalette, zone: AquaZone, n: number, seed: number) => {
  const def = ZONEN[zone], b = kit.batch(), r = new Rng(seed);
  for (let i = 0; i < n; i++) {
    const x = r.range(-245, 245), z = r.range(-245, 245), h = def.hoehe(x, z);
    if (!def.frei(x, z) || def.schicht(x, z, h) !== "gras") continue;
    const k = r.next(), yy = terrainAt(zone, x, z) - 0.08;
    if (k < 0.45) pinieTeile(b, rp, [x, yy, z], r.range(9, 14), i); else if (k < 0.7) zypresseTeile(b, rp, [x, yy, z], r.range(7, 12), i); else oliveTeile(b, rp, [x, yy, z], r.range(3.5, 5.5), i);
  }
  const g = b.build("wald"); g.userData.occluder = false;
  return g;
};
/** Einzelner Baum (Sichtlinien-Teilnehmer). */
const baum = (c: WCtx, art: "pinie" | "zypresse" | "olive", at: V3, h: number, seed: number) => {
  const b = c.kit.batch(), o: V3 = [0, 0, 0];
  if (art === "pinie") pinieTeile(b, c.rp, o, h, seed); else if (art === "zypresse") zypresseTeile(b, c.rp, o, h, seed); else oliveTeile(b, c.rp, o, h, seed);
  const g = b.build(art); g.position.set(at[0], at[1] - 0.05, at[2]);
  return c.st(klein(g));
};
/** Felsbrocken (grob, Fels-Textur), in einer Gruppe. */
const felsen = (c: WCtx, punkte: [number, number, number, number][], y: (x: number, z: number) => V3, name: string) => {
  const b = c.kit.batch(), tex = rock(c.rp.fels), r = new Rng(punkte.length * 13);
  for (const [x, z, s, hoch] of punkte) { const p = y(x, z); b.add(ballGrob, [p[0], p[1] + s * hoch * 0.4, p[2]], "#ffffff", tex, [r.range(0, 40), r.range(0, 180), r.range(0, 30)], [s, s * hoch, s * r.range(0.7, 1)]); }
  return c.st(fest(b.build(name)));
};
/** Weinberg: Reihen entlang z mit Pfählen, Reben-Polstern und Trauben. */
const reben = (c: WCtx, x0: number, x1: number, z0: number, z1: number, terrain: (x: number, z: number) => number, seed: number) => {
  const b = c.kit.batch(), r = new Rng(seed), rp = c.rp;
  for (let x = x0; x <= x1; x += 2.6) for (let z = z0; z <= z1; z += 2.2) {
    const y = terrain(x, z);
    b.add(new THREE.CylinderGeometry(0.04, 0.05, 1.5, 5), [x, y + 0.7, z], rp.holzDunkel);
    b.add(ball, [x, y + 1.05, z + 1.1], shade(r.pick(rp.rebe), r.range(0.9, 1.1)), undefined, [0, 0, 0], [0.42, 0.42, 1.05]);
    if (r.next() < 0.45) b.add(ballGrob, [x + (r.next() < 0.5 ? 0.38 : -0.38), y + 0.82, z + r.range(0.5, 1.6)], rp.trauben, undefined, [0, 0, 0], [0.09, 0.14, 0.09]);
  }
  const g = b.build("weinberg"); g.userData.kulisse = true; g.userData.occluder = false;
  return c.st(g);
};
/** Bleirohr als Rohr entlang eines Pfades (z. B. geheime Leitung). */
const rohr = (c: WCtx, pfad: V3[], r = 0.07, farbe?: string, name = "bleirohr") => {
  const k = new THREE.CatmullRomCurve3(pfad.map((p) => new THREE.Vector3(...p)), false, "catmullrom", 0.05);
  const m = c.kit.mesh(new THREE.TubeGeometry(k, Math.max(12, Math.round(k.getLength() * 2)), r, 8, false), farbe ?? c.ap.blei); m.name = name; m.userData.occluder = false;
  return c.st(m);
};
/** Steinrand eines kleinen Beckens (Rechteck w × d, Höhe h) mit Wasser. */
const steinBecken = (c: WCtx, at: V3, w: number, d: number, h: number, f = c.ap.klar) => {
  const b = c.kit.batch(), st = blocks(c.rp.travertin, shade(c.rp.travertin, 0.72));
  for (const s of [-1, 1]) { b.box([w + 0.5, h, 0.25], [0, h / 2, s * (d / 2 + 0.125)], "#ffffff", st); b.box([0.25, h, d], [s * (w / 2 + 0.125), h / 2, 0], "#ffffff", st); }
  b.box([w, 0.1, d], [0, 0.05, 0], shade(c.rp.travertin, 0.7));
  const g = b.build("steinbecken"), grp = new THREE.Group(); grp.add(g); grp.add(becken(c.uhr, f, [0, h - 0.12, 0], w - 0.02, d - 0.02, 0, { tempo: 0.5 }));
  grp.position.set(...at);
  return c.st(fest(grp, "steinbecken"));
};

// ---------------- kleine Bauten nur dieser Welt ----------------
/** Rundhütte des frühen Rom: Flechtwand mit Lehm, Kegeldach aus Stroh, Türöffnung nach +z. */
const huette = (c: WCtx, at: V3, r: number, turn: number, seed: number) => {
  const b = c.kit.batch(), rr = new Rng(seed), ap = c.ap, h = 1.9;
  b.add(new THREE.CylinderGeometry(r, r * 1.03, h, 20, 1, true), [0, h / 2, 0], "#ffffff", planks(ap.flechtwerk, true));
  b.add(new THREE.CylinderGeometry(r * 0.98, r * 0.98, 0.5, 20, 1, true), [0, 0.25, 0], ap.lehm);
  b.add(new THREE.ConeGeometry(r * 1.35, r * 1.5, 20), [0, h + r * 0.72, 0], ap.stroh, undefined, [0, rr.range(0, 30), 0]);
  b.add(new THREE.ConeGeometry(r * 1.38, 0.3, 20, 1, true), [0, h + 0.05, 0], shade(ap.stroh, 0.82));
  b.box([0.9, 1.5, 0.12], [0, 0.75, r - 0.02], "#2a1e16");
  for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.07, 0.08, 1.7, 6), [s * 0.5, 0.85, r + 0.02], c.rp.holzDunkel);
  b.add(new THREE.CylinderGeometry(0.06, 0.06, 1.1, 6), [0, 1.62, r + 0.05], c.rp.holzDunkel, undefined, [0, 0, 90]);
  const g = b.build("huette"); g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(turn);
  return c.st(fest(g));
};
/** Römischer Flusskahn: langer Rumpf, Ruder, Fässer/Amphoren; schaukelt. */
const kahn = (c: WCtx, at: V3, turn: number, phase: number, ladung = true): Lebendig => {
  const b = c.kit.batch(), rp = c.rp;
  b.add(ball, [0, 0.2, 0], rp.holz, planks(rp.holz), [0, 0, 0], [3.6, 0.55, 1.1]);
  b.box([6.4, 0.08, 1.6], [0, 0.58, 0], rp.holzDunkel);
  b.add(new THREE.ConeGeometry(0.25, 1.2, 6), [3.7, 0.9, 0], rp.holz, undefined, [0, 0, -60]);
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 3.6, 6), [-3.2, 0.7, 0.7], rp.holzDunkel, undefined, [60, 0, 20]);
  b.box([0.5, 0.06, 0.25], [-4.6, -0.3, 1.8], rp.holz);
  if (ladung) for (let i = 0; i < 5; i++) amphore(b, rp, [-1.6 + i * 0.7, 0.62, (i % 2 ? 0.3 : -0.3)], 0.55);
  const g = b.build("kahn"), o = new THREE.Group(); o.add(g); o.position.set(...at); o.rotation.y = THREE.MathUtils.degToRad(turn); o.name = "kahn";
  return { obj: klein(o), tick: (t) => { g.position.y = 0.06 * Math.sin(t * 1.3 + phase); g.rotation.z = 0.025 * Math.sin(t * 1.1 + phase * 2); g.rotation.x = 0.015 * Math.sin(t * 0.9 + phase); } };
};
/** Ruine einer Bogenreihe: n Felder (6,4 m) entlang x ab x0, Höhe je Feld verschieden, manche Felder fehlen, Efeu. */
const ruine = (c: WCtx, x0: number, z: number, n: number, seed: number, terrain: (x: number, z: number) => number) => {
  const r = new Rng(seed), g = new THREE.Group(), tex = rubble(c.ap.ruine, shade(c.ap.ruine, 0.72)), e = c.kit.batch();
  for (let i = 0; i < n; i++) {
    if (r.next() < 0.18) {   // Feld fehlt: nur ein Stumpf und Brocken
      const b = c.kit.batch(); b.box([2.2, r.range(0.8, 2.2), 2.6], [x0 + i * 6.4 + 1.1, 0.5, 0], "#ffffff", tex);
      for (let k = 0; k < 3; k++) b.add(ballGrob, [x0 + i * 6.4 + r.range(1, 5.5), 0.3, r.range(-2, 3)], "#ffffff", tex, [r.range(0, 60), r.range(0, 180), 0], [r.range(0.4, 0.8), r.range(0.3, 0.5), r.range(0.4, 0.8)]);
      const m = b.build("ruine-stumpf"); m.position.y = terrain(x0 + i * 6.4 + 3, z) - 0.3; m.position.z = z; g.add(m); continue;
    }
    const top = r.range(6.5, 10.5), xa = x0 + i * 6.4;
    const m = c.kit.mesh(arkadeGeo(xa, xa + 6.4, -2, top, 1, 2.6, { hoch: 0.62, weite: 0.66 }), "#ffffff", tex); m.position.set(0, terrain(xa + 3.2, z), z); m.name = "ruine-feld"; g.add(m);
    for (let k = 0; k < 7; k++) {   // Efeu-Polster an der Front und oben
      const ex = xa + r.range(0.2, 6.2), ey = r.range(top * 0.3, top), sz = r.range(0.5, 1.1);
      e.add(ball, [ex, terrain(xa + 3.2, z) + ey, z + 1.3 + sz * 0.25], r.pick(c.ap.efeu), undefined, [0, 0, 0], [sz, sz * 1.3, sz * 0.4]);
    }
    e.add(ball, [xa + 3.2, terrain(xa + 3.2, z) + top + 0.1, z], r.pick(c.ap.efeu), undefined, [0, 0, 0], [2.4, 0.4, 1.3]);
  }
  g.add(e.build("efeu"));
  return c.st(fest(g, "ruine"));
};

// ---------------- Zonen ----------------
const QUELLE_KANAL_Z = -4.95;
const ZONEN: Record<AquaZone, ZonenDef> = {
  quelle: {
    hoehe: (x, z) => {
      let h = 16 * glatt(-12, -80, z) * (0.8 + 0.2 * Math.sin(x / 23)) + welle(x, z, 1.6) + buckel(x, z, -40, -20, 6, 14) + buckel(x, z, 50, -30, 5, 18);
      h *= 1 - Math.max(rechteck(x, z, -10, 10, -14, 2, 5), rechteck(x, z, 2, 170, -8.5, -1.5, 4));
      return h * rand(x, z);
    },
    schicht: (x, z, h) => (h > 9 + 2 * Math.sin(x / 7) ? "fels" : rechteck(x, z, -3, 3, -3, 12, 0.5) > 0.5 ? "erde" : "gras"),
    frei: (x, z) => !(rechteck(x, z, -6, 6, -12, 0, 0) > 0) && !(x > 0 && x < 172 && z > -7.5 && z < -2.5),
    baeume: 260, wiese: [[-40, 60, -40, 30, 7000]],
    baue: (c, w) => {
      const q = quellhaus(c); q.position.set(0, 0, -8); c.st(q);
      const b = c.kit.batch(); const k = kanal(b, c, 1.8, 170, 0.06, QUELLE_KANAL_Z, { w: 1.0, h: 0.9, t: 0.4, tief: 0.42, deckel: true, offen: [[1.8, 26]] });
      c.st(fest(b.build("quell-kanal"))); c.st(k.wasser);
      felsen(c, [[-6, -13, 2.2, 0.8], [5, -14, 2.6, 0.7], [-9, -10, 1.6, 0.9], [8, -11, 1.4, 1], [-2, -16, 3.2, 0.6], [12, -18, 2.8, 0.7], [-14, -16, 2.4, 0.8], [-4, -4, 0.6, 0.7], [4.5, 1.5, 0.5, 0.8]], w.y, "quell-felsen");
      c.st(rinne(c.uhr, c.ap.klar, [-3.8, 2.2 + w.terrain(-3.8, -15), -15], [-1.6, 0.4, -9.9], 0.35, { tempo: 2.4 }));
      c.lebt(esel(c.kit, c.rp, c.ap, w.y(5.5, 1.5), -60, 0.3, "kruege"));
      baum(c, "pinie", w.y(-11, -3), 12, 1); baum(c, "zypresse", w.y(11, -2), 9, 2); baum(c, "olive", w.y(-8, 6), 4.5, 3);
      c.lebt(schilf(c.kit, c.ap, w.y(1.8, -2.4), { n: 14, w: 1.6, seed: 4 }));
    },
  },
  bruecke: {
    hoehe: (x, z) => {
      const ax = Math.abs(x);
      let h = -40 * (1 - glatt(20, 90, ax)) - 1.5 * glatt(8, 5, ax);
      h += 1.2 * Math.sin(z / 23 + x / 41) * glatt(7, 16, ax) * (1 - glatt(100, 140, ax) * 0.5);
      h += 8 * glatt(100, 180, ax) * (0.6 + 0.4 * Math.sin(z / 37)) * glatt(8, 30, Math.abs(z + 30));
      h = Math.min(h, Math.abs(z + 30) < 6 && ax > 105 ? 1 : 99);
      return h * rand(x, z) + (1 - rand(x, z)) * 0;
    },
    schicht: (x, z, h) => (h < -40.3 ? "kies" : h < -6 && h > -37 && Math.sin(z / 9) + Math.sin(x / 7) > 0.7 ? "fels" : "gras"),
    boden: (x) => (Math.abs(x) < 6.5 ? -40.6 : -99),
    frei: (x, z) => Math.abs(x) > 9 && !(Math.abs(z + 30) < 6) && !(Math.abs(x) < 26 && z > -6 && z < 14),
    baeume: 380, wiese: [[-40, 40, -60, 40, 6000]],
    baue: (c, w) => {
      const br = aquaeduktBruecke(c, -40); br.obj.position.z = -30; c.st(br.obj);
      w.wasser(water(c.rp.fluss, [14, 520], [0, -40.6, 0], c.sun));
      const r = new Rng(9);
      for (let i = 0; i < 9; i++) c.lebt(schaf(c.kit, c.np, w.y(12 + r.range(0, 9), -2 + r.range(-6, 10)), r.range(0, 360), r.range(0, 6)));
      c.lebt(ziege(c.kit, c.np, w.y(19, 9), 200, 1.2, 3));
      for (const [x, z, n] of [[-7, 10, 16], [7.5, -8, 14], [-7.5, -52, 12], [7, 30, 12]] as const) c.lebt(schilf(c.kit, c.ap, w.y(x, z), { n, w: 3, seed: Math.abs(x * z) }));
      felsen(c, [[-10, 4, 1.6, 0.6], [9, 18, 1.2, 0.7], [-12, -60, 2, 0.6], [24, 2, 1.4, 0.7]], w.y, "tal-felsen");
      baum(c, "olive", w.y(26, 6), 5, 11); baum(c, "zypresse", w.y(-24, 8), 10, 12);
    },
  },
  bogenreihe: {
    hoehe: (x, z) => {
      let h = welle(x, z, 1.4) + 1.2 + 10 * glatt(-80, -200, z) * (0.7 + 0.3 * Math.sin(x / 29)) + buckel(x, z, -120, 60, 5, 30);
      h *= glatt(13, 24, Math.abs(z + 35));
      h *= 1 - rechteck(x, z, 20, 40, 12, 28, 6);
      return h * rand(x, z);
    },
    schicht: (x, z) => (x > 56 && x < 124 && z > -4 && z < 54 ? "erde" : rechteck(x, z, -222, -196, -42, -24, 0) > 0 || rechteck(x, z, 20, 40, 12, 28, 0) > 0 ? "erde"
      : x > -30 && x < 50 && z > 40 && z < 120 && ((x + 30) % 26) > 2 ? "acker" : "gras"),
    frei: (x, z) => Math.abs(z + 35) > 4 && !rechteck(x, z, 55, 125, -5, 55, 0) && !rechteck(x, z, 18, 42, 10, 30, 0) && !rechteck(x, z, -225, -195, -44, -22, 0)
      && !rechteck(x, z, -96, -24, 16, 58, 0) && !(x > 60 && x < 75 && z > -34 && z < 8),
    baeume: 300, wiese: [[-100, 100, -20, 50, 8000], [-230, -180, -60, 0, 1500]],
    baue: (c, w) => {
      const br = bogenreihe(c, -200, 260, 9.5, [-40, 80]); br.position.z = -35; c.st(br);
      const bs = baustelleBogen(c, 9.5); bs.position.set(-206, w.terrain(-206, -35), -35); c.st(bs);
      c.lebt(tretkran(c.kit, c.rp, c.ap, w.y(-212, -29), 0, 0.2));
      c.st(grabwerkzeug(c.kit, c.rp, c.ap, w.y(-200, -29), 30));
      const hof = stadthaus(c.kit, c.rp, 12, 9, 1, 7); hof.position.set(30, w.terrain(30, 20) - 0.05, 20); hof.rotation.y = Math.PI; c.st(fest(hof));
      reben(c, 60, 120, 0, 50, w.terrain, 5);
      // geheimes Rohr: vom unteren Kanal am Pfeiler x 62,4 hinunter und unter dem Gras zum Becken im Weinberg
      rohr(c, [[62.4, 10.4, -33.7], [62.4, 6, -33.6], [62.4, 0.6, -33.5], [63.5, 0.15, -31], [68, 0.12, -10], [71.2, 0.3, 4.8]], 0.07, undefined, "geheimrohr");
      steinBecken(c, w.y(72, 6), 1.6, 1.2, 0.6);
      c.st(strahl(c.uhr, c.ap.klar, [71.3, w.terrain(72, 6) + 0.55, 5.1], [72, w.terrain(72, 6) + 0.48, 6], 0.03, { bogen: 0.1, tempo: 3 }));
      c.lebt(chorobates(c.kit, c.rp, c.ap, c.uhr, w.y(-60, 25), 0, 0.4));
      c.st(nivellierlatte(c.kit, c.rp, w.y(-40, 25), 0));
      c.lebt(groma(c.kit, c.rp, w.y(-80, 30), 20, 0.6));
      c.st(pfloecke(c.kit, c.rp, w.y(-74, 24), 0, 14, 6));
      c.lebt(ochse(c.kit, c.rp, w.y(22, 32), 80, 0.5)); c.lebt(esel(c.kit, c.rp, c.ap, w.y(40, 30), 200, 1.1, "steine"));
      baum(c, "pinie", w.y(42, 14), 13, 21); baum(c, "olive", w.y(16, 30), 4.8, 22); baum(c, "zypresse", w.y(-30, 18), 10, 23);
    },
  },
  tunnel: {
    hoehe: (x, z) => {
      const ax = Math.abs(x);
      let h = welle(x, z, 0.8) * glatt(-6, -20, z) + 6 * glatt(-60, -160, z);
      if (ax < 66 && z > -1 && z < 50) {
        const tief = Math.min(glatt(66, 62, ax), z >= 0 ? glatt(50, 45, z) : 0);
        h = h * (1 - tief) - 21 * tief;
      }
      if (ax < 61 && z > -40.5 && z <= -1) h = Math.max(h, 0.04);   // über dem Erdblock knapp darüber (nie bündig mit seiner Oberseite)
      return h * rand(x, z);
    },
    schicht: (x, z, h) => (h < -2 ? "fels" : x > 4 && x < 50 && z < -6 && z > -46 ? "acker" : "gras"),
    boden: (x, z) => (Math.abs(x) < 59.5 && z > -2.6 && z < -0.2 ? TUNNEL.y0 + 0.55 : -99), ersetzt: true,
    loch: (x, z) => Math.abs(x) < 60.5 && z > -1 && z < 0,
    frei: (x, z) => !(Math.abs(x) < 70 && z > -6) && !(x > 2 && x < 52 && z < -4 && z > -48),
    baeume: 260, wiese: [[-60, 60, -60, -4, 5000]],
    baue: (c, w) => {
      const t = tunnelSchnitt(c); c.st(t.obj);
      TUNNEL.schaechte.forEach((x, i) => c.lebt(haspel(c, [x, 0, -1.4], -TUNNEL.y1 + 0.2, { phase: i * 0.33, tempo: 0.12 + i * 0.02 })));
      c.st(leiter(c.kit, c.rp, [0.3, TUNNEL.y0 + 0.06, -2.3], 0, 13.2, 3));
      for (const x of TUNNEL.schaechte) { const b = c.kit.batch(); for (const s of [-1, 1]) b.box([0.3, 0.35, 3.4], [x + s * 0.95, 0.15, -1.4], shade(c.rp.travertin, 0.85)); c.st(fest(b.build("schachtrand"))); }
      c.lebt(ochse(c.kit, c.rp, w.y(20, -12), -90, 0.2)); c.st(pflug(c.kit, c.rp, w.y(17.2, -12), -90));
      c.st(grabwerkzeug(c.kit, c.rp, c.ap, [-20, TUNNEL.y0 + 0.55, -2.4], 0));
    },
  },
  siphon: {
    hoehe: (x, z) => {
      const ax = Math.abs(x);
      let h = -22 * (1 - glatt(15, 70, ax)) - 0.8 * glatt(3, 1.2, ax);
      h += welle(x, z, 1.1) * glatt(16, 30, ax) * glatt(4, 14, Math.abs(z));
      h += 9 * glatt(110, 200, ax) * glatt(12, 40, Math.abs(z));
      return h * rand(x, z);
    },
    schicht: (x, z, h) => (h < -22.3 ? "kies" : h < -4 && h > -20 && Math.sin(z / 8 + x / 5) > 0.75 ? "fels" : "gras"),
    boden: (x) => (Math.abs(x) < 1.6 ? -22.4 : -99),
    frei: (x, z) => Math.abs(z) > 5 && Math.abs(x) > 2.5,
    baeume: 300, wiese: [[-80, 80, -40, 40, 7000]],
    baue: (c, w) => {
      for (const [x, h, s] of [[-72, 8, 1], [72, 6, 2]] as const) { const t = beckenTurm(c, h, s); t.position.set(x, w.terrain(x, 0) - 0.3, 0); c.st(t); }
      const zu = bogenreihe(c, -258, -74.4, 7.9); zu.position.y = w.terrain(-72, 0) - 0.3; c.st(zu);
      const ab = bogenreihe(c, 74.4, 258, 5.4); ab.position.y = w.terrain(72, 0) - 0.3; c.st(ab);
      const venter = c.kit.mesh(arkadeGeo(-15, 15, -23, -19.6, 4, 2.4, { hoch: 0.72, weite: 0.6 }), "#ffffff", blocks(c.ap.tuff, c.ap.tuffFuge)); venter.name = "venter"; c.st(fest(venter));
      const pfad: V3[] = [[-69.6, 6.8, 0], [-69.2, 1.2, 0]];
      for (let x = -66; x <= 66; x += 6) pfad.push([x, Math.max(w.terrain(x, 0), Math.abs(x) <= 15 ? -19.6 : -99) + 0.05, 0]);
      pfad.push([69.2, 1.2, 0], [69.6, 4.8, 0]);
      c.st(rohrbuendel(c, pfad, { n: 3, r: 0.16, abstand: 0.38 }));
      c.st(rinne(c.uhr, c.ap.wasser, [0, -22.3, -250], [0, -22.3, 250], 2.6, { tempo: 1.4 }));
      c.lebt(schilf(c.kit, c.ap, w.y(2.5, 14), { n: 12, w: 2, seed: 41 })); c.lebt(schilf(c.kit, c.ap, w.y(-2.6, -18), { n: 12, w: 2, seed: 42 }));
      baum(c, "zypresse", w.y(-80, 10), 10, 31); baum(c, "olive", w.y(84, 9), 5, 32);
    },
  },
  wasserwerk: {
    hoehe: (x, z) => (welle(x, z, 0.5) * glatt(40, 70, Math.hypot(x, z + 10)) + 4 * glatt(-120, -220, z)) * rand(x, z),
    schicht: (x, z) => (rechteck(x, z, -46, 50, -32, 12, 0) > 0 ? "kies" : "gras"),
    frei: (x, z) => !rechteck(x, z, -50, 60, -36, 16, 0) && !(Math.abs(x + 34.6) < 5),
    baeume: 200, wiese: [[-80, 80, -60, 50, 6000]],
    baue: (c, w) => {
      const zu = bogenreihe(c, -200, -23.4, 6); zu.rotation.y = -Math.PI / 2; zu.position.x = -34.6; c.st(zu);
      const kb = klaerbecken(c); kb.position.set(-30, 0, -20); c.st(kb);
      c.st(vorhang(c.uhr, c.ap.wasser, [-34.6, 6.95, -23.45], 0.95, 0.4, 0, { tempo: 3, neig: 0.2 }));
      const ws = wasserschloss(c, { dicke: c.dicke }); ws.obj.position.set(30, 0, -10); c.st(ws.obj);
      rohr(c, [[-23.5, 4.1, -20], [-21.5, 1.2, -20], [-10, 0.35, -18], [20, 0.35, -11.5], [25.7, 1.0, -10]], 0.32, c.ap.bleiDunkel, "hauptrohr");
      c.lebt(wasserverkauf(c, w.y(44, -4), -30));
      c.st(kruege(c.kit, c.rp, w.y(45.6, -2.8), 0, 4, 2));
      const H: [number, number, number, number, number, number][] = [[-10, -50, 10, 9, 3, 0], [6, -52, 11, 9, 4, 0], [22, -50, 9, 10, 3, 0], [54, -36, 10, 10, 3, -90], [56, -18, 9, 11, 2, -90], [-56, -38, 9, 10, 3, 90]];
      H.forEach(([x, z, ww, d, s, t], i) => { const h = stadthaus(c.kit, c.rp, ww, d, s, 40 + i); h.position.set(x, w.terrain(x, z) - 0.05, z); h.rotation.y = THREE.MathUtils.degToRad(t); c.st(fest(h)); });
      baum(c, "zypresse", w.y(-14, 2), 9, 51); baum(c, "pinie", w.y(14, 8), 12, 52);
    },
  },
  strasse: {
    hoehe: (x, z) => (rechteck(x, z, -5.6, 5.6, -96, 64, 0) > 0 || rechteck(x, z, -16, 16, -86, -52, 0) > 0 ? -0.35 : welle(x, z, 0.6) * glatt(20, 40, Math.abs(x)) * rand(x, z)),
    schicht: (x) => (Math.abs(x) < 16 ? "erde" : "gras"),
    boden: (x, z) => {
      if (z < -52 && z > -86 && Math.abs(x) < 16) return 0.05;
      if (z < -96 || z > 64) return -99;
      const ax = Math.abs(x);
      if (Math.abs(z + 10) < 0.5 && (Math.abs(x) < 0.5 || Math.abs(x - 2) < 0.5 || Math.abs(x + 2) < 0.5)) return 0.45;
      return ax < 3.5 ? 0 : ax < 5.6 ? 0.25 : -99;
    },
    frei: (x) => Math.abs(x) > 18,
    baeume: 150, wiese: [[-60, 60, -60, 60, 2500]],
    baue: (c, w) => strasseBauen(c, w),
  },
  thermen: {
    hoehe: (x, z) => (rechteck(x, z, -29.6, 29.6, -7.6, 7.6, 0) > 0 ? -1.4 : welle(x, z, 0.6) * glatt(48, 70, Math.hypot(x, z - 10)) * rand(x, z)),
    schicht: (x, z) => (rechteck(x, z, -34, 34, -12, 42, 0) > 0 || rechteck(x, z, -66, -42, -8, 9, 0) > 0 ? "kies" : "gras"),
    boden: (x, z) => thermenBoden(x, z),
    frei: (x, z) => !rechteck(x, z, -70, 40, -16, 46, 0),
    baeume: 220, wiese: [[-90, 90, -60, 70, 5000]],
    baue: (c, w) => {
      c.st(thermen(c)); c.st(latrine(c));
      for (const [x, z] of [[-40, 20], [40, 26], [-44, -14], [44, -16]] as const) baum(c, "zypresse", w.y(x, z), 10, Math.abs(x * z));
      baum(c, "pinie", w.y(-38, 40), 13, 71); baum(c, "pinie", w.y(42, 44), 12, 72);
    },
  },
  cloaca: {
    hoehe: (x, z) => {
      let h = 0.5;
      if (z > -38) h = z < -2 ? -6.5 : -6.5 + 7 * glatt(-2, 6, z);
      if (z > 6) h = 0.5 + welle(x, z, 0.8) * glatt(10, 30, z);
      if (z < -40) h = 0.5 + 6 * glatt(-120, -220, z);
      return z < -38 || z > 6 ? h * rand(x, z) + (1 - rand(x, z)) * 0 : h;
    },
    schicht: (x, z, h) => (h < -1 ? "kies" : z < -38 ? "kies" : "gras"),
    boden: (x, z) => (z > -37.4 && z < -2 ? -4 : z <= -37.4 && z > -40 ? 0.5 : -99),
    frei: (x, z) => z > 4 && !(Math.abs(x - 60) < 6),
    baeume: 160, wiese: [[-80, 80, 4, 60, 5000]],
    baue: (c, w) => cloacaBauen(c, w),
  },
  fruehrom: {
    hoehe: (x, z) => {
      let h = welle(x, z, 1.3) + buckel(x, z, -50, -10, 10, 22) + buckel(x, z, 60, 10, 8, 26);
      h *= 1 - rechteck(x, z, -22, 22, -18, 18, 8) * 0.85;
      const dz = Math.abs(z + 40), m = glatt(16, 9, dz);
      h = h * (1 - m) + (-3.4 + 3 * glatt(3, 9, dz)) * m;
      return h * rand(x, z);
    },
    schicht: (x, z, h) => (h < -2.6 ? "kies" : rechteck(x, z, -14, 14, -10, 12, 0) > 0 || (Math.abs(x - z * 0.15) < 1.2 && z > -34 && z < 60) ? "erde" : "gras"),
    boden: (x, z) => (Math.abs(z + 40) < 5 ? -2.5 : -99),
    frei: (x, z) => !rechteck(x, z, -22, 22, -20, 18, 0) && Math.abs(z + 40) > 6,
    baeume: 260, wiese: [[-60, 60, -60, 50, 7000]],
    baue: (c, w) => {
      const H: [number, number, number, number][] = [[-12, -6, 2.6, 30], [-4, -12, 2.2, 10], [8, -8, 2.8, -20], [14, 4, 2.4, -60], [-14, 8, 2.3, 70], [2, 12, 2.0, 180]];
      H.forEach(([x, z, r, t], i) => huette(c, w.y(x, z), r, t, i + 1));
      const b = c.kit.batch(), st = rubble(c.rp.fels, shade(c.rp.fels, 0.7)), p = w.y(0, 0);
      b.add(new THREE.CylinderGeometry(0.6, 0.64, 0.8, 18, 1, true), [p[0], p[1] + 0.4, p[2]], "#ffffff", st);
      b.add(new THREE.TorusGeometry(0.62, 0.1, 6, 18), [p[0], p[1] + 0.8, p[2]], shade(c.rp.fels, 0.9), undefined, [90, 0, 0]);
      b.add(new THREE.CircleGeometry(0.56, 18), [p[0], p[1] + 0.2, p[2]], "#123048", undefined, [-90, 0, 0]);
      c.st(fest(b.build("ziehbrunnen")));
      c.lebt(haspel(c, [p[0], p[1] + 0.8, p[2]], 3.2, { tempo: 0.15 }));
      steinBecken(c, w.y(-6, 3), 3, 2, 0.5, c.ap.wasser);   // Zisterne
      w.wasser(water(c.rp.fluss, [520, 10], [0, -2.5, -40], c.sun));
      for (const [x, n] of [[-30, 14], [-6, 12], [18, 16], [40, 12]] as const) c.lebt(schilf(c.kit, c.ap, w.y(x, -34.5), { n, w: 4, seed: x + 100 }));
      c.st(kruege(c.kit, c.rp, w.y(3, 2.2), 0, 5, 3));
      c.lebt(ziege(c.kit, c.np, w.y(16, -14), 30, 0.7, 2)); c.lebt(schaf(c.kit, c.np, w.y(18, -16), 120, 2.1));
      baum(c, "olive", w.y(-20, -16), 5, 91); baum(c, "olive", w.y(22, 14), 4.5, 92);
    },
  },
  innen: {
    hoehe: () => 0,
    schicht: () => "gras",
    boden: (x, z) => innenBoden(x, z),
    frei: (x, z) => !rechteck(x, z, -40, 46, -12, 12, 4),
    baeume: 80, wiese: [],
    baue: (c) => { c.st(innenraeume(c)); },
    aussen: false,
  },
  heute: {
    hoehe: (x, z) => {
      let h = welle(x, z, 1.2) + 1;
      if (z < -40) h = h * glatt(-56, -40, z) - 4 * glatt(-40, -56, z);
      return h * rand(x, z);
    },
    schicht: (x, z, h) => (h < -1.2 ? "kies" : "gras"),
    boden: (x, z) => (z < -50 ? -1.5 : -99),
    frei: (x, z) => Math.abs(z + 10) > 4 && z > -44 && !rechteck(x, z, -10, 0, -50, -40, 0),
    baeume: 220, wiese: [[-80, 80, -44, 60, 8000]],
    baue: (c, w) => {
      ruine(c, -60, -10, 19, 7, w.terrain);
      w.wasser(water(c.ap.see, [520, 210], [0, -1.5, -150], c.sun));
      c.lebt(forschungsboot(c.kit, c.ap, [10, -1.5, -72], 30, 0.4));
      c.st(bohrkernTisch(c.kit, c.ap, w.y(-6, -44.5), 0));
      felsen(c, [[-20, 12, 1.2, 0.6], [30, 6, 0.9, 0.7], [44, -14, 1.4, 0.6]], w.y, "ruine-brocken");
      baum(c, "pinie", w.y(-30, 10), 13, 111); baum(c, "zypresse", w.y(26, 14), 10, 112);
      baum(c, "olive", w.y(-13, 3), 4.5, 113); baum(c, "olive", w.y(15, 0), 4.2, 114); baum(c, "zypresse", w.y(-22, -2), 9, 115);
      c.lebt(schaf(c.kit, c.np, w.y(-5, 4), 40, 0.6)); c.lebt(schaf(c.kit, c.np, w.y(7, 2.5), 210, 1.7)); c.lebt(schaf(c.kit, c.np, w.y(2, 7), 120, 2.9));
    },
  },
};

// ---------------- Stadtstrasse ----------------
const strasseBauen = (c: WCtx, w: ZonenWerk) => {
  const ap = c.ap, rp = c.rp, b = c.kit.batch(), r = new Rng(61);
  b.box([7, 0.35, 160], [0, -0.175, -16], "#ffffff", slabs(rp.pflaster, rp.pflasterFuge));
  for (const s of [-1, 1]) {
    b.box([2.1, 0.6, 160], [s * 4.55, -0.05, -16], "#ffffff", slabs(rp.travertin, shade(rp.travertin, 0.75)));
    b.box([0.16, 0.62, 160], [s * 3.5, -0.04, -16], shade(rp.randstein, 0.95));
  }
  b.box([32, 0.4, 34], [0, -0.15, -69], "#ffffff", slabs(rp.travertin, shade(rp.travertin, 0.78)));
  for (const x of [-2, 0, 2]) b.box([0.9, 0.8, 0.9], [x, 0.05, -10], shade(rp.randstein, 1.05));   // Trittsteine
  c.st(fest(b.build("strasse")));
  // Häuser links und rechts (Front zur Strasse), Lücken für Bäckerei, Taberna, Platz
  const links: [number, number, number][] = [[-82, 10, 4], [-40, 12, 4], [-30.7, 6.6, 3], [-6, 10, 4], [6, 12, 5], [20, 10, 4], [32, 12, 3], [46, 10, 4], [58, 8, 3]];
  const rechts: [number, number, number][] = [[-82, 10, 4], [-40, 12, 5], [-27, 11, 4], [-14, 10, 3], [6, 10, 4], [18, 12, 5], [31, 10, 3], [44, 12, 4], [56, 9, 4]];
  for (const [liste, s] of [[links, -1], [rechts, 1]] as const) liste.forEach(([z, d, st], i) => {
    const wd = 9 + (i % 3), h = stadthaus(c.kit, rp, d, wd, st, 80 + i * 2 + (s > 0 ? 1 : 0)); h.position.set(s * (5.6 + wd / 2), 0, z); h.rotation.y = s < 0 ? Math.PI / 2 : -Math.PI / 2; c.st(fest(h));
  });
  // Bäckerei links (z −17…−27): offene Front, Ofen mit Glut, Brote auf der Theke; vor der Tür gehobene Platten mit dem geheimen Rohr
  c.st(fest(baeckerei(c, [-10.1, 0.25, -22])));
  c.st(deckplatten(c.kit, ap, [-4.5, 0.25, -22], 20, 4));
  c.st(bleirohre(c.kit, ap, [-4.6, -0.05, -22.6], 90, 2.4, 5));
  rohr(c, [[-3.6, 0.0, -24.6], [-4.4, 0.02, -22.2], [-5.6, 0.1, -21.6]], 0.06, undefined, "baecker-rohr");
  // Taberna rechts (z −2…−8) mit Theke und Amphoren, Gemüsestand davor
  const tb = c.kit.batch(); tb.box([1.0, 1.0, 4.4], [6.6, 0.75, -5], "#ffffff", slabs(rp.marmor, shade(rp.marmor, 0.8)));
  for (let i = 0; i < 4; i++) amphore(tb, rp, [7.2, 1.25, -6.6 + i * 1.1], 0.55);
  c.st(klein(tb.build("taberna")));
  c.st(marktstand(c.kit, rp, [5.2, 0.25, 10], -90, 3));
  // Löwenbrunnen (läuft über), Rinne im Rinnstein nach Süden
  c.lebt(loewenbrunnen(c, [4.5, 0.26, -6], -90, { ueberlauf: c.ueberlauf }));
  c.st(rinne(c.uhr, ap.wasser, [3.3, 0.02, -2.4], [3.3, 0.02, 60], 0.32, { tempo: 2 }));
  // Wäsche über der Strasse, Markisen, Tiere
  for (const [z, y] of [[-30, 7.4], [-14, 8.6], [2, 7.8], [24, 9.2], [40, 7.6]] as const) c.lebt(waescheleine(c.kit, ap, [-5.6, y, z], [5.6, y + r.range(-0.4, 0.4), z + r.range(-1.5, 1.5)], { n: 7, seed: z + 200, wind: 0.6 }));
  for (const [z, s, ww] of [[-36, -1, 4], [14, 1, 3.4], [30, -1, 3.6], [-44, 1, 4]] as const) c.lebt(markise(c.kit, ap, [s * 5.55, 3.1, z], s < 0 ? 90 : -90, { w: ww, tiefe: 1.6, seed: z + 50 }));
  c.lebt(hund(c.kit, ap, [-2.2, 0, 4], 140, 0.5));
  c.lebt(tauben(c.kit, ap, [1.4, 0, -40], 6, 1.4, 7)); c.lebt(tauben(c.kit, ap, [-5, 0.08, -58], 5, 1.2, 8));
  c.lebt(esel(c.kit, rp, ap, [-1.4, 0.03, 20], 180, 0.9, "kruege"));
  // Platz mit Zierbrunnen, Säulenhalle im Hintergrund
  c.lebt(zierbrunnen(c, [0, 0.05, -68], { muenzen: 60 }));
  const tp = tempel(c.kit, rp); tp.position.set(0, 0.05, -100); c.st(fest(tp));
  for (const [x, z] of [[-12, -60], [12, -60], [-12, -78], [12, -78]] as const) baum(c, "zypresse", [x, 0.05, z], 8.5, Math.abs(x * z));
  void w;
};
/** Bäckerei: Raum mit offener Front nach +x (zur Strasse), Theke, gemauerter Ofen mit Glut, Mühle, Brote. */
const baeckerei = (c: WCtx, at: V3) => {
  const g = new THREE.Group(), b = c.kit.batch(), rp = c.rp, ap = c.ap, W = 9, D = 10, H = 6.2;
  b.box([W, H, 0.4], [0, H / 2, -D / 2], "#ffffff", slabs(rp.putz[0], shade(rp.putz[0], 0.85)));
  b.box([W, H, 0.4], [0, H / 2, D / 2], "#ffffff", slabs(rp.putz[0], shade(rp.putz[0], 0.85)));
  b.box([0.4, H, D], [-W / 2, H / 2, 0], "#ffffff", slabs(rp.putz[0], shade(rp.putz[0], 0.85)));
  b.box([0.5, H - 3.2, D], [W / 2, 3.2 + (H - 3.2) / 2, 0], "#ffffff", slabs(rp.putz[0], shade(rp.putz[0], 0.85)));   // Sturz über der offenen Front
  b.box([W, 0.3, D], [0, H + 0.15, 0], "#ffffff", tiles(rp.ziegel));
  b.box([W - 0.4, 0.06, D - 0.4], [0, 0.03, 0], shade(ap.lehm, 0.9));
  b.box([1.0, 1.0, 5], [W / 2 - 1.0, 0.5, 0], "#ffffff", slabs(rp.marmor, shade(rp.marmor, 0.8)));   // Theke
  b.add(new THREE.SphereGeometry(1.6, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), [-2.2, 0.9, -2.6], "#ffffff", blocks(ap.ofen, shade(ap.ofen, 0.7)));
  b.box([3.4, 0.9, 3.4], [-2.2, 0.45, -2.6], "#ffffff", blocks(ap.ofen, shade(ap.ofen, 0.7)));
  b.box([0.9, 0.7, 0.12], [-2.2, 1.25, -0.95], "#2a1a12");
  b.add(new THREE.ConeGeometry(0.7, 1.4, 12), [-2.4, 0.7, 2.6], shade(rp.fels, 1.05)); b.add(new THREE.ConeGeometry(0.75, 1.1, 12), [-2.4, 1.6, 2.6], shade(rp.fels, 0.9), undefined, [180, 0, 0]);   // Mühle
  g.add(b.build("baeckerei"));
  g.add(brote(c.kit, rp, ap, [W / 2 - 1.0, 1.0, -1.2]));
  g.add(brote(c.kit, rp, ap, [W / 2 - 1.0, 1.0, 1.0], 0, 5));
  g.add(c.lebt(glutFeuer([-2.2, 0.95, -1.1], { w: 0.6, groesse: 0.5, phase: 0.6 })).obj);
  g.position.set(...at);
  return g;
};

// ---------------- Cloaca und Tiber ----------------
const cloacaBauen = (c: WCtx, w: ZonenWerk) => {
  const ap = c.ap, rp = c.rp, b = c.kit.batch(), tex = blocks(ap.tuff, ap.tuffFuge);
  w.wasser(water(ap.tiber, [520, 37], [0, -4, -19.6], c.sun));
  // Kai im Norden: Mauer von −7 bis 0,5, mit dem Mund der Cloaca (drei Bogenringe), Treppe zum Wasser
  for (const [a, e] of [[-260, -3.4], [3.4, 260]]) b.box([e - a, 7.5, 1.4], [(a + e) / 2, -3.25, -38.3], "#ffffff", tex);
  b.box([6.8, 3.4, 1.4], [0, -1.2 + 1.5, -38.3], "#ffffff", tex);
  b.box([6.8, 3.3, 1.4], [0, -5.35, -38.3], "#ffffff", tex);
  const tor = new THREE.Group();
  for (let i = 0; i < 3; i++) { const sh = new THREE.Shape(), R = 2.1 + i * 0.55, rr = R - 0.5; sh.absarc(0, 0, R, 0, Math.PI, false); sh.lineTo(-rr, 0); sh.absarc(0, 0, rr, Math.PI, 0, true); sh.closePath();
    const m = c.kit.mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.5 - i * 0.12, bevelEnabled: false, curveSegments: 20 }), shade(ap.tuff, 0.95 - i * 0.06)); m.position.set(0, -3.7, -37.6 + i * 0.01 - (0.5 - i * 0.12) * 0); tor.add(m); }
  for (const s of [-1, 1]) b.box([0.9, 0.8, 1.6], [s * 3.0, -3.3, -38.3], "#ffffff", tex);
  b.box([4.2, 2.4, 2.4], [0, -2.6, -40.4], "#1d1712");   // dunkle Röhre dahinter
  b.box([520, 0.5, 1.8], [0, 0.6, -38.6], shade(ap.tuff, 0.9));
  for (let i = 0; i < 8; i++) b.box([2.2, 0.35, 0.8], [20, -0.5 - i * 0.6, -37.3 + i * 0.75 * 0.0 + i * 0.01], shade(ap.tuff, 0.88));   // Treppe am Kai
  c.st(fest(b.build("kai"))); c.st(fest(tor, "cloaca-mund"));
  c.st(vorhang(c.uhr, ap.kloake, [0, -2.9, -37.5], 3.4, 1.1, 0, { tempo: 2.6, neig: 0.25 }));
  c.st(rinne(c.uhr, ap.kloake, [0, -2.92, -41], [0, -2.92, -37.6], 3.2, { tempo: 2.2 }));
  c.lebt(spritzer([0, -3.98, -36.5], { n: 16, kraft: 0.4, weite: 1.4, farbe: ap.kloake.glanz, ring: ap.kloake.hell, seed: 81 }));
  const fleck = new THREE.Mesh(new THREE.CircleGeometry(6, 32), new THREE.MeshBasicMaterial({ color: ap.kloake.tief, transparent: true, opacity: 0.45, depthWrite: false, fog: true }));
  fleck.rotation.x = -Math.PI / 2; fleck.position.set(0, -3.95, -30); fleck.scale.set(1, 1.2, 1); fleck.userData.occluder = false; fleck.name = "kloake-fahne"; c.st(fleck);
  // Brücke, Boote, Ufer, Stadt
  const br = bruecke(c.kit, rp, 44, 6.7, [-12, 0, 12], 4.8, -7.6); br.position.set(60, 0.5, -20); c.st(fest(br));
  c.lebt(kahn(c, [24, -4, -24], 80, 0.3)); c.lebt(kahn(c, [-30, -4, -14], -100, 1.7, false)); c.lebt(kahn(c, [90, -4, -28], 95, 2.6));
  for (const [x, n] of [[-40, 18], [-14, 14], [12, 16], [36, 14]] as const) c.lebt(schilf(c.kit, c.ap, w.y(x, -1.5), { n, w: 5, seed: x + 300 }));
  const H: [number, number, number, number, number][] = [[-60, -48, 10, 9, 4], [-44, -50, 9, 10, 3], [-24, -48, 11, 9, 4], [18, -48, 10, 9, 3], [34, -50, 9, 10, 5], [80, -48, 10, 9, 3], [96, -50, 11, 10, 4]];
  H.forEach(([x, z, ww, d, s], i) => { const h = stadthaus(c.kit, rp, ww, d, s, 120 + i); h.position.set(x, 0.5, z); c.st(fest(h)); });
  const tp = tempel(c.kit, rp); tp.position.set(-6, 0.5, -76); c.st(fest(tp));
  c.st(kruege(c.kit, rp, [16, 0.5, -40.6], 0, 5, 9));
};

// ---------------- Orte (Kamera-Vorschläge) ----------------
export type AquaPlace = { at: V3; wide: { pos: V3; look: V3 }; medium: { pos: V3; look: V3 }; note: string };
const ort = (zone: AquaZone, at: V3, wide: [V3, V3], medium: [V3, V3], note: string): AquaPlace => {
  const dx = ZX(zone), v = (p: V3): V3 => [p[0] + dx, p[1], p[2]];
  return { at: v(at), wide: { pos: v(wide[0]), look: v(wide[1]) }, medium: { pos: v(medium[0]), look: v(medium[1]) }, note };
};
export const AQUA_PLACES: Record<string, AquaPlace> = {
  quelle: ort("quelle", [0, 0, -4], [[10, 5, 16], [0, 1.6, -8]], [[3, 1.7, 2.5], [0, 1.0, -6.5]], "Quellhaus am Hang, Wasser fällt ins Becken, Kanal läuft nach rechts (+x), Esel mit Krügen"),
  "quelle-kanal": ort("quelle", [14, 0, -2], [[24, 4, 8], [40, 0.5, -5]], [[16, 1.6, -1.5], [24, 0.4, -5]], "offener Kanal mit fliessendem Wasser, weiter hinten mit Deckplatten"),
  bruecke: ort("bruecke", [14, -40, 0], [[52, -15, 62], [0, -24, -30]], [[16, -38.3, 2], [4, -32, -30]], "dreistöckige Aquädukt-Brücke über das Tal (Boden −40), Fluss darunter, Schafe bei x 12…20"),
  "bruecke-oben": ort("bruecke", [0, 3.5, -30], [[-14, 7, -24], [8, 3.8, -30]], [[-3, 5.6, -27], [4, 3.6, -30]], "oben auf der Brücke: Kanal mit Wasser, Blick ins Tal"),
  bogenreihe: ort("bogenreihe", [20, 0, -20], [[-10, 6, 40], [30, 7, -35]], [[20, 2, -18], [20, 7.5, -35]], "lange Bogenreihe über die Felder, Doppelkanal x −40…80"),
  doppelkanal: ort("bogenreihe", [20, 0, -30], [[20, 13, -20], [20, 10.5, -35]], [[12, 12.2, -30], [20, 11, -35]], "zwei Kanäle übereinander: unten geschlossen mit Fenstern, oben offen"),
  baustelle: ort("bogenreihe", [-206, 0, -28], [[-190, 5, -8], [-206, 5, -35]], [[-200, 1.7, -24], [-206, 4, -33]], "unfertiger Bogen mit Lehrgerüst, Tretkran (−212, −29)"),
  vermessung: ort("bogenreihe", [-60, 0, 28], [[-60, 4, 44], [-60, 1, 25]], [[-56, 1.6, 31], [-60, 1.1, 25]], "Chorobates (−60, 25), Latte (−40, 25), Groma (−80, 30), Pflöcke"),
  "geheimrohr-weinberg": ort("bogenreihe", [68, 0, 2], [[80, 5, 22], [66, 2, -10]], [[74, 1.5, 11], [72, 0.6, 6]], "geheimes Bleirohr vom Pfeiler x 62,4 zum Becken (72, 6) im Weinberg, Bauernhof (30, 20)"),
  tunnel: ort("tunnel", [0, -12.45, -1.4], [[0, -9, 28], [0, -8, -1.4]], [[-8, -11.4, 7], [-6, -11.6, -1.4]], "Tunnel im Querschnitt: Kanal, Öllampen, drei Schächte mit Haspeln, Leiter im mittleren; Figuren im Tunnel: z −2,6…−0,2"),
  "tunnel-oben": ort("tunnel", [10, 0, -10], [[30, 5, 20], [8, 0, -8]], [[14, 1.7, -4], [18, 1.2, -12]], "oben: Schachtöffnungen mit Haspeln, Bauer mit Ochse und Pflug (20, −12)"),
  siphon: ort("siphon", [0, -22, 10], [[0, 12, 95], [0, -8, 0]], [[8, -20.4, 14], [0, -19.4, 0]], "Siphon: Kopfturm x −72, Rohrbündel durchs Tal, Rohrbrücke (venter) x ±15, Empfangsturm x 72"),
  kopfturm: ort("siphon", [-66, 0, 6], [[-56, 6, 22], [-72, 6, 0]], [[-66, 3.2, 8], [-72, 5.2, 0]], "Kopfturm mit Becken, Rohre gehen den Hang hinunter"),
  klaerbecken: ort("wasserwerk", [-30, 0, -10], [[-30, 4.4, 0], [-30, 3.2, -20]], [[-26, 4.2, -12], [-30, 3.0, -20]], "Klärbecken im Schnitt: links trüb mit Schlamm, rechts klar"),
  wasserschloss: ort("wasserwerk", [30, 0, -2], [[30, 6.5, 8], [30, 1, -12]], [[30, 4.4, -6.2], [30, 1, -13.2]], "Wasserschloss: Becken, Schieber, Rohrfächer hinter der Rückwand, eine Düse zu dick (golden)"),
  wasserverkauf: ort("wasserwerk", [44, 0, -2], [[40, 3, 8], [44, 1.2, -4]], [[42, 1.7, 0], [44, 1.1, -4]], "geheimer Wasserverkauf an einem angezapften Rohr"),
  strasse: ort("strasse", [0, 0, 6], [[1, 4.5, 34], [0, 3, -20]], [[-1.4, 1.7, 0], [4, 1.2, -6]], "Stadtstrasse mit Wäsche, Markisen; Löwenbrunnen (4,2, −6) läuft über, Rinnstein"),
  "baeckerei-rohr": ort("strasse", [-4.5, 0.25, -20], [[2, 3, -14], [-5, 0.5, -22]], [[-2.2, 1.5, -19.5], [-4.5, 0.2, -22.2]], "gehobene Platten vor der Bäckerei, geheimes Rohr darunter"),
  zierbrunnen: ort("strasse", [0, 0.05, -60], [[0, 4, -48], [0, 1.5, -68]], [[2.4, 1.7, -61], [0, 1.0, -68]], "Platz mit Zierbrunnen, Münzen im Becken, Tempel dahinter"),
  thermen: ort("thermen", [0, 0, 30], [[0, 7, 64], [0, 5, 0]], [[6, 1.8, 20], [0, 4, 8]], "Thermen von aussen, Palästra mit Säulengang, Rauch aus dem Heizofen"),
  frigidarium: ort("thermen", [-20, 0.3, 4], [[-20, 3.2, 7], [-20, 0.6, -4]], [[-17, 1.9, 4], [-20, 0.2, -2]], "Kaltbad mit Löwenkopf-Speier"),
  caldarium: ort("thermen", [20, 0.3, 4], [[20, 4, 7.4], [20, 2.5, -4]], [[17, 2.0, 4.5], [20, 0.6, -1]], "Warmbad unter der Kuppel, Dampf"),
  bibliothek: ort("thermen", [0, 0.3, -6], [[0, 2.4, 5], [0, 2, -10]], [[1.2, 1.9, -5.5], [0, 1.7, -11]], "Bibliotheks-Nische mit Rollenregalen"),
  heizofen: ort("thermen", [34, 0, 4], [[42, 3, 9], [32, 1.2, -2]], [[36, 1.6, 2.5], [33.6, 0.8, -2]], "Heizofen (praefurnium) mit Feuer und Holz"),
  latrine: ort("thermen", [-54, 0.2, 3], [[-54, 2.4, 8], [-54, 0.9, -4.5]], [[-51, 1.5, 3], [-55, 0.9, -4]], "Latrine: Bank mit Löchern, fliessendes Wasser, Schwamm-Stäbe"),
  cloaca: ort("cloaca", [10, -4, -24], [[14, 3, 16], [0, -2.5, -38]], [[4, -2.3, -26], [0, -3.2, -38]], "Mund der Cloaca Maxima: braunes Wasser fällt in den Tiber, Boote, Brücke x 60"),
  tiber: ort("cloaca", [40, -4, -20], [[80, 6, 30], [30, -1, -30]], [[30, -2.6, -14], [24, -3.4, -24]], "Tiber mit Booten und Steinbrücke, Stadt am Nordufer"),
  fruehrom: ort("fruehrom", [0, 0, 6], [[10, 6, 32], [0, 1, -4]], [[4, 1.7, 5], [0, 1.0, 0]], "frühes Rom: Rundhütten, Ziehbrunnen mit Haspel (0, 0), Zisterne (−6, 3)"),
  "fruehrom-fluss": ort("fruehrom", [6, -2.5, -32], [[10, 2, -18], [0, -2, -40]], [[4, 0, -30], [0, -2.2, -40]], "Fluss mit Schilf, wo Wasser geholt wird"),
  buero: ort("innen", [-30, 0.12, 0], [[-30, 2.2, 4.2], [-29.6, 1.3, -3]], [[-28.8, 1.6, 1.6], [-29.5, 1.0, -1]], "Büro des Frontinus: Schreibtisch mit Plan, Rollenregale, Öllampen"),
  kueche: ort("innen", [-10, 0.12, 0], [[-10, 2.2, 4.2], [-10.8, 1.2, -3.5]], [[-9, 1.6, 1], [-11, 1.2, -4.1]], "Küche: Herd mit Bleitopf (Traubensirup), Kräuter, Brot, Krüge"),
  werkstatt: ort("innen", [10, 0.12, 0], [[10, 2.2, 4.2], [9, 1.2, -3]], [[8.5, 1.6, 0.5], [7.2, 1.3, -4]], "Bleirohr-Werkstatt: Schmelzofen, Bleiplatten, Rohre"),
  atrium: ort("innen", [34, 0.12, 2], [[34, 2.3, 6.3], [34, 1.2, -4]], [[35.4, 1.6, 2.2], [34.6, 0.5, -0.5]], "Atrium einer Villa: Impluvium mit Strahl, Säulen, Lararium, Lichtsäule"),
  ruinen: ort("heute", [0, 0, 6], [[0, 4, 34], [0, 4, -10]], [[6, 1.7, 2], [3, 3.5, -10]], "Ruinen der Bogenreihe heute, mit Efeu"),
  "see-boot": ort("heute", [0, 0, -42], [[-6, 2.6, -30], [4, -0.3, -62]], [[-2.2, 1.5, -39.6], [-4.6, 0.9, -43.8]], "See mit Forschungsboot, Bohrkern-Tisch am Ufer (−6, −44,5)"),
};

/** Zonen, die für diese Kameras gebaut werden (Kamera-x ±420 m). */
export const aquaZonenFuer = (kameraXs: number[], immer: AquaZone[] = []) =>
  AQUA_ZONEN.filter((z, k) => immer.includes(z) || kameraXs.some((x) => Math.abs(x - k * AQUA_ZONE_ABSTAND) < 420));

export const aqua = (kit: Kit, look: AquaLook, seed = 1, opt: AquaOptions = {}, kameraXs: number[] = [0]) => {
  const root = new THREE.Group(); root.name = "aqua";
  const leben: Lebendig[] = [], wasserFl: { tick: (t: number, cam: THREE.Camera, sun?: THREE.Vector3) => void }[] = [];
  const zonen = aquaZonenFuer(kameraXs, opt.zonen);
  const r = new Rng(seed * 73);
  // flacher Boden zwischen den Zonen, mit einem Loch unter jeder gebauten Zone (Täler der Zonen liegen tiefer); der Rand der Zonen
  // läuft ab 252 m auf 0 aus und liegt so über dem Boden (−0,3)
  const flaeche = new THREE.Shape([new THREE.Vector2(-1200, -1200), new THREE.Vector2(7800, -1200), new THREE.Vector2(7800, 1200), new THREE.Vector2(-1200, 1200)]);
  for (const zone of zonen) {
    const x = ZX(zone);
    flaeche.holes.push(new THREE.Path([new THREE.Vector2(x - 250, -250), new THREE.Vector2(x - 250, 250), new THREE.Vector2(x + 250, 250), new THREE.Vector2(x + 250, -250)]));
  }
  const boden = kit.mesh(new THREE.ShapeGeometry(flaeche).rotateX(-Math.PI / 2), "#ffffff", grass(look.rp.grasFern)); boden.position.y = -0.3; boden.name = "boden-fern"; boden.userData.occluder = false; root.add(boden);
  for (const zone of zonen) {
    const zg = new THREE.Group(); zg.name = `zone-${zone}`; zg.position.x = ZX(zone); root.add(zg);
    const def = ZONEN[zone], uhr = new FlussUhr();
    const c: WCtx & { np: NordPalette; dicke?: number; ueberlauf?: boolean } = {
      kit, ap: look.ap, rp: look.rp, np: look.np, uhr, sun: look.sunColor, dicke: opt.dickeDuese, ueberlauf: opt.ueberlauf,
      lebt: (l) => { zg.add(l.obj); leben.push(l); return l; },
      st: (o) => { zg.add(o); return o; },
    };
    leben.push({ obj: new THREE.Group(), tick: (t) => uhr.tick(t) });
    const terrain = (x: number, z: number) => terrainAt(zone, x, z);
    const yAt = (x: number, z: number): V3 => { const t = terrain(x, z), b = def.boden ? def.boden(x, z) : -99; return [x, b > -99 && def.ersetzt ? b : Math.max(t, b), z]; };
    zg.add(gelaende(kit, look.rp, look.ap, zone));
    def.baue(c, { y: yAt, terrain, wasser: (w) => { zg.add(w.mesh); wasserFl.push(w); } });
    if (def.wiese?.length) zg.add(wiese(kit, look.rp, zone, def.wiese, seed * 7 + ZX(zone)));
    if (def.baeume) zg.add(wald(kit, look.rp, zone, def.baeume, seed * 11 + ZX(zone)));
    if (def.aussen !== false) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2 + r.range(-0.2, 0.2), d = r.range(200, 290);
        zg.add(cloud(look.clouds, [Math.cos(a) * d, r.range(70, 140), Math.sin(a) * d - 40], r.range(1.4, 2.2), i + ZX(zone)));
      }
      if (opt.voegel !== false) c.lebt(voegel([0, 26, -30], { n: 6, radius: 22, tempo: 0.07, seed: 3 + AQUA_ZONEN.indexOf(zone), farbe: "#3a3540" }));
    }
  }
  // Der Himmel der Bühne ist eine Kugel um den Ursprung (900 m); die Zonen liegen bis 6600 m weit weg – darum wandert er mit der Kamera
  let himmel: THREE.Object3D | null | undefined;
  const tick = (time: number, cam: THREE.Camera, sunDir?: THREE.Vector3) => {
    if (himmel === undefined) { let top: THREE.Object3D = root; while (top.parent) top = top.parent; himmel = top.getObjectByName("sky") ?? null; }
    if (himmel) himmel.position.copy(cam.position);
    for (const w of wasserFl) w.tick(time, cam, sunDir);
    for (const l of leben) l.tick(time);
  };
  return { root, tick, groundAt: aquaGroundAt };
};

export { kies as _aquaKies };
