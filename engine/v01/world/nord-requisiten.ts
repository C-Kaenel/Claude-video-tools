// Herkunft: eigen (V-Video), geschrieben 2026-11-16, ohne Vorlage.
// Requisiten der Nord-Welt (Wikinger um 900): Vorräte und Essen (Fass, Korb, Krug, Handmühle, Stockfisch-Gestell, Netz, Kessel am
// Dreibein), Handwerk (Webstuhl, Hackklotz mit Axt, Werkbank), Schmiede (Esse mit Glut, Amboss, Blasebalg), Waffen und Schmuck
// (Schildständer, Speerständer, Runenstein, Schnitzpfosten, Rabenfahne), Feuer (Feuerstelle) und Tiere (Schaf, Ziege, Rabe).
// Jede Funktion liefert eine Gruppe (Ursprung = Mitte am Boden, `turn` in Grad) oder ein bewegtes Teil `{ obj, tick }`.
import * as THREE from "three";
import { Rng } from "../core/random";
import { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { flecht, netz, planks, rabenfahne, rock, runenstein, shade, webstoff } from "./paint";
import { rauchsaeule, type Lebendig } from "./leben";
import type { NordPalette } from "./nord";

type B = ReturnType<Kit["batch"]>;
const ball = new THREE.IcosahedronGeometry(1, 2);
const ballGrob = new THREE.IcosahedronGeometry(1, 1);

/** Farben der Requisiten (Teil der Nord-Palette in den Tokens). */
export type NordReqFarben = { schafWolle: string; schafKopf: string; ziege: string[]; rabe: string; fisch: string; ton: string; glut: string;
  netz: string; korb: string; fahne: string[] };
type NP = NordPalette;

const bau = (kit: Kit, name: string, at: V3, turn: number, f: (b: B) => void, occluder = false) => {
  const b = kit.batch(); f(b);
  const g = b.build(name); g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(turn); g.userData.occluder = occluder;
  return g;
};
/** Lathe-Form (Krug, Kessel): Umriss [Radius, Höhe] um die y-Achse. */
const drehform = (umriss: [number, number][]) => new THREE.LatheGeometry(umriss.map(([r, y]) => new THREE.Vector2(r, y)), 16);

// ---------------- Vorräte und Essen ----------------
export const fass = (b: B, np: NP, at: V3, h = 0.95, liegend = false) => {
  const r = h * 0.38, g = new THREE.CylinderGeometry(r * 0.88, r * 0.88, h, 14);
  const rot: V3 = liegend ? [0, 0, 90] : [0, 0, 0], y = liegend ? r : h / 2;
  b.add(g, [at[0], at[1] + y, at[2]], "#ffffff", planks(np.holz, true), rot, [1.08, 1, 1.08]);
  for (const k of [-0.32, 0.32]) b.add(new THREE.TorusGeometry(r * 0.96, 0.025, 5, 18), liegend ? [at[0] + k * h, at[1] + y, at[2]] : [at[0], at[1] + y + k * h, at[2]], np.metall, undefined, liegend ? [0, 90, 0] : [90, 0, 0]);
};
export const korb = (b: B, np: NP, at: V3, inhalt?: string, s = 1) => {
  b.add(new THREE.CylinderGeometry(0.32 * s, 0.24 * s, 0.38 * s, 14, 1, true), [at[0], at[1] + 0.19 * s, at[2]], "#ffffff", flecht(np.korb));
  b.add(new THREE.CylinderGeometry(0.24 * s, 0.24 * s, 0.02, 14), [at[0], at[1] + 0.01, at[2]], np.korb);
  b.add(new THREE.TorusGeometry(0.32 * s, 0.03 * s, 5, 16), [at[0], at[1] + 0.38 * s, at[2]], shade(np.korb, 0.8), undefined, [90, 0, 0]);
  if (inhalt) for (let i = 0; i < 6; i++) { const a = i * 1.05; b.add(ball, [at[0] + Math.cos(a) * 0.14 * s, at[1] + 0.36 * s, at[2] + Math.sin(a) * 0.14 * s], inhalt, undefined, [0, 0, 0], [0.09 * s, 0.09 * s, 0.09 * s]); }
};
export const krug = (b: B, np: NP, at: V3, s = 1) => {
  b.add(drehform([[0.001, 0], [0.16, 0.02], [0.22, 0.18], [0.2, 0.36], [0.11, 0.48], [0.13, 0.56], [0.001, 0.56]].map(([r, y]) => [r * s, y * s] as [number, number])), at, np.ton);
  b.add(new THREE.TorusGeometry(0.1 * s, 0.025 * s, 5, 10, Math.PI), [at[0] + 0.18 * s, at[1] + 0.38 * s, at[2]], shade(np.ton, 0.85), undefined, [0, 0, -90]);
};
/** Vorräte: Gruppe aus Fässern, Körben (mit Äpfeln/Rüben) und Krügen. */
export const vorraete = (kit: Kit, np: NP, at: V3, turn = 0, seed = 1) => bau(kit, "vorraete", at, turn, (b) => {
  const r = new Rng(seed * 7 + 3);
  fass(b, np, [0, 0, 0]); fass(b, np, [0.85, 0, 0.2], 0.85); fass(b, np, [0.3, 0, 0.95], 0.9, true);
  korb(b, np, [-0.9, 0, 0.3], r.pick(["#e8402e", "#f2b928", "#9a4ab0"])); korb(b, np, [-0.7, 0, 1.0], "#e07a2a", 0.9);
  krug(b, np, [1.5, 0, 0.9]); krug(b, np, [1.75, 0, 0.6], 0.8);
});
/** Handmühle: zwei runde Mühlsteine auf einem Holzklotz, Kurbelstab, Mehlsack daneben. */
export const handmuehle = (kit: Kit, np: NP, at: V3, turn = 0) => bau(kit, "handmuehle", at, turn, (b) => {
  b.add(new THREE.BoxGeometry(0.9, 0.55, 0.9), [0, 0.275, 0], "#ffffff", planks(np.holzDunkel));
  b.add(new THREE.CylinderGeometry(0.38, 0.38, 0.14, 18), [0, 0.62, 0], "#ffffff", rock(np.stein));
  b.add(new THREE.CylinderGeometry(0.36, 0.36, 0.14, 18), [0, 0.77, 0], "#ffffff", rock(shade(np.stein, 1.1)));
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), [0.26, 1.05, 0], np.holz);
  b.add(ball, [0.75, 0.3, 0.3], np.fell[0], undefined, [0, 30, 0], [0.32, 0.3, 0.26]);
});
/** Stockfisch-Gestell: zwei A-Böcke, drei Querstangen, paarweise hängende Fische. */
export const stockfisch = (kit: Kit, np: NP, at: V3, turn = 0, seed = 1) => bau(kit, "stockfisch", at, turn, (b) => {
  const r = new Rng(seed * 11 + 5), L = 4;
  for (const x of [-L / 2, L / 2]) for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.06, 0.07, 2.6, 6), [x, 1.2, s * 0.45], np.holzDunkel, undefined, [s * 20, 0, 0]);
  for (const z of [-0.25, 0, 0.25]) b.add(new THREE.CylinderGeometry(0.04, 0.04, L + 0.3, 6), [0, 2.25 - Math.abs(z) * 0.8, z], np.holz, undefined, [0, 0, 90]);
  for (const z of [-0.25, 0, 0.25]) for (let x = -L / 2 + 0.3; x < L / 2 - 0.2; x += 0.32) {
    const y = 2.25 - Math.abs(z) * 0.8;
    for (const s of [-1, 1]) {
      b.add(ball, [x, y - 0.42, z + s * 0.05], shade(np.fisch, r.range(0.88, 1.08)), undefined, [0, 0, 0], [0.07, 0.36, 0.035]);
      b.add(new THREE.ConeGeometry(0.08, 0.14, 4), [x, y - 0.83, z + s * 0.05], shade(np.fisch, 0.8), undefined, [180, 0, 0], [1, 1, 0.4]);
    }
  }
});
/** Fischernetz zum Trocknen an zwei Stangen, mit Schwimmern oben. */
export const netzgestell = (kit: Kit, np: NP, at: V3, turn = 0) => bau(kit, "netz", at, turn, (b) => {
  for (const x of [-1.6, 1.6]) b.add(new THREE.CylinderGeometry(0.06, 0.07, 2.4, 6), [x, 1.2, 0], np.holzDunkel);
  b.add(new THREE.CylinderGeometry(0.035, 0.035, 3.4, 6), [0, 2.2, 0], np.holz, undefined, [0, 0, 90]);
  const g = new THREE.PlaneGeometry(3.1, 1.8, 10, 4), p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.12 * Math.sin(x * 2.4) * (1 - (y + 0.9) / 1.8)); p.setY(i, y - 0.08 * Math.cos(x * 1.2)); }
  g.computeVertexNormals();
  b.add(g, [0, 1.25, 0.02], "#ffffff", netz(np.netz));
  b.add(g, [0, 1.25, -0.02], "#ffffff", netz(np.netz), [0, 180, 0]);
  for (let x = -1.4; x <= 1.4; x += 0.4) b.add(ball, [x, 2.12, 0.05], np.bemalung[2], undefined, [0, 0, 0], [0.08, 0.08, 0.08]);
});

