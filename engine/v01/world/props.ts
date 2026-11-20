// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Requisiten: Bank, Laterne, Kisten, Boot, Marktstand. Ursprung jeweils am Boden in der Mitte; Vorderseite zeigt nach +z.
// Weitere Requisiten kommen über die Bibliothek (library/) dazu.
import * as THREE from "three";
import { Kit, extrude } from "./kit";
import type { V3 } from "../camera/rig";
import { blocks, planks, shade, stripes, tiles } from "./paint";
import type { WorldPalette } from "./palette";

const place = (g: THREE.Group, at: V3, turn = 0) => { g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(turn); return g; };

/** Parkbank: drei Sitzlatten, zwei Lehnlatten, Beine (Holz). 2 m breit. */
export const bench = (kit: Kit, pal: WorldPalette, at: V3, turn = 0) => {
  const b = kit.batch(), wood = planks(pal.wood), dark = shade(pal.wood, 0.7);
  for (let i = 0; i < 3; i++) b.box([2, 0.07, 0.15], [0, 0.48, -0.2 + i * 0.18], "#ffffff", wood);
  for (let i = 0; i < 2; i++) b.box([2, 0.15, 0.06], [0, 0.72 + i * 0.22, -0.32], "#ffffff", wood, [-8, 0, 0]);
  for (const x of [-0.85, 0.85]) {
    b.box([0.08, 0.48, 0.08], [x, 0.24, 0.12], dark);
    b.box([0.08, 1.0, 0.08], [x, 0.5, -0.32], dark);
    b.box([0.08, 0.08, 0.5], [x, 0.44, -0.08], dark);
  }
  const g = b.build("bank"); g.userData.protect = true;
  return place(g, at, turn);
};

/** Strassenlaterne: Mast, Arm, Laterne mit leuchtendem Glas (leuchtet stärker, je höher `glow`). */
export const lantern = (kit: Kit, pal: WorldPalette, at: V3, glow = 1.5) => {
  const b = kit.batch();
  b.add(new THREE.CylinderGeometry(0.07, 0.1, 3.6, 10), [0, 1.8, 0], pal.metal);
  b.add(new THREE.CylinderGeometry(0.18, 0.22, 0.3, 10), [0, 0.15, 0], pal.metal);
  b.add(new THREE.ConeGeometry(0.3, 0.3, 6), [0, 4.25, 0], pal.metal);
  b.box([0.5, 0.06, 0.5], [0, 3.6, 0], pal.metal);
  const g = b.build("laterne");
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 0.5, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(pal.lamp).multiplyScalar(glow) }));
  lamp.position.set(0, 3.86, 0);
  g.add(lamp);
  g.userData.lamp = lamp;
  return place(g, at);
};

/** Holzkisten-Stapel. */
export const crates = (kit: Kit, pal: WorldPalette, at: V3, turn = 0) => {
  const b = kit.batch(), wood = planks(shade(pal.wood, 1.08));
  const s = 0.7;
  for (const [x, y, z, r] of [[0, 0, 0, 0], [0.75, 0, 0.05, 6], [0.35, s, 0, -8]] as const) {
    b.box([s, s, s], [x, y + s / 2, z], "#ffffff", wood, [0, r, 0]);
    b.box([s + 0.04, 0.08, s + 0.04], [x, y + s - 0.034, z], shade(pal.wood, 0.7), undefined, [0, r, 0]);   // Band 6 mm über dem Deckel (sonst flackert es)
  }
  return place(b.build("kisten"), at, turn);
};

