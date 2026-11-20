// Herkunft: eigen (V-Video), geschrieben 2026-11-16, ohne Vorlage.
// Bayreuth 1876: Festspielhaus auf dem Hügel (aussen, um x 0), Zuschauerraum mit Bühne (innen, um x 400) und Garderobe
// (um x 470). Drei Orte in einer Welt, weit auseinander – innen sieht man den Himmel nie.
//  - Aussen: Backstein mit Sandstein-Gliederung, Eingangsbau mit fünf Bögen und Balkon, Zuschauerhaus, hohes Bühnenhaus mit
//    Fachwerk, Fahnen; Vorplatz aus Kies, Springbrunnen, Blumentöpfe, Kastanien-Alleen, Gaslaternen, Bänke,
//    Büsche, Park-Wald und Wolken.
//  - Saal: ansteigende Sitzreihen im Fächer, Säulen mit Gaslampen, Fürstengalerie, gemalte Segeltuch-Decke, verdeckter
//    Orchestergraben (Schalldeckel) mit Pult des Dirigenten, Doppel-Proszenium, roter Vorhang (öffnet schräg zu den Seiten),
//    Rampenlicht, Bühnenbild (gemalter Prospekt, Felsen, Tannen).
//  - Garderobe: Schminktisch mit Spiegel und Lampen, Helmständer mit Hörner- und Flügelhelm, Kostümstange, Requisiten.
// Bewegung nur aus der Shot-Zeit (Vorhang, Flackern der Gaslichter, Fahnen).
import * as THREE from "three";
import { Rng } from "../core/random";
import { Kit, archFrame, archShape, extrude } from "./kit";
import type { V3 } from "../camera/rig";
import { brick, glass, grass, kies, planks, plaster, rock, shade, buehnenbild, tapete, velum, webstoff } from "./paint";
import { bush, cloud, tree, type CloudColors } from "./nature";
import { NOINK } from "../post/ink";
import { bench, blumentopf, lantern } from "./props";
import { fahne, flacker, type Lebendig } from "./leben";

import type { WorldPalette } from "./palette";

export type BayreuthPalette = {
  ziegel: string; ziegelFuge: string; sandstein: string; sandsteinDunkel: string; dach: string; fachwerk: string; tuer: string; glas: string;
  kies: string; kiesFuge: string; rasen: string; putz: string; saeule: string; gold: string; rot: string; rotDunkel: string; sitz: string; polster: string;
  velum: [string, string]; buehne: string; lampe: string; tapete: [string, string, string]; boden: string; spiegel: string;
  helm: string; horn: string; fluegel: string; kostuem: string[]; fell: string; prospekt: string[]; felsen: string; tanne: string; fahne: string[]; wasser: string;
};
export type BayreuthLook = { palette: WorldPalette; bay: BayreuthPalette; clouds: CloudColors; sunColor: string };
/** `vorhang`: 0 = zu, 1 = offen (Standard 1) oder Bewegung in Film-Sekunden { t0, t1, von, nach }. */
export type BayreuthOptions = { vorhang?: number | { t0: number; t1: number; von?: number; nach?: number } };

export const BAY_SAAL_X = 400, BAY_GARDEROBE_X = 470;
const STAGE_Y = 1.2, ROWS = 30, ROW_D = 0.95, ROW_H = 0.22, ROW_Z0 = 8.5;
const rowW = (k: number) => 24 + 0.6 * k;                        // Breite der Reihe k (Fächer)
const halbBreite = (z: number) => rowW(Math.max(0, (z - ROW_Z0) / ROW_D)) / 2;

/** Bodenhöhe: aussen 0, Saal (Bühne, Graben, Reihen), Garderobe. */
export const bayreuthGroundAt = (x: number, z: number) => {
  if (x > BAY_SAAL_X - 45 && x < BAY_SAAL_X + 45) {
    const lx = x - BAY_SAAL_X;
    if (z < 0.3 && Math.abs(lx) < 14) return z > -23 ? STAGE_Y : 0;
    if (z < 6.5) return Math.abs(lx) < 13 ? -2.5 : 0;
    if (z < ROW_Z0) return 0;
    const k = Math.min(ROWS - 1, Math.floor((z - ROW_Z0) / ROW_D));
    return ROW_H * (k + 1);
  }
  return 0;
};

