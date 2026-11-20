// Herkunft: eigen (V-Video), geschrieben 2026-11-18, ohne Vorlage.
// Thermen und Innenräume der Römer-Wasser-Welt. Thermen: Halle (x −30…30, z −8…8) mit drei Räumen – Frigidarium (kalt, links),
// Tepidarium (lau, Mitte, mit Bibliotheks-Nische), Caldarium (heiss, rechts, Kuppel mit Oculus, Dampf); Becken eingesenkt, Mosaik-
// Boden, Fresken, Statuen; Südfront mit grossen Bogenfenstern (man sieht hinein), davor die Palästra (Ringer-Hof) mit Säulengang;
// an der Ostwand der Heizofen (praefurnium) mit Feuer, Rauch und Holz. Latrine (x −60…−48): Bank mit Löchern, darunter fliessendes
// Wasser, vorn eine Rinne für die Schwämme. Innenräume (je ein Raum mit Decke, Kamera innen): Büro des Frontinus, Küche,
// Bleirohr-Werkstatt, Atrium einer Villa mit Impluvium. Raumschalen sind `protect` (nie ausgeblendet).
import * as THREE from "three";
import { Rng } from "../core/random";
import { NOINK } from "../post/ink";
import type { V3 } from "../camera/rig";
import { archShape, extrude } from "./kit";
import { bauplan, blocks, brick, fresko, mosaik, planks, plaster, shade, slabs, tiles } from "./paint";
import { becken, rinne, dampf, strahl, spritzer, vorhang } from "./aqua-wasser";
import { arkadeGeo, fest, glutFeuer, oellampeLicht, type AquaCtx } from "./aqua-bauten";
import { saeule, statue, amphore } from "./roemer-bauten";
import { rauchsaeule } from "./leben";
import { bleiplatte, bleirohre, bleitopf, brennholz, brote, kruege, schreibtisch, schriftrollenRegal, schwammstaebe, wandplan } from "./aqua-requisiten";

const rad = THREE.MathUtils.degToRad;
const ball = new THREE.IcosahedronGeometry(1, 2);

/** Masse der Thermen (Zonen-Lage). */
export const THERMEN = { x0: -30, x1: 30, z0: -8, z1: 8, H: 11, F: 0.3, wand: 0.8,
  becken: [{ x: -20, z: -0.5, w: 12, d: 6, art: "kalt" }, { x: 0, z: -0.5, w: 8, d: 5, art: "lau" }, { x: 20, z: -0.5, w: 10, d: 6, art: "heiss" }] as const,
  palaestra: { z0: 9, z1: 40 }, latrine: { x0: -62, x1: -46, z0: -5, z1: 5 } };
/** Boden in den Thermen (für Figuren): Halle F, in den Becken der Beckenboden, Palästra Sand. */
export const thermenBoden = (x: number, z: number) => {
  const T = THERMEN;
  for (const b of T.becken) if (Math.abs(x - b.x) < b.w / 2 && Math.abs(z - b.z) < b.d / 2) return T.F - 1.2;
  if (x > T.x0 && x < T.x1 && z > T.z0 && z < T.z1) return T.F;
  if (x > T.latrine.x0 && x < T.latrine.x1 && z > T.latrine.z0 && z < T.latrine.z1) return 0.2;
  if (Math.abs(x) < 32 && z >= T.palaestra.z0 - 1 && z < T.palaestra.z1) return 0.05;
  return -99;
};

