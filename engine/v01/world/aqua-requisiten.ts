// Herkunft: eigen (V-Video), geschrieben 2026-11-18, ohne Vorlage.
// Requisiten der Römer-Wasser-Welt: Vermessung (Chorobates, Nivellierlatte, Pflöcke mit Schnur), Bau (Tretkran mit drehendem Rad,
// Leiter, Schaufel und Spitzhacke, Deckplatten, Bleirohre, Bronze-Düsen), Wasser (Löwenkopf-Brunnen, Zierbrunnen mit Münzen,
// geheimer Wasserverkauf, Krüge), Stadt (Wäscheleine und Markise im Wind, Brot, Gemüse), Haus (Schriftrollen-Regal, Bleitopf mit
// Traubensirup, Öllampe), Tiere (Esel mit Körben, Hund, Tauben, Schafe und Ziegen aus der Nord-Welt), Land (Pflug, Schilf,
// Brennholz), heute (Forschungsboot mit Bohrkern). Bewegung nur aus der Shot-Zeit.
import * as THREE from "three";
import { Rng } from "../core/random";
import type { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { planks, shade, slabs, blocks, tiles } from "./paint";
import { FlussUhr, becken, rinne, spritzer, strahl, vorhang, dampf } from "./aqua-wasser";
import { klein, glutFeuer, haspel, oellampeLicht, type AquaCtx, type AquaPalette } from "./aqua-bauten";
import type { Lebendig } from "./leben";
import type { RoemerPalette } from "./roemer";
import { amphore, statue } from "./roemer-bauten";
import { groma, ochse, amphoren, moertelkasten, werkzeug } from "./roemer-requisiten";
import { schaf, ziege } from "./nord-requisiten";
import type { NordPalette } from "./nord";

type B = ReturnType<Kit["batch"]>;
type AP = AquaPalette; type RP = RoemerPalette;
const ball = new THREE.IcosahedronGeometry(1, 2);
const ballGrob = new THREE.IcosahedronGeometry(1, 1);
const rad = THREE.MathUtils.degToRad;
const zyl = (r0: number, r1: number, h: number, n = 10) => new THREE.CylinderGeometry(r0, r1, h, n);

/** Requisit bauen: Batch füllen, an `at` setzen, um `turn` (Grad) drehen; klein = wird ausgeblendet, wenn es die Sicht verdeckt. */
const bau = (kit: Kit, name: string, at: V3, turn: number, f: (b: B) => void) => {
  const b = kit.batch(); f(b);
  const g = b.build(name); g.position.set(...at); g.rotation.y = rad(turn);
  return klein(g);
};
/** Gruppe mit bewegten Teilen an `at`/`turn`. */
const gruppe = (name: string, at: V3, turn: number) => { const g = new THREE.Group(); g.name = name; g.position.set(...at); g.rotation.y = rad(turn); return klein(g); };

// ---------------- Vermessung ----------------
/** Chorobates: 6 m langer Holztisch mit Wassernut oben und vier Loten an den Beinen (schwingen leise). Entlang x. */
export const chorobates = (kit: Kit, rp: RP, ap: AP, uhr: FlussUhr, at: V3, turn = 0, phase = 0): Lebendig => {
  const g = gruppe("chorobates", at, turn), b = kit.batch(), L = 6, H = 1.05;
  b.box([L, 0.16, 0.36], [0, H, 0], "#ffffff", planks(rp.holz));
  for (const x of [-L / 2 + 0.3, L / 2 - 0.3]) for (const z of [-0.2, 0.2]) b.box([0.12, H, 0.12], [x, H / 2, z * 1.6], rp.holzDunkel, undefined, [z > 0 ? 6 : -6, 0, 0]);
  for (const x of [-L / 2 + 0.3, L / 2 - 0.3]) b.box([0.08, 0.08, 0.9], [x, 0.35, 0], rp.holzDunkel);
  for (const x of [-L / 2 + 0.7, L / 2 - 0.7]) b.box([0.08, 0.7, 0.08], [x, H - 0.4, 0.18], rp.holzDunkel, undefined, [0, 0, x > 0 ? 35 : -35]);   // Streben
  b.box([L - 0.6, 0.04, 0.12], [0, H + 0.08, 0], shade(rp.holz, 0.6));   // Nut
  g.add(b.build("chorobates-tisch"));
  g.add(rinne(uhr, ap.klar, [-L / 2 + 0.35, H + 0.095, 0], [L / 2 - 0.35, H + 0.095, 0], 0.1, { tempo: 0.15, dichte: 0.4 }));
  const lote: THREE.Object3D[] = [];
  for (const x of [-L / 2 + 0.55, -L / 2 + 1.3, L / 2 - 1.3, L / 2 - 0.55]) {
    const l = new THREE.Group(); l.position.set(x, H - 0.08, 0.2);
    const s = kit.mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.55, 4), "#3a3540"); s.position.y = -0.275; l.add(s);
    const k = kit.mesh(new THREE.ConeGeometry(0.035, 0.08, 8), rp.bronze); k.rotation.x = Math.PI; k.position.y = -0.58; l.add(k);
    g.add(l); lote.push(l);
  }
  return { obj: g, tick: (t) => lote.forEach((l, i) => { l.rotation.z = 0.04 * Math.sin(t * 2.1 + phase + i * 0.7); }) };
};
/** Nivellierlatte: Stange mit roten und weissen Feldern und verschiebbarer Zieltafel, auf einem Fussbrett. */
export const nivellierlatte = (kit: Kit, rp: RP, at: V3, turn = 0) => bau(kit, "nivellierlatte", at, turn, (b) => {
  const H = 3.2;
  for (let i = 0; i < 10; i++) b.box([0.1, H / 10, 0.06], [0, 0.1 + (i + 0.5) * (H / 10), 0], i % 2 ? "#f6f1e4" : rp.rot);
  b.box([0.5, 0.36, 0.04], [0, 1.9, 0.05], "#f6f1e4"); b.box([0.5, 0.06, 0.05], [0, 1.9, 0.07], rp.rot);
  b.box([0.5, 0.1, 0.5], [0, 0.05, 0], rp.holzDunkel);
});
/** Pflöcke mit Schnur: n Pflöcke auf einer Linie (entlang x, Länge l), dazwischen eine rote Schnur. */
export const pfloecke = (kit: Kit, rp: RP, at: V3, turn = 0, l = 12, n = 5) => bau(kit, "pfloecke", at, turn, (b) => {
  for (let i = 0; i < n; i++) { const x = -l / 2 + (i * l) / (n - 1); b.add(zyl(0.04, 0.025, 0.6, 6), [x, 0.3, 0], rp.holz); b.add(new THREE.ConeGeometry(0.06, 0.06, 6), [x, 0.62, 0], rp.rot); }
  b.box([l, 0.012, 0.012], [0, 0.52, 0], rp.rot);
});