/** Orte: Totale und Halbnah (Kamera-Vorschläge) – aussen, Saal, Bühne, Vorhang, Graben, Garderobe. */
export const BAYREUTH_PLACES: Record<string, { at: V3; wide: { pos: V3; look: V3 }; medium: { pos: V3; look: V3 }; note: string }> = {
  aussen: { at: [0, 0, 12], wide: { pos: [-8, 5.5, 58], look: [0, 8, 3] }, medium: { pos: [7, 1.8, 24], look: [0, 3.2, 2] }, note: "Festspielhaus von vorn, Vorplatz mit Kies, Laternen und Kastanien" },
  saal: { at: [BAY_SAAL_X, 3, 18], wide: { pos: [BAY_SAAL_X, 7.4, 34], look: [BAY_SAAL_X, 4.6, -6] }, medium: { pos: [BAY_SAAL_X + 5, 5.6, 22], look: [BAY_SAAL_X, 3.8, 8] }, note: "Zuschauerraum im Fächer, Säulen mit Gaslampen, Blick zur Bühne" },
  buehne: { at: [BAY_SAAL_X, STAGE_Y, -6], wide: { pos: [BAY_SAAL_X, 3.2, 10], look: [BAY_SAAL_X, 5.2, -14] }, medium: { pos: [BAY_SAAL_X + 1.5, 2.9, -1.6], look: [BAY_SAAL_X, 2.5, -7] }, note: "Bühne mit Bühnenbild (Prospekt, Felsen, Tannen), Vorhang offen" },
  vorhang: { at: [BAY_SAAL_X, STAGE_Y, -2.4], wide: { pos: [BAY_SAAL_X, 3.6, 12], look: [BAY_SAAL_X, 5.4, -2] }, medium: { pos: [BAY_SAAL_X - 3, 2.6, 9.8], look: [BAY_SAAL_X, 4.2, -1.2] }, note: "Proszenium mit rotem Vorhang und Rampenlicht" },
  graben: { at: [BAY_SAAL_X, -2.5, 5.2], wide: { pos: [BAY_SAAL_X + 4.5, 0.4, 2.6], look: [BAY_SAAL_X + 0.3, -1.2, 5.3] }, medium: { pos: [BAY_SAAL_X + 1.6, -0.9, 2.8], look: [BAY_SAAL_X, -1.1, 5.2] }, note: "verdeckter Orchestergraben, Dirigentenpult unter dem Schalldeckel" },
  garderobe: { at: [BAY_GARDEROBE_X, 0, 0], wide: { pos: [BAY_GARDEROBE_X + 3.1, 1.9, 2.7], look: [BAY_GARDEROBE_X - 1.4, 1.3, -1.6] }, medium: { pos: [BAY_GARDEROBE_X - 0.4, 1.6, 0.9], look: [BAY_GARDEROBE_X - 3.0, 1.55, -1.0] }, note: "Garderobe der Sänger: Helmständer, Schminktisch, Kostüme" },
};

const ball = new THREE.SphereGeometry(1, 14, 10);
type B = ReturnType<Kit["batch"]>;
const glow = (color: string, k = 1.15, opacity = 1) => {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k) });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; m.depthWrite = false; }
  return m;
};
/** Leuchtkugel mit Lichthof (Gaslicht), flackert leicht. */
const gaslicht = (at: V3, farbe: string, r: number, ph: number): Lebendig => {
  const g = new THREE.Group();
  const kern = new THREE.Mesh(ball, glow(farbe, 1.1)); kern.scale.setScalar(r);
  const hof = new THREE.Mesh(ball, glow(farbe, 1, 0.28)); hof.scale.setScalar(r * 2.4);
  g.add(kern, hof); g.position.set(...at);
  return { obj: g, tick: (t) => { const f = flacker(t * 0.4, ph); hof.scale.setScalar(r * (2.2 + 0.4 * f)); } };
};
const ohneSchatten = (o: THREE.Object3D) => { o.traverse((m) => { (m as THREE.Mesh).castShadow = false; }); return o; };

// ---------------- Helme (für Garderobe und Bühne) ----------------
/** Hörnerhelm der Oper (1876): runde Glocke mit Reif und zwei nach oben gebogenen Hörnern. `at` = Mitte des Kopfes. */
export const hoernerhelm3D = (b: B, at: V3, metall: string, horn: string, s = 1) => {
  b.add(new THREE.SphereGeometry(0.15 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), [at[0], at[1] + 0.02 * s, at[2]], metall);
  b.add(new THREE.TorusGeometry(0.152 * s, 0.018 * s, 6, 24), [at[0], at[1] + 0.03 * s, at[2]], shade(metall, 0.8), undefined, [90, 0, 0]);
  for (const d of [-1, 1]) for (let i = 0; i < 6; i++) {   // Horn: Glieder, nach aussen und oben gebogen, zur Spitze dünner
    const t = i / 6, a = t * 1.25, r = (0.045 - t * 0.034) * s;
    const x = at[0] + d * (0.14 + Math.sin(a) * 0.14) * s, y = at[1] + (0.08 + (1 - Math.cos(a)) * 0.05 + t * 0.2) * s;
    b.add(new THREE.CylinderGeometry(r * 0.8, r, 0.075 * s, 8), [x, y, at[2]], horn, undefined, [0, 0, -d * (70 - t * 70)]);
  }
};
/** Flügelhelm der Oper: Glocke mit Reif, an den Seiten zwei weisse Flügel aus Federn nach oben hinten. */
export const fluegelhelm3D = (b: B, at: V3, metall: string, feder: string, s = 1) => {
  b.add(new THREE.SphereGeometry(0.15 * s, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), [at[0], at[1] + 0.02 * s, at[2]], metall);
  b.add(new THREE.TorusGeometry(0.152 * s, 0.018 * s, 6, 24), [at[0], at[1] + 0.03 * s, at[2]], shade(metall, 0.8), undefined, [90, 0, 0]);
  const wing = new THREE.Shape();
  wing.moveTo(0, 0); wing.lineTo(0.06, 0.05); wing.lineTo(0.22, 0.3); wing.lineTo(0.16, 0.3); wing.lineTo(0.2, 0.24); wing.lineTo(0.12, 0.25);
  wing.lineTo(0.15, 0.18); wing.lineTo(0.07, 0.18); wing.lineTo(0.08, 0.11); wing.lineTo(0, 0.08); wing.closePath();
  const geo = extrude(wing, 0.02).scale(s * 1.7, s * 1.7, s);
  for (const d of [-1, 1]) b.add(geo, [at[0] + d * 0.15 * s, at[1] + 0.05 * s, at[2] + 0.05 * s], feder, undefined, [0, d > 0 ? 80 : 100, 0]);   // nach hinten oben, leicht nach aussen
};