// ---------------- Handwerk ----------------
/** Gewichtswebstuhl: schräg an die Wand gelehnter Rahmen, oben bunter Stoff, unten Kettfäden und Webgewichte. */
export const webstuhl = (kit: Kit, np: NP, at: V3, turn = 0) => bau(kit, "webstuhl", at, turn, (b) => {
  for (const x of [-0.9, 0.9]) b.add(new THREE.CylinderGeometry(0.06, 0.07, 2.4, 6), [x, 1.15, -0.2], np.holzDunkel, undefined, [-12, 0, 0]);
  b.add(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 6), [0, 2.25, -0.43], np.holz, undefined, [0, 0, 90]);
  b.add(new THREE.BoxGeometry(1.7, 0.8, 0.03), [0, 1.85, -0.36], "#ffffff", webstoff(np.decken), [-12, 0, 0]);
  for (let x = -0.8; x <= 0.8; x += 0.08) b.add(new THREE.CylinderGeometry(0.008, 0.008, 1.0, 3), [x, 0.95, -0.16], "#efe6d0", undefined, [-12, 0, 0]);
  for (let x = -0.78; x <= 0.8; x += 0.16) b.add(ball, [x, 0.42, -0.05], np.ton, undefined, [0, 0, 0], [0.07, 0.07, 0.06]);
});
/** Hackklotz mit Axt, Späne. */
export const hackklotz = (kit: Kit, np: NP, at: V3, turn = 0) => bau(kit, "hackklotz", at, turn, (b) => {
  b.add(new THREE.CylinderGeometry(0.38, 0.42, 0.6, 12), [0, 0.3, 0], np.holz);
  b.add(new THREE.CylinderGeometry(0.36, 0.36, 0.02, 12), [0, 0.61, 0], np.holzHell);
  b.add(new THREE.CylinderGeometry(0.03, 0.035, 0.8, 6), [0.15, 0.95, 0], np.holzDunkel, undefined, [0, 0, -25]);
  b.add(new THREE.BoxGeometry(0.22, 0.14, 0.03), [0.02, 0.64, 0], np.metall, undefined, [0, 0, -25]);
  for (let i = 0; i < 8; i++) b.add(new THREE.BoxGeometry(0.12, 0.02, 0.05), [Math.cos(i) * 0.6, 0.01, Math.sin(i * 1.7) * 0.5], np.holzHell, undefined, [0, i * 40, 0]);
});
/** Werkbank mit Werkzeug (Beil, Hobel, Schale), Brett eingespannt. */
export const werkbank = (kit: Kit, np: NP, at: V3, turn = 0) => bau(kit, "werkbank", at, turn, (b) => {
  b.add(new THREE.BoxGeometry(2.2, 0.12, 0.7), [0, 0.85, 0], "#ffffff", planks(np.holzHell));
  for (const x of [-0.95, 0.95]) for (const z of [-0.25, 0.25]) b.add(new THREE.BoxGeometry(0.1, 0.8, 0.1), [x, 0.4, z], np.holzDunkel);
  b.add(new THREE.BoxGeometry(0.9, 0.06, 0.3), [-0.4, 0.94, 0.05], np.holz);
  b.add(new THREE.BoxGeometry(0.3, 0.1, 0.1), [0.4, 0.96, -0.1], np.holzDunkel);
  b.add(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), [0.7, 0.94, 0.15], np.holzDunkel, undefined, [90, 30, 0]);
  b.add(new THREE.BoxGeometry(0.16, 0.12, 0.02), [0.62, 0.94, -0.06], np.metall, undefined, [90, 30, 0]);
  b.add(new THREE.CylinderGeometry(0.16, 0.1, 0.08, 12), [-0.85, 0.95, -0.15], np.holzHell);
});