// ---------------- Bau ----------------
/** Tretkran: Holzgestell mit schrägem Ausleger, grosses Laufrad (dreht), Seil mit Steinblock (geht auf und ab). Rad quer zu x. */
export const tretkran = (kit: Kit, rp: RP, ap: AP, at: V3, turn = 0, phase = 0): Lebendig => {
  const g = gruppe("tretkran", at, turn), b = kit.batch(), hd = rp.holzDunkel, R = 2.2;
  for (const z of [-0.9, 0.9]) { b.box([0.2, 3.0, 0.2], [0, 1.5, z], hd); b.box([3.6, 0.2, 0.2], [0, 0.1, z], hd); b.box([0.16, 3.2, 0.16], [-0.9, 1.4, z], hd, undefined, [0, 0, 28]); }
  b.box([0.24, 9.5, 0.24], [2.4, 4.3, 0], rp.holz, undefined, [0, 0, -18]);   // Ausleger
  b.box([0.14, 6, 0.14], [1.2, 3.2, 0], hd, undefined, [0, 0, -40]);
  g.add(b.build("tretkran-gestell"));
  const rad_ = new THREE.Group(); rad_.position.set(-0.2, R + 0.25, 0);
  const rb = kit.batch();
  for (const z of [-0.75, 0.75]) rb.add(new THREE.TorusGeometry(R, 0.08, 6, 32), [0, 0, z], rp.holz);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; rb.box([0.1, 0.1, 1.6], [Math.cos(a) * R, Math.sin(a) * R, 0], rp.holz); }
  for (let i = 0; i < 6; i++) for (const z of [-0.75, 0.75]) rb.box([2 * R, 0.08, 0.08], [0, 0, z], hd, undefined, [0, 0, i * 30]);
  rb.add(zyl(0.18, 0.18, 2.1, 10), [0, 0, 0], hd, undefined, [90, 0, 0]);
  rad_.add(rb.build("tretrad")); g.add(rad_);
  const spitze: V3 = [3.85, 8.85, 0];
  const seilGeo = new THREE.CylinderGeometry(0.02, 0.02, 1, 5); seilGeo.translate(0, -0.5, 0);
  const seil = kit.mesh(seilGeo, "#6a4a2a"); seil.position.set(...spitze); g.add(seil);
  const stein = kit.mesh(new THREE.BoxGeometry(1.0, 0.6, 0.7), "#ffffff", blocks(ap.tuff, ap.tuffFuge)); g.add(stein);
  return { obj: g, tick: (t) => {
    const u = 0.5 - 0.5 * Math.cos(((t + phase) * 0.12) * Math.PI * 2), l = 1.2 + u * 6.0;
    rad_.rotation.z = -l / 0.5; seil.scale.y = l; stein.position.set(spitze[0], spitze[1] - l - 0.3, 0);
  } };
};
/** Leiter (Holz), Höhe h, lehnt leicht schräg (Fuss am Ursprung). */
export const leiter = (kit: Kit, rp: RP, at: V3, turn = 0, h = 4, schraeg = 8) => bau(kit, "leiter", at, turn, (b) => {
  const k = Math.tan(rad(schraeg));
  for (const x of [-0.25, 0.25]) b.box([0.07, h, 0.07], [x, h / 2, -k * h / 2], rp.holz, undefined, [-schraeg, 0, 0]);
  for (let y = 0.3; y < h - 0.1; y += 0.32) b.add(zyl(0.025, 0.025, 0.5, 5), [0, y, -k * y], rp.holzDunkel, undefined, [0, 0, 90]);
});
/** Bleirohre gestapelt (Pyramide), Länge l, mit Muffen. */
export const bleirohre = (kit: Kit, ap: AP, at: V3, turn = 0, l = 3, seed = 1) => bau(kit, "bleirohre", at, turn, (b) => {
  const r = new Rng(seed * 5 + 2), R = 0.13;
  for (let reihe = 0; reihe < 3; reihe++) for (let i = 0; i < 4 - reihe; i++) {
    const x = (i - (3 - reihe) / 2) * R * 2.1, y = R + reihe * R * 1.8, f = shade(ap.blei, r.range(0.9, 1.08));
    b.add(zyl(R, R, l, 12), [0, y, x], f, undefined, [0, 0, 90]);
    b.add(new THREE.TorusGeometry(R * 1.05, 0.03, 5, 14), [l / 2 - 0.1, y, x], shade(ap.blei, 0.75), undefined, [0, 90, 0]);
    b.add(new THREE.CircleGeometry(R * 0.7, 10), [l / 2 + 0.005, y, x], ap.bleiDunkel, undefined, [0, 90, 0]);
  }
  b.box([0.1, 0.1, 1.2], [-l / 3, 0.05, 0], shade(rp0(ap), 0.8)); b.box([0.1, 0.1, 1.2], [l / 3, 0.05, 0], shade(rp0(ap), 0.8));
});
const rp0 = (ap: AP) => ap.regal;
/** Bleiplatte am Boden und ein Rohr, das um einen Holzkern gebogen wird (Werkstatt), mit Lötnaht. */
export const bleiplatte = (kit: Kit, ap: AP, at: V3, turn = 0) => bau(kit, "bleiplatte", at, turn, (b) => {
  b.box([2.4, 0.03, 0.9], [0, 0.015, 0], ap.blei);
  b.add(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 14, 1, true, 0, Math.PI * 1.6), [0, 0.35, -1.2], ap.bleiHell, undefined, [0, 0, 90]);
  b.add(zyl(0.12, 0.12, 2.6, 10), [0, 0.35, -1.2], ap.regal, undefined, [0, 0, 90]);
  b.box([2.2, 0.035, 0.04], [0, 0.5, -1.2], ap.bleiDunkel);
});
/** Bronze-Düsen (calices) auf einem Brett, eine viel dicker als die anderen (goldener Glanz). */
export const duesen = (kit: Kit, ap: AP, rp: RP, at: V3, turn = 0) => bau(kit, "duesen", at, turn, (b) => {
  b.box([1.4, 0.06, 0.5], [0, 0.03, 0], rp.holz);
  [-0.5, -0.25, 0, 0.25].forEach((x) => b.add(zyl(0.05, 0.055, 0.22, 10), [x, 0.17, 0], ap.bronzeDunkel, undefined, [0, 0, 90]));
  b.add(zyl(0.11, 0.12, 0.3, 14), [0.52, 0.19, 0], ap.bronze, undefined, [0, 0, 90]);
});
/** Schieber (Holzbrett mit Griff) als loses Teil. */
export const schieberTeil = (kit: Kit, rp: RP, at: V3, turn = 0) => bau(kit, "schieber", at, turn, (b) => {
  b.box([0.9, 1.0, 0.08], [0, 0.5, 0], "#ffffff", planks(rp.holz, true)); b.box([0.4, 0.06, 0.06], [0, 1.06, 0], rp.eisen);
});
/** Deckplatten gestapelt (Stein). */
export const deckplatten = (kit: Kit, ap: AP, at: V3, turn = 0, n = 5) => bau(kit, "deckplatten", at, turn, (b) => {
  for (let i = 0; i < n; i++) b.box([1.2, 0.22, 2.2], [((i * 7) % 3) * 0.05, 0.11 + i * 0.23, 0], shade(ap.tuff, 0.9 + (i % 3) * 0.05));
});
/** Grabwerkzeug: Schaufel und Spitzhacke an eine Wand gelehnt, Korb mit Erde. */
export const grabwerkzeug = (kit: Kit, rp: RP, ap: AP, at: V3, turn = 0) => bau(kit, "grabwerkzeug", at, turn, (b) => {
  b.box([0.06, 1.5, 0.06], [-0.3, 0.75, 0], rp.holz, undefined, [12, 0, 0]); b.box([0.32, 0.4, 0.04], [-0.3, 0.2, 0.1], rp.eisen, undefined, [12, 0, 0]);
  b.box([0.06, 1.2, 0.06], [0.3, 0.6, 0], rp.holz, undefined, [10, 0, 0]); b.box([0.7, 0.07, 0.07], [0.3, 1.18, -0.13], rp.eisen, undefined, [10, 0, 0]);
  b.add(zyl(0.32, 0.24, 0.36, 12), [0.9, 0.18, 0.3], rp.korb); b.add(ballGrob, [0.9, 0.33, 0.3], ap.erdeSchnitt[0], undefined, [0, 0, 0], [0.28, 0.1, 0.28]);
});