// ---------------- Aussen ----------------
const festspielhaus = (kit: Kit, bp: BayreuthPalette) => {
  const b = kit.batch(), z = brick(bp.ziegel, bp.ziegelFuge), st = bp.sandstein;
  // Eingangsbau x ±16, z −10…0, 13 m
  b.box([32, 13, 10], [0, 6.5, -5], "#ffffff", z);
  b.box([32.3, 0.9, 10.3], [0, 0.45, -5], bp.sandsteinDunkel);                 // Sockel
  b.box([32.6, 0.7, 10.6], [0, 13.2, -5], st);                                  // Hauptgesims
  b.box([25, 0.35, 1.6], [0, 6.0, 0.8], st);                                    // Balkon
  for (let x = -12; x <= 12.01; x += 1.0) b.box([0.12, 0.8, 0.12], [x, 6.6, 1.5], st);
  b.box([25, 0.12, 0.2], [0, 7.05, 1.5], st);
  for (const x of [-10, -5, 0, 5, 10]) {
    b.add(extrude(archShape(3, 5), 0.06), [x, 0.9, 0.02], bp.tuer);             // Bogentüren
    b.add(extrude(archFrame(3, 5, 0.4), 0.2), [x, 0.9, 0.0], st);
    b.add(extrude(archShape(1.6, 3.2), 0.06), [x, 7.6, 0.02], "#ffffff", glass(bp.glas));   // Fenster oben
    b.add(extrude(archFrame(1.6, 3.2, 0.25), 0.16), [x, 7.6, 0.0], st);
    b.teil("tuer", [3, 5, 0.3], [x, 3.4, 0.1]); b.teil("fenster", [1.6, 3.2, 0.2], [x, 9.2, 0.1]);
  }
  for (const x of [-15.6, -7.5, -2.5, 2.5, 7.5, 15.6]) b.box([0.7, 12, 0.3], [x, 6.9, 0.12], st);   // Lisenen
  // Giebel über der Mitte
  const gs = new THREE.Shape(); gs.moveTo(-8, 0); gs.lineTo(8, 0); gs.lineTo(0, 3.6); gs.closePath();
  b.add(extrude(gs, 0.8), [0, 13.5, -0.6], st);
  b.box([32, 1.6, 10], [0, 14.4, -5.2], bp.dach);                               // flaches Dach
  // Zuschauerhaus x ±24, z −42…−10, 17 m, oben Fachwerk
  b.box([48, 17, 32], [0, 8.5, -26], "#ffffff", z);
  b.box([48.4, 0.6, 32.4], [0, 17.2, -26], st);
  for (const sx of [-1, 1]) for (let zz = -38; zz <= -13; zz += 5) {
    b.add(extrude(archShape(1.4, 2.8), 0.06), [sx * 24.0, 11, zz], "#ffffff", glass(bp.glas), [0, sx * 90, 0]);
    b.teil("fenster", [0.2, 2.8, 1.4], [sx * 24, 12.4, zz]);
  }
  const fw = (x0: number, x1: number, zf: number, y0: number, y1: number, nz: number) => {   // Fachwerk auf einer Wand (nach +z)
    const n = Math.round((x1 - x0) / 3);
    for (let i = 0; i <= n; i++) b.box([0.28, y1 - y0, 0.08], [x0 + (i * (x1 - x0)) / n, (y0 + y1) / 2, zf + nz * 0.05], bp.fachwerk);
    for (const y of [y0, (y0 + y1) / 2, y1]) b.box([x1 - x0, 0.26, 0.08], [(x0 + x1) / 2, y, zf + nz * 0.05], bp.fachwerk);
    for (let i = 0; i < n; i += 2) {
      const xa = x0 + (i * (x1 - x0)) / n, xb = x0 + ((i + 1) * (x1 - x0)) / n, l = Math.hypot(xb - xa, (y1 - y0) / 2);
      b.box([l, 0.24, 0.07], [(xa + xb) / 2, y0 + (y1 - y0) / 4, zf + nz * 0.06], bp.fachwerk, undefined, [0, 0, (Math.atan2((y1 - y0) / 2, xb - xa) * 180) / Math.PI]);
    }
  };
  fw(-23.5, -16.5, -10, 10.5, 16.6, 1); fw(16.5, 23.5, -10, 10.5, 16.6, 1);
  b.box([48, 1.2, 32], [0, 18.1, -26], bp.dach);
  // Bühnenhaus x ±20, z −80…−42, 34 m, Satteldach, Fachwerk vorn
  b.box([40, 34, 38], [0, 17, -61], "#ffffff", z);
  b.box([40.4, 0.6, 38.4], [0, 34.2, -61], st);
  fw(-19.5, 19.5, -42, 20, 33.6, 1);
  const dach = new THREE.Shape(); dach.moveTo(-21, 0); dach.lineTo(21, 0); dach.lineTo(0, 9); dach.closePath();
  b.add(extrude(dach, 39), [0, 34.4, -80.5], bp.dach);
  b.add(extrude(dach, 0.4), [0, 34.5, -41.5], st, undefined, [0, 0, 0], [1.02, 1.02, 1]);
  // Seitenflügel
  for (const sx of [-1, 1]) {
    b.box([10, 9, 24], [sx * 29, 4.5, -27], "#ffffff", z);
    b.box([10.4, 0.6, 24.4], [sx * 29, 9.2, -27], st);
    for (let zz = -36; zz <= -18; zz += 4.5) { b.add(extrude(archShape(1.3, 2.4), 0.06), [sx * 34.0, 2.6, zz], "#ffffff", glass(bp.glas), [0, sx * 90, 0]); b.teil("fenster", [0.2, 2.4, 1.3], [sx * 34, 3.8, zz]); }
  }
  const g = b.build("festspielhaus");
  g.userData.occluder = true;
  return g;
};