// ---------------- Schmiede ----------------
/** Esse: gemauerter Steinblock mit Feuermulde und glühender Kohle (leuchtet, flackert), kleine Flammen, Rauch. */
export const esse = (kit: Kit, np: NP, at: V3, turn = 0, phase = 0): Lebendig => {
  const g = bau(kit, "esse", [0, 0, 0], 0, (b) => {
    b.add(new THREE.BoxGeometry(1.6, 0.85, 1.2), [0, 0.425, 0], "#ffffff", rock(np.stein));
    b.add(new THREE.BoxGeometry(1.7, 0.12, 1.3), [0, 0.9, 0], "#ffffff", rock(shade(np.stein, 0.85)));
    b.add(new THREE.BoxGeometry(0.5, 1.6, 0.5), [0, 1.75, -0.4], "#ffffff", rock(np.stein));   // Rauchfang
  });
  const glut = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(np.glut).multiplyScalar(1.6) }));
  glut.position.set(0, 0.98, 0.1); g.add(glut);
  const kohlen = kit.batch();
  for (let i = 0; i < 9; i++) kohlen.add(ballGrob, [Math.cos(i * 0.7) * 0.25, 1.02, 0.1 + Math.sin(i * 1.3) * 0.2], "#2a2224", undefined, [0, i * 40, 0], [0.09, 0.06, 0.08]);
  g.add(kohlen.build("kohlen"));
  const feuer = rauchsaeule(kit, [0, 0.98, 0.1], { feuer: 0.5, hoehe: 6, dicke: 0.3, wind: [0.8, -0.4], n: 6, tempo: 0.15, farbe: np.rauch, phase });
  g.add(feuer.obj);
  const wrap = new THREE.Group(); wrap.add(g); wrap.position.set(...at); wrap.rotation.y = THREE.MathUtils.degToRad(turn); wrap.name = "esse";
  return { obj: wrap, tick: (t) => { feuer.tick(t); (glut.material as THREE.MeshBasicMaterial).color.set(np.glut).multiplyScalar(1.3 + 0.4 * Math.sin(t * 7 + phase) * Math.sin(t * 3.1)); } };
};
/** Amboss auf einem Holzklotz, Hammer und Zange daneben. */
export const amboss = (kit: Kit, np: NP, at: V3, turn = 0) => bau(kit, "amboss", at, turn, (b) => {
  b.add(new THREE.CylinderGeometry(0.34, 0.38, 0.55, 12), [0, 0.275, 0], np.holz);
  b.add(new THREE.BoxGeometry(0.5, 0.18, 0.24), [0, 0.64, 0], np.metall);
  b.add(new THREE.BoxGeometry(0.3, 0.12, 0.18), [0, 0.5, 0], shade(np.metall, 0.8));
  b.add(new THREE.ConeGeometry(0.1, 0.32, 8), [0.38, 0.67, 0], np.metall, undefined, [0, 0, -90]);
  b.add(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), [-0.1, 0.76, 0.06], np.holzDunkel, undefined, [90, 20, 0]);
  b.add(new THREE.BoxGeometry(0.12, 0.08, 0.08), [-0.1, 0.76, -0.12], shade(np.metall, 1.1));
});
/** Blasebalg: zwei keilförmige Bretter mit Leder dazwischen, Düse zur Esse. */
export const blasebalg = (kit: Kit, np: NP, at: V3, turn = 0) => bau(kit, "blasebalg", at, turn, (b) => {
  const keil = new THREE.Shape(); keil.moveTo(0, -0.3); keil.lineTo(0.9, -0.08); keil.lineTo(0.9, 0.08); keil.lineTo(0, 0.3); keil.closePath();
  b.add(new THREE.ExtrudeGeometry(keil, { depth: 0.04, bevelEnabled: false }), [0, 0.5, -0.02], "#ffffff", planks(np.holz), [90, 0, 0]);
  b.add(new THREE.ExtrudeGeometry(keil, { depth: 0.04, bevelEnabled: false }), [0, 0.78, -0.02], "#ffffff", planks(np.holz), [90, 0, 0]);
  b.add(ball, [0.35, 0.64, 0], np.fell[1], undefined, [0, 0, 0], [0.42, 0.13, 0.26]);
  b.add(new THREE.CylinderGeometry(0.04, 0.06, 0.4, 8), [1.05, 0.64, 0], np.metall, undefined, [0, 0, 90]);
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 0.5, 6), [-0.1, 0.25, 0], np.holzDunkel);
});

