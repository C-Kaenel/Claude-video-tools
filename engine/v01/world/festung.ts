// Herkunft: eigen (V-Video), geschrieben 2026-11-08, ohne Vorlage.
// Korea-Welt (für V0004 und weitere Geschichts-Videos): Gelände mit Bergen, Festungsmauern entlang eines Pfades
// (Bruchstein, Lehm + Bruchstein, Quader, Hwaseong: Quader + Ziegel-Brustwehr mit Schiessscharten), Tortürme mit
// geschwungenem Ziegeldach, Hanok-Häuser (Ziegel- oder Strohdach), Kanonenturm aus Ziegeln, Lastkran aus Holz, Kiefern.
// Vier Bereiche entlang x – je eine Epoche – mit benannten Orten (KOREA_PLACES):
//   x −300 Bergfestung (Bruchstein-Ring um den Gipfel, Strohdach-Dorf am Fuss)
//   x −150 Grenzmauer (Steinmauer über die Hügel, Wachturm)
//   x    0 Hanyang (Stadtmauer mit Tor, steigt den Berg hinauf; Variante "alt" Lehm + Bruchstein / "neu" Quader)
//   x  150 Hwaseong (Quader-Mauer mit Ziegel-Brustwehr, Torhalle, Kanonenturm, Kran; Variante bau / ganz / ruine)
// Die Kamera steht im Süden (+z) und schaut nach Norden; Mauern haben ihre Brustwehr auf der Aussenseite (Feind = −z).
import * as THREE from "three";
import { Rng } from "../core/random";
import { Kit, archShape, extrude } from "./kit";
import type { V3 } from "../camera/rig";
import { blocks, brick, earth, giwa, grass, plaster, planks, rock, rubble, shade, thatch } from "./paint";
import { cloud, type CloudColors } from "./nature";
import { fackel, fahne, laternenkette, rauchsaeule, voegel, type Lebendig } from "./leben";
import type { WorldPalette } from "./palette";
import { NOINK } from "../post/ink";

export type KoreaPalette = {
  grass: string; dirt: string; rock: string;
  rubble: string; rubbleJoint: string; earth: string;
  blocks: string; blocksJoint: string; oldBlocks: string;
  brick: string; mortar: string;
  giwa: string; ridge: string; thatch: string;
  hanokWall: string; timber: string; paper: string;
  red: string; green: string; blue: string;
  pine: string; pineBark: string; wood: string;
};
export type KoreaLook = { palette: WorldPalette; korea: KoreaPalette; clouds: CloudColors };
export type KoreaOptions = { hanyang?: "alt" | "neu"; hwaseong?: "bau" | "ganz" | "ruine" };
type Path = [number, number][];

// ---------------- Gelände ----------------
const bump = (x: number, z: number, cx: number, cz: number, h: number, sx: number, sz = sx) =>
  h * Math.exp(-((x - cx) ** 2) / (2 * sx * sx) - ((z - cz) ** 2) / (2 * sz * sz));
const smooth = (a: number, b: number, v: number) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

/** Höhe des Geländes (ohne Mauern). Südlich von z −6 ist alles flach (Wege, Dorf, Bauplatz). */
export const koreaHeight = (x: number, z: number) => {
  let h = 0;
  h += bump(x, z, -300, -48, 30, 22) + bump(x, z, -340, -86, 24, 30) + bump(x, z, -258, -84, 21, 26);   // Bergfestung
  if (x > -250 && x < -50) h += 9 * Math.exp(-((z + 32 - 5 * Math.sin(x / 22)) ** 2) / (2 * 11 * 11)) * (0.85 + 0.25 * Math.sin(x / 13));
  h += bump(x, z, -150, -96, 26, 34);                                                                   // Berge hinter der Grenze
  h += bump(x, z, 44, -60, 30, 24) + bump(x, z, -40, -86, 24, 30);                                       // Hanyang
  h += bump(x, z, 178, -82, 22, 32);                                                                    // hinter Hwaseong
  h += 34 * smooth(110, 200, -z) * (0.8 + 0.2 * Math.sin(x / 41));                                       // Bergkette am Horizont
  // Hügel im Süden (Blick von den Mauern ins Tal endet an Bergen, nicht am Rand der Welt)
  const south = 30 * smooth(60, 150, z) * (0.8 + 0.2 * Math.sin(x / 37)) + bump(x, z, -300, 70, 14, 28) + bump(x, z, 160, 75, 12, 30);
  return h * smooth(-6, -16, z) + south * smooth(20, 45, z);
};

const terrain = (kit: Kit, kp: KoreaPalette) => {
  const W = 700, D = 420, step = 2.5, cx = -80, cz = -40;
  const g = new THREE.PlaneGeometry(W, D, W / step, D / step).rotateX(-Math.PI / 2);
  const p = g.getAttribute("position");
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, z = p.getZ(i) + cz; p.setY(i, koreaHeight(x, z) - 0.02); }
  g.translate(cx, 0, cz);
  g.computeVertexNormals();
  const m = kit.mesh(g, "#ffffff", grass(kp.grass));
  m.name = "gelaende";
  return m;
};

/** Höhe der gezeichneten Geländefläche (Dreiecke des 2,5-m-Rasters wie in terrain) – Büschel sitzen genau darauf. */
const T_STEP = 2.5, T_X0 = -80 - 350, T_Z0 = -40 - 210;
const terrainAt = (x: number, z: number) => {
  const gx = (x - T_X0) / T_STEP, gz = (z - T_Z0) / T_STEP, ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const hAt = (i: number, k: number) => koreaHeight(T_X0 + i * T_STEP, T_Z0 + k * T_STEP) - 0.02;
  const ha = hAt(ix, iz), hb = hAt(ix, iz + 1), hc = hAt(ix + 1, iz + 1), hd = hAt(ix + 1, iz);
  return fx + fz <= 1 ? ha + (hd - ha) * fx + (hb - ha) * fz : hc + (hb - hc) * (1 - fx) + (hd - hc) * (1 - fz);
};

/** Gras-Details: Büschel (drei Halme) und Blumen auf den Wiesen nahe den Orten – ohne Tusche (Ebene NOINK, wie gemalt),
 *  nicht auf Wegen, Mauern und in Bauten. Kein Sichtlinien-Teilnehmer, fehlt in der Prüf-Ebene "karten" (Kulisse). */