// ---------------- Wasser in der Stadt ----------------
/** Löwenkopf-Brunnen: Steintrog vor einer Stele mit Löwenkopf, aus dem Maul ein Strahl; der Trog läuft über (Vorhang an der Front,
 *  Spritzer, Rinne im Pflaster). Front nach +z. */
export const loewenbrunnen = (c: AquaCtx, at: V3, turn = 0, o: { ueberlauf?: boolean } = {}): Lebendig => {
  const g = gruppe("loewenbrunnen", at, turn), b = c.kit.batch(), ap = c.ap, rp = c.rp, st = blocks(rp.travertin, shade(rp.travertin, 0.72));
  b.box([2.4, 0.75, 0.22], [0, 0.375, 0.6], "#ffffff", st); b.box([2.4, 0.75, 0.22], [0, 0.375, -0.6], "#ffffff", st);
  for (const s of [-1, 1]) b.box([0.22, 0.75, 1.42], [s * 1.09, 0.375, 0], "#ffffff", st);
  b.box([2.0, 0.1, 1.0], [0, 0.05, 0], shade(rp.travertin, 0.7));
  b.box([1.2, 2.1, 0.5], [0, 1.05, -0.95], "#ffffff", st); b.box([1.4, 0.2, 0.6], [0, 2.15, -0.95], shade(rp.travertin, 0.9));
  // Löwenkopf: Mähne (Ring aus Kugeln), Gesicht, Nase, Maul
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.add(ball, [Math.cos(a) * 0.3, 1.45 + Math.sin(a) * 0.3, -0.66], ap.bronzeDunkel, undefined, [0, 0, 0], [0.13, 0.13, 0.1]); }
  b.add(ball, [0, 1.45, -0.62], ap.bronze, undefined, [0, 0, 0], [0.26, 0.26, 0.14]);
  b.add(ball, [0, 1.4, -0.5], shade(ap.bronze, 0.85), undefined, [0, 0, 0], [0.08, 0.06, 0.06]);
  for (const s of [-1, 1]) b.add(ball, [s * 0.1, 1.53, -0.5], "#2b2a33", undefined, [0, 0, 0], [0.035, 0.03, 0.02]);
  b.add(zyl(0.06, 0.06, 0.12, 10), [0, 1.3, -0.48], "#2b2a33", undefined, [90, 0, 0]);
  g.add(b.build("loewenbrunnen-stein"));
  g.add(strahl(c.uhr, ap.klar, [0, 1.3, -0.44], [0, 0.66, 0.05], 0.045, { bogen: 0.15, tempo: 3 }));
  g.add(becken(c.uhr, ap.wasser, [0, 0.68, 0], 1.98, 0.98, 0, { tempo: 0.6 }));
  const l: Lebendig[] = [spritzer([0, 0.69, 0.05], { n: 10, kraft: 0.35, weite: 0.5, seed: 31 })];
  if (o.ueberlauf !== false) {
    g.add(vorhang(c.uhr, ap.wasser, [0, 0.75, 0.72], 1.6, 0.73, 0, { tempo: 2.6, neig: 0.08 }));
    g.add(rinne(c.uhr, ap.wasser, [0, 0.03, 0.85], [0, 0.03, 3.6], 0.45, { tempo: 2 }));
    l.push(spritzer([0, 0.03, 0.9], { n: 12, kraft: 0.3, weite: 0.9, seed: 32 }));
  }
  l.forEach((x) => g.add(x.obj));
  return { obj: g, tick: (t) => { c.uhr.tick(t); l.forEach((x) => x.tick(t)); } };
};
/** Zierbrunnen auf einem Platz: rundes Becken (klares Wasser, man sieht die Münzen am Boden), Mittelsäule mit Schale, aus der
 *  Wasser rundum fällt, oben eine Bronze-Figur mit Strahl; vier Delfine speien ins Becken. */