export const thermen = (c: AquaCtx) => {
  const T = THERMEN, ap = c.ap, rp = c.rp, g = new THREE.Group(), b = c.kit.batch(), W = T.x1 - T.x0, D = T.z1 - T.z0;
  const ziegel = brick(ap.ziegelwand, ap.ziegelFuge), putz = plaster(ap.putzInnen[0]), fr = fresko(ap.fresko, ap.freskoGelb, ap.freskoGruen, ap.freskoBlau);
  // Boden mit Löchern für die Becken: Streifen zwischen den Becken
  const xs = [T.x0, ...T.becken.flatMap((k) => [k.x - k.w / 2, k.x + k.w / 2]), T.x1];
  const mos = mosaik(ap.mosaik);
  for (let i = 0; i < xs.length; i += 2) b.box([xs[i + 1] - xs[i], T.F, D], [(xs[i] + xs[i + 1]) / 2, T.F / 2, 0], "#ffffff", mos);
  T.becken.forEach((k) => {
    for (const [z0, z1] of [[T.z0, k.z - k.d / 2], [k.z + k.d / 2, T.z1]]) b.box([k.w, T.F, z1 - z0], [k.x, T.F / 2, (z0 + z1) / 2], "#ffffff", mos);
    const tief = 1.2, y0 = T.F - tief;
    b.box([k.w, 0.1, k.d], [k.x, y0 - 0.05, k.z], "#ffffff", slabs(ap.kacheln, ap.kachelFuge));
    for (const s of [-1, 1]) { b.box([k.w - 0.06, tief - 0.02, 0.12], [k.x, y0 + tief / 2 - 0.01, k.z + s * (k.d / 2 + 0.03)], "#ffffff", slabs(ap.kacheln, ap.kachelFuge)); b.box([0.12, tief - 0.02, k.d - 0.06], [k.x + s * (k.w / 2 + 0.03), y0 + tief / 2 - 0.01, k.z], "#ffffff", slabs(ap.kacheln, ap.kachelFuge)); }
    for (let i = 0; i < 3; i++) b.box([k.w - 0.4, 0.3, 0.4], [k.x, y0 + 0.15 + i * 0.3, k.z - k.d / 2 + 0.25 + i * 0.4], shade(ap.kacheln, 1.08));   // Stufen hinein
    b.box([k.w + 0.6, 0.12, 0.3], [k.x, T.F + 0.06, k.z - k.d / 2 - 0.15], shade(rp.marmor, 0.95)); b.box([k.w + 0.6, 0.12, 0.3], [k.x, T.F + 0.06, k.z + k.d / 2 + 0.15], shade(rp.marmor, 0.95));
  });
  // Wände: Nord voll, Ost/West voll, Südfront mit Bogenfenstern (Arkade), Zwischenwände mit Durchgängen
  for (const s of [-1, 1]) b.box([W / 2 - 3.5, T.H, T.wand], [s * (W / 4 + 1.75), T.H / 2, T.z0 - T.wand / 2], "#ffffff", ziegel);
  b.box([7, T.H - 5.3, T.wand], [0, 5.3 + (T.H - 5.3) / 2, T.z0 - T.wand / 2], "#ffffff", ziegel);
  for (const s of [-1, 1]) b.box([T.wand, T.H, D + 2 * T.wand], [s * (W / 2 + T.wand / 2), T.H / 2, 0], "#ffffff", ziegel);
  const front = c.kit.mesh(arkadeGeo(T.x0, T.x1, 0, T.H, 6, T.wand, { hoch: 0.62, weite: 0.72 }), "#ffffff", ziegel); front.position.z = T.z1 + T.wand / 2; front.name = "thermen-front"; g.add(front);
  for (const x of [-10, 10]) {   // Zwischenwände mit je einem Bogendurchgang (Form in x, danach quer gestellt)
    const geo = arkadeGeo(-D / 2, D / 2, 0, T.H - T.F, 1, 0.6, { hoch: 0.5, weite: 0.5 }); geo.rotateY(Math.PI / 2); geo.translate(0, T.F, 0);
    const m = c.kit.mesh(geo, "#ffffff", putz); m.position.x = x; m.name = "thermen-zwischenwand"; g.add(m);
  }
  // Fresko-Sockel innen an der Nordwand (Streifen), Putz darüber, Gesims
  for (const s of [-1, 1]) {
    b.box([W / 2 - 3.6, 2.4, 0.06], [s * (W / 4 + 1.8), T.F + 1.2, T.z0 + 0.03], "#ffffff", fr);
    b.box([W / 2 - 3.6, T.H - 2.8, 0.05], [s * (W / 4 + 1.8), T.F + 2.4 + (T.H - 2.8) / 2, T.z0 + 0.025], "#ffffff", putz);
  }
  b.box([W, 0.3, 0.5], [0, T.H - 0.15, T.z0 + 0.25], shade(rp.marmor, 0.92));
  // Decke: Tonnengewölbe über Frigidarium und Tepidarium (halbe Zylinder entlang x), Kuppel über dem Caldarium mit Oculus
  for (const [x0, x1] of [[T.x0, -10], [-10, 10]]) {
    const geo = new THREE.CylinderGeometry(D / 2 + T.wand, D / 2 + T.wand, x1 - x0, 24, 1, true, 0, Math.PI); geo.rotateZ(Math.PI / 2);
    b.add(geo, [(x0 + x1) / 2, T.H, 0], "#ffffff", tiles(rp.ziegel), [0, 0, 0]);
    const innen = new THREE.CylinderGeometry(D / 2 + 0.1, D / 2 + 0.1, x1 - x0, 24, 1, true, 0, Math.PI); innen.rotateZ(Math.PI / 2);
    b.add(innen, [(x0 + x1) / 2, T.H, 0], ap.putzInnen[2]);
  }
  b.box([20, 0.4, D + 2 * T.wand], [20, T.H + 0.2, 0], shade(ap.ziegelwand, 0.9));
  const kup = new THREE.SphereGeometry(9.5, 32, 12, 0, Math.PI * 2, 0.16, Math.PI / 2 - 0.16);
  b.add(kup, [20, T.H + 0.3, 0], ap.putzInnen[2], undefined, [0, 0, 0], [1, 0.62, 1]);
  b.add(new THREE.TorusGeometry(1.5, 0.25, 8, 24), [20, T.H + 0.3 + 9.5 * 0.62 * Math.cos(0.16), 0], shade(rp.marmor, 0.9), undefined, [90, 0, 0]);
  // Statuen in Nischen an der Nordwand, Bänke, Becken-Fontäne im Tepidarium
  for (const x of [-26, -14, 14, 26]) { b.box([2.2, 4.2, 0.4], [x, T.F + 2.4, T.z0 + 0.2], shade(ap.putzInnen[1], 0.9)); }
  for (const x of [-26, -14, 26]) b.box([3, 0.45, 0.6], [x, T.F + 0.22, T.z1 - 0.5], shade(rp.marmor, 0.95));
  // Bibliotheks-Nische: tiefe Nische in der Nordwand des Tepidariums (hinter der Wand ein Anbau) mit Rollenregalen
  b.box([7, T.F, 4], [0, T.F / 2, T.z0 - 2.8], "#ffffff", mos);
  b.box([7.6, 6, 0.6], [0, 3, T.z0 - 5.1], "#ffffff", ziegel); for (const s of [-1, 1]) b.box([0.6, 6, 4.4], [s * 3.8, 3, T.z0 - 2.8], "#ffffff", ziegel);
  b.box([7.6, 0.4, 5], [0, 6.2, T.z0 - 2.8], shade(ap.ziegelwand, 0.9));
  g.add(b.build("thermen"));
  for (const x of [-2.4, 0, 2.4]) g.add(schriftrollenRegal(c.kit, ap, [x, T.F, T.z0 - 4.6], 0, { w: 2.2, h: 2.6 }));
  g.add(statue(c.kit, rp, [-26, T.F, T.z0 + 1.2], 0, false)); g.add(statue(c.kit, rp, [-14, T.F, T.z0 + 1.2], 0, true)); g.add(statue(c.kit, rp, [14, T.F, T.z0 + 1.2], 0, false)); g.add(statue(c.kit, rp, [26, T.F, T.z0 + 1.2], 0, true));
  // Wasser in den Becken, Dampf, Fontäne
  const farbe = { kalt: ap.klar, lau: ap.wasser, heiss: ap.wasser } as const;
  T.becken.forEach((k) => g.add(becken(c.uhr, farbe[k.art], [k.x, T.F - 0.25, k.z], k.w, k.d, 0, { tempo: k.art === "heiss" ? 0.9 : 0.4, durch: 0.85 })));
  c.lebt(dampf([20, T.F - 0.2, -0.5], { w: 9, d: 5, hoehe: 4, n: 16, groesse: 0.8, seed: 61, dichte: 0.32 }));
  c.lebt(dampf([0, T.F - 0.2, -0.5], { w: 7, d: 4, hoehe: 3, n: 10, groesse: 0.6, seed: 62, dichte: 0.3 }));
  c.lebt(dampf([20, T.H + 6.2, 0], { w: 2, d: 2, hoehe: 6, n: 10, groesse: 0.9, seed: 63, dichte: 0.4 }));
  g.add(strahl(c.uhr, ap.klar, [-20, T.F + 2.6, T.z0 + 0.6], [-20, T.F - 0.25, T.z0 + 5.4], 0.08, { bogen: 0.6, tempo: 3 }));
  c.lebt(spritzer([-20, T.F - 0.24, T.z0 + 5.4], { n: 10, kraft: 0.35, weite: 0.6, seed: 64 }));
  const lb = c.kit.batch();
  lb.add(ball, [-20, T.F + 2.6, T.z0 + 0.45], ap.bronze, undefined, [0, 0, 0], [0.35, 0.35, 0.25]);   // Löwenkopf-Speier
  g.add(lb.build("speier"));
  // Heizofen an der Ostwand: gewölbte Öffnung, Feuer, Rauch aus dem Schornstein, Holzstapel
  const ob = c.kit.batch(), ox = T.x1 + T.wand;
  ob.box([3, 3.4, 4.4], [ox + 1.5, 1.7, -2], "#ffffff", blocks(ap.ofen, shade(ap.ofen, 0.7)));
  ob.box([1.6, 6, 1.6], [ox + 1.5, 6.4, -3.2], "#ffffff", brick(ap.ziegelwand, ap.ziegelFuge));
  ob.add(extrude(archShape(1.8, 1.7), 0.2), [ox + 3.01, 0.0, -2], "#2a1a12", undefined, [0, 90, 0]);
  g.add(ob.build("heizofen"));
  c.lebt(glutFeuer([ox + 2.7, 0.05, -2], { w: 1.2, groesse: 1.2, phase: 0.3 }));
  c.lebt(rauchsaeule(c.kit, [ox + 1.5, 9.4, -3.2], { hoehe: 16, dicke: 1.1, feuer: 0, sockel: false, wind: [0.8, -0.3], farbe: "#9a9aa6", tempo: 0.6 }));
  g.add(brennholz(c.kit, rp, [ox + 3.5, 0, 2.4], 90, 2.4));
  // Palästra: Sandhof mit Säulengang auf drei Seiten, Ringer-Platz in der Mitte
  const P = T.palaestra, pb = c.kit.batch(), sand = ap.sand;
  pb.box([62, 0.1, P.z1 - P.z0], [0, 0.0, (P.z0 + P.z1) / 2], sand);
  for (let x = -30; x <= 30; x += 4) saeule(pb, x, 0.05, P.z1 - 1, 5, 0.3, rp.marmor);
  for (let z = P.z0 + 3; z < P.z1 - 1; z += 4) for (const x of [-30, 30]) saeule(pb, x, 0.05, z, 5, 0.3, rp.marmor);
  pb.box([62, 0.5, 4], [0, 5.3, P.z1 - 1.4], "#ffffff", tiles(rp.ziegel));
  for (const x of [-30.4, 30.4]) pb.box([4, 0.5, P.z1 - P.z0 - 2], [x, 5.3, (P.z0 + P.z1) / 2], "#ffffff", tiles(rp.ziegel));
  pb.add(new THREE.CircleGeometry(4, 32), [0, 0.06, 24], shade(sand, 0.9), undefined, [-90, 0, 0]);
  g.add(pb.build("palaestra"));
  return fest(g, "thermen");
};