/** Springbrunnen: runder Steinrand, Wasserfläche, Säule mit Schale; ein Strahl oben und vier Bögen aus der Schale (Tropfen
 *  fliegen auf Wurfbahnen, nur aus der Zeit gerechnet). `at` = Mitte auf dem Boden. */
const springbrunnen = (kit: Kit, bp: BayreuthPalette, at: V3): Lebendig => {
  const b = kit.batch(), R = 4.2, st = bp.sandstein;
  const ring = new THREE.Shape(); ring.absarc(0, 0, R, 0, Math.PI * 2, false);
  const loch = new THREE.Path(); loch.absarc(0, 0, R - 0.45, 0, Math.PI * 2, true); ring.holes.push(loch);
  b.add(new THREE.ExtrudeGeometry(ring, { depth: 0.65, bevelEnabled: false, curveSegments: 40 }), [0, 0, 0], st, undefined, [-90, 0, 0]);
  b.add(new THREE.TorusGeometry(R - 0.22, 0.12, 8, 48), [0, 0.68, 0], bp.sandsteinDunkel, undefined, [90, 0, 0]);
  b.add(new THREE.CylinderGeometry(R - 0.4, R - 0.4, 0.4, 40), [0, 0.2, 0], bp.wasser);           // Wasser (oben 0,4 m, unter dem Rand)
  b.add(new THREE.CylinderGeometry(0.42, 0.55, 1.9, 16), [0, 1.3, 0], st);                         // Säule
  b.add(new THREE.CylinderGeometry(1.5, 0.55, 0.45, 24), [0, 2.4, 0], st);                         // Schale
  b.add(new THREE.CylinderGeometry(1.32, 1.32, 0.06, 24), [0, 2.6, 0], bp.wasser);
  b.add(new THREE.CylinderGeometry(0.16, 0.22, 0.7, 10), [0, 2.95, 0], bp.sandsteinDunkel);
  b.add(new THREE.SphereGeometry(0.24, 12, 8), [0, 3.35, 0], bp.gold);
  const g = b.build("springbrunnen"); g.userData.occluder = true;
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(bp.wasser).lerp(new THREE.Color("#ffffff"), 0.55), transparent: true, opacity: 0.85, depthWrite: false });
  const tropfen = new THREE.SphereGeometry(1, 8, 6), drops: { m: THREE.Mesh; k: number; bahn: number }[] = [];
  for (let bahn = 0; bahn < 5; bahn++) for (let k = 0; k < 12; k++) { const m = new THREE.Mesh(tropfen, mat); m.layers.set(NOINK); g.add(m); drops.push({ m, k, bahn }); }
  g.position.set(...at);
  return { obj: g, tick: (t) => {
    for (const { m, k, bahn } of drops) {
      const u = (t * 0.9 + k / 12) % 1;
      if (bahn === 4) { m.position.set(0, 3.5 + Math.sin(u * Math.PI) * 1.6, 0); m.scale.setScalar(0.13 * (1 - u * 0.4)); continue; }   // Strahl oben
      const a = (bahn / 4) * Math.PI * 2 + 0.4, r = 1.5 + u * 1.9;
      m.position.set(Math.cos(a) * r, 2.62 + u * 1.0 - u * u * 2.4, Math.sin(a) * r);   // Bogen aus der Schale ins Becken
      m.scale.setScalar(0.11);
    }
  } };
};