export const zierbrunnen = (c: AquaCtx, at: V3, o: { muenzen?: number; r?: number } = {}): Lebendig => {
  const g = gruppe("zierbrunnen", at, 0), b = c.kit.batch(), ap = c.ap, rp = c.rp, R = o.r ?? 3.4, m = rp.marmor;
  b.add(new THREE.CylinderGeometry(R + 0.3, R + 0.35, 0.7, 40, 1, true), [0, 0.35, 0], m);
  b.add(new THREE.TorusGeometry(R + 0.15, 0.18, 8, 40), [0, 0.7, 0], shade(m, 0.94), undefined, [90, 0, 0]);
  b.add(new THREE.CircleGeometry(R + 0.2, 40), [0, 0.06, 0], "#ffffff", tiles(ap.kacheln), [-90, 0, 0]);
  b.add(zyl(0.35, 0.5, 2.0, 16), [0, 1.0, 0], m); b.add(new THREE.CylinderGeometry(1.3, 0.3, 0.4, 24), [0, 2.1, 0], m);
  b.add(zyl(0.18, 0.25, 0.8, 12), [0, 2.7, 0], m);
  b.add(ball, [0, 3.35, 0], ap.bronze, undefined, [0, 0, 0], [0.22, 0.4, 0.22]); b.add(ball, [0, 3.85, 0], ap.bronze, undefined, [0, 0, 0], [0.15, 0.15, 0.15]);
  const r = new Rng(77);
  for (let i = 0; i < (o.muenzen ?? 40); i++) { const a = r.range(0, Math.PI * 2), d = Math.sqrt(r.next()) * (R - 0.3); if (d < 0.6) continue; b.add(zyl(0.07, 0.07, 0.015, 10), [Math.cos(a) * d, 0.08, Math.sin(a) * d], r.next() < 0.75 ? ap.muenze : ap.kupferGruen, undefined, [r.range(-8, 8), 0, r.range(-8, 8)]); }
  const delfine: [number, number][] = [];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, x = Math.cos(a) * (R + 0.1), z = Math.sin(a) * (R + 0.1); delfine.push([x, z]);
    b.add(ball, [x, 1.0, z], ap.kupferGruen, undefined, [0, -(a * 180) / Math.PI, 30], [0.4, 0.18, 0.18]);
    b.add(new THREE.ConeGeometry(0.12, 0.3, 6), [x * 1.04, 1.32, z * 1.04], ap.kupferGruen, undefined, [0, 0, 0]);
  }
  g.add(b.build("zierbrunnen"));
  g.add(becken(c.uhr, ap.klar, [0, 0.55, 0], 2 * R, 2 * R, 0, { rund: true, tempo: 0.4, durch: 0.55 }));
  g.add(becken(c.uhr, ap.wasser, [0, 2.29, 0], 2.5, 2.5, 0, { rund: true, tempo: 0.6 }));
  const kreis = new THREE.CylinderGeometry(1.3, 1.5, 1.72, 32, 1, true);
  const f = new Float32Array(kreis.getAttribute("position").count * 2), uv = kreis.getAttribute("uv");
  for (let i = 0; i < uv.count; i++) { f[i * 2] = Math.abs(uv.getX(i) * 8 % 1 - 0.5) * 2; f[i * 2 + 1] = (1 - uv.getY(i)) * 3; }
  kreis.setAttribute("fluss", new THREE.BufferAttribute(f, 2));
  const fall = new THREE.Mesh(kreis, c.uhr.mat(ap.wasser, 2.4, 1.2, 0.85)); fall.position.y = 1.42; fall.name = "fluss-kranz"; fall.userData.occluder = false; g.add(fall);
  g.add(strahl(c.uhr, ap.klar, [0, 4.0, 0], [0, 4.0, 0.01], 0.05, { bogen: 1.0, tempo: 3 }));
  delfine.forEach(([x, z]) => g.add(strahl(c.uhr, ap.klar, [x * 0.97, 1.05, z * 0.97], [x * 0.55, 0.56, z * 0.55], 0.04, { bogen: 0.3, tempo: 3 })));
  const l: Lebendig[] = [spritzer([0, 0.56, 0], { n: 16, kraft: 0.4, weite: 1.6, ring: ap.wasser.hell, seed: 41 }), ...delfine.map(([x, z], i) => spritzer([x * 0.55, 0.56, z * 0.55], { n: 6, kraft: 0.25, weite: 0.3, seed: 50 + i }))];
  l.forEach((x) => g.add(x.obj));
  g.userData.protect = true; g.userData.occluder = false;
  return { obj: g, tick: (t) => { c.uhr.tick(t); l.forEach((x) => x.tick(t)); } };
};
/** Geheimer Wasserverkauf: Holzbrett als Tisch an einem angezapften Rohr (Hahn), darunter ein Krug, Münzen auf dem Brett. */
export const wasserverkauf = (c: AquaCtx, at: V3, turn = 0): Lebendig => {
  const g = gruppe("wasserverkauf", at, turn), b = c.kit.batch(), ap = c.ap, rp = c.rp;
  b.box([1.6, 0.06, 0.7], [0, 0.85, 0], rp.holz); for (const x of [-0.7, 0.7]) b.box([0.08, 0.85, 0.6], [x, 0.425, 0], rp.holzDunkel);
  b.add(zyl(0.09, 0.09, 3.0, 10), [-1.5, 0.15, -0.8], ap.blei, undefined, [0, 0, 90]);
  b.add(zyl(0.06, 0.06, 0.9, 8), [-0.2, 0.55, -0.8], ap.blei);
  b.add(zyl(0.06, 0.06, 0.5, 8), [-0.2, 1.0, -0.6], ap.blei, undefined, [70, 0, 0]);
  b.box([0.12, 0.1, 0.08], [-0.2, 1.12, -0.42], ap.bronze);   // Hahn
  amphore(b, rp, [-0.2, 0, -0.25], 0.6);
  const r = new Rng(5); for (let i = 0; i < 9; i++) b.add(zyl(0.05, 0.05, 0.012, 10), [0.3 + r.range(-0.25, 0.25), 0.89 + (i % 3) * 0.012, r.range(-0.2, 0.2)], ap.muenze);
  b.box([0.5, 0.3, 0.3], [0.5, 1.03, 0.1], rp.korb);
  g.add(b.build("wasserverkauf"));
  g.add(strahl(c.uhr, ap.klar, [-0.2, 1.07, -0.38], [-0.2, 0.63, -0.25], 0.025, { bogen: 0.05, tempo: 3 }));
  return { obj: g, tick: (t) => c.uhr.tick(t) };
};
/** Krüge und Amphoren als Gruppe (Wasserträger, Küche). */
export const kruege = (kit: Kit, rp: RP, at: V3, turn = 0, n = 4, seed = 1) => bau(kit, "kruege", at, turn, (b) => {
  const r = new Rng(seed * 9 + 1);
  for (let i = 0; i < n; i++) amphore(b, rp, [((i % 3) - 1) * 0.45 + r.range(-0.05, 0.05), 0, Math.floor(i / 3) * 0.45], r.range(0.55, 0.75));
});

// ---------------- Stadt ----------------
/** Wäscheleine zwischen a und b (Weltlage in der Gruppe), Wäschestücke schwingen im Wind. */
export const waescheleine = (kit: Kit, ap: AP, a: V3, e: V3, o: { n?: number; seed?: number; wind?: number } = {}): Lebendig => {
  const g = new THREE.Group(); g.name = "waescheleine";
  const A = new THREE.Vector3(...a), E = new THREE.Vector3(...e), L = A.distanceTo(E), mitte = A.clone().lerp(E, 0.5); mitte.y -= L * 0.04;
  const kurve = new THREE.QuadraticBezierCurve3(A, mitte, E);
  g.add(kit.mesh(new THREE.TubeGeometry(kurve, 16, 0.012, 4, false), "#5a4a3a"));
  const r = new Rng((o.seed ?? 1) * 13 + 3), n = o.n ?? Math.max(3, Math.round(L / 1.3)), teile: { m: THREE.Object3D; ph: number }[] = [];
  for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, p = kurve.getPoint(u), w = r.range(0.5, 0.9), h = r.range(0.5, 1.0);
    const geo = new THREE.PlaneGeometry(w, h, 1, 4); geo.translate(0, -h / 2, 0);
    const m = kit.mesh(geo, r.pick(ap.waesche)); (m.material as THREE.Material).side = THREE.DoubleSide;
    const piv = new THREE.Group(); piv.position.copy(p); piv.rotation.y = Math.atan2(-(E.z - A.z), E.x - A.x); piv.add(m); g.add(piv);
    teile.push({ m: piv, ph: r.range(0, 6) });
  }
  g.userData.occluder = false;
  return { obj: g, tick: (t) => teile.forEach(({ m, ph }) => { m.rotation.x = (o.wind ?? 0.25) * (0.6 + 0.4 * Math.sin(t * 1.7 + ph)) + 0.08 * Math.sin(t * 5.3 + ph * 2); }) };
};
/** Markise (gestreiftes Tuch) über einem Laden: hängt von der Wand (Ursprung oben an der Wand) nach vorn (+z), Vorderkante flattert. */
export const markise = (kit: Kit, ap: AP, at: V3, turn = 0, o: { w?: number; tiefe?: number; seed?: number } = {}): Lebendig => {
  const g = gruppe("markise", at, turn), w = o.w ?? 3, d = o.tiefe ?? 1.8, r = new Rng((o.seed ?? 1) * 7), f1 = r.pick(ap.markise), f2 = "#f6f1e4";
  const n = 6, streifen: THREE.Mesh[] = [];
  for (let i = 0; i < n; i++) {
    const geo = new THREE.PlaneGeometry(w / n, d, 1, 6); geo.rotateX(-Math.PI / 2 + 0.35); geo.translate(-w / 2 + (i + 0.5) * (w / n), -Math.sin(0.35) * d / 2, d / 2 * Math.cos(0.35));
    const m = kit.mesh(geo, i % 2 ? f2 : f1); (m.material as THREE.Material).side = THREE.DoubleSide; g.add(m); streifen.push(m);
  }
  const b = kit.batch(); for (const x of [-w / 2, w / 2]) b.box([0.05, 0.05, d * 1.05], [x, -Math.sin(0.35) * d / 2, d / 2], "#5a4a3a", undefined, [20, 0, 0]);
  g.add(b.build("markise-stangen"));
  const pos = streifen.map((m) => (m.geometry.getAttribute("position") as THREE.BufferAttribute)), basis = pos.map((p) => Float32Array.from(p.array as Float32Array));
  return { obj: g, tick: (t) => pos.forEach((p, k) => {
    const a = p.array as Float32Array, b0 = basis[k];
    for (let i = 0; i < p.count; i++) { const z = b0[i * 3 + 2], u = Math.max(0, z / d); a[i * 3 + 1] = b0[i * 3 + 1] + u * u * 0.12 * Math.sin(t * 4.2 + k * 0.6 + b0[i * 3] * 1.3); }
    p.needsUpdate = true;
  }) };
};
/** Brot: Brett mit runden Broten (acht Kerben). */
export const brote = (kit: Kit, rp: RP, ap: AP, at: V3, turn = 0, n = 6) => bau(kit, "brote", at, turn, (b) => {
  b.box([1.4, 0.06, 0.6], [0, 0.03, 0], rp.holz);
  for (let i = 0; i < n; i++) { const x = -0.5 + (i % 3) * 0.5, z = -0.14 + Math.floor(i / 3) * 0.28; b.add(ball, [x, 0.1, z], ap.brot, undefined, [0, i * 20, 0], [0.18, 0.08, 0.18]); for (let k = 0; k < 4; k++) b.box([0.34, 0.012, 0.02], [x, 0.17, z], shade(ap.brot, 0.65), undefined, [0, k * 45, 0]); }
});