/** Latrine: Raum mit offener Front (Schnitt) und Steinbank mit Löchern an drei Wänden; unter der Bank fliesst Wasser, vor der Bank
 *  eine schmale Rinne (für die Schwämme); Fresko an der Wand, kleiner Brunnen in der Mitte. */
export const latrine = (c: AquaCtx) => {
  const L = THERMEN.latrine, ap = c.ap, rp = c.rp, g = new THREE.Group(), b = c.kit.batch(), W = L.x1 - L.x0, D = L.z1 - L.z0, cx = (L.x0 + L.x1) / 2, H = 4.5;
  b.box([W, 0.2, D], [cx, 0.1, 0], "#ffffff", mosaik(ap.mosaik));
  b.box([W, H, 0.5], [cx, H / 2, L.z0 - 0.25], "#ffffff", plaster(ap.putzInnen[1]));
  for (const x of [L.x0 - 0.25, L.x1 + 0.25]) b.box([0.5, H, D], [x, H / 2, 0], "#ffffff", plaster(ap.putzInnen[1]));
  b.box([W, 1.6, 0.05], [cx, 1.4, L.z0 + 0.02], "#ffffff", fresko(ap.fresko, ap.freskoGelb, ap.freskoGruen, ap.freskoBlau));
  // Bank entlang der Nordwand: Platte mit Löchern (als einzelne Platten mit Lücken), Kanal darunter
  const bz = L.z0 + 0.5, bankH = 0.95;
  for (let x = L.x0 + 0.3; x < L.x1 - 0.4; x += 0.62) {
    b.box([0.42, 0.1, 1.0], [x + 0.31, bankH, bz], shade(rp.marmor, 0.96));
    b.box([0.2, 0.1, 0.62], [x + 0.62, bankH, bz - 0.19], shade(rp.marmor, 0.96));   // zwischen den Löchern
    b.box([0.2, 0.1, 0.16], [x + 0.62, bankH, bz + 0.42], shade(rp.marmor, 0.96));
  }
  b.box([W, 0.75, 0.1], [cx, 0.5, bz + 0.55], shade(rp.marmor, 0.85));          // Front der Bank
  b.box([W, 0.12, 0.3], [cx, 0.2, bz + 0.85], shade(rp.marmor, 0.8));           // Rinne vorne (Wangen)
  g.add(b.build("latrine"));
  g.add(rinne(c.uhr, ap.wasser, [L.x0 + 0.1, 0.28, bz], [L.x1 - 0.1, 0.28, bz], 0.9, { tempo: 2.4 }));
  g.add(rinne(c.uhr, ap.klar, [L.x1 - 0.1, 0.24, bz + 0.85], [L.x0 + 0.1, 0.24, bz + 0.85], 0.2, { tempo: 1.6 }));
  g.add(schwammstaebe(c.kit, rp, [cx + 4, 0.2, bz + 1.4]));
  g.add(becken(c.uhr, ap.klar, [cx, 0.75, 1.8], 1.4, 1.4, 0, { rund: true, tempo: 0.4 }));
  const kb = c.kit.batch(); kb.add(new THREE.CylinderGeometry(0.75, 0.8, 0.6, 20, 1, true), [cx, 0.5, 1.8], rp.marmor); kb.add(new THREE.TorusGeometry(0.75, 0.08, 6, 20), [cx, 0.8, 1.8], shade(rp.marmor, 0.92), undefined, [90, 0, 0]);
  g.add(kb.build("latrine-brunnen"));
  return fest(g, "latrine");
};