// ---------------- Saal und Bühne ----------------
const saal = (kit: Kit, bp: BayreuthPalette, prospekt: THREE.Mesh) => {
  const b = kit.batch(), putz = plaster(bp.putz), holz = planks(bp.buehne);
  // Bühne, Bühnenhaus innen
  b.box([28, STAGE_Y, 23.3], [0, STAGE_Y / 2, -11.35], "#ffffff", holz);
  for (const sx of [-1, 1]) b.box([0.6, 22, 30.4], [sx * 14.3, 11, -8], shade(bp.putz, 0.75));
  b.box([29.2, 22, 0.6], [0, 11, -23.3], shade(bp.putz, 0.7));
  b.box([29.2, 0.6, 24], [0, 22, -11], shade(bp.putz, 0.6));
  // Proszenium-Wand mit Öffnung 15 × 10 m (z −2,0…−1,4)
  b.box([12.6, 18, 0.6], [-13.8, 9, -1.7], "#ffffff", putz); b.box([12.6, 18, 0.6], [13.8, 9, -1.7], "#ffffff", putz);
  b.box([15.2, 6.8, 0.6], [0, 14.6, -1.7], "#ffffff", putz);
  // Doppel-Proszenium: vorderer Rahmen mit Säulen und Bogen (Gold, Creme, Rot)
  for (const sx of [-1, 1]) for (const k of [0, 1]) {
    const x = sx * (8.3 + k * 1.4), zz = -1.1 + k * 0.05;
    b.add(new THREE.CylinderGeometry(0.34, 0.4, 10.4, 16), [x, STAGE_Y + 5.2, zz], bp.saeule);
    b.box([1.0, 0.5, 1.0], [x, STAGE_Y + 10.6, zz], bp.gold); b.box([1.0, 0.4, 1.0], [x, STAGE_Y + 0.2, zz], bp.gold);
  }
  b.add(extrude(archFrame(16.6, 11.6, 1.1), 0.5), [0, STAGE_Y - 0.4, -1.35], bp.saeule);
  b.add(extrude(archFrame(18.2, 12.4, 0.35), 0.55), [0, STAGE_Y - 0.4, -1.38], bp.gold);
  // Lambrequin: roter Behang oben mit Goldkante
  b.box([15.6, 1.4, 0.2], [0, STAGE_Y + 9.4, -1.55], bp.rot); b.box([15.6, 0.2, 0.24], [0, STAGE_Y + 8.7, -1.55], bp.gold);
  // Rampe mit Rampenlicht-Kästen
  b.box([16, 0.25, 0.3], [0, STAGE_Y + 0.12, 0.12], shade(bp.gold, 0.7));
  // Orchestergraben: Boden, Wände, Pult, Notenpulte, Stühle; Abdeckung von der Bühne her und Schalldeckel zum Saal
  b.box([26, 0.3, 6.2], [0, -2.65, 3.4], "#ffffff", planks(shade(bp.boden, 0.8)));
  b.box([26, 2.45, 0.3], [0, -1.275, 6.65], shade(bp.putz, 0.7));
  for (const sx of [-1, 1]) b.box([0.3, 2.5, 6.4], [sx * 13.15, -1.25, 3.4], shade(bp.putz, 0.7));
  b.box([26, 0.12, 1.7], [0, STAGE_Y - 0.06, 1.15], shade(bp.buehne, 0.8));
  const deckel = new THREE.Shape(); deckel.moveTo(0, 0); deckel.quadraticCurveTo(1.2, 1.5, 3.0, 1.3); deckel.lineTo(3.0, 1.18); deckel.quadraticCurveTo(1.25, 1.36, 0.1, 0); deckel.closePath();
  b.add(extrude(deckel, 26), [-13, -0.05, 6.6], shade(bp.sitz, 1.1), undefined, [0, 90, 0]);   // Schalldeckel: vom Saal her über den Dirigenten
  b.box([0.9, 0.3, 0.9], [0, -2.35, 5.4], bp.rotDunkel);                         // Dirigentenpodest
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), [0, -1.65, 4.85], bp.sitz);
  b.box([0.6, 0.04, 0.42], [0, -1.1, 4.85], bp.sitz, undefined, [-30, 0, 0]);
  for (let i = 0; i < 18; i++) {
    const x = -10 + (i % 9) * 2.5, zz = 1.8 + Math.floor(i / 9) * 1.6;
    b.box([0.45, 0.06, 0.45], [x, -2.05, zz], bp.sitz); b.box([0.45, 0.5, 0.06], [x, -1.8, zz - 0.22], bp.sitz);
    b.box([0.06, 0.45, 0.06], [x, -2.28, zz], shade(bp.sitz, 0.6));
    b.add(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 5), [x, -1.95, zz + 0.55], "#3a3634"); b.box([0.5, 0.36, 0.03], [x, -1.35, zz + 0.55], "#f4efe2", undefined, [-25, 0, 0]);
  }
  // Boden vor den Reihen und ansteigende Reihen mit Stühlen (Holz, rote Polster)
  b.box([30, 0.3, 2.0], [0, -0.15, 7.5], "#ffffff", planks(bp.boden));
  b.box([50, 0.2, 32], [0, -0.4, 22.5], shade(bp.boden, 0.6));
  for (let k = 0; k < ROWS; k++) {
    const w = rowW(k), z0 = ROW_Z0 + k * ROW_D, top = ROW_H * (k + 1), n = Math.floor(w / 0.6);
    b.box([w + 3.6, top + 0.3, ROW_D], [0, (top - 0.3) / 2, z0 + ROW_D / 2], "#ffffff", planks(bp.boden));   // bis an die Seitenwand
    for (let i = 0; i < n; i++) {
      const x = -w / 2 + 0.3 + i * ((w - 0.6) / Math.max(1, n - 1));
      b.box([0.42, 0.4, 0.34], [x, top + 0.2, z0 + 0.45], shade(bp.sitz, 0.7));
      b.box([0.46, 0.09, 0.42], [x, top + 0.45, z0 + 0.45], bp.polster);
      b.box([0.46, 0.5, 0.06], [x, top + 0.75, z0 + 0.7], bp.sitz);
    }
  }
  // Seitenwände im Fächer, Säulen mit Gaslampen
  const zEnd = ROW_Z0 + ROWS * ROW_D;
  const lichter: [V3, number][] = [];
  for (const sx of [-1, 1]) {
    const x0 = sx * (halbBreite(6.5) + 1.6), x1 = sx * (halbBreite(zEnd) + 1.6), l = Math.hypot(x1 - x0, zEnd - 6.5);
    b.box([0.5, 18, l + 1], [(x0 + x1) / 2 + sx * 0.3, 9, (6.5 + zEnd) / 2], "#ffffff", putz, [0, (Math.atan2(x1 - x0, zEnd - 6.5) * 180) / Math.PI, 0]);
    for (let zz = 9.5; zz < zEnd; zz += 4) {
      const x = sx * (halbBreite(zz) + 0.75), y0 = bayreuthGroundAt(BAY_SAAL_X, zz);
      b.add(new THREE.CylinderGeometry(0.3, 0.36, 16 - y0, 14), [x, (16 + y0) / 2, zz], bp.saeule);
      b.box([0.9, 0.5, 0.9], [x, 16.2, zz], bp.gold); b.box([0.9, 0.4, 0.9], [x, y0 + 0.2, zz], bp.gold);
      b.box([0.6, 0.08, 0.08], [x - sx * 0.35, 5.2 + y0 * 0.4, zz], bp.gold);
      lichter.push([[x - sx * 0.7, 5.2 + y0 * 0.4, zz], 0.16]);
    }
  }
  // Rückwand mit Fürstengalerie
  b.box([46, 18, 0.6], [0, 9, zEnd + 0.9], "#ffffff", putz);
  b.box([40, 0.4, 2.6], [0, 8.4, zEnd - 0.6], bp.saeule);
  for (let x = -19.5; x <= 19.51; x += 0.65) b.box([0.12, 0.9, 0.12], [x, 9.05, zEnd - 1.85], bp.gold);
  b.box([40, 0.14, 0.2], [0, 9.55, zEnd - 1.85], bp.gold);
  for (let x = -16; x <= 16; x += 8) { b.add(extrude(archShape(4.6, 5.4), 0.08), [x, 8.6, zEnd + 0.52], bp.rotDunkel); b.add(extrude(archFrame(4.6, 5.4, 0.3), 0.2), [x, 8.6, zEnd + 0.45], bp.gold); }
  // Decke: Segeltuch (gemalt)
  b.box([52, 0.3, zEnd + 4], [0, 18.15, (zEnd - 2) / 2], "#ffffff", velum(bp.velum[0], bp.velum[1]));
  const g = b.build("saal");
  g.add(prospekt);
  const leben: Lebendig[] = lichter.map(([at, r], i) => gaslicht(at, bp.lampe, r, i * 0.7));
  for (let i = 0; i < 15; i++) leben.push(gaslicht([-7 + i, STAGE_Y + 0.32, 0.12], bp.lampe, 0.09, i * 1.3));   // Rampenlicht
  leben.push(gaslicht([0, -1.05, 4.75], bp.lampe, 0.06, 0.3));   // Pultlampe des Dirigenten
  for (const l of leben) g.add(l.obj);
  return { g, leben };
};