const grasDetails = (kit: Kit, kp: KoreaPalette, frei: (x: number, z: number) => boolean, seed: number) => {
  const b = kit.batch(), rng = new Rng(seed);
  const halm = new THREE.ConeGeometry(0.075, 1, 5), bluete = new THREE.IcosahedronGeometry(1, 0);
  const BLUMEN = ["#ffffff", "#ffe14a", "#ff8fb8", "#9fd0ff", "#ff7a3a"];
  const TOENE = [0.94, 1.02, 1.1, 1.18, 1.26, 1.34].map((k) => shade(kp.grass, k));   // wenige Töne = wenige Materialien
  for (const cx of [-300, -150, 0, 150]) for (let i = 0; i < 4200; i++) {
    const x = cx + rng.range(-55, 55), z = rng.range(-50, 30);
    if (!frei(x, z)) continue;
    const y = terrainAt(x, z) - 0.03, hgt = rng.range(0.22, 0.42), ti = Math.floor(rng.next() * 5), rot = rng.range(0, 180);
    for (let k = 0; k < 3; k++) {
      const a = (k - 1) * 0.35 + rng.range(-0.1, 0.1), hh = hgt * (k === 1 ? 1 : 0.8);
      b.add(halm, [x + Math.sin(a) * hh * 0.25 + (k - 1) * 0.04, y + hh / 2, z], TOENE[k === 1 ? ti + 1 : ti], undefined, [0, rot, THREE.MathUtils.radToDeg(-a)], [1, hh, 1]);
    }
    if (rng.next() < 0.12) {   // Blume
      const by = y + hgt + 0.05, fc = BLUMEN[Math.floor(rng.next() * BLUMEN.length)];
      b.add(halm, [x + 0.1, y + (hgt + 0.05) / 2, z + 0.03], TOENE[1], undefined, [0, 0, 0], [0.4, hgt + 0.05, 0.4]);
      b.add(bluete, [x + 0.1, by, z + 0.03], fc, undefined, [0, rot, 0], [0.09, 0.07, 0.09]);
      b.add(bluete, [x + 0.1, by + 0.02, z + 0.03], "#ffd23a", undefined, [0, 0, 0], [0.035, 0.035, 0.035]);
    }
  }
  const g = b.build("gras");
  g.traverse((o) => { o.layers.set(NOINK); (o as THREE.Mesh).castShadow = false; });
  g.userData.kulisse = true;
  return g;
};

// ---------------- Mauern ----------------
export type WallKind = "rubble" | "earth-rubble" | "stone" | "blocks" | "hwaseong";
export type WallSeg = { a: [number, number]; b: [number, number]; top: number; half: number };

/** Höhe der Mauerkrone, wenn (x, z) auf einer Mauer liegt – sonst null. */
const onWall = (segTop: WallSeg[], x: number, z: number) => {
  let best: number | null = null;
  for (const s of segTop) {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2));
    const px = s.a[0] + t * dx - x, pz = s.a[1] + t * dz - z;
    if (px * px + pz * pz <= s.half * s.half) best = Math.max(best ?? -1e9, s.top);
  }
  return best;
};

/** Mauer entlang eines Pfades: Abschnitte von ~2 m folgen dem Gelände (gestuft), Brustwehr mit Zinnen auf der Aussenseite.
 *  `outer(x, z)` = Richtung nach aussen (Standard Norden). `ruin` 0…1 = Anteil fehlender Brustwehr und eingestürzter Stücke. */
export const fortWall = (kit: Kit, kp: KoreaPalette, path: Path, o: { height: number; thick: number; kind: WallKind; parapet?: boolean;
  ruin?: number; gaps?: [number, number][]; seed?: number; outer?: (x: number, z: number) => [number, number]; segs?: WallSeg[] }) => {
  const b = kit.batch(), rng = new Rng(o.seed ?? 7);
  const P = (k: WallKind) =>
    k === "rubble" ? rubble(kp.rubble, kp.rubbleJoint)
    : k === "stone" ? blocks(kp.oldBlocks, shade(kp.oldBlocks, 0.55))
    : k === "blocks" || k === "hwaseong" ? blocks(kp.blocks, kp.blocksJoint)
    : rubble(shade(kp.rubble, 1.05), kp.rubbleJoint);
  const inGap = (x: number) => (o.gaps ?? []).some(([g0, g1]) => x > g0 && x < g1);
  let n = 0;
  for (let i = 0; i + 1 < path.length; i++) {
    const [x0, z0] = path[i], [x1, z1] = path[i + 1];
    const dx = x1 - x0, dz = z1 - z0, len = Math.hypot(dx, dz), steps = Math.max(1, Math.ceil(len / 2));
    const rot = THREE.MathUtils.radToDeg(Math.atan2(-dz, dx));
    let nx = -dz / len, nz = dx / len;
    for (let k = 0; k < steps; k++) {
      const t = (k + 0.5) / steps, mx = x0 + dx * t, mz = z0 + dz * t, sl = len / steps + 0.9;   // überlappen: in Kurven entstehen sonst Spalten
      if (inGap(mx)) continue;
      const out = o.outer ? o.outer(mx, mz) : [0, -1];
      if (nx * out[0] + nz * out[1] < 0) { nx = -nx; nz = -nz; }
      const g = koreaHeight(mx, mz), broken = (o.ruin ?? 0) > 0 && rng.next() < (o.ruin ?? 0) * 0.35;
      const h = o.height * (broken ? rng.range(0.45, 0.75) : 1), bottom = g - 1.5, top = g + h;
      const kind: WallKind = o.kind === "earth-rubble" ? ((n % 7) < 3 ? "earth-rubble" : "rubble") : o.kind;
      const paint = o.kind === "earth-rubble" && (n % 7) < 3 ? earth(kp.earth) : P(kind);
      // Nachbarstücke überlappen: abwechselnd 6 cm dicker und 3 cm höher, sonst liegen ihre Flächen in derselben Ebene und flackern
      const th = o.thick + (n % 2) * 0.06, lift = (n % 2) * 0.03;
      b.box([sl, top + lift - bottom, th], [mx, (top + lift + bottom) / 2, mz], "#ffffff", paint, [0, rot, 0]);
      o.segs?.push({ a: [mx - (dx / len) * sl / 2, mz - (dz / len) * sl / 2], b: [mx + (dx / len) * sl / 2, mz + (dz / len) * sl / 2], top, half: o.thick / 2 - 0.15 });
      if (o.parapet !== false && !broken) {
        const brickTop = o.kind === "hwaseong", ph = brickTop ? 1.55 : 1.05, pt = brickTop ? 0.75 : 0.6;
        const ox = mx + nx * (th / 2 - pt / 2), oz = mz + nz * (th / 2 - pt / 2);
        const merl = brickTop ? sl : sl * 0.68;                                         // Hwaseong: geschlossene Brustwehr mit Scharten
        if (!(o.ruin && rng.next() < (o.ruin ?? 0))) {
          const pp = brickTop ? brick(kp.brick, kp.mortar) : paint;
          b.box([merl, ph, pt + (n % 2) * 0.05], [ox, top + lift + ph / 2, oz], "#ffffff", pp, [0, rot, 0]);
          if (brickTop) {   // Schiessscharten: dunkle Löcher auf der Innenseite (zur Kamera)
            const pw = pt + (n % 2) * 0.05, ix = ox - nx * (pw / 2 + 0.01), iz = oz - nz * (pw / 2 + 0.01);
            b.box([0.28, 0.32, 0.04], [ix, top + lift + 0.55, iz], "#231e1c", undefined, [0, rot, 0]);
            if (n % 2) b.box([0.22, 0.22, 0.04], [ix + (dx / len) * 0.6, top + lift + 1.15, iz + (dz / len) * 0.6], "#231e1c", undefined, [0, rot, 0]);
            b.box([merl + 0.04, 0.12, pw + 0.08], [ox, top + lift + ph + 0.06, oz], kp.ridge, undefined, [0, rot, 0]);   // Ziegel-Abdeckung
          }
        }
      }
      if (broken) for (let r = 0; r < 4; r++) {   // Schutt vor der Mauer
        const s = rng.range(0.4, 0.9);
        b.box([s, s * 0.6, s], [mx - nx * rng.range(1.5, 3.5) + rng.range(-1, 1), g + s * 0.25, mz - nz * rng.range(1.5, 3.5) + rng.range(-1, 1)], "#ffffff", P(kind), [rng.range(-20, 20), rng.range(0, 90), rng.range(-20, 20)]);
      }
      n++;
    }
  }
  // kein Sichtlinien-Teilnehmer: die Mauer ist ein langes Netz, ihr Hüllquader würde ganze Täler ausblenden
  return b.build(`mauer-${o.kind}`);
};