// ---------------- Innenräume ----------------
/** Masse der Innenräume (Mitte x, Breite, Tiefe); Kamera steht innen (z bis +4), Blick nach Norden. */
export const INNEN = { buero: { x: -30, w: 9, d: 10 }, kueche: { x: -10, w: 9, d: 10 }, werkstatt: { x: 10, w: 9, d: 10 }, atrium: { x: 34, w: 14, d: 14 }, H: 4.4 };
export const innenBoden = (x: number, z: number) => {
  for (const r of Object.values(INNEN)) if (typeof r === "object" && Math.abs(x - r.x) < r.w / 2 && Math.abs(z) < r.d / 2) {
    if (r === INNEN.atrium && Math.abs(x - r.x) < 2 && Math.abs(z + 0.5) < 1.5) return 0.18;   // Impluvium
    return 0.12;
  }
  return -99;
};
/** Raumschale: Boden, vier Wände (Süd mit Tür), Decke mit Balken; Wandfarbe/Fresko je Raum. */
const raum = (c: AquaCtx, name: string, r: { x: number; w: number; d: number }, o: { boden: Parameters<AquaCtx["kit"]["mesh"]>[2]; wand: Parameters<AquaCtx["kit"]["mesh"]>[2]; sockel?: Parameters<AquaCtx["kit"]["mesh"]>[2]; offen?: [number, number]; fenster?: boolean }) => {
  const b = c.kit.batch(), H = INNEN.H, t = 0.3, { x, w, d } = r;
  b.box([w, 0.12, d], [x, 0.06, 0], "#ffffff", o.boden);
  b.box([w + 2 * t, H, t], [x, H / 2, -d / 2 - t / 2], "#ffffff", o.wand);
  for (const s of [-1, 1]) b.box([t, H, d], [x + s * (w / 2 + t / 2), H / 2, 0], "#ffffff", o.wand);
  b.box([w + 2 * t, H, t], [x, H / 2, d / 2 + t / 2], "#ffffff", o.wand);
  if (o.sockel) { b.box([w - 0.02, 1.2, 0.04], [x, 0.72, -d / 2 + 0.02], "#ffffff", o.sockel); for (const s of [-1, 1]) b.box([0.04, 1.2, d - 0.02], [x + s * (w / 2 - 0.02), 0.72, 0], "#ffffff", o.sockel); }
  if (o.offen) {   // Deckenöffnung (Impluvium): Decke als Rahmen
    const [ow, od] = o.offen;
    for (const s of [-1, 1]) { b.box([w + 2 * t, 0.25, (d - od) / 2], [x, H + 0.125, s * (od / 2 + (d - od) / 4)], shade(c.rp.holz, 0.85)); b.box([(w - ow) / 2, 0.25, od], [x + s * (ow / 2 + (w - ow) / 4), H + 0.125, 0], shade(c.rp.holz, 0.85)); }
  } else b.box([w + 2 * t, 0.25, d + 2 * t], [x, H + 0.125, 0], shade(c.rp.holz, 0.85));
  for (let k = -d / 2 + 1; k < d / 2; k += 1.6) if (!o.offen || Math.abs(k) > o.offen[1] / 2 + 0.2) b.box([w, 0.22, 0.18], [x, H - 0.11, k], c.rp.holzDunkel);
  if (o.fenster) b.box([1.4, 1.0, 0.05], [x + w / 4, 2.6, -d / 2 + 0.02], "#bfe6ff");
  const m = b.build(name);
  return fest(m);
};