// ---------------- Haus ----------------
/** Regal mit Schriftrollen (Fächer, in jedem Rollen mit roten Etiketten). Ursprung = Mitte unten, Front nach +z. */
export const schriftrollenRegal = (kit: Kit, ap: AP, at: V3, turn = 0, o: { w?: number; h?: number } = {}) => bau(kit, "rollenregal", at, turn, (b) => {
  const w = o.w ?? 2.4, h = o.h ?? 2.2, F = 4, Z = 3;
  b.box([w, h, 0.06], [0, h / 2, -0.25], ap.regal);
  for (const x of [-w / 2, w / 2]) b.box([0.06, h, 0.5], [x, h / 2, 0], ap.regal);
  for (let k = 0; k <= Z; k++) b.box([w, 0.05, 0.5], [0, 0.05 + (k * (h - 0.1)) / Z, 0], ap.regal);
  for (let i = 1; i < F; i++) b.box([0.04, h, 0.48], [-w / 2 + (i * w) / F, h / 2, 0], ap.regal);
  const r = new Rng(17);
  for (let k = 0; k < Z; k++) for (let i = 0; i < F; i++) for (let j = 0; j < 7; j++) {
    const x = -w / 2 + (i + 0.15 + (j % 4) * 0.22) * (w / F), y = 0.12 + (k * (h - 0.1)) / Z + 0.07 + Math.floor(j / 4) * 0.12;
    b.add(zyl(0.055, 0.055, 0.44, 8), [x, y, 0.02], shade(ap.rolle, r.range(0.9, 1.05)), undefined, [90, 0, 0]);
    b.add(new THREE.CircleGeometry(0.056, 8), [x, y, 0.245], ap.rolleRand);
    if (r.next() < 0.3) b.box([0.04, 0.06, 0.01], [x, y - 0.07, 0.25], ap.fresko);
  }
});
/** Bleitopf mit kochendem Traubensirup (sapa) auf einem kleinen Feuer, Blasen und Dampf. */
export const bleitopf = (kit: Kit, ap: AP, at: V3, phase = 0): Lebendig => {
  const g = gruppe("bleitopf", at, 0), b = kit.batch();
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; b.add(ballGrob, [Math.cos(a) * 0.36, 0.1, Math.sin(a) * 0.36], ap.felsSchnitt, undefined, [0, 0, 0], [0.16, 0.14, 0.16]); }
  b.add(new THREE.LatheGeometry([[0.05, 0], [0.32, 0.04], [0.38, 0.2], [0.36, 0.42], [0.4, 0.46]].map(([x, y]) => new THREE.Vector2(x, y)), 18), [0, 0.24, 0], ap.blei);
  b.add(new THREE.TorusGeometry(0.39, 0.03, 6, 20), [0, 0.7, 0], ap.bleiDunkel, undefined, [90, 0, 0]);
  b.add(new THREE.CircleGeometry(0.35, 20), [0, 0.6, 0], ap.sirup, undefined, [-90, 0, 0]);
  g.add(b.build("bleitopf"));
  const feuer = glutFeuer([0, 0.02, 0], { w: 0.4, groesse: 0.6, phase }); g.add(feuer.obj);
  const blasen = Array.from({ length: 5 }, (_, i) => { const m = kit.mesh(ball, shade(ap.sirup, 1.25)); m.position.set(Math.cos(i * 2.4) * 0.2, 0.61, Math.sin(i * 2.4) * 0.2); g.add(m); return m; });
  const d = dampf([0, 0.7, 0], { w: 0.5, d: 0.5, hoehe: 1.4, n: 6, groesse: 0.18, seed: 7 }); g.add(d.obj);
  return { obj: g, tick: (t) => { feuer.tick(t); d.tick(t); blasen.forEach((m, i) => { const u = ((t * 0.9 + i * 0.37 + phase) % 1); m.scale.setScalar(0.02 + 0.05 * Math.sin(u * Math.PI)); }); } };
};
/** Öllampe als loses Requisit (flackert). */
export const oellampe = (c: AquaCtx, at: V3, phase = 0) => oellampeLicht(c, [at[0], at[1] + 0.06, at[2]], phase);
/** Schreibtisch mit Bauplan, Schreibrohr, Tintenfass und Wachstafel. */
export const schreibtisch = (kit: Kit, rp: RP, ap: AP, at: V3, turn = 0, plan?: Parameters<Kit["mesh"]>[2]) => bau(kit, "schreibtisch", at, turn, (b) => {
  b.box([2.2, 0.08, 1.0], [0, 0.82, 0], rp.holz); for (const x of [-1, 1]) for (const z of [-0.42, 0.42]) b.box([0.08, 0.82, 0.08], [x, 0.41, z], rp.holzDunkel);
  b.box([1.2, 0.01, 0.8], [-0.2, 0.865, 0], "#ffffff", plan);
  for (const x of [-0.8, 0.4]) b.add(zyl(0.05, 0.05, 0.9, 8), [x, 0.91, -0.38], ap.rolleRand, undefined, [0, 0, 90]);
  b.add(zyl(0.05, 0.05, 0.1, 8), [0.75, 0.91, 0.2], "#2b2a33"); b.box([0.3, 0.02, 0.012], [0.65, 0.93, 0.28], rp.holzDunkel, undefined, [0, 30, 0]);
  b.box([0.4, 0.03, 0.3], [0.75, 0.875, -0.15], rp.holzDunkel); b.box([0.34, 0.01, 0.24], [0.75, 0.892, -0.15], "#4a4038");
});
/** Wand mit aufgehängtem Bauplan (Pergament mit Bogen-Aufriss) an zwei Stäben. */
export const wandplan = (kit: Kit, ap: AP, at: V3, turn = 0, plan?: Parameters<Kit["mesh"]>[2]) => bau(kit, "wandplan", at, turn, (b) => {
  b.box([1.6, 1.1, 0.01], [0, 1.9, 0], "#ffffff", plan);
  for (const y of [1.33, 2.47]) b.add(zyl(0.035, 0.035, 1.75, 8), [0, y, 0.02], ap.rolleRand, undefined, [0, 0, 90]);
});