// ---------------- Dächer ----------------
/** Geschwungenes Walmdach (Hof-/Torhallen, Hanok): steil am First, flach an der Traufe, Ecken hochgezogen.
 *  Ursprung = Mitte der Traufe unten; Breite x, Tiefe z, Höhe y. */
export const roofGeo = (W: number, D: number, H: number, curl = 0.35) => {
  const nx = 30, nz = 20, pos: number[] = [], idx: number[] = [];
  const ridge = Math.max(0, (W - D) / 2);
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const u = (i / nx) * 2 - 1, v = (j / nz) * 2 - 1, x = (u * W) / 2, z = (v * D) / 2;
    const e = Math.max(0, Math.min((D / 2 - Math.abs(z)) / (D / 2), (W / 2 - Math.abs(x)) / (D / 2)));
    const corner = Math.pow(Math.abs(u) * Math.abs(v), 3);
    pos.push(x, H * Math.pow(Math.min(1, e), 1.6) + H * curl * corner + (Math.abs(x) <= ridge ? 0 : 0), z);
  }
  const top = pos.length / 3;
  for (let k = 0; k < top; k++) pos.push(pos[k * 3], pos[k * 3 + 1] - 0.22, pos[k * 3 + 2]);   // Unterseite
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b2 = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, c, b2, b2, c, d);
    idx.push(top + a, top + b2, top + c, top + b2, top + d, top + c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
};

const roofOn = (b: ReturnType<Kit["batch"]>, kp: KoreaPalette, at: V3, W: number, D: number, H: number, curl = 0.35, rot = 0) => {
  b.add(roofGeo(W, D, H, curl), at, "#ffffff", giwa(kp.giwa), [0, rot, 0]);
  const rl = Math.max(0.6, W - D) + 0.4;
  b.box([rl, 0.38, 0.42], [at[0], at[1] + H + 0.05, at[2]], kp.ridge, undefined, [0, rot, 0]);   // First
};

// ---------------- Bauten ----------------
const beam = (b: ReturnType<Kit["batch"]>, p0: V3, p1: V3, r: number, color: string) => {
  const a = new THREE.Vector3(...p0), c = new THREE.Vector3(...p1), d = c.clone().sub(a), L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, 8);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  g.translate((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, (p0[2] + p1[2]) / 2);
  b.add(g, [0, 0, 0], color);
};

/** Holzhalle mit roten Säulen, grün-roten Balken und geschwungenem Dach (Torhalle, Pavillon). Ursprung = Mitte Boden. */
const pavilion = (b: ReturnType<Kit["batch"]>, kp: KoreaPalette, at: V3, w: number, d: number, colH: number, roofH: number) => {
  const nx = Math.max(2, Math.round(w / 2.6)), nz = Math.max(2, Math.round(d / 2.6));
  for (let i = 0; i <= nx; i++) for (const zz of [-d / 2, d / 2]) b.add(new THREE.CylinderGeometry(0.2, 0.22, colH - 0.02, 12), [at[0] - w / 2 + (i * w) / nx, at[1] + 0.02 + (colH - 0.02) / 2, at[2] + zz], kp.red);
  for (let j = 1; j < nz; j++) for (const xx of [-w / 2, w / 2]) b.add(new THREE.CylinderGeometry(0.2, 0.22, colH - 0.02, 12), [at[0] + xx, at[1] + 0.02 + (colH - 0.02) / 2, at[2] - d / 2 + (j * d) / nz], kp.red);
  for (const zz of [-d / 2, d / 2]) {
    b.box([w + 0.5, 0.42, 0.34], [at[0], at[1] + colH - 0.2, at[2] + zz], kp.green);
    b.box([w + 0.5, 0.14, 0.36], [at[0], at[1] + colH - 0.5, at[2] + zz], kp.red);
  }
  for (const xx of [-w / 2, w / 2]) b.box([0.28, 0.39, d + 0.46], [at[0] + xx, at[1] + colH - 0.205, at[2]], kp.green);   // etwas kleiner als die Längsbalken: keine deckungsgleichen Flächen an den Ecken
  b.box([w + 0.3, 0.3, d + 0.3], [at[0], at[1] + 0.16, at[2]], shade(kp.blocks, 0.9));            // Boden der Halle
  roofOn(b, kp, [at[0], at[1] + colH, at[2]], w + 3.2, d + 3.0, roofH, 0.32);
};

/** Tor: Steinsockel mit Bogen-Durchgang, darauf eine (zwei) Holzhalle(n). Ursprung = Mitte Boden, Front = +z. */
export const gateTower = (kit: Kit, kp: KoreaPalette, at: V3, o: { width?: number; depth?: number; baseH?: number; floors?: 1 | 2; base?: "blocks" | "stone" | "rubble"; ruin?: boolean } = {}) => {
  const b = kit.batch(), w = o.width ?? 13, d = o.depth ?? 9, h = o.baseH ?? 5.6;
  const paint = o.base === "rubble" ? rubble(kp.rubble, kp.rubbleJoint) : o.base === "stone" ? blocks(kp.oldBlocks, shade(kp.oldBlocks, 0.55)) : blocks(kp.blocks, kp.blocksJoint);
  b.box([w + 0.2, h + 1.5, d], [at[0], at[1] + (h - 1.5) / 2, at[2]], "#ffffff", paint);   // 10 cm breiter: Mauerenden stecken im Sockel statt bündig
  for (const s of [1, -1]) {
    b.add(extrude(archShape(3.4, 4.3), 0.08), [at[0], at[1] + 0.012, at[2] + s * (d / 2 + 0.01) - (s < 0 ? 0.08 : 0)], "#231e1c");
    b.add(extrude(archShape(4.0, 4.65), 0.05), [at[0], at[1], at[2] + s * (d / 2 + 0.005) - (s < 0 ? 0.05 : 0)], shade(kp.blocks, 0.8));
  }
  if (o.ruin) {   // ausgebrannte Halle: nur verkohlte Säulenstümpfe
    const rng = new Rng(17);
    for (let i = 0; i < 7; i++) b.add(new THREE.CylinderGeometry(0.2, 0.24, rng.range(0.6, 2.4), 8), [at[0] + rng.range(-w / 2 + 1, w / 2 - 1), at[1] + h + 0.6, at[2] + rng.range(-d / 2 + 1, d / 2 - 1)], "#2e2622");
  } else {
    pavilion(b, kp, [at[0], at[1] + h, at[2]], w - 3, d - 2.6, 2.9, 2.6);
    if (o.floors === 2) pavilion(b, kp, [at[0], at[1] + h + 3.4, at[2]], w - 5, d - 3.6, 2.4, 2.4);
  }
  const g = b.build("tor");
  g.userData.occluder = true;
  return g;
};