/** Bühnenbild: Felsen, Tannen und ein Felsplateau in der Mitte (Walkürenfelsen). */
const buehnenbildTeile = (kit: Kit, bp: BayreuthPalette) => {
  const b = kit.batch(), r = new Rng(76), fels = rock(bp.felsen);
  for (const [x, z, s] of [[-9, -12, 2.8], [-6.5, -16, 3.4], [8.5, -13, 3.0], [6, -17.5, 3.6], [0.5, -12.5, 2.2]] as const)
    b.add(new THREE.IcosahedronGeometry(1, 1), [x, STAGE_Y + s * 0.35, z], "#ffffff", fels, [r.range(0, 40), r.range(0, 360), 0], [s * 1.3, s * 0.75, s]);
  b.box([5, 0.6, 3], [0.5, STAGE_Y + 1.4, -12.5], "#ffffff", fels);
  for (const [x, z, h] of [[-11, -8, 6], [-10, -17, 8], [11, -9, 6.5], [10.5, -18, 7.5], [-12.5, -13, 7], [12.6, -14, 6]] as const) {
    b.add(new THREE.CylinderGeometry(0.12, 0.18, h * 0.3, 8), [x, STAGE_Y + h * 0.15, z], shade(bp.fachwerk, 1.2));
    for (let i = 0; i < 4; i++) b.add(new THREE.ConeGeometry(h * (0.26 - i * 0.05), h * 0.34, 10), [x, STAGE_Y + h * (0.3 + i * 0.17), z], shade(bp.tanne, 1 + i * 0.06));
  }
  return b.build("buehnenbild");
};

/** Roter Vorhang aus zwei Hälften mit Falten; geöffnet ziehen sich die Hälften schräg nach oben aussen (gerafft). */
const vorhang = (kit: Kit, bp: BayreuthPalette) => {
  const H = 10.2, HW = 7.7, g = new THREE.Group(); g.name = "vorhang";
  const mat = (kit.mat(bp.rot) as THREE.Material).clone(); mat.side = THREE.DoubleSide;
  const haelften = [-1, 1].map((s) => {
    const geo = new THREE.PlaneGeometry(1, 1, 30, 14), m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = true;
    const base = Float32Array.from(geo.getAttribute("position").array as Float32Array);
    g.add(m); return { s, geo, base };
  });
  let letzt = -1;
  const set = (o: number) => {
    if (Math.abs(o - letzt) < 1e-4) return; letzt = o;
    for (const { s, geo, base } of haelften) {
      const pos = geo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const u = base[i * 3] + 0.5, v = base[i * 3 + 1] + 0.5;   // u 0 = Mitte … 1 = aussen, v 0 = unten
        const zug = o * (1 - v * 0.55);
        const x = s * HW * (u + (1 - u) * zug * 0.92);
        const y = v * H + o * (1 - u) * (1 - v) * H * 0.62;
        const z = 0.16 * Math.sin(u * HW * 4.2) * (1 + o * 1.6);
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true; geo.computeVertexNormals();
    }
  };
  g.position.set(0, STAGE_Y, -2.3);
  return { g, set };
};