/** Ruderboot (Rumpf aus Profil, Sitzbrett). Länge 4 m entlang x. */
export const boat = (kit: Kit, pal: WorldPalette, at: V3, turn = 0, hull = "#b5653f") => {
  const b = kit.batch();
  const prof = new THREE.Shape();
  prof.moveTo(-2, 0.55); prof.quadraticCurveTo(-1.6, 0, -0.6, 0); prof.lineTo(0.8, 0); prof.quadraticCurveTo(1.8, 0.05, 2.1, 0.6); prof.lineTo(-2, 0.55);
  // hohl: zwei Bordwände aus dem Profil, Boden, Heckbrett, innen Bodenbretter, Dollbord oben, Sitzbrett
  for (const z of [-0.65, 0.57]) b.add(extrude(prof, 0.08), [0, 0, z], hull);
  b.box([2.9, 0.06, 1.22], [0.1, 0.03, 0], shade(hull, 0.8));
  b.box([0.08, 0.5, 1.22], [-1.94, 0.3, 0], hull);
  b.box([0.08, 0.45, 0.5], [2.02, 0.35, 0], hull);
  b.box([2.9, 0.04, 1.1], [0.1, 0.1, 0], "#ffffff", planks(shade(pal.wood, 0.8)));
  for (const z of [-0.65, 0.65]) b.box([3.9, 0.07, 0.12], [0.05, 0.6, z], shade(hull, 0.65));
  b.box([0.35, 0.06, 1.16], [0.2, 0.42, 0], "#ffffff", planks(pal.wood));
  const g = b.build("boot"); g.userData.protect = true;
  return place(g, at, turn);
};

/** Kleiner Tisch (Holz), Höhe h; Gegenstände stehen auf at[1] + h. */
export const table = (kit: Kit, pal: WorldPalette, at: V3, h = 0.75, turn = 0) => {
  const b = kit.batch(), dark = shade(pal.wood, 0.7);
  b.box([0.8, 0.06, 0.55], [0, h - 0.03, 0], "#ffffff", planks(pal.wood));
  for (const x of [-0.33, 0.33]) for (const z of [-0.22, 0.22]) b.box([0.06, h - 0.06, 0.06], [x, (h - 0.06) / 2, z], dark);
  const g = b.build("tisch"); g.userData.protect = true;
  return place(g, at, turn);
};

/** Marktstand: Tisch, vier Pfosten, gestreiftes Schrägdach. 2,4 m breit. */
export const stand = (kit: Kit, pal: WorldPalette, at: V3, turn = 0) => {
  const b = kit.batch(), wood = planks(pal.wood);
  b.box([2.4, 0.9, 1.0], [0, 0.45, 0], "#ffffff", wood);
  for (const x of [-1.15, 1.15]) for (const z of [-0.45, 0.45]) b.box([0.08, 2.4, 0.08], [x, 1.2 + (z < 0 ? 0.2 : 0), z], shade(pal.wood, 0.75));
  b.box([2.8, 0.06, 1.6], [0, 2.55, 0.05], "#ffffff", stripes(pal.awning[0], pal.awning[1]), [14, 0, 0]);
  const g = b.build("stand"); g.userData.protect = true;
  return place(g, at, turn);
};

/** Blumentopf: Tontopf (Höhe ≈ 0,45 m) mit einem Ballen aus Blättern und bunten Blüten. `size` skaliert alles. */
export const blumentopf = (kit: Kit, pal: WorldPalette, at: V3, seed = 1, size = 1) => {
  let s = (seed * 9301 + 49297) % 233280;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const b = kit.batch(), ton = "#c4643a";
  b.add(new THREE.CylinderGeometry(0.26, 0.19, 0.42, 12), [0, 0.21, 0], ton);
  b.add(new THREE.CylinderGeometry(0.29, 0.29, 0.07, 12), [0, 0.43, 0], shade(ton, 0.9));
  const ball = new THREE.IcosahedronGeometry(1, 2), bloom = new THREE.IcosahedronGeometry(0.075, 1);
  const leaf = pal.leaves[Math.floor(rnd() * pal.leaves.length)];
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2, r = 0.2 + rnd() * 0.06;
    b.add(ball, [Math.cos(a) * 0.1, 0.62 + rnd() * 0.08, Math.sin(a) * 0.1], shade(leaf, 0.92 + rnd() * 0.16), undefined, [0, 0, 0], [r, r * 0.9, r]);
  }
  const farbe = pal.flowers[Math.floor(rnd() * pal.flowers.length)];
  for (let i = 0; i < 14; i++) {
    const a = rnd() * Math.PI * 2, h = rnd();
    b.add(bloom, [Math.cos(a) * 0.27 * (1 - h * 0.5), 0.6 + h * 0.3, Math.sin(a) * 0.27 * (1 - h * 0.5)], i % 4 === 3 ? pal.flowers[Math.floor(rnd() * pal.flowers.length)] : farbe);
  }
  const g = b.build("blumentopf"); g.userData.protect = true;
  g.scale.setScalar(size);
  return place(g, at);
};