// ---------------- Waffen und Schmuck ----------------
/** Schildständer: Holzgestell mit vier bunten Rundschilden. */
export const schildstaender = (kit: Kit, np: NP, at: V3, turn = 0) => bau(kit, "schildstaender", at, turn, (b) => {
  for (const x of [-1.2, 1.2]) b.add(new THREE.BoxGeometry(0.1, 1.3, 0.1), [x, 0.65, -0.15], np.holzDunkel);
  b.add(new THREE.BoxGeometry(2.44, 0.08, 0.08), [0, 1.2, -0.15], np.holz);   // dünner und kürzer als die Pfosten (sonst decken sich Flächen)
  for (let i = 0; i < 4; i++) {
    const x = -0.9 + i * 0.6, a = np.bemalung[i % np.bemalung.length], c = i % 2 ? "#f4efe2" : np.bemalung[(i + 2) % np.bemalung.length];
    const z = (i % 2) * 0.08;   // Schilde überlappen sich: abwechselnd vorn und hinten, nie in einer Ebene
    b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20, 1, false, 0, Math.PI), [x, 0.75, z], a, undefined, [80, 0, 0]);
    b.add(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 20, 1, false, Math.PI, Math.PI), [x, 0.75, z], c, undefined, [80, 0, 0]);
    b.add(ball, [x, 0.75, z + 0.05], np.metall, undefined, [0, 0, 0], [0.1, 0.1, 0.07]);
  }
});
/** Speerständer: Querholz mit sechs senkrechten Speeren (Eisenspitzen), Fuss aus Stein. */
export const speerstaender = (kit: Kit, np: NP, at: V3, turn = 0) => bau(kit, "speerstaender", at, turn, (b) => {
  b.add(new THREE.BoxGeometry(1.6, 0.25, 0.4), [0, 0.12, 0], "#ffffff", rock(np.stein));
  b.add(new THREE.BoxGeometry(1.6, 0.08, 0.08), [0, 1.3, 0], np.holz);
  for (const x of [-0.75, 0.75]) b.add(new THREE.BoxGeometry(0.11, 1.3, 0.11), [x, 0.75, 0], np.holzDunkel);   // dicker als das Querholz
  for (let i = 0; i < 6; i++) {
    const x = -0.6 + i * 0.24;
    b.add(new THREE.CylinderGeometry(0.025, 0.025, 2.3, 6), [x, 1.25, 0], np.holz);
    b.add(new THREE.ConeGeometry(0.05, 0.3, 4), [x, 2.55, 0], np.metall);
  }
});
/** Runenstein: hoher Stein mit bemaltem Schlangenband und Zeichen (Vorderseite +z). */
export const runensteinBau = (kit: Kit, np: NP, at: V3, turn = 0, h = 2.6) => bau(kit, "runenstein", at, turn, (b) => {
  b.add(new THREE.BoxGeometry(1.2, h, 0.45), [0, h / 2 - 0.1, 0], "#ffffff", runenstein(np.stein, np.bemalung[0]), [0, 0, 2]);
  b.add(ball, [0, h - 0.12, 0], "#ffffff", rock(np.stein), [0, 0, 0], [0.62, 0.25, 0.24]);
}, true);
/** Schnitzpfosten: Pfahl mit bemalten Ringen und Flechtband, oben ein geschnitzter Kopf. */
export const schnitzpfosten = (kit: Kit, np: NP, at: V3, turn = 0, h = 3) => bau(kit, "schnitzpfosten", at, turn, (b) => {
  b.add(new THREE.CylinderGeometry(0.2, 0.24, h, 10), [0, h / 2, 0], np.holz);
  for (let i = 0; i < 4; i++) b.add(new THREE.TorusGeometry(0.22, 0.05, 6, 14), [0, 0.6 + i * 0.55, 0], np.bemalung[i % np.bemalung.length], undefined, [90, 0, 0]);
  b.add(ball, [0, h + 0.18, 0], np.holz, undefined, [0, 0, 0], [0.28, 0.32, 0.26]);
  for (const s of [-1, 1]) b.add(ball, [s * 0.1, h + 0.24, 0.22], "#ffffff", undefined, [0, 0, 0], [0.06, 0.06, 0.03]);
  b.add(new THREE.ConeGeometry(0.07, 0.2, 6), [0, h + 0.14, 0.27], shade(np.holz, 0.8), undefined, [90, 0, 0]);
  b.add(new THREE.BoxGeometry(0.4, 0.06, 0.06), [0, h + 0.04, 0.24], np.bemalung[0]);
});
/** Rabenfahne: dreieckiges Tuch mit schwarzem Raben an einer Stange, weht (Material nur für Rabenfahnen, nie klonen). */
export const rabenfahneBau = (kit: Kit, np: NP, at: V3, farbe: string, o: { h?: number; turn?: number; phase?: number } = {}): Lebendig => {
  const h = o.h ?? 3.6, w = 1.6, fh = 1.15, ph = o.phase ?? 0, g = new THREE.Group(); g.name = "rabenfahne";
  const stange = kit.mesh(new THREE.CylinderGeometry(0.04, 0.05, h, 8), np.holzDunkel); stange.position.y = h / 2; g.add(stange);
  const spitze = kit.mesh(new THREE.ConeGeometry(0.07, 0.24, 6), np.metall); spitze.position.y = h + 0.12; g.add(spitze);
  const geo = new THREE.PlaneGeometry(w, fh, 14, 6); geo.translate(w / 2, h - fh / 2 - 0.1, 0);
  const base = Float32Array.from(geo.getAttribute("position").array as Float32Array);
  const p0 = geo.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < p0.count; i++) {   // Dreieck: zur Spitze hin schmaler (Saum unten gerade, oben schräg)
    const k = base[i * 3] / w, y = base[i * 3 + 1] - (h - fh / 2 - 0.1);
    base[i * 3 + 1] = (h - fh / 2 - 0.1) + y * (1 - 0.7 * k) + fh * 0.35 * k * 0.5;
  }
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i));
  const mat = kit.mat("#ffffff", rabenfahne(farbe, np.rabe)); mat.side = THREE.DoubleSide;
  const tuch = new THREE.Mesh(geo, mat); tuch.castShadow = true; g.add(tuch);
  g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(o.turn ?? 0);
  return { obj: g, tick: (t) => {
    for (let i = 0; i < p0.count; i++) {
      const x = base[i * 3], y = base[i * 3 + 1], k = x / w;
      p0.setXYZ(i, x, y - k * k * 0.1, k * (0.2 * Math.sin(x * 3 - t * 6.5 + ph) + 0.05 * Math.sin(y * 4 + t * 5 + ph)));
    }
    p0.needsUpdate = true; geo.computeVertexNormals();
  } };
};