// ---------------- Tiere ----------------
/** Esel mit zwei Tragkörben (wahlweise mit Steinen/Krügen); nickt mit dem Kopf, Schwanz schwingt. Blick nach +x. */
export const esel = (kit: Kit, rp: RP, ap: AP, at: V3, turn = 0, phase = 0, ladung: "steine" | "kruege" | "leer" = "kruege"): Lebendig => {
  const g = gruppe("esel", at, turn), b = kit.batch(), f = ap.esel, h = ap.eselHell;
  b.add(ball, [0, 0.95, 0], f, undefined, [0, 0, 0], [0.62, 0.34, 0.28]);
  b.add(ball, [0, 0.86, 0], h, undefined, [0, 0, 0], [0.5, 0.24, 0.25]);
  for (const x of [-0.4, 0.4]) for (const z of [-0.15, 0.15]) { b.add(zyl(0.06, 0.05, 0.72, 6), [x, 0.36, z], f); b.add(zyl(0.065, 0.065, 0.06, 6), [x, 0.03, z], "#3a3540"); }
  b.box([0.7, 0.04, 0.62], [0, 1.27, 0], rp.leder);
  for (const s of [-1, 1]) {
    b.add(zyl(0.26, 0.2, 0.46, 12), [0, 0.95, s * 0.48], rp.korb);
    if (ladung === "steine") for (let i = 0; i < 4; i++) b.add(ballGrob, [(i - 1.5) * 0.12, 1.2, s * 0.48], ap.tuff, undefined, [i * 40, 0, 0], [0.11, 0.08, 0.1]);
    if (ladung === "kruege") for (const x of [-0.1, 0.1]) b.add(new THREE.LatheGeometry([[0.02, 0], [0.09, 0.08], [0.1, 0.22], [0.04, 0.32], [0.05, 0.38]].map(([x, y]) => new THREE.Vector2(x, y)), 10), [x, 1.0, s * 0.48], rp.amphore);
  }
  g.add(b.build("esel"));
  const kopf = new THREE.Group(); kopf.position.set(0.55, 1.12, 0);
  const kb = kit.batch();
  kb.add(ball, [0.12, 0.12, 0], f, undefined, [0, 0, -35], [0.2, 0.13, 0.13]);
  kb.add(ball, [0.36, -0.05, 0], f, undefined, [0, 0, -50], [0.24, 0.12, 0.12]);
  kb.add(ball, [0.52, -0.2, 0], h, undefined, [0, 0, 0], [0.11, 0.09, 0.1]);
  for (const s of [-1, 1]) { kb.add(ball, [0.18, 0.4, s * 0.07], f, undefined, [s * 12, 0, -10], [0.05, 0.2, 0.035]); kb.add(ball, [0.36, 0.06, s * 0.11], "#ffffff", undefined, [0, 0, 0], [0.035, 0.035, 0.02]); kb.add(ball, [0.375, 0.06, s * 0.125], "#2b2a33", undefined, [0, 0, 0], [0.018, 0.018, 0.01]); }
  kb.box([0.04, 0.35, 0.08], [0.0, 0.22, 0], shade(f, 0.6));   // Mähne
  kopf.add(kb.build("eselkopf")); g.add(kopf);
  const schwanz = new THREE.Group(); schwanz.position.set(-0.6, 1.0, 0);
  const sw = kit.mesh(zyl(0.025, 0.02, 0.5, 5), f); sw.position.y = -0.25; schwanz.add(sw);
  const qu = kit.mesh(ball, shade(f, 0.5)); qu.scale.set(0.05, 0.1, 0.05); qu.position.y = -0.52; schwanz.add(qu); g.add(schwanz);
  return { obj: g, tick: (t) => { kopf.rotation.z = -0.15 - 0.2 * Math.max(0, Math.sin(t * 0.8 + phase)); schwanz.rotation.x = 0.3 * Math.sin(t * 2.4 + phase); schwanz.rotation.z = -0.2; } };
};
/** Hund: sitzt oder steht, wedelt mit dem Schwanz, hebt den Kopf. Blick nach +x. */
export const hund = (kit: Kit, ap: AP, at: V3, turn = 0, phase = 0): Lebendig => {
  const g = gruppe("hund", at, turn), b = kit.batch(), f = ap.hund, h = shade(f, 1.25);
  b.add(ball, [0, 0.42, 0], f, undefined, [0, 0, 0], [0.34, 0.18, 0.16]);
  b.add(ball, [0.05, 0.38, 0], h, undefined, [0, 0, 0], [0.24, 0.12, 0.14]);
  for (const x of [-0.22, 0.22]) for (const z of [-0.09, 0.09]) b.add(zyl(0.04, 0.035, 0.34, 6), [x, 0.17, z], f);
  g.add(b.build("hund"));
  const kopf = new THREE.Group(); kopf.position.set(0.32, 0.56, 0);
  const kb = kit.batch(); kb.add(ball, [0.06, 0.04, 0], f, undefined, [0, 0, 0], [0.13, 0.12, 0.12]); kb.add(ball, [0.2, 0.0, 0], h, undefined, [0, 0, 0], [0.09, 0.06, 0.07]);
  kb.add(ball, [0.29, 0.02, 0], "#2b2a33", undefined, [0, 0, 0], [0.025, 0.022, 0.025]);
  for (const s of [-1, 1]) { kb.add(ball, [0.0, 0.1, s * 0.09], shade(f, 0.7), undefined, [s * 30, 0, 20], [0.05, 0.11, 0.03]); kb.add(ball, [0.13, 0.08, s * 0.07], "#2b2a33", undefined, [0, 0, 0], [0.018, 0.018, 0.01]); }
  kopf.add(kb.build("hundekopf")); g.add(kopf);
  const schwanz = new THREE.Group(); schwanz.position.set(-0.32, 0.5, 0);
  const sm = kit.mesh(zyl(0.03, 0.015, 0.3, 5), f); sm.position.y = 0.15; schwanz.add(sm); schwanz.rotation.z = 0.6; g.add(schwanz);
  return { obj: g, tick: (t) => { schwanz.rotation.x = 0.6 * Math.sin(t * 9 + phase); kopf.rotation.z = 0.15 * Math.sin(t * 0.7 + phase); } };
};
/** Tauben: n Tauben pickend am Boden (Kopf nickt), in einem Kreis vom Radius r. */
export const tauben = (kit: Kit, ap: AP, at: V3, n = 5, r = 1.2, seed = 1): Lebendig => {
  const g = gruppe("tauben", at, 0), rng = new Rng(seed * 11 + 4), koepfe: { k: THREE.Object3D; ph: number }[] = [];
  for (let i = 0; i < n; i++) {
    const t = new THREE.Group(); t.position.set(rng.range(-r, r), 0, rng.range(-r, r)); t.rotation.y = rng.range(0, Math.PI * 2);
    const b = kit.batch();
    b.add(ball, [0, 0.13, 0], ap.taube, undefined, [0, 0, 10], [0.13, 0.08, 0.07]);
    b.add(ball, [-0.12, 0.14, 0], shade(ap.taube, 0.8), undefined, [0, 0, 20], [0.07, 0.03, 0.05]);
    for (const z of [-0.03, 0.03]) b.add(zyl(0.008, 0.008, 0.07, 4), [0.0, 0.035, z], "#e0707a");
    t.add(b.build("taube"));
    const k = new THREE.Group(); k.position.set(0.1, 0.18, 0);
    const kb = kit.batch(); kb.add(ball, [0.02, 0.04, 0], ap.taubeHals, undefined, [0, 0, 0], [0.05, 0.06, 0.045]); kb.add(ball, [0.06, 0.09, 0], ap.taube, undefined, [0, 0, 0], [0.045, 0.04, 0.04]);
    kb.add(new THREE.ConeGeometry(0.012, 0.04, 5), [0.11, 0.085, 0], "#e0a050", undefined, [0, 0, -90]);
    k.add(kb.build("taubenkopf")); t.add(k); g.add(t);
    koepfe.push({ k, ph: rng.range(0, 6) });
  }
  return { obj: g, tick: (t) => koepfe.forEach(({ k, ph }) => { k.rotation.z = -0.9 * Math.max(0, Math.sin(t * 3 + ph)) ** 4; }) };
};