// ---------------- Requisiten je Epoche (2026-11-13) ----------------
const zufall = (seed: number) => { let s = (seed * 9301 + 49297) % 233280; return () => (s = (s * 9301 + 49297) % 233280) / 233280; };

/** Dreht eine Fläche nach innen (Reihenfolge der Ecken und Normalen umgekehrt) – z. B. Innenwand eines Brunnens. */
const innen = (g: THREE.BufferGeometry) => {
  const idx = g.getIndex();
  if (idx) for (let i = 0; i < idx.count; i += 3) { const a = idx.getX(i); idx.setX(i, idx.getX(i + 2)); idx.setX(i + 2, a); }
  const n = g.getAttribute("normal");
  for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
  return g;
};

/** Rad mit Nabe und Speichen (Achse entlang x), Mitte bei at. */
const rad = (b: ReturnType<Kit["batch"]>, at: V3, r: number, holz: string) => {
  b.add(new THREE.TorusGeometry(r, 0.045, 8, 24), at, shade(holz, 0.7), undefined, [0, 90, 0]);
  b.add(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 10), at, shade(holz, 0.55), undefined, [0, 0, 90]);
  for (let i = 0; i < 3; i++) b.box([0.035, r * 2 - 0.06, 0.04], at, shade(holz, 0.85), undefined, [i * 60, 0, 0]);
};

/** Handkarren (alle Epochen): Kasten auf zwei Rädern, Holme mit Griffen nach vorn (+z), Stütze; Ladung aus Säcken und
 *  Gemüse. 1,3 m breit (mit Rädern), 2,2 m lang. `ladung` false = leer. */
export const karren = (kit: Kit, pal: WorldPalette, at: V3, turn = 0, ladung = true, seed = 1) => {
  const b = kit.batch(), holz = shade(pal.wood, 1.05), rnd = zufall(seed), y = 0.62, f = pal.requisiten;
  b.box([1.0, 0.06, 1.3], [0, y, -0.15], "#ffffff", planks(holz));
  for (const x of [-0.5, 0.5]) b.box([0.05, 0.32, 1.3], [x, y + 0.19, -0.15], "#ffffff", planks(shade(holz, 0.95), true));
  b.box([0.94, 0.32, 0.05], [0, y + 0.19, -0.82], "#ffffff", planks(shade(holz, 0.95)));
  for (const x of [-0.42, 0.42]) b.box([0.07, 0.07, 2.1], [x, y - 0.07, 0.15], shade(holz, 0.7), undefined, [-4, 0, 0]);   // Holme mit Griffen
  for (const x of [-0.42, 0.42]) b.box([0.06, 0.5, 0.06], [x, 0.25, 0.85], shade(holz, 0.7));                            // Stütze vorn
  b.add(new THREE.CylinderGeometry(0.04, 0.04, 1.32, 8), [0, 0.45, -0.3], pal.metal, undefined, [0, 0, 90]);              // Achse
  for (const x of [-0.6, 0.6]) rad(b, [x, 0.45, -0.3], 0.42, holz);
  if (ladung) {
    for (let i = 0; i < 3; i++) b.add(new THREE.IcosahedronGeometry(0.2, 1), [-0.25 + i * 0.25, y + 0.22, -0.5 + (i % 2) * 0.12], f.saecke[i % f.saecke.length], undefined, [0, i * 40, 0], [1.1, 0.75, 0.9]);
    for (let i = 0; i < 4; i++) b.add(new THREE.IcosahedronGeometry(0.13, 1), [-0.3 + i * 0.2, y + 0.16, 0.12 + rnd() * 0.12], f.gemuese[i % f.gemuese.length]);
  }
  const g = b.build("karren"); g.userData.protect = true;
  return place(g, at, turn);
};