/** Hanok-Haus: Steinsockel, weisse Wände mit Holzrahmen, Papiertüren; Ziegel- oder Strohdach. Front = +z (oder turn). */
export const hanok = (kit: Kit, kp: KoreaPalette, at: V3, o: { w?: number; d?: number; roof?: "tile" | "thatch"; turn?: number } = {}) => {
  const b = kit.batch(), w = o.w ?? 7, d = o.d ?? 4.6, tile = (o.roof ?? "tile") === "tile";
  b.box([w + 0.6, 0.5, d + 0.6], [0, 0.25, 0], "#ffffff", rubble(kp.rubble, kp.rubbleJoint));
  b.box([w, 2.31, d], [0, 0.49 + 1.155, 0], "#ffffff", tile ? plaster(kp.hanokWall) : earth(kp.earth));
  const posts = Math.round(w / 1.7);
  for (let i = 0; i <= posts; i++) b.box([0.16, 2.26, 0.16], [-w / 2 + (i * w) / posts, 0.52 + 1.13, d / 2 + 0.03], kp.timber);
  b.box([w + 0.04, 0.16, 0.16], [0, 2.75, d / 2 + 0.04], kp.timber);
  for (let i = 1; i < posts - 1; i += 2) {   // Papiertüren mit Gitter
    const cx = -w / 2 + ((i + 0.5) * w) / posts, dw = w / posts - 0.3;
    b.box([dw, 1.7, 0.04], [cx, 1.45, d / 2 + 0.05], kp.paper);
    for (let k = 1; k < 4; k++) b.box([dw, 0.03, 0.05], [cx, 0.6 + k * 0.42, d / 2 + 0.06], kp.timber);
    b.box([0.03, 1.68, 0.055], [cx, 1.45, d / 2 + 0.0625], kp.timber);
  }
  if (tile) roofOn(b, kp, [0, 2.8, 0], w + 2.2, d + 2.0, 1.9, 0.35);
  else {
    const s = new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    b.add(s, [0, 2.75, 0], "#ffffff", thatch(kp.thatch), [0, 0, 0], [w / 2 + 0.7, 1.6, d / 2 + 0.7]);
  }
  const g = b.build(tile ? "hanok" : "strohhaus");
  g.position.set(...at);
  g.rotation.y = THREE.MathUtils.degToRad(o.turn ?? 0);
  g.userData.occluder = true;
  return g;
};

/** Kanonenturm (Hwaseong): Ziegelturm auf Quadersockel, Reihen von Schiessscharten, kleines Dach. */
export const gunTower = (kit: Kit, kp: KoreaPalette, at: V3, o: { size?: number; height?: number; ruin?: boolean } = {}) => {
  const b = kit.batch(), s = o.size ?? 6.5, h = o.height ?? 9;
  b.box([s + 0.8, 3, s + 0.8], [0, 1.5 - 1, 0], "#ffffff", blocks(kp.blocks, kp.blocksJoint));
  const bh = o.ruin ? h * 0.7 : h;
  b.box([s, bh - 2, s], [0, 2 + (bh - 2) / 2, 0], "#ffffff", brick(kp.brick, kp.mortar));
  for (let r = 0; r < 3; r++) for (let c = -1; c <= 1; c++) {
    const y = 3.6 + r * 2.0; if (y > bh - 0.8) continue;
    b.box([0.34, 0.38, 0.05], [c * 1.8, y, s / 2 + 0.02], "#231e1c");
  }
  if (!o.ruin) {
    b.box([s + 0.3, 0.3, s + 0.3], [0, bh + 0.15, 0], kp.ridge);
    pavilion(b, kp, [0, bh + 0.3, 0], s - 2.4, s - 2.4, 2.1, 2.0);
  }
  const g = b.build("kanonenturm");
  g.position.set(...at);
  g.userData.occluder = true;
  return g;
};

/** Lastkran aus Holz (wie in Hwaseong): zwei A-Böcke, Querbalken mit Rollen, Seile, Haspel mit zwei Rädern. Front = +z.
 *  Die Rolle in der Mitte hängt bei y = 5,75 m über dem Boden (Lastseil der Karte `steinblock` endet dort). */
export const CRANE_PULLEY_Y = 5.75;
export const crane = (kit: Kit, kp: KoreaPalette, at: V3, turn = 0) => {
  const b = kit.batch(), H = 6.2, wd = kp.wood;
  for (const x of [-1.7, 1.7]) {
    beam(b, [x, 0, -1.3], [x, H, 0], 0.13, wd);
    beam(b, [x, 0, 1.3], [x, H, 0], 0.13, wd);
    beam(b, [x, 1.6, -0.95], [x, 1.6, 0.95], 0.09, wd);
  }
  beam(b, [-2.1, H, 0], [2.1, H, 0], 0.16, wd);
  for (const x of [-0.5, 0, 0.5]) b.add(new THREE.TorusGeometry(0.34, 0.07, 8, 18), [x, H - 0.45, 0], shade(wd, 0.8));   // Mitte: Rolle für das Lastseil (Karte steinblock)
  b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 6), [0, H - 0.2, 0], shade(wd, 0.6));
  for (const x of [-0.75, 0.75]) beam(b, [x, H - 0.4, 0.02], [x * 1.4, 1.2, 1.6], 0.025, "#d8cfb4");   // Seile zur Haspel
  for (const x of [-0.9, 0.9]) {   // Haspel-Räder mit Speichen
    b.add(new THREE.TorusGeometry(0.85, 0.08, 8, 24), [x, 1.05, 1.8], wd, undefined, [0, 90, 0]);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI; beam(b, [x, 1.05 + Math.cos(a) * 0.85, 1.8 + Math.sin(a) * 0.85], [x, 1.05 - Math.cos(a) * 0.85, 1.8 - Math.sin(a) * 0.85], 0.04, wd); }
  }
  beam(b, [-1.2, 1.05, 1.8], [1.2, 1.05, 1.8], 0.08, shade(wd, 0.8));
  for (const x of [-1.2, 1.2]) beam(b, [x, 0, 1.8], [x, 1.1, 1.8], 0.09, wd);
  const g = b.build("kran");
  g.position.set(...at);
  g.rotation.y = THREE.MathUtils.degToRad(turn);
  g.userData.protect = true;
  return g;
};