// ---------------- Land ----------------
/** Pflug (Hakenpflug aus Holz mit Eisenschar), Deichsel nach +x. */
export const pflug = (kit: Kit, rp: RP, at: V3, turn = 0) => bau(kit, "pflug", at, turn, (b) => {
  b.box([2.6, 0.1, 0.1], [0.9, 0.45, 0], rp.holz, undefined, [0, 0, 12]);
  b.box([0.7, 0.12, 0.12], [-0.4, 0.08, 0], rp.holzDunkel, undefined, [0, 0, -8]); b.add(new THREE.ConeGeometry(0.08, 0.3, 6), [-0.85, 0.05, 0], rp.eisen, undefined, [0, 0, 100]);
  b.box([0.08, 1.0, 0.08], [-0.55, 0.55, 0], rp.holz, undefined, [0, 0, 25]); b.box([0.06, 0.06, 0.4], [-0.75, 1.0, 0], rp.holzDunkel);
});
/** Schilf: Büschel aus Halmen mit braunen Kolben, wiegen sich. */
export const schilf = (kit: Kit, ap: AP, at: V3, o: { n?: number; w?: number; seed?: number } = {}): Lebendig => {
  const g = gruppe("schilf", at, 0), r = new Rng((o.seed ?? 1) * 5 + 3), w = o.w ?? 1.6, halme: { m: THREE.Object3D; ph: number }[] = [];
  for (let i = 0; i < (o.n ?? 14); i++) {
    const p = new THREE.Group(); p.position.set(r.range(-w / 2, w / 2), 0, r.range(-w / 3, w / 3));
    const h = r.range(1.2, 2.2), m = kit.mesh(new THREE.ConeGeometry(0.03, h, 4), r.pick(ap.schilf)); m.position.y = h / 2; p.add(m);
    if (r.next() < 0.5) { const k = kit.mesh(zyl(0.04, 0.04, 0.22, 6), "#7a5230"); k.position.y = h * 0.82; p.add(k); }
    g.add(p); halme.push({ m: p, ph: r.range(0, 6) });
  }
  g.userData.occluder = false;
  return { obj: g, tick: (t) => halme.forEach(({ m, ph }) => { m.rotation.z = 0.08 * Math.sin(t * 1.3 + ph); m.rotation.x = 0.05 * Math.sin(t * 0.9 + ph * 1.7); }) };
};
/** Brennholz-Stapel (Scheite quer). */
export const brennholz = (kit: Kit, rp: RP, at: V3, turn = 0, l = 2) => bau(kit, "brennholz", at, turn, (b) => {
  const r = new Rng(3);
  for (let reihe = 0; reihe < 4; reihe++) for (let i = 0; i < Math.round(l / 0.22); i++) b.add(zyl(0.1, 0.1, 0.7, 7), [-l / 2 + 0.11 + i * 0.22 + (reihe % 2) * 0.05, 0.1 + reihe * 0.19, 0], shade(rp.holz, r.range(0.75, 1.1)), undefined, [90, 0, 0]);
  for (const x of [-l / 2 - 0.08, l / 2 + 0.08]) b.box([0.08, 0.9, 0.08], [x, 0.45, 0], rp.holzDunkel);
});
/** Schwammstäbe in einem Krug (Latrine). */
export const schwammstaebe = (kit: Kit, rp: RP, at: V3) => bau(kit, "schwammstaebe", at, 0, (b) => {
  b.add(new THREE.LatheGeometry([[0.05, 0], [0.18, 0.1], [0.2, 0.3], [0.14, 0.48], [0.16, 0.52]].map(([x, y]) => new THREE.Vector2(x, y)), 12), [0, 0, 0], rp.amphore);
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; b.add(zyl(0.012, 0.012, 0.8, 5), [Math.cos(a) * 0.06, 0.72, Math.sin(a) * 0.06], rp.holz, undefined, [Math.sin(a) * 10, 0, Math.cos(a) * 10]); b.add(ball, [Math.cos(a) * 0.13, 1.13, Math.sin(a) * 0.13], "#f2c94c", undefined, [0, 0, 0], [0.07, 0.06, 0.07]); }
});

// ---------------- heute ----------------
/** Forschungsboot: weisser Rumpf mit rotem Streifen, Kabine, A-Rahmen am Heck, an dem ein Bohrrohr hängt (geht auf und ab);
 *  auf Deck ein Tisch mit einem aufgeschnittenen Bohrkern (Schichten). Bug nach +x. Ursprung = Wasserlinie. */
export const forschungsboot = (kit: Kit, ap: AP, at: V3, turn = 0, phase = 0): Lebendig => {
  const g = gruppe("forschungsboot", at, turn), b = kit.batch(), L = 9, W = 3.2;
  const rumpf = new THREE.Shape(); rumpf.moveTo(-L / 2, -W / 2); rumpf.lineTo(L / 2 - 2, -W / 2); rumpf.quadraticCurveTo(L / 2, -W / 4, L / 2 + 0.4, 0); rumpf.quadraticCurveTo(L / 2, W / 4, L / 2 - 2, W / 2); rumpf.lineTo(-L / 2, W / 2); rumpf.closePath();
  const rg = new THREE.ExtrudeGeometry(rumpf, { depth: 1.4, bevelEnabled: false }); rg.rotateX(-Math.PI / 2); rg.translate(0, -0.5, 0);
  b.add(rg, [0, 0, 0], ap.boot);
  b.box([L - 0.6, 0.18, 0.04], [-0.1, 0.55, W / 2 + 0.01], ap.bootRot); b.box([L - 0.6, 0.18, 0.04], [-0.1, 0.55, -W / 2 - 0.01], ap.bootRot);
  b.box([2.6, 1.8, 2.4], [1.0, 1.8, 0], ap.boot); b.box([2.7, 0.12, 2.5], [1.0, 2.76, 0], ap.bootBlau);
  for (const z of [-0.6, 0.6]) b.box([1.0, 0.6, 0.03], [2.2, 2.05, z * 2.03], "#7fc6e8");
  b.box([2.0, 0.6, 0.04], [1.0, 2.05, 1.21], "#7fc6e8");
  for (const z of [-1.2, 1.2]) b.box([0.14, 4.0, 0.14], [-3.6, 2.9, z], ap.bootRot, undefined, [0, 0, -14]);
  b.box([0.16, 0.16, 2.6], [-4.1, 4.85, 0], ap.bootRot);
  b.box([1.6, 0.06, 0.7], [-1.4, 1.75, -0.8], "#d8dde4"); for (const x of [-2.1, -0.7]) b.box([0.05, 0.85, 0.05], [x, 1.32, -0.8], "#5f6878");
  ap.bohrkern.forEach((f, i) => b.box([0.3, 0.12, 0.12], [-2.0 + i * 0.32, 1.85, -0.8], f));
  b.add(zyl(0.06, 0.06, 1.3, 10, ), [-1.4, 1.85, -0.55], ap.kernrohr, undefined, [0, 0, 90]);
  g.add(b.build("forschungsboot"));
  const rohr = new THREE.Group(); rohr.position.set(-4.1, 4.75, 0);
  const seil = kit.mesh(zyl(0.015, 0.015, 1, 4), "#2b2a33"); seil.geometry.translate(0, -0.5, 0); rohr.add(seil);
  const kern = kit.mesh(zyl(0.09, 0.09, 2.4, 10), ap.kernrohr); rohr.add(kern); g.add(rohr);
  return { obj: g, tick: (t) => {
    const u = 0.5 - 0.5 * Math.cos(((t + phase) * 0.1) * Math.PI * 2), l = 0.6 + u * 3.5;
    seil.scale.y = l; kern.position.y = -l - 1.2;
    g.rotation.z = 0.015 * Math.sin(t * 0.9 + phase); g.position.y = at[1] + 0.05 * Math.sin(t * 1.1 + phase);
  } };
};
/** Bohrkern auf einem Tisch (Labor im Freien), aufgeschnitten, mit Massstab. */
export const bohrkernTisch = (kit: Kit, ap: AP, at: V3, turn = 0) => bau(kit, "bohrkern", at, turn, (b) => {
  b.box([2.2, 0.06, 0.8], [0, 0.85, 0], "#d8dde4"); for (const x of [-1, 1]) for (const z of [-0.32, 0.32]) b.box([0.05, 0.85, 0.05], [x, 0.425, z], "#5f6878");
  const r = new Rng(9); let x = -0.9;
  while (x < 0.9) { const l = r.range(0.08, 0.3); b.box([Math.min(l, 0.9 - x), 0.08, 0.14], [x + l / 2, 0.92, 0], r.pick(ap.bohrkern)); x += l; }
  b.box([1.85, 0.02, 0.04], [0, 0.89, 0.12], "#f6f1e4"); for (let i = 0; i < 10; i++) b.box([0.01, 0.025, 0.04], [-0.9 + i * 0.2, 0.9, 0.12], "#2b2a33");
});