// ---------------- Garderobe ----------------
const garderobe = (kit: Kit, bp: BayreuthPalette) => {
  const b = kit.batch(), wand = tapete(bp.tapete[0], bp.tapete[1], bp.tapete[2]);
  b.box([8.4, 0.2, 6.8], [0, -0.1, 0], "#ffffff", planks(bp.boden));
  b.box([8.4, 3.6, 0.2], [0, 1.8, -3.3], "#ffffff", wand); b.box([8.4, 3.6, 0.2], [0, 1.8, 3.3], "#ffffff", wand);
  b.box([0.2, 3.6, 6.8], [-4.1, 1.8, 0], "#ffffff", wand); b.box([0.2, 3.6, 6.8], [4.1, 1.8, 0], "#ffffff", wand);
  b.box([8.4, 0.2, 6.8], [0, 3.7, 0], "#ffffff", plaster(bp.putz));
  for (const [x, z, rx, rz] of [[0, -3.17, 8.2, 0.06], [0, 3.17, 8.2, 0.06]] as const) b.box([rx, 0.14, rz], [x, 0.07, z], shade(bp.boden, 0.6));   // Fussleisten
  b.box([3.2, 0.03, 2.2], [0.6, 0.015, 0.2], "#ffffff", webstoff([bp.rot, bp.gold, bp.rotDunkel]));   // Teppich
  // Schminktisch mit Spiegel und zwei Lampen
  b.box([2.0, 0.08, 0.7], [0.9, 0.78, -2.8], bp.sitz);
  for (const x of [0.0, 1.8]) b.box([0.08, 0.76, 0.6], [x, 0.38, -2.8], shade(bp.sitz, 0.7));
  b.box([1.3, 1.0, 0.06], [0.9, 1.75, -3.14], bp.spiegel); b.box([1.5, 1.2, 0.04], [0.9, 1.75, -3.18], bp.gold);
  for (const [x, c] of [[0.5, bp.rot], [0.75, bp.gold], [1.3, "#2f6fd0"], [1.5, "#f4efe2"]] as const) b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), [x, 0.87, -2.7], c);
  b.box([0.5, 0.06, 0.5], [0.9, 0.48, -1.9], bp.polster); b.box([0.5, 0.6, 0.06], [0.9, 0.8, -1.67], bp.sitz);
  for (const x of [0.7, 1.1]) for (const zz of [-2.1, -1.7]) b.box([0.05, 0.45, 0.05], [x, 0.23, zz], shade(bp.sitz, 0.7));
  // Helmständer an der linken Wand: Säule, Fuss, Kopf, Helm
  const staender = (z: number, helm: (at: V3) => void) => {
    b.add(new THREE.CylinderGeometry(0.22, 0.26, 0.06, 16), [-3.4, 0.03, z], shade(bp.sitz, 0.7));
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 1.35, 8), [-3.4, 0.7, z], shade(bp.sitz, 0.7));
    b.add(ball, [-3.4, 1.48, z], "#e9dcc4", undefined, [0, 0, 0], [0.13, 0.16, 0.14]);
    helm([-3.4, 1.52, z]);
  };
  staender(-2.1, (at) => hoernerhelm3D(b, at, bp.helm, bp.horn));
  staender(-0.9, (at) => fluegelhelm3D(b, at, bp.helm, bp.fluegel));
  staender(0.3, (at) => hoernerhelm3D(b, at, bp.gold, bp.horn));
  staender(1.5, (at) => fluegelhelm3D(b, at, bp.gold, bp.fluegel));
  // Kostümstange an der rechten Wand mit Mänteln (Fellkragen)
  for (const zz of [-2.4, 1.6]) b.add(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 6), [3.4, 0.95, zz], shade(bp.sitz, 0.6));
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 4.0, 6), [3.4, 1.88, -0.4], shade(bp.sitz, 0.6), undefined, [90, 0, 0]);
  bp.kostuem.forEach((c, i) => {
    const zz = -2.0 + i * 0.8;
    b.box([0.12, 1.25, 0.62], [3.4, 1.2, zz], c);
    b.add(ball, [3.4, 1.82, zz], bp.fell, undefined, [0, 0, 0], [0.14, 0.09, 0.34]);
  });
  // Opern-Requisiten: Speer und Schild an der Wand, Truhe, Skizzen an der Wand
  b.add(new THREE.CylinderGeometry(0.025, 0.025, 2.6, 6), [2.6, 1.3, -3.05], bp.sitz, undefined, [8, 0, 0]);
  b.add(new THREE.ConeGeometry(0.06, 0.25, 6), [2.6, 2.7, -2.86], bp.helm);
  b.add(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 20), [-2.2, 1.1, -3.12], bp.gold, undefined, [90, 0, 0]);
  b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.06, 12), [-2.2, 1.1, -3.08], bp.helm, undefined, [90, 0, 0]);
  b.box([1.0, 0.55, 0.6], [-1.3, 0.28, 2.6], bp.rotDunkel); b.box([1.04, 0.08, 0.64], [-1.3, 0.6, 2.6], bp.gold);
  for (const [x, y] of [[-1.0, 2.2], [-0.4, 2.35], [0.2, 2.15]] as const) b.box([0.42, 0.56, 0.02], [x, y, -3.19], "#f4efe2", undefined, [0, 0, (x * 9) % 7]);
  const g = b.build("garderobe");
  const lampen = [gaslicht([0.12, 1.95, -3.0], bp.lampe, 0.09, 0.2), gaslicht([1.68, 1.95, -3.0], bp.lampe, 0.09, 1.1), gaslicht([-2.6, 3.2, 0], bp.lampe, 0.14, 2.3)];
  for (const l of lampen) g.add(l.obj);
  return { g, leben: lampen };
};