/** Ziehbrunnen (Stadt, Hanse): runder Steinkranz, zwei Pfosten, Satteldach, Kurbelwelle mit Seil und Eimer. Ø 1,6 m. */
export const brunnen = (kit: Kit, pal: WorldPalette, at: V3, turn = 0, dach = pal.requisiten.brunnenDach) => {
  const b = kit.batch(), holz = shade(pal.wood, 0.9), f = pal.requisiten;
  b.add(new THREE.CylinderGeometry(0.75, 0.8, 0.8, 20, 1, true), [0, 0.4, 0], "#ffffff", blocks(pal.stone, shade(pal.stone, 0.62)));
  b.add(new THREE.TorusGeometry(0.75, 0.1, 8, 24), [0, 0.82, 0], shade(pal.stone, 0.9), undefined, [90, 0, 0]);
  b.add(innen(new THREE.CylinderGeometry(0.66, 0.66, 0.42, 20, 1, true)), [0, 0.63, 0], "#ffffff", blocks(shade(pal.stone, 0.72), shade(pal.stone, 0.45)));   // Innenwand
  b.add(new THREE.CircleGeometry(0.655, 20), [0, 0.45, 0], f.schacht, undefined, [-90, 0, 0]);                            // Wasser tief im Schacht
  for (const x of [-0.92, 0.92]) b.box([0.12, 2.5, 0.12], [x, 1.25, 0], holz);
  b.add(new THREE.CylinderGeometry(0.07, 0.07, 1.9, 10), [0, 2.2, 0], shade(holz, 0.8), undefined, [0, 0, 90]);          // Welle
  b.box([0.05, 0.32, 0.05], [1.02, 2.08, 0.0], pal.metal);                                                                 // Kurbel
  b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 6), [0.1, 1.72, 0], f.seil);                                     // Seil
  b.add(new THREE.CylinderGeometry(0.16, 0.12, 0.26, 12), [0.1, 1.15, 0], shade(holz, 1.1));                              // Eimer
  for (const s of [-1, 1]) b.box([2.3, 0.05, 0.95], [0, 2.82, s * 0.38], "#ffffff", tiles(dach), [s * 32, 0, 0]);         // Satteldach
  b.box([2.3, 0.08, 0.08], [0, 3.1, 0], shade(dach, 0.7));
  const g = b.build("brunnen"); g.userData.protect = true;
  return place(g, at, turn);
};

/** Obst- und Gemüsekörbe (alle Epochen): n geflochtene Körbe mit Äpfeln, Birnen, Kohl, Rüben, Pflaumen. */
export const koerbe = (kit: Kit, pal: WorldPalette, at: V3, n = 3, seed = 1, turn = 0) => {
  const b = kit.batch(), rnd = zufall(seed), korb = pal.requisiten.korb, inhalt = pal.requisiten.obst;
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.64, z = (i % 2) * 0.18, f = inhalt[(i + seed) % inhalt.length];
    b.add(new THREE.CylinderGeometry(0.28, 0.21, 0.3, 14), [x, 0.15, z], "#ffffff", stripes(korb, shade(korb, 0.78)));
    b.add(new THREE.TorusGeometry(0.28, 0.03, 6, 16), [x, 0.31, z], shade(korb, 0.8), undefined, [90, 0, 0]);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2 + rnd(), r = k === 6 ? 0 : 0.15;
      b.add(new THREE.IcosahedronGeometry(0.075, 1), [x + Math.cos(a) * r, 0.33 + (k === 6 ? 0.07 : 0), z + Math.sin(a) * r], f[k % 2]);
    }
  }
  const g = b.build("koerbe"); g.userData.protect = true;
  return place(g, at, turn);
};