// ---------------- Auswahl nach Namen ----------------
export type AquaRequisit = "chorobates" | "nivellierlatte" | "groma" | "pfloecke" | "tretkran" | "leiter" | "haspel" | "bleirohre" | "bleiplatte" | "duesen"
  | "schieber" | "deckplatten" | "grabwerkzeug" | "moertelkasten" | "werkzeug" | "loewenbrunnen" | "zierbrunnen" | "wasserverkauf" | "kruege" | "amphoren"
  | "waescheleine" | "markise" | "brote" | "rollenregal" | "bleitopf" | "oellampe" | "schreibtisch" | "esel" | "hund" | "tauben" | "schaf" | "ziege"
  | "ochse" | "pflug" | "schilf" | "brennholz" | "schwammstaebe" | "statue" | "forschungsboot" | "bohrkern" | "feuer" | "dampf";
export const AQUA_REQUISITEN: AquaRequisit[] = ["chorobates", "nivellierlatte", "groma", "pfloecke", "tretkran", "leiter", "haspel", "bleirohre", "bleiplatte", "duesen",
  "schieber", "deckplatten", "grabwerkzeug", "moertelkasten", "werkzeug", "loewenbrunnen", "zierbrunnen", "wasserverkauf", "kruege", "amphoren",
  "waescheleine", "markise", "brote", "rollenregal", "bleitopf", "oellampe", "schreibtisch", "esel", "hund", "tauben", "schaf", "ziege",
  "ochse", "pflug", "schilf", "brennholz", "schwammstaebe", "statue", "forschungsboot", "bohrkern", "feuer", "dampf"];
/** Farben, die ein Requisit braucht. */
export type AquaReqFarben = { ap: AP; rp: RP; np: NordPalette };
/** Ein Requisit der Wasser-Welt nach Namen (Gruppe oder bewegtes Teil). Wasser-Requisiten bringen ihre eigene Wasser-Uhr mit. */
export const aquaRequisit = (kit: Kit, f: AquaReqFarben, art: AquaRequisit, at: V3, turn = 0, seed = 1): THREE.Object3D | Lebendig => {
  const { ap, rp, np } = f, uhr = new FlussUhr();
  const c: AquaCtx = { kit, ap, rp, uhr, lebt: (l) => l, st: (o) => o, sun: "#ffffff" };
  const mitUhr = (l: Lebendig): Lebendig => ({ obj: l.obj, tick: (t) => { uhr.tick(t); l.tick(t); } });
  switch (art) {
    case "chorobates": return mitUhr(chorobates(kit, rp, ap, uhr, at, turn, seed * 0.3));
    case "nivellierlatte": return nivellierlatte(kit, rp, at, turn);
    case "groma": return groma(kit, rp, at, turn, seed * 0.3);
    case "pfloecke": return pfloecke(kit, rp, at, turn);
    case "tretkran": return tretkran(kit, rp, ap, at, turn, seed);
    case "leiter": return leiter(kit, rp, at, turn);
    case "haspel": return haspel(c, at, 2.5, { turn, phase: seed * 0.2 });
    case "bleirohre": return bleirohre(kit, ap, at, turn, 3, seed);
    case "bleiplatte": return bleiplatte(kit, ap, at, turn);
    case "duesen": return duesen(kit, ap, rp, at, turn);
    case "schieber": return schieberTeil(kit, rp, at, turn);
    case "deckplatten": return deckplatten(kit, ap, at, turn);
    case "grabwerkzeug": return grabwerkzeug(kit, rp, ap, at, turn);
    case "moertelkasten": return moertelkasten(kit, rp, at, turn);
    case "werkzeug": return werkzeug(kit, rp, at, turn);
    case "loewenbrunnen": return loewenbrunnen(c, at, turn);
    case "zierbrunnen": return zierbrunnen(c, at);
    case "wasserverkauf": return wasserverkauf(c, at, turn);
    case "kruege": return kruege(kit, rp, at, turn, 4, seed);
    case "amphoren": return amphoren(kit, rp, at, turn, 5, seed);
    case "waescheleine": { const r = rad(turn); return waescheleine(kit, ap, [at[0] - Math.cos(r) * 3, at[1] + 4, at[2] + Math.sin(r) * 3], [at[0] + Math.cos(r) * 3, at[1] + 4, at[2] - Math.sin(r) * 3], { seed }); }
    case "markise": return markise(kit, ap, [at[0], at[1] + 2.6, at[2]], turn, { seed });
    case "brote": return brote(kit, rp, ap, at, turn);
    case "rollenregal": return schriftrollenRegal(kit, ap, at, turn);
    case "bleitopf": return bleitopf(kit, ap, at, seed * 0.4);
    case "oellampe": return oellampe(c, at, seed * 0.5);
    case "schreibtisch": return schreibtisch(kit, rp, ap, at, turn);
    case "esel": return esel(kit, rp, ap, at, turn, seed * 0.7, seed % 3 === 0 ? "steine" : "kruege");
    case "hund": return hund(kit, ap, at, turn, seed * 0.5);
    case "tauben": return tauben(kit, ap, at, 5, 1.2, seed);
    case "schaf": return schaf(kit, np, at, turn, seed * 0.6);
    case "ziege": return ziege(kit, np, at, turn, seed * 0.6, seed);
    case "ochse": return ochse(kit, rp, at, turn, seed * 0.7, seed % 2 === 0);
    case "pflug": return pflug(kit, rp, at, turn);
    case "schilf": return schilf(kit, ap, at, { seed });
    case "brennholz": return brennholz(kit, rp, at, turn);
    case "schwammstaebe": return schwammstaebe(kit, rp, at);
    case "statue": return statue(kit, rp, at, turn, seed % 2 === 0);
    case "forschungsboot": return forschungsboot(kit, ap, at, turn, seed);
    case "bohrkern": return bohrkernTisch(kit, ap, at, turn);
    case "feuer": return glutFeuer(at, { phase: seed * 0.3 });
    case "dampf": return dampf(at, { seed });
  }
};