// ---------------- Feuer ----------------
/** Feuerstelle: Steinring, gekreuzte Scheite, Flammen und Rauch. */
export const feuerstelle = (kit: Kit, np: NP, at: V3, o: { groesse?: number; phase?: number } = {}): Lebendig => {
  const s = o.groesse ?? 1, g = bau(kit, "feuerstelle", [0, 0, 0], 0, (b) => {
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; b.add(ballGrob, [Math.cos(a) * 0.75 * s, 0.1, Math.sin(a) * 0.75 * s], "#ffffff", rock(np.stein), [0, i * 30, 0], [0.22 * s, 0.16 * s, 0.18 * s]); }
    for (let i = 0; i < 4; i++) b.add(new THREE.CylinderGeometry(0.07 * s, 0.08 * s, 1.0 * s, 7), [0, 0.18 * s, 0], np.holzDunkel, undefined, [0, i * 45, 72]);
  });
  const f = rauchsaeule(kit, [0, 0.15, 0], { feuer: 0.9 * s, hoehe: 9, dicke: 0.5, wind: [2, 0.5], n: 8, tempo: 0.12, farbe: np.rauch, phase: o.phase ?? 0 });
  g.add(f.obj); g.position.set(...at);
  return { obj: g, tick: f.tick };
};
/** Kessel am Dreibein über einem kleinen Feuer, dampft. */
export const kessel = (kit: Kit, np: NP, at: V3, phase = 0): Lebendig => {
  const g = bau(kit, "kessel", [0, 0, 0], 0, (b) => {
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; b.add(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6), [Math.cos(a) * 0.45, 1.0, Math.sin(a) * 0.45], np.holzDunkel, undefined, [Math.sin(a) * 22, 0, -Math.cos(a) * 22]); }
    b.add(new THREE.CylinderGeometry(0.015, 0.015, 0.55, 4), [0, 1.62, 0], np.metall);
    b.add(drehform([[0.001, 0], [0.22, 0.04], [0.32, 0.2], [0.3, 0.42], [0.33, 0.44]]), [0, 0.92, 0], np.metall);
    b.add(new THREE.CylinderGeometry(0.29, 0.29, 0.02, 14), [0, 1.33, 0], "#c9a35a");   // Suppe
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; b.add(ballGrob, [Math.cos(a) * 0.5, 0.08, Math.sin(a) * 0.5], "#ffffff", rock(np.stein), [0, i * 30, 0], [0.16, 0.12, 0.13]); }
  });
  const f = rauchsaeule(kit, [0, 0.1, 0], { feuer: 0.45, hoehe: 0.8, dicke: 0.1, n: 2, tempo: 0.3, farbe: np.rauch, phase });
  const dampf = rauchsaeule(kit, [0, 1.36, 0], { hoehe: 3, dicke: 0.25, wind: [0.6, 0.2], n: 6, tempo: 0.18, farbe: "#f4f2ee", phase: phase + 0.4 });
  g.add(f.obj, dampf.obj); g.position.set(...at);
  return { obj: g, tick: (t) => { f.tick(t); dampf.tick(t); } };
};