/** Palasthalle (Joseon): zweistufiger Steinsockel mit Treppe, Halle mit roten Säulen, Papierwänden und grossem Dach. Front = +z. */
export const hall = (kit: Kit, kp: KoreaPalette, at: V3, o: { w?: number; d?: number; turn?: number } = {}) => {
  const b = kit.batch(), w = o.w ?? 14, d = o.d ?? 8;
  const stone = blocks(kp.blocks, kp.blocksJoint);
  b.box([w + 4, 0.7, d + 4], [0, 0.35, 0], "#ffffff", stone);
  b.box([w + 2, 0.6, d + 2], [0, 1.0, 0], "#ffffff", stone);
  for (let i = 0; i < 4; i++) b.box([3, 0.32, 0.6], [0, 0.16 + i * 0.32, d / 2 + 2.6 - i * 0.6], "#ffffff", stone);   // Treppe
  b.box([w, 3.4, d], [0, 1.3 + 1.7, 0], "#ffffff", plaster(kp.hanokWall));
  const n = Math.round(w / 2.3);
  for (let i = 0; i <= n; i++) b.add(new THREE.CylinderGeometry(0.22, 0.24, 3.4, 10), [-w / 2 + (i * w) / n, 3.0, d / 2 + 0.05], kp.red);
  for (let i = 0; i < n; i++) {   // Gittertüren aus Papier zwischen den Säulen
    const cx = -w / 2 + ((i + 0.5) * w) / n, dw = w / n - 0.5;
    b.box([dw, 2.6, 0.05], [cx, 2.75, d / 2 + 0.06], kp.paper);
    for (let k = 1; k < 5; k++) b.box([dw, 0.04, 0.07], [cx, 1.45 + k * 0.52, d / 2 + 0.08], kp.timber);
    for (let k = 1; k < 3; k++) b.box([0.04, 2.58, 0.075], [cx - dw / 2 + (k * dw) / 3, 2.75, d / 2 + 0.0825], kp.timber);
  }
  b.box([w + 0.6, 0.45, 0.4], [0, 4.55, d / 2 + 0.1], kp.green);
  b.box([w + 0.6, 0.16, 0.42], [0, 4.25, d / 2 + 0.1], kp.red);
  roofOn(b, kp, [0, 4.75, 0], w + 3.6, d + 3.4, 3.0, 0.36);
  const g = b.build("halle");
  g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(o.turn ?? 0);
  g.userData.occluder = true;
  return g;
};

/** Speicher auf Stelzen (frühe Festungen): vier Pfosten, Bretterkasten, Strohdach. */
export const granary = (kit: Kit, kp: KoreaPalette, at: V3, turn = 0) => {
  const b = kit.batch();
  for (const x of [-1.3, 1.3]) for (const z of [-0.9, 0.9]) b.add(new THREE.CylinderGeometry(0.11, 0.13, 1.3, 8), [x, 0.65, z], kp.timber);
  b.box([3.2, 2.2, 2.4], [0, 1.3 + 1.1, 0], "#ffffff", planks(kp.wood, true));
  const s = new THREE.SphereGeometry(1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
  b.add(s, [0, 3.45, 0], "#ffffff", thatch(kp.thatch), [0, 0, 0], [2.2, 1.3, 1.8]);
  b.add(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), [1.0, 0.75, 1.4], kp.timber, undefined, [25, 0, 0]);   // Leiter
  const g = b.build("speicher");
  g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(turn);
  g.userData.occluder = true;
  return g;
};

/** Hölzerner Wachturm: vier hohe Pfosten mit Streben, Plattform mit Geländer, kleines Strohdach. */
export const watchtower = (kit: Kit, kp: KoreaPalette, at: V3, h = 6.5) => {
  const b = kit.batch(), wd = kp.timber;
  for (const x of [-1.2, 1.2]) for (const z of [-1.2, 1.2]) beam(b, [x * 1.2, 0, z * 1.2], [x, h + 1.2, z], 0.12, wd);
  for (const y of [h * 0.35, h * 0.7]) { beam(b, [-1.3, y, -1.3], [1.3, y, 1.3], 0.06, wd); beam(b, [1.3, y, -1.3], [-1.3, y, 1.3], 0.06, wd); }
  b.box([3.0, 0.16, 3.0], [0, h, 0], "#ffffff", planks(kp.wood));
  for (const [x, z, w, d] of [[0, 1.45, 3, 0.08], [0, -1.45, 3, 0.08], [1.45, 0, 0.08, 3], [-1.45, 0, 0.08, 3]] as const) b.box([w, 0.9, d], [x, h + 0.55, z], wd);
  b.add(new THREE.ConeGeometry(2.3, 1.4, 4), [0, h + 1.9, 0], "#ffffff", thatch(kp.thatch), [0, 45, 0]);
  const g = b.build("wachturm-holz");
  g.position.set(...at);
  g.userData.occluder = true;
  return g;
};

const ball = new THREE.IcosahedronGeometry(1, 2);
/** Kiefer: gebogener rotbrauner Stamm, flache dunkelgrüne Nadel-Wolken. */
export const pine = (kit: Kit, kp: KoreaPalette, at: V3, h = 7, seed = 1) => {
  const rng = new Rng(seed + 501), b = kit.batch();
  let p: V3 = [0, 0, 0];
  const lean = rng.range(-0.25, 0.25);
  for (let i = 0; i < 4; i++) {
    const q: V3 = [p[0] + lean * h * 0.18 + rng.range(-0.25, 0.25), p[1] + h * 0.18, p[2] + rng.range(-0.15, 0.15)];
    beam(b, p, q, 0.22 * h / 7 * (1 - i * 0.15), kp.pineBark); p = q;
  }
  for (let i = 0; i < 4; i++) {
    const r = h * rng.range(0.17, 0.24);
    b.add(ball, [p[0] + rng.range(-1.4, 1.4) * h / 7, p[1] + i * 0.5 * h / 7 - 0.4, p[2] + rng.range(-0.8, 0.8)], shade(kp.pine, rng.range(0.88, 1.1)), undefined, [0, 0, 0], [r * 1.5, r * 0.45, r * 1.2]);
  }
  const g = b.build("kiefer");
  g.position.set(...at);
  g.userData.occluder = true;
  return g;
};

/** Felsbrocken (Gipfel). */
const boulder = (b: ReturnType<Kit["batch"]>, kp: KoreaPalette, at: V3, s: number, rot: number) =>
  b.add(ball, at, "#ffffff", rock(kp.rock), [0, rot, 0], [s * 1.3, s * 0.7, s]);

/** Weg: flacher Streifen aus gestampfter Erde. */
const path = (kit: Kit, kp: KoreaPalette, x0: number, x1: number, z: number, w: number) => {
  const m = kit.mesh(new THREE.PlaneGeometry(x1 - x0, w).rotateX(-Math.PI / 2).translate((x0 + x1) / 2, 0.012, z), "#ffffff", earth(kp.dirt));
  m.castShadow = false; m.name = "weg";
  return m;
};

// ---------------- Orte ----------------
export type KoreaPlace = { at: V3; wide: { pos: V3; look: V3 }; medium: { pos: V3; look: V3 }; note: string };
const ringPath = (cx: number, cz: number, r: number, n = 28, from = 0, to = Math.PI * 2): Path =>
  Array.from({ length: n + 1 }, (_, i) => { const a = from + ((to - from) * i) / n; return [cx + Math.cos(a) * r * (1 + 0.08 * Math.sin(a * 3)), cz + Math.sin(a) * r]; });