// ---------------- Welt ----------------
export const bayreuth = (kit: Kit, look: BayreuthLook, seed = 1, opt: BayreuthOptions = {}, start = 0) => {
  const bp = look.bay, pal = look.palette, r = new Rng(seed * 61);
  const root = new THREE.Group(); root.name = "bayreuth";
  const leben: Lebendig[] = [];
  const lebt = (l: Lebendig) => { root.add(l.obj); leben.push(l); return l; };

  // Aussen: Boden aus Flächen, die aneinanderstossen (Kies vorn, Rasen rundum), Hügel, Bäume, Laternen
  const boden = kit.batch(), rasen = grass(bp.rasen);
  boden.box([68, 0.2, 42], [0, -0.1, 19], "#ffffff", kies(bp.kies, bp.kiesFuge));
  // Rasen bis an den Horizont, aber mit Lücke x 340…520 (dort liegen Saal und Garderobe, ihr Boden ist tiefer)
  for (const [w, d, x, z] of [[966, 2000, -517, 0], [306, 2000, 187, 0], [480, 2000, 760, 0], [68, 960, 0, 520], [68, 998, 0, -501]] as const) boden.box([w, 0.2, d], [x, -0.1, z], "#ffffff", rasen);
  root.add(boden.build("boden"));
  root.add(festspielhaus(kit, bp));
  for (const sx of [-1, 1]) for (let zz = 6; zz <= 38; zz += 6.4) root.add(tree(kit, pal, [sx * 30, 0, zz], r.range(7.5, 9), Math.round(zz * 3 + sx * 50)));
  for (const [x, zz] of [[-40, -6], [42, -12], [-44, -30], [46, -40], [-38, -58], [40, -66]] as const) root.add(tree(kit, pal, [x, 0, zz], r.range(9, 11), Math.round(x)));
  for (const sx of [-1, 1]) for (const zz of [6, 16, 26]) { const l = lantern(kit, pal, [sx * 13, 0, zz], 1.4); l.scale.setScalar(0.95); root.add(l); }
  for (const sx of [-1, 1]) for (const k of [0, 1, 2]) root.add(bush(kit, pal, [sx * (18.5 + k * 2.4), 0, 2.6], 1.5, 3 + k + sx * 5));   // Büsche vor dem Haus
  lebt(springbrunnen(kit, bp, [0, 0, 27]));
  const topf = (x: number, z: number, i: number, gr = 1.6) => root.add(blumentopf(kit, pal, [x, 0, z], 11 + i, gr));
  [-7.5, -2.5, 2.5, 7.5].forEach((x, i) => topf(x, 1.1, i, 1.7));                                         // vor den Lisenen
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; topf(Math.cos(a) * 5.4, 27 + Math.sin(a) * 5.4, 20 + i); }   // um den Brunnen
  for (const sx of [-1, 1]) for (const zz of [11, 21, 31]) topf(sx * 13, zz, 40 + zz + sx, 1.6);           // zwischen den Laternen
  for (const sx of [-1, 1]) for (const zz of [3.2, 5.6]) topf(sx * 17, zz, 60 + zz * 3 + sx, 1.8);         // an den Ecken des Eingangsbaus
  // Park-Wald ringsum als Horizont (ein Batch, ohne Tusche: in der Ferne würden die Linien das Laub schwärzen)
  const wald = kit.batch();
  for (let i = 0; i < 150; i++) {
    const a = r.range(0, Math.PI * 2), d = r.range(110, 180), x = Math.cos(a) * d, z = Math.sin(a) * d;
    if (z < -40 && Math.abs(x) < 60) continue;
    const h = r.range(12, 20), kr = h * r.range(0.38, 0.46);   // Kronen bis fast zum Boden (dunkle Stämme wirken in der Ferne wie ein Band)
    wald.add(new THREE.CylinderGeometry(0.4, 0.6, h * 0.5, 6), [x, h * 0.25, z], pal.bark);
    wald.add(ball, [x, h * 0.5, z], shade(r.pick(pal.leaves), r.range(0.85, 1.1)), undefined, [0, 0, 0], [kr, kr * 1.1, kr]);
    wald.add(ball, [x + kr * 0.5, h * 0.22, z + kr * 0.3], shade(r.pick(pal.leaves), r.range(0.85, 1.1)), undefined, [0, 0, 0], [kr * 0.8, kr * 0.8, kr * 0.8]);
  }
  const wg = wald.build("park-wald"); wg.traverse((m) => m.layers.set(NOINK)); root.add(wg);
  for (const sx of [-1, 1]) for (const zz of [12, 30]) { const bk = bench(kit, pal, [sx * 26, 0, zz], sx * 90); bk.scale.setScalar(0.85); root.add(bk); }
  for (const [x, f] of [[-6, 0], [6, 1]] as const) lebt(fahne(kit, [x, 15.2, -2], bp.fahne[f], { h: 5, w: 2.6, turn: 200, phase: x }));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + r.range(-0.2, 0.2), d = r.range(220, 290);
    root.add(cloud(look.clouds, [Math.cos(a) * d, r.range(90, 150), Math.sin(a) * d], r.range(1.4, 2.2), i + 3));
  }

  // Saal mit Bühne
  const prospekt = new THREE.Mesh(new THREE.PlaneGeometry(27, 15), kit.mat("#ffffff", buehnenbild(bp.prospekt)));
  prospekt.position.set(0, STAGE_Y + 7.5, -20.5); prospekt.receiveShadow = true;
  const s = saal(kit, bp, prospekt);
  s.g.add(buehnenbildTeile(kit, bp));
  const vh = vorhang(kit, bp); s.g.add(vh.g);
  s.g.position.x = BAY_SAAL_X; root.add(ohneSchatten(s.g)); leben.push(...s.leben);
  // Garderobe
  const gd = garderobe(kit, bp); gd.g.position.x = BAY_GARDEROBE_X; root.add(ohneSchatten(gd.g)); leben.push(...gd.leben);

  const vo = opt.vorhang ?? 1;
  const offen = (film: number) => {
    if (typeof vo === "number") return vo;
    const u = Math.min(1, Math.max(0, (film - vo.t0) / Math.max(0.01, vo.t1 - vo.t0))), e = u * u * (3 - 2 * u);
    return (vo.von ?? 0) + ((vo.nach ?? 1) - (vo.von ?? 0)) * e;
  };
  vh.set(offen(start));
  const tick = (time: number) => {
    for (const l of leben) l.tick(time);
    vh.set(offen(time + start));
  };
  return { root, tick, groundAt: bayreuthGroundAt };
};