// ---------------- Tiere ----------------
/** Schaf: wolliger Körper aus Ballen, dunkler Kopf und Beine; grast (Kopf nickt). */
export const schaf = (kit: Kit, np: NP, at: V3, turn = 0, phase = 0): Lebendig => {
  const g = bau(kit, "schaf", [0, 0, 0], 0, (b) => {
    for (const [x, y, z, r] of [[0, 0.62, 0, 0.36], [0.28, 0.66, 0.05, 0.28], [-0.28, 0.64, -0.04, 0.3], [0.05, 0.82, 0, 0.26], [0, 0.62, 0.2, 0.26], [0, 0.62, -0.2, 0.26]] as const)
      b.add(ballGrob, [x, y, z], np.schafWolle, undefined, [0, x * 90, 0], [r * 1.15, r, r]);
    for (const x of [-0.25, 0.25]) for (const z of [-0.15, 0.15]) b.add(new THREE.CylinderGeometry(0.045, 0.04, 0.42, 6), [x, 0.21, z], np.schafKopf);
  });
  const kopf = bau(kit, "schafkopf", [0, 0, 0], 0, (b) => {
    b.add(ball, [0.18, -0.05, 0], np.schafKopf, undefined, [0, 0, 0], [0.2, 0.13, 0.12]);
    for (const s of [-1, 1]) { b.add(ball, [0.08, 0.04, s * 0.13], np.schafKopf, undefined, [0, 0, 0], [0.09, 0.04, 0.05]); b.add(ball, [0.22, 0.02, s * 0.06], "#ffffff", undefined, [0, 0, 0], [0.03, 0.03, 0.02]); }
    b.add(ballGrob, [0.02, 0.07, 0], np.schafWolle, undefined, [0, 0, 0], [0.11, 0.08, 0.1]);
  });
  kopf.position.set(0.48, 0.72, 0); g.add(kopf);
  g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(turn);
  return { obj: g, tick: (t) => { kopf.rotation.z = -0.55 - 0.35 * Math.max(0, Math.sin(t * 0.9 + phase)); } };
};
/** Ziege: schlanker Körper (zweifarbig), Hörner, Bart; hebt und senkt den Kopf. */
export const ziege = (kit: Kit, np: NP, at: V3, turn = 0, phase = 0, seed = 1): Lebendig => {
  const r = new Rng(seed * 3 + 1), fell = r.pick(np.ziege), fleck = np.ziege[(np.ziege.indexOf(fell) + 1) % np.ziege.length];
  const g = bau(kit, "ziege", [0, 0, 0], 0, (b) => {
    b.add(ball, [0, 0.62, 0], fell, undefined, [0, 0, 0], [0.42, 0.22, 0.2]);
    b.add(ball, [-0.1, 0.66, 0.06], fleck, undefined, [0, 0, 0], [0.2, 0.15, 0.16]);
    for (const x of [-0.28, 0.28]) for (const z of [-0.11, 0.11]) b.add(new THREE.CylinderGeometry(0.035, 0.03, 0.48, 6), [x, 0.24, z], shade(fell, 0.7));
    b.add(new THREE.ConeGeometry(0.05, 0.18, 6), [-0.42, 0.72, 0], fell, undefined, [0, 0, 60]);   // Schwänzchen
  });
  const kopf = bau(kit, "ziegenkopf", [0, 0, 0], 0, (b) => {
    b.add(ball, [0.14, 0.02, 0], fell, undefined, [0, 0, 0], [0.18, 0.1, 0.09]);
    for (const s of [-1, 1]) {
      b.add(new THREE.TorusGeometry(0.1, 0.022, 5, 10, Math.PI * 0.8), [0.02, 0.12, s * 0.05], "#d9cdb0", undefined, [0, 0, 20]);
      b.add(ball, [0.14, 0.06, s * 0.07], "#ffffff", undefined, [0, 0, 0], [0.025, 0.025, 0.015]);
      b.add(ball, [0.0, 0.02, s * 0.1], fell, undefined, [0, 0, 0], [0.08, 0.025, 0.04]);
    }
    b.add(new THREE.ConeGeometry(0.035, 0.14, 5), [0.24, -0.12, 0], "#f3ece0", undefined, [180, 0, 0]);   // Bart
  });
  kopf.position.set(0.42, 0.78, 0); g.add(kopf);
  g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(turn);
  return { obj: g, tick: (t) => { kopf.rotation.z = 0.15 - 0.6 * Math.max(0, Math.sin(t * 0.7 + phase)); } };
};
/** Sitzender Rabe (schwarz, glänzend), dreht den Kopf. */
export const rabe = (kit: Kit, np: NP, at: V3, turn = 0, phase = 0): Lebendig => {
  const g = bau(kit, "rabe", [0, 0, 0], 0, (b) => {
    b.add(ball, [0, 0.18, 0], np.rabe, undefined, [0, 0, -20], [0.18, 0.12, 0.1]);
    b.add(new THREE.ConeGeometry(0.08, 0.22, 5), [-0.2, 0.12, 0], np.rabe, undefined, [0, 0, 70], [1, 1, 0.5]);
    for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 4), [0.02, 0.05, s * 0.04], "#2a2a30");
  });
  const kopf = bau(kit, "rabenkopf", [0, 0, 0], 0, (b) => {
    b.add(ball, [0, 0, 0], np.rabe, undefined, [0, 0, 0], [0.08, 0.08, 0.07]);
    b.add(new THREE.ConeGeometry(0.03, 0.12, 5), [0.1, -0.01, 0], "#2a2a30", undefined, [0, 0, -90]);
    for (const s of [-1, 1]) b.add(ball, [0.04, 0.02, s * 0.055], "#ffffff", undefined, [0, 0, 0], [0.015, 0.015, 0.01]);
  });
  kopf.position.set(0.14, 0.3, 0); g.add(kopf);
  g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(turn);
  return { obj: g, tick: (t) => { kopf.rotation.y = 0.6 * Math.sin(t * 0.8 + phase) * (Math.sin(t * 0.3 + phase) > 0 ? 1 : 0.3); } };
};