/** Pfade der Mauern (für Darsteller auf der Mauer: Punkte darauf liefern die Kronenhöhe über `groundAt`). */
export const KOREA_WALLS = {
  bergfestung: ringPath(-300, -48, 21),
  grenzmauer: Array.from({ length: 31 }, (_, i): [number, number] => { const x = -235 + i * 6; return [x, -32 + 5 * Math.sin(x / 22)]; }),
  hanyang: [[-70, -12], [-8, -12], [8, -12], [24, -16], [34, -26], [42, -38], [48, -52], [52, -66]] as Path,
  hwaseong: [[96, -12], [210, -12]] as Path,
};
export const KOREA_PLACES: Record<string, KoreaPlace> = {
  dorf: { at: [-300, 0, -3], note: "Strohdach-Dorf am Fuss des Festungsbergs (Goguryeo); Mauer-Ring um den Gipfel",
    wide: { pos: [-292, 3.5, 16], look: [-300, 12, -40] }, medium: { pos: [-299, 1.7, 2.5], look: [-300, 1.6, -3] } },
  bergfestung: { at: [-300, 0, -27], note: "Mauerring auf dem Berg (Vorderseite bei z −27)",
    wide: { pos: [-290, 26, -10], look: [-300, 21, -40] }, medium: { pos: [-299, 25.5, -21.5], look: [-300, 25, -27] } },
  grenzmauer: { at: [-150, 0, -32], note: "Steinmauer über die Hügel, Wachturm bei x −150",
    wide: { pos: [-140, 9, 6], look: [-152, 8, -32] }, medium: { pos: [-149, 13, -25], look: [-150, 12.5, -32] } },
  hanyang: { at: [0, 0, -12], note: "Stadtmauer mit Tor (x 0), steigt nach Nordosten den Berg hinauf; Hanok-Häuser innen",
    wide: { pos: [-6, 4, 18], look: [12, 7, -24] }, medium: { pos: [16, 2.2, -4], look: [18, 2.2, -13] } },
  hwaseong: { at: [150, 0, -12], note: "Hwaseong: Quader-Mauer mit Ziegel-Brustwehr, Torhalle (x 140), Kanonenturm (x 168), Kran (x 156)",
    wide: { pos: [158, 4.5, 20], look: [152, 5, -12] }, medium: { pos: [156, 2.0, 4], look: [156, 2.4, -3] } },
};

/** Die ganze Korea-Welt. Varianten: Hanyang-Mauer "alt" (Lehm + Bruchstein) oder "neu" (Quader); Hwaseong "bau" (Kran,
 *  Lücken in der Brustwehr), "ganz", "ruine" (zerstört, ohne Hallen). */