/** Alle vier Innenräume (eine Zone). */
export const innenraeume = (c: AquaCtx) => {
  const ap = c.ap, rp = c.rp, g = new THREE.Group(), I = INNEN;
  const fr = fresko(ap.fresko, ap.freskoGelb, ap.freskoGruen, ap.freskoBlau), plan = bauplan(ap.rolle, "#3a3550", ap.fresko);
  // Büro des Frontinus: Rollenregale, Schreibtisch mit Plan, Wandplan, Öllampen, Fenster, Truhe
  g.add(raum(c, "buero", I.buero, { boden: slabs(rp.travertin, shade(rp.travertin, 0.75)), wand: plaster(ap.putzInnen[0]), sockel: fr, fenster: true }));
  const bx = I.buero.x;
  for (const x of [bx - 2.8, bx - 0.4]) g.add(schriftrollenRegal(c.kit, ap, [x, 0.12, -I.buero.d / 2 + 0.35], 0, { w: 2.3, h: 2.6 }));
  g.add(schreibtisch(c.kit, rp, ap, [bx + 0.5, 0.12, -1.0], 0, plan));
  g.add(wandplan(c.kit, ap, [bx + 2.6, 0.12, -I.buero.d / 2 + 0.05], 0, plan));
  g.add(wandplan(c.kit, ap, [bx + I.buero.w / 2 - 0.05, 0.12, -1.5], -90, plan));
  c.lebt(oellampeLicht(c, [bx + 1.4, 0.98, -0.8], 0.4)); c.lebt(oellampeLicht(c, [bx - 3.9, 1.5, -3], 1.3));
  const tb = c.kit.batch(); tb.box([1.2, 0.6, 0.6], [bx - 3.4, 0.42, 2.5], "#ffffff", planks(rp.holz)); tb.box([1.24, 0.06, 0.64], [bx - 3.4, 0.75, 2.5], rp.eisen);
  tb.box([0.6, 0.06, 0.6], [bx + 0.5, 0.6, 0.2], rp.holz); for (const z of [-0.25, 0.25]) for (const x of [-0.25, 0.25]) tb.box([0.05, 0.48, 0.05], [bx + 0.5 + x, 0.36, 0.2 + z], rp.holzDunkel);
  g.add(fest(tb.build("buero-moebel")));
  // Küche: gemauerter Herd mit Feuer und Bleitopf (Traubensirup), Amphoren, Kräuter, Tisch mit Brot, Regal mit Krügen
  const kx = I.kueche.x;
  g.add(raum(c, "kueche", I.kueche, { boden: slabs(ap.lehm, shade(ap.lehm, 0.7)), wand: plaster(ap.putzInnen[3]), fenster: true }));
  const hb = c.kit.batch(); hb.box([3.2, 0.9, 1.4], [kx - 1.5, 0.57, -I.kueche.d / 2 + 0.85], "#ffffff", brick(ap.ziegelwand, ap.ziegelFuge));
  hb.box([3.4, 0.08, 1.5], [kx - 1.5, 1.04, -I.kueche.d / 2 + 0.85], shade(ap.ofen, 0.9));
  hb.box([2.8, 0.06, 0.5], [kx + 2.4, 1.8, -I.kueche.d / 2 + 0.3], rp.holz); hb.box([2.8, 0.06, 0.5], [kx + 2.4, 2.5, -I.kueche.d / 2 + 0.3], rp.holz);
  for (let i = 0; i < 6; i++) hb.add(ball, [kx - 3.5 + i * 0.5, 3.5, -I.kueche.d / 2 + 0.35], i % 2 ? "#6fae4a" : "#9ac25a", undefined, [0, 0, 0], [0.12, 0.3, 0.12]);   // Kräuterbündel
  hb.box([3.2, 0.03, 0.03], [kx - 2.25, 3.82, -I.kueche.d / 2 + 0.35], rp.holzDunkel);
  hb.box([2.4, 0.08, 1.1], [kx + 1, 0.86, 0.6], rp.holz); for (const x of [-1, 1]) for (const z of [-0.45, 0.45]) hb.box([0.08, 0.8, 0.08], [kx + 1 + x, 0.48, 0.6 + z], rp.holzDunkel);
  for (let i = 0; i < 4; i++) { amphore(hb, rp, [kx + 1.4 + i * 0.6, 1.86, -I.kueche.d / 2 + 0.3], 0.5); }
  g.add(fest(hb.build("kueche-moebel")));
  c.lebt(bleitopf(c.kit, ap, [kx - 1.0, 1.08, -I.kueche.d / 2 + 0.85], 0.2));
  c.lebt(glutFeuer([kx - 2.4, 1.1, -I.kueche.d / 2 + 0.85], { w: 0.6, groesse: 0.6, phase: 1.1 }));
  g.add(brote(c.kit, rp, ap, [kx + 1, 0.9, 0.6]));
  g.add(kruege(c.kit, rp, [kx + 3.2, 0.12, 2.6], 0, 5, 4));
  // Bleirohr-Werkstatt: Schmelzofen mit Glut, Bleiplatten, Rohre in Arbeit, Stapel, Werkbank, bleiche Wand mit Russ
  const wx = I.werkstatt.x;
  g.add(raum(c, "werkstatt", I.werkstatt, { boden: slabs(ap.felsSchnitt, shade(ap.felsSchnitt, 0.7)), wand: plaster(shade(ap.putzInnen[2], 0.86)) }));
  const wb = c.kit.batch(); wb.box([2, 1.2, 1.6], [wx - 2.8, 0.72, -I.werkstatt.d / 2 + 1.0], "#ffffff", brick(ap.ziegelwand, ap.ziegelFuge));
  wb.add(new THREE.CylinderGeometry(0.55, 0.45, 0.4, 16), [wx - 2.8, 1.5, -I.werkstatt.d / 2 + 1.0], "#5a5a62");
  wb.add(new THREE.CircleGeometry(0.5, 16), [wx - 2.8, 1.71, -I.werkstatt.d / 2 + 1.0], ap.bleiHell, undefined, [-90, 0, 0]);
  wb.box([1.2, 3.2, 1.2], [wx - 2.8, 3.0, -I.werkstatt.d / 2 + 0.7], "#ffffff", brick(shade(ap.ziegelwand, 0.7), ap.ziegelFuge));
  wb.box([3, 0.1, 1.0], [wx + 1.6, 0.9, -I.werkstatt.d / 2 + 0.7], rp.holz); for (const x of [-1.4, 1.4]) wb.box([0.1, 0.84, 0.9], [wx + 1.6 + x, 0.5, -I.werkstatt.d / 2 + 0.7], rp.holzDunkel);
  wb.add(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), [wx + 1.0, 1.0, -I.werkstatt.d / 2 + 0.6], rp.holzDunkel, undefined, [0, 0, 80]);
  wb.box([0.25, 0.16, 0.1], [wx + 0.75, 1.02, -I.werkstatt.d / 2 + 0.6], rp.eisen);
  g.add(fest(wb.build("werkstatt-moebel")));
  c.lebt(glutFeuer([wx - 2.8, 0.25, -I.werkstatt.d / 2 + 1.85], { w: 0.8, groesse: 0.7, phase: 2.1 }));
  c.lebt(dampf([wx - 2.8, 1.75, -I.werkstatt.d / 2 + 1.0], { w: 0.6, d: 0.6, hoehe: 1.4, n: 6, groesse: 0.2, seed: 81, dichte: 0.35 }));
  g.add(bleiplatte(c.kit, ap, [wx + 0.5, 0.12, 1.4], 0));
  g.add(bleirohre(c.kit, ap, [wx + 2.6, 0.12, 2.8], 90, 2.6, 2));
  g.add(bleirohre(c.kit, ap, [wx - 3, 0.12, 2.8], 90, 2.6, 3));
  // Atrium: Säulen um das Impluvium, Deckenöffnung (Compluvium) mit Licht, Fresken, Mosaik, Lararium, Zierbrunnen-Strahl
  const ax = I.atrium.x, A = I.atrium;
  g.add(raum(c, "atrium", A, { boden: mosaik(ap.mosaik), wand: plaster(ap.fresko), sockel: fr, offen: [4.4, 3.6] }));
  const ab = c.kit.batch();
  for (const sz of [-1, 1]) { ab.box([4.4, 0.3, 0.2], [ax, 0.27, -0.5 + sz * 1.6], shade(rp.marmor, 0.95)); ab.box([0.2, 0.3, 3.0], [ax + sz * 2.1, 0.27, -0.5], shade(rp.marmor, 0.95)); }
  for (const [x, z] of [[-2.2, -2.3], [2.2, -2.3], [-2.2, 1.3], [2.2, 1.3]] as const) saeule(ab, ax + x, 0.12, z, INNEN.H - 0.1, 0.22, rp.marmor);
  ab.box([1.4, 1.6, 0.6], [ax + 5, 0.92, -A.d / 2 + 0.4], shade(rp.marmor, 0.9)); ab.box([1.6, 0.18, 0.8], [ax + 5, 1.8, -A.d / 2 + 0.45], rp.marmor);   // Lararium
  ab.add(new THREE.ConeGeometry(0.9, 0.6, 4), [ax + 5, 2.2, -A.d / 2 + 0.45], shade(ap.fresko, 0.9), undefined, [0, 45, 0], [1, 1, 0.5]);
  for (const s of [-1, 1]) ab.box([0.6, 2.4, 0.06], [ax + s * 4.2, 2.4, -A.d / 2 + 0.05], ap.freskoBlau);
  g.add(fest(ab.build("atrium")));
  g.add(becken(c.uhr, ap.klar, [ax, 0.18, -0.5], 3.98, 2.98, 0, { tempo: 0.3, durch: 0.75 }));
  g.add(strahl(c.uhr, ap.klar, [ax, 0.9, -0.5], [ax + 0.9, 0.18, -0.5], 0.035, { bogen: 0.7, tempo: 3 }));
  const sb = c.kit.batch(); sb.add(new THREE.CylinderGeometry(0.1, 0.16, 0.9, 10), [ax, 0.45, -0.5], ap.bronze); g.add(sb.build("atrium-strahl"));
  c.lebt(spritzer([ax + 0.9, 0.19, -0.5], { n: 8, kraft: 0.25, weite: 0.4, seed: 91 }));
  const licht = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.4, INNEN.H, 4, 1, true), new THREE.MeshBasicMaterial({ color: "#fff6d8", transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, fog: true }));
  licht.position.set(ax, INNEN.H / 2, -0.5); licht.rotation.y = Math.PI / 4; licht.scale.set(1, 1, 0.8); licht.userData.occluder = false; licht.layers.set(NOINK); licht.name = "lichtsaeule"; g.add(licht);   // Licht: ohne Tusche, verdeckt nichts
  g.add(statue(c.kit, rp, [ax - 5, 0.12, -A.d / 2 + 1.2], 0, true));
  return g;
};

export { rad as _aquaRad, Rng as _aquaRng, vorhang as _aquaVorhang };