// ---------------- für Szenen: Requisit nach Namen ----------------
export type NordRequisit = "vorraete" | "fass" | "korb" | "krug" | "handmuehle" | "stockfisch" | "netz" | "kessel" | "webstuhl" | "hackklotz" | "werkbank"
  | "esse" | "amboss" | "blasebalg" | "schildstaender" | "speerstaender" | "runenstein" | "schnitzpfosten" | "rabenfahne" | "feuerstelle"
  | "schaf" | "ziege" | "rabe";
export const NORD_REQUISITEN: NordRequisit[] = ["vorraete", "fass", "korb", "krug", "handmuehle", "stockfisch", "netz", "kessel", "webstuhl", "hackklotz", "werkbank",
  "esse", "amboss", "blasebalg", "schildstaender", "speerstaender", "runenstein", "schnitzpfosten", "rabenfahne", "feuerstelle", "schaf", "ziege", "rabe"];
/** Ein Requisit der Nord-Welt nach Namen (für Szenen-Requisiten `kind: "nordteil"`): Gruppe oder bewegtes Teil. */
export const nordRequisit = (kit: Kit, np: NP, art: NordRequisit, at: V3, turn = 0, seed = 1, farbe?: string): THREE.Object3D | Lebendig => {
  const einzel = (name: string, f: (b: B) => void) => bau(kit, name, at, turn, f);
  switch (art) {
    case "vorraete": return vorraete(kit, np, at, turn, seed);
    case "fass": return einzel("fass", (b) => fass(b, np, [0, 0, 0]));
    case "korb": return einzel("korb", (b) => korb(b, np, [0, 0, 0], farbe ?? np.bemalung[seed % np.bemalung.length]));
    case "krug": return einzel("krug", (b) => krug(b, np, [0, 0, 0]));
    case "handmuehle": return handmuehle(kit, np, at, turn);
    case "stockfisch": return stockfisch(kit, np, at, turn, seed);
    case "netz": return netzgestell(kit, np, at, turn);
    case "kessel": return kessel(kit, np, at, seed * 0.37);
    case "webstuhl": return webstuhl(kit, np, at, turn);
    case "hackklotz": return hackklotz(kit, np, at, turn);
    case "werkbank": return werkbank(kit, np, at, turn);
    case "esse": return esse(kit, np, at, turn, seed * 0.37);
    case "amboss": return amboss(kit, np, at, turn);
    case "blasebalg": return blasebalg(kit, np, at, turn);
    case "schildstaender": return schildstaender(kit, np, at, turn);
    case "speerstaender": return speerstaender(kit, np, at, turn);
    case "runenstein": return runensteinBau(kit, np, at, turn);
    case "schnitzpfosten": return schnitzpfosten(kit, np, at, turn);
    case "rabenfahne": return rabenfahneBau(kit, np, at, farbe ?? np.fahne[seed % np.fahne.length], { turn, phase: seed * 0.7 });
    case "feuerstelle": return feuerstelle(kit, np, at, { phase: seed * 0.37 });
    case "schaf": return schaf(kit, np, at, turn, seed * 0.9);
    case "ziege": return ziege(kit, np, at, turn, seed * 0.9, seed);
    case "rabe": return rabe(kit, np, at, turn, seed * 0.9);
  }
};