/** Onggi (Korea): Gruppe brauner, glasierter Tonkrüge mit Deckeln auf einem niedrigen Steinsockel (Jangdokdae). */
export const onggi = (kit: Kit, pal: WorldPalette, at: V3, n = 5, seed = 1, turn = 0) => {
  const b = kit.batch(), rnd = zufall(seed), braun = pal.requisiten.onggi, sockel = pal.requisiten.sockel;
  const w = Math.ceil(n / 2) * 0.72 + 0.3;
  b.box([w, 0.2, 1.5], [0, 0.1, 0], "#ffffff", blocks(sockel[0], sockel[1]));
  for (let i = 0; i < n; i++) {
    const s = 0.75 + rnd() * 0.45, x = -w / 2 + 0.5 + Math.floor(i / 2) * 0.72, z = i % 2 ? 0.35 : -0.35, col = braun[i % braun.length];
    const prof = [[0.001, 0], [0.12, 0], [0.24, 0.08], [0.3, 0.3], [0.27, 0.5], [0.17, 0.6], [0.16, 0.64]].map(([r, y]) => new THREE.Vector2(r * s, y * s));
    b.add(new THREE.LatheGeometry(prof, 16), [x, 0.21, z], col);
    b.add(new THREE.CylinderGeometry(0.21 * s, 0.17 * s, 0.07 * s, 16), [x, 0.21 + 0.675 * s, z], shade(col, 0.85));
    b.add(new THREE.SphereGeometry(0.05 * s, 8, 6), [x, 0.21 + 0.74 * s, z], shade(col, 0.7));
  }
  const g = b.build("onggi"); g.userData.protect = true;
  return place(g, at, turn);
};

/** Hühner (alle Epochen): n Hennen in Weiss, Braun und Gold mit rotem Kamm und gelbem Schnabel, verstreut um at. */
export const huehner = (kit: Kit, pal: WorldPalette, at: V3, n = 4, seed = 1) => {
  const b = kit.batch(), rnd = zufall(seed), f = pal.requisiten;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd() * 0.8, r = 0.3 + rnd() * 0.4, x = Math.cos(a) * r, z = Math.sin(a) * r, dir = rnd() * 360;
    const feder = f.federn[i % f.federn.length], w = THREE.MathUtils.degToRad(dir);
    const fx = Math.cos(w), fz = -Math.sin(w);
    b.add(new THREE.SphereGeometry(0.15, 12, 8), [x, 0.24, z], feder, undefined, [0, dir, 0], [1.25, 0.95, 0.9]);
    b.add(new THREE.SphereGeometry(0.085, 10, 8), [x + fx * 0.17, 0.4, z + fz * 0.17], feder);
    b.add(new THREE.ConeGeometry(0.07, 0.16, 6), [x - fx * 0.18, 0.33, z - fz * 0.18], shade(feder, 0.8), undefined, [0, dir, 40]);   // Schwanz
    b.box([0.03, 0.07, 0.08], [x + fx * 0.17, 0.5, z + fz * 0.17], f.kamm, undefined, [0, dir + 90, 0]);                         // Kamm
    b.add(new THREE.ConeGeometry(0.025, 0.07, 6), [x + fx * 0.28, 0.4, z + fz * 0.28], f.schnabel, undefined, [0, dir, -90]);         // Schnabel
    for (const k of [-1, 1]) b.add(new THREE.CylinderGeometry(0.012, 0.012, 0.13, 5), [x - fz * k * 0.05, 0.075, z + fx * k * 0.05], f.schnabel);
  }
  return place(b.build("huehner"), at);
};

/** Holzstapel (alle Epochen): Scheite in vier Lagen zwischen zwei Pfosten, 1,8 m breit, Schnittflächen nach vorn (+z). */
export const holzstapel = (kit: Kit, pal: WorldPalette, at: V3, turn = 0, seed = 1) => {
  const b = kit.batch(), rnd = zufall(seed), rinde = shade(pal.bark, 1.05), schnitt = pal.requisiten.schnittholz;
  for (let lage = 0; lage < 4; lage++) for (let i = 0; i < 7; i++) {
    const x = -0.66 + i * 0.22 + (lage % 2) * 0.11, y = 0.11 + lage * 0.2, r = 0.09 + rnd() * 0.012;
    if (x > 0.72) continue;
    b.add(new THREE.CylinderGeometry(r, r, 0.62, 8), [x, y, 0], rinde, undefined, [90, 0, 0]);
    b.add(new THREE.CircleGeometry(r * 0.9, 8), [x, y, 0.315], schnitt);                                                  // Schnittfläche 5 mm vor dem Scheit
  }
  for (const x of [-0.85, 0.85]) b.box([0.08, 1.0, 0.08], [x, 0.5, 0], shade(pal.wood, 0.6));
  const g = b.build("holzstapel"); g.userData.protect = true;
  return place(g, at, turn);
};