export const korea = (kit: Kit, look: KoreaLook, seed = 1, opt: KoreaOptions = {}) => {
  const kp = look.korea, pal = look.palette;
  const root = new THREE.Group(); root.name = "korea";
  const add = (o: THREE.Object3D) => { root.add(o); return o; };
  const segs: WallSeg[] = [];
  add(terrain(kit, kp));
  const rng = new Rng(seed * 29);
  const gy = (x: number, z: number) => koreaHeight(x, z) - 0.25;

  // A – Bergfestung (Goguryeo)
  add(fortWall(kit, kp, KOREA_WALLS.bergfestung, { height: 4.2, thick: 3.2, kind: "rubble", seed: 3, segs, outer: (x, z) => [x + 300, z + 48] }));
  add(path(kit, kp, -340, -260, 3, 4));
  for (const [x, z, t] of [[-318, -6, 10], [-306, -9, -5], [-292, -7, 8], [-280, -10, -12], [-312, 9, 175], [-296, 10, 185], [-284, 9, 170]] as const)
    add(hanok(kit, kp, [x, 0, z], { w: 5.6, d: 4, roof: "thatch", turn: t }));
  const rb = kit.batch();
  for (let i = 0; i < 9; i++) { const a = rng.range(0, Math.PI * 2), r = rng.range(0, 9); const x = -300 + Math.cos(a) * r, z = -48 + Math.sin(a) * r; boulder(rb, kp, [x, koreaHeight(x, z) - 0.4, z], rng.range(1.2, 2.6), rng.range(0, 90)); }
  add(rb.build("felsen"));
  // Innenseite: Speicher, Wachturm und Unterkünfte auf dem Gipfel (Goguryeo-Festungen waren Zufluchtsorte mit Vorräten)
  for (const [x, z, r] of [[-307, -41, 10], [-292, -44, -15], [-298, -58, 5]] as const) add(granary(kit, kp, [x, gy(x, z), z], r));
  add(watchtower(kit, kp, [-312, gy(-312, -52), -52], 6));
  for (const [x, z, r] of [[-289, -55, 200], [-306, -63, 170]] as const) add(hanok(kit, kp, [x, gy(x, z), z], { w: 7, d: 4, roof: "thatch", turn: r }));

  // B – Grenzmauer (Goryeo)
  add(fortWall(kit, kp, KOREA_WALLS.grenzmauer, { height: 5, thick: 3.6, kind: "stone", seed: 5, segs }));
  { const tz = -32 + 5 * Math.sin(-150 / 22), g = koreaHeight(-150, tz), tb = kit.batch();
    tb.box([6, 9, 6], [-150, g + 2.5, tz], "#ffffff", blocks(kp.oldBlocks, shade(kp.oldBlocks, 0.55)));
    for (let i = -1; i <= 1; i++) tb.box([1.3, 1.1, 0.7], [-150 + i * 2, g + 7.55, tz - 2.65], "#ffffff", blocks(kp.oldBlocks, shade(kp.oldBlocks, 0.55)));
    const t = add(tb.build("wachturm")); t.userData.occluder = true;
    segs.push({ a: [-152.6, tz], b: [-147.4, tz], top: g + 7, half: 2.6 }); }
  // Innenseite: Garnison am Hang (Unterkünfte, Speicher, Wachturm)
  for (const [x, z, r] of [[-182, -25, 8], [-194, -23, -6], [-206, -24, 4]] as const) add(hanok(kit, kp, [x, gy(x, z), z], { w: 9, d: 4.4, roof: "thatch", turn: r }));
  add(granary(kit, kp, [-170, gy(-170, -27), -27], 12));
  add(watchtower(kit, kp, [-190, gy(-190, -24), -24], 6.5));

  // C – Hanyang (Joseon)
  const alt = (opt.hanyang ?? "neu") === "alt";
  add(fortWall(kit, kp, KOREA_WALLS.hanyang, { height: 5.2, thick: 4, kind: alt ? "earth-rubble" : "blocks", gaps: [[-8, 8]], seed: 9, segs }));
  add(gateTower(kit, kp, [0, 0, -12], { width: 15, depth: 10, baseH: 5.6, floors: 2, base: "blocks" }));
  segs.push({ a: [-7, -12], b: [7, -12], top: 5.6, half: 4.6 });
  add(path(kit, kp, -60, 60, -2, 6));
  for (const [x, z] of [[-14, -24], [-26, -22], [-38, -25], [-20, -34], [-33, -36], [-46, -33], [-10, -38]] as const) add(hanok(kit, kp, [x, 0, z], { w: rng.range(7, 9), d: 5, roof: "tile" }));
  // Innenseite der Hauptstadt (Süden, zur Kamera): Ziegeldach-Häuser entlang der Strasse, eine Halle, Strohdach am Rand
  for (const [x, z, w] of [[-11, -7, 7], [37, -8, 7], [-22, -6.5, 8], [-33, -6.5, 9], [-44, -6.5, 8], [-26, 6, 9], [-38, 7, 8], [26, 6, 8], [36, 7, 9]] as const)
    add(hanok(kit, kp, [x, gy(x, z), z], { w, d: 4.6, roof: "tile", turn: z > 0 ? 180 : 0 }));
  add(hall(kit, kp, [-60, 0, -2], { w: 14, d: 8, turn: 90 }));
  for (const [x, z, t] of [[18, 9, 180], [50, 8, 185]] as const) add(hanok(kit, kp, [x, 0, z], { w: 5.6, d: 4, roof: "thatch", turn: t }));

  // D – Hwaseong (spätes Joseon)
  const hw = opt.hwaseong ?? "ganz", ruin = hw === "ruine";
  add(fortWall(kit, kp, KOREA_WALLS.hwaseong, { height: 4.6, thick: 4, kind: "hwaseong", gaps: [[132, 148]], ruin: ruin ? 0.55 : hw === "bau" ? 0.25 : 0, seed: 11, segs }));
  add(gateTower(kit, kp, [140, 0, -12], { width: 16, depth: 11, baseH: 5.8, floors: 2, base: "blocks", ruin }));
  segs.push({ a: [133, -12], b: [147, -12], top: 5.8, half: 5 });
  const gt = add(gunTower(kit, kp, [170, 0, -15], { size: 7, height: 10, ruin }));
  segs.push({ a: [166.5, -15], b: [173.5, -15], top: ruin ? 7 : 10, half: 3.4 });
  void gt;
  add(path(kit, kp, 96, 214, -2, 7));
  if (hw === "bau") {
    add(crane(kit, kp, [156, 0, -7.6], 0));
    const sb = kit.batch();
    for (let i = 0; i < 6; i++) sb.box([1.1, 0.7, 0.8], [160.5 + (i % 3) * 1.2, 0.35 + Math.floor(i / 3) * 0.7, -4 + (i % 2) * 0.3], "#ffffff", blocks(kp.blocks, kp.blocksJoint), [0, (i * 7) % 20, 0]);
    for (let i = 0; i < 4; i++) sb.box([1.0, 0.5, 0.5], [151 - (i % 2) * 1.1, 0.25 + Math.floor(i / 2) * 0.5, -4], "#ffffff", brick(kp.brick, kp.mortar));
    const st = add(sb.build("baustoffe")); st.userData.protect = true;
  }
  for (const [x, z] of [[120, -26], [132, -28], [158, -27], [186, -25]] as const) add(hanok(kit, kp, [x, 0, z], { w: 8, d: 5, roof: "tile" }));
  // Innenseite (Süden, zur Kamera): Stadt Hwaseong – Ziegeldach-Häuser, Palasthalle; im Krieg (ruine) nur Reste
  if (!ruin) {
    for (const [x, z, w] of [[166, -6.5, 6], [174, -6.5, 6.5], [128, -6.5, 6.5], [114, 7, 9], [104, -5, 8], [176, 6, 8], [186, 7, 9], [196, 6, 8], [184, -5, 8], [196, -5, 7]] as const)
      add(hanok(kit, kp, [x, 0, z], { w, d: 4.6, roof: "tile", turn: z > 0 ? 180 : 0 }));
    add(hall(kit, kp, [104, 0, 14], { w: 14, d: 7, turn: 180 }));
  } else {
    const rr = kit.batch(), r2 = new Rng(31);
    for (const [x, z] of [[104, 6], [114, 7], [176, 6], [186, 7], [104, -5], [184, -5]] as const) {
      rr.box([7, 0.5, 4], [x, 0.25, z], "#ffffff", rubble(kp.rubble, kp.rubbleJoint));
      for (let k = 0; k < 5; k++) rr.add(new THREE.CylinderGeometry(0.16, 0.2, r2.range(0.5, 1.8), 8), [x + r2.range(-3, 3), 0.9, z + r2.range(-1.6, 1.6)], "#2e2622", undefined, [r2.range(-25, 25), 0, r2.range(-25, 25)]);
    }
    add(rr.build("truemmer"));   // kein Sichtlinien-Teilnehmer (verstreute Teile, grosser Hüllquader)
  }

  // ---- Leben: wehende Fahnen, flackernde Fackeln, Rauch und Feuer, blinkende Laternen, Vögel (bewegt in tick) ----
  const leben: Lebendig[] = [];
  const lebt = (l: Lebendig) => { root.add(l.obj); leben.push(l); };
  const krone = (x: number, z: number) => onWall(segs, x, z) ?? Math.max(0, koreaHeight(x, z));
  const OBANG = ["#2f5fb3", "#c0392b", "#e2b52f", "#f4f0e6", "#2a2a30"];   // Obangsaek: Blau, Rot, Gelb, Weiss, Schwarz
  // A – Ring: Fahnen auf der Krone (innen), Fackeln neben der Vorderseite, Signalfeuer auf dem Gipfel, Kaminrauch im Dorf
  KOREA_WALLS.bergfestung.forEach(([x, z], i) => {
    if (i % 3 !== 1) return;
    const ix = x + (-300 - x) * 0.07, iz = z + (-48 - z) * 0.07;
    lebt(fahne(kit, [ix, krone(ix, iz), iz], i % 2 ? "#b8382f" : "#2a2a30", { rand: "#e2b52f", turn: 200 + i * 3, phase: i * 0.7 }));
  });
  for (const x of [-303.2, -296.4]) lebt(fackel(kit, [x, krone(x, -27.9), -27.9], { phase: x }));
  lebt(rauchsaeule(kit, [-303, koreaHeight(-303, -50) - 0.2, -50], { sockel: true, feuer: 2.4, hoehe: 26, dicke: 2.2, wind: [9, 3], phase: 0.1 }));
  for (const [x, z, ph] of [[-306, -9, 0.2], [-292, -7, 0.55], [-296, 10, 0.8]] as const)
    lebt(rauchsaeule(kit, [x, 4.6, z], { hoehe: 9, dicke: 0.5, wind: [3, 1], n: 8, tempo: 0.12, farbe: "#d8d2c8", phase: ph }));
  for (const [x, z] of [[-301.5, 1.2], [-294.5, 1.4]] as const) lebt(fackel(kit, [x, 0, z], { phase: x * 0.3 }));
  lebt(voegel([-296, 34, -14], { n: 7, radius: 16, seed: 1 }));

  // B – Grenzmauer: Fahnen auf der Krone, Fackeln bei Minho, Signalfeuer auf dem Wachturm, Rauch der Garnison
  for (let x = -214, i = 0; x <= -118; x += 8, i++) {
    if (Math.abs(x + 150) < 4) continue;
    const z = -32 + 5 * Math.sin(x / 22) + 1.1;
    lebt(fahne(kit, [x, krone(x, z), z], i % 2 ? "#e2b52f" : "#2f5fb3", { rand: "#c0392b", turn: 190 + i * 4, phase: i * 0.9 }));
  }
  for (const x of [-162.6, -157.4]) { const z = -32 + 5 * Math.sin(x / 22) + 1.2; lebt(fackel(kit, [x, krone(x, z), z], { phase: x })); }
  { const tz = -32 + 5 * Math.sin(-150 / 22); lebt(rauchsaeule(kit, [-150, koreaHeight(-150, tz) + 7, tz], { sockel: true, feuer: 2.2, hoehe: 24, dicke: 2, wind: [8, 2], phase: 0.4 })); }
  for (const [x, z, ph] of [[-182, -25, 0.3], [-194, -23, 0.65]] as const)
    lebt(rauchsaeule(kit, [x, koreaHeight(x, z) + 4.8, z], { hoehe: 9, dicke: 0.55, wind: [3, 1], n: 8, tempo: 0.12, farbe: "#d8d2c8", phase: ph }));
  lebt(voegel([-160, 30, -44], { n: 6, radius: 18, seed: 2 }));

  // C – Hanyang: Obangsaek-Fahnen auf Mauer und Tor, Fackeln am Tor, Laternen an der Strasse, Signalfeuer auf dem Berg
  for (const [x, z, i] of [[-44, -10.6, 0], [-34, -10.6, 1], [-24, -10.6, 2], [-15, -10.6, 3], [15, -11.3, 4], [26.6, -16.6, 0], [33, -24, 1], [38.5, -31, 2]] as const)
    lebt(fahne(kit, [x, krone(x, z), z], OBANG[i], { rand: OBANG[(i + 2) % 5], turn: 195 + i * 5, phase: x * 0.3 }));
  for (const x of [-6.8, 6.8]) lebt(fahne(kit, [x, 5.6, -7.6], OBANG[x < 0 ? 0 : 1], { h: 4, w: 1.9, rand: "#e2b52f", turn: 200, phase: x }));
  for (const x of [-8.6, 8.6]) lebt(fackel(kit, [x, 0, -6.6], { h: 2.2, phase: x }));
  lebt(laternenkette(kit, [-30, 0, 1.6], [-16, 0, 1.6], { n: 7, phase: 0.3 }));
  lebt(laternenkette(kit, [30, 0, 1.6], [44, 0, 1.6], { n: 7, phase: 1.1 }));
  lebt(rauchsaeule(kit, [44, koreaHeight(44, -60) - 0.2, -60], { sockel: true, feuer: 2.4, hoehe: 26, dicke: 2.2, wind: [-8, 3], phase: 0.7 }));
  for (const [x, z, ph] of [[-33, -6.5, 0.15], [36, 7, 0.6]] as const)
    lebt(rauchsaeule(kit, [x, gy(x, z) + 5, z], { hoehe: 9, dicke: 0.5, wind: [3, 1], n: 8, tempo: 0.12, farbe: "#d8d2c8", phase: ph }));
  lebt(voegel([4, 26, -26], { n: 7, radius: 18, seed: 3 }));

  // D – Hwaseong: bunte Fahnen auf Mauer und Kanonenturm, Fackeln, Laternen (fertige Stadt); Ruine: brennende Reste
  if (!ruin) {
    for (let x = 100, i = 0; x <= 206; x += 7, i++) {
      if (x > 130 && x < 150) continue;
      lebt(fahne(kit, [x, krone(x, -10.6), -10.6], OBANG[i % 5], { rand: OBANG[(i + 2) % 5], turn: 195 + (i % 4) * 6, phase: i * 0.8 }));
    }
    lebt(fahne(kit, [170, 10, -13], "#c0392b", { h: 4.2, w: 2.2, rand: "#e2b52f", turn: 200, phase: 2 }));
    for (const x of [133.5, 146.5]) lebt(fahne(kit, [x, 5.8, -7.4], OBANG[x < 140 ? 2 : 0], { h: 4, w: 1.9, rand: "#c0392b", turn: 200, phase: x }));
    for (const x of [119.6, 128.8]) lebt(fackel(kit, [x, krone(x, -11), -11], { phase: x }));
    for (const x of [131.4, 148.6]) lebt(fackel(kit, [x, 0, -6.4], { h: 2.2, phase: x }));
    if (hw === "ganz") {
      lebt(laternenkette(kit, [100, 0, 1.6], [116, 0, 1.6], { n: 8, phase: 0.2 }));
      lebt(laternenkette(kit, [160, 0, 1.6], [176, 0, 1.6], { n: 8, phase: 0.9 }));
      lebt(laternenkette(kit, [118, krone(118, -10.4), -10.4], [130, krone(130, -10.4), -10.4], { n: 7, h: 2.6, phase: 1.7 }));
    }
    for (const [x, z, ph] of [[186, 7, 0.25], [114, 7, 0.7]] as const)
      lebt(rauchsaeule(kit, [x, 5, z], { hoehe: 9, dicke: 0.5, wind: [3, 1], n: 8, tempo: 0.12, farbe: "#d8d2c8", phase: ph }));
  } else {
    for (const [x, z, s, ph] of [[104, 6, 1.8, 0.1], [114, 7, 2.4, 0.5], [176, 6, 2.0, 0.3], [184, -5, 1.6, 0.8], [140, -7, 2.6, 0.6], [168, -9, 1.8, 0.2]] as const)
      lebt(rauchsaeule(kit, [x, 0.4, z], { feuer: s, hoehe: 22, dicke: 1.4 + s * 0.4, wind: [6, 2], farbe: "#6a645e", tempo: 0.1, phase: ph }));
  }
  lebt(voegel([150, 24, -18], { n: 8, radius: 20, seed: 4 }));

  // Kiefern überall auf den Hängen
  for (let i = 0; i < 90; i++) {
    const x = rng.range(-400, 240), z = rng.range(-140, -18), g = koreaHeight(x, z);
    if (onWall(segs, x, z) !== null || Math.abs(z + 12) < 6 || (x > -60 && x < 0 && z > -42)) continue;
    add(pine(kit, kp, [x, g - 0.3, z], rng.range(6, 9), i));
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rng.range(-0.2, 0.2), d = rng.range(260, 340);
    root.add(cloud(look.clouds, [-80 + Math.cos(a) * d, rng.range(60, 100), Math.sin(a) * d], rng.range(1.2, 1.9), i + 1));
  }
  // zweite, höhere Wolkenschicht rundum: auch über Dächern und Türmen stehen in jedem Bild Wolken am Himmel
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + rng.range(-0.15, 0.15), d = rng.range(210, 300);
    root.add(cloud(look.clouds, [-80 + Math.cos(a) * d, rng.range(85, 150), Math.sin(a) * d], rng.range(1.9, 2.8), 40 + i));
  }
  // Gras-Details auf den Wiesen (nicht auf Wegen, Mauern und in Bauten)
  const sperren: THREE.Box3[] = [];
  root.updateMatrixWorld(true);
  for (const o of root.children) if (o.userData.occluder || o.userData.protect) sperren.push(new THREE.Box3().setFromObject(o).expandByVector(new THREE.Vector3(0.3, 0, 0.3)));
  const nahMauer = (x: number, z: number) => segs.some((s) => {
    const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - s.a[0]) * dx + (z - s.a[1]) * dz) / L2));
    return Math.hypot(s.a[0] + t * dx - x, s.a[1] + t * dz - z) < s.half + 1.6;
  });
  const aufWeg = (x: number, z: number) => (x > -342 && x < -258 && z > 0.6 && z < 5.4) || (x > -62 && x < 62 && z > -5.4 && z < 1.4) || (x > 94 && x < 216 && z > -5.9 && z < 1.9);
  const p = new THREE.Vector3();
  const frei = (x: number, z: number) => !aufWeg(x, z) && !nahMauer(x, z) && !sperren.some((bx) => bx.containsPoint(p.set(x, bx.min.y + 0.01, z)));
  root.add(grasDetails(kit, kp, frei, seed * 53 + 7));
  void pal; void planks;

  const groundAt = (x: number, z: number) => { const w = onWall(segs, x, z); return w ?? Math.max(0, koreaHeight(x, z)) + (Math.abs(z + 2) < 3.5 || Math.abs(z - 3) < 2 ? 0.01 : 0); };
  const tick = (time: number, _cam: THREE.Camera, _sun?: THREE.Vector3) => { for (const l of leben) l.tick(time); };
  return { root, tick, groundAt };
};
