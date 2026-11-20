// Herkunft: eigen (V-Video), geschrieben 2026-11-16, ohne Vorlage.
// Schiffe der Nord-Welt (Wikinger um 900): Langschiff in Klinkerbauweise (überlappende Planken), hohe Steven mit Drachenkopf am Bug
// und eingerolltem Heck, bunte Rundschilde an der Bordwand, Mast mit gestreiftem Rahsegel, Steuerruder an Steuerbord. Modi:
// "segeln" (Segel gesetzt, bläht sich), "rudern" (Ruder schlagen im Takt, Segel an der Rah gerefft), "liegen" (vertäut, gerefft),
// "strand" (auf den Kies gezogen, leicht schräg, ohne Schaukeln). Dazu die Knorr: breiter, höher, ohne Schilde, Laderaum mit
// Fässern und Säcken, kleiner Bugsteven. Ursprung = Mitte in Höhe der Wasserlinie, Bug nach +x. Bewegung nur aus der Zeit.
import * as THREE from "three";
import { Rng } from "../core/random";
import { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { planks, shade, stripes } from "./paint";
import { drachenkopf } from "./nord-bauten";
import type { Lebendig } from "./leben";
import type { NordPalette } from "./nord";

export type SchiffArt = "langschiff" | "knorr";
export type SchiffModus = "segeln" | "rudern" | "liegen" | "strand";
type Masse = { L: number; B: number; frei: number; kiel: number; steven: number; strakes: number };
const MASSE: Record<SchiffArt, Masse> = {
  langschiff: { L: 22, B: 5, frei: 1.15, kiel: 0.85, steven: 2.6, strakes: 7 },
  knorr: { L: 16, B: 5.6, frei: 1.7, kiel: 1.1, steven: 1.4, strakes: 8 },
};
/** Länge, Breite, Tiefgang eines Schiffs (Kameras, Liegeplätze). */
export const schiffMasse = (art: SchiffArt) => MASSE[art];

const ball = new THREE.IcosahedronGeometry(1, 2);
const deg = (r: number) => (r * 180) / Math.PI;

/** Rumpfform an der Stelle u (−1 Heck … 1 Bug): halbe Breite, Oberkante (Schergang), Kiel. */
const form = (m: Masse, u: number) => {
  const a = Math.abs(u);
  return { w: (m.B / 2) * Math.pow(Math.max(0, 1 - Math.pow(a, 2.4)), 0.55), oben: m.frei + m.steven * 0.55 * Math.pow(a, 5), kiel: -m.kiel * Math.sqrt(Math.max(0, 1 - a * a)) + 0.25 * Math.pow(a, 6) };
};

/** Ein Plankengang (Strake) einer Seite als Band von t0 bis t1 (0 = Kiel, 1 = Schergang), um `off` nach aussen versetzt. */
const plankengang = (m: Masse, seite: 1 | -1, t0: number, t1: number, off: number) => {
  const n = 56, pos: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const u = -1 + (2 * i) / n, f = form(m, u), x = (u * m.L) / 2;
    for (const t of [t0, t1]) {
      const y = f.kiel + (f.oben - f.kiel) * t, z = seite * (f.w * Math.pow(Math.sin((t * Math.PI) / 2), 0.6) + off * Math.min(1, f.w * 2));
      pos.push(x, y, z);
    }
  }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  return g;
};

/** Rundschild (Ø d): zwei bemalte Hälften, Rand, Buckel; schaut in Richtung `seite` (z). */
const schild = (b: B, at: V3, d: number, seite: 1 | -1, a: string, c: string, metall: string) => {
  const r = d / 2, rot: V3 = [seite * 90, 0, 0];
  b.add(new THREE.CylinderGeometry(r, r, 0.05, 20, 1, false, 0, Math.PI), at, a, undefined, rot);
  b.add(new THREE.CylinderGeometry(r, r, 0.05, 20, 1, false, Math.PI, Math.PI), at, c, undefined, rot);
  b.add(new THREE.TorusGeometry(r, 0.035, 5, 24), [at[0], at[1], at[2] + seite * 0.03], shade(a, 0.6));
  b.add(ball, [at[0], at[1], at[2] + seite * 0.06], metall, undefined, [0, 0, 0], [r * 0.24, r * 0.24, r * 0.16]);
};
type B = ReturnType<Kit["batch"]>;

/** Steven als gebogenes Rohr von `a` über `b` nach `c` (Radius r). */
const steven = (bb: B, pts: V3[], r: number, farbe: string) => {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  bb.add(new THREE.TubeGeometry(curve, 24, r, 8, false), [0, 0, 0], farbe);
};

export type Schiff = Lebendig & { art: SchiffArt; modus: SchiffModus };

/**
 * Langschiff oder Knorr. `modus` (siehe oben), `segel` = Farbe der Streifen, `phase` = Versatz für Schaukeln/Ruder.
 * Ursprung = Wasserlinie Mitte; für "strand" setzt die Welt das Schiff auf den Kies (Kiel auf dem Boden).
 */
export const schiff = (kit: Kit, np: NordPalette, art: SchiffArt, modus: SchiffModus, o: { streifen?: string; phase?: number; seed?: number } = {}): Schiff => {
  const m = MASSE[art], g = new THREE.Group(); g.name = art;
  const b = kit.batch(), ph = o.phase ?? 0, r = new Rng((o.seed ?? 1) * 13 + (art === "knorr" ? 5 : 1));
  // Rumpf: Plankengänge aussen (überlappend, abwechselnd hell/dunkel, oberster bemalt) – beidseitig sichtbar (man blickt hinein)
  const farben = Array.from({ length: m.strakes }, (_, k) => k === m.strakes - 1 ? (art === "langschiff" ? np.bemalung[2] : np.holzDunkel) : shade(np.holz, k % 2 ? 0.86 : 1.0));
  const huelle = new THREE.Group(); huelle.name = "rumpf";
  for (const seite of [1, -1] as const) for (let k = 0; k < m.strakes; k++) {
    const t0 = k / m.strakes - (k ? 0.035 : 0), t1 = (k + 1) / m.strakes, mat = kit.mat(farben[k]);
    mat.side = THREE.DoubleSide;   // man blickt in den Rumpf hinein (Material nie klonen – der Zwei-Ton-Shader bricht sonst)
    const mesh = new THREE.Mesh(plankengang(m, seite, t0, t1, 0.03 * k), mat); mesh.castShadow = mesh.receiveShadow = true; huelle.add(mesh);
  }
  g.add(huelle);
  // Boden (Bodenbretter), Spanten innen, Schergang-Leiste
  const fb = form(m, 0);
  // Boden 10 cm über der Wasserlinie, folgt der Rumpfform (sonst sieht man innen das Wasser)
  const BODEN = 0.1, nb = 24, tB = (y: number, f: ReturnType<typeof form>) => Math.min(1, Math.max(0, (y - f.kiel) / (f.oben - f.kiel)));
  for (let i = 0; i < nb; i++) {
    const u0 = -0.97 + (1.94 * i) / nb, u1 = -0.97 + (1.94 * (i + 1)) / nb, f = form(m, (u0 + u1) / 2);
    const halb = f.w * Math.pow(Math.sin((tB(BODEN, f) * Math.PI) / 2), 0.6) + 0.02;
    if (halb > 0.05) b.add(new THREE.BoxGeometry(((u1 - u0) * m.L) / 2 + 0.02, 0.08, halb * 2), [((u0 + u1) / 2 * m.L) / 2, BODEN, 0], "#ffffff", planks(np.holzHell));
  }
  for (let i = -5; i <= 5; i++) {   // Spanten innen: vom Boden bis knapp unter die Bordwand
    const u = i / 7, f = form(m, u), hh = f.oben - 0.2 - BODEN;
    for (const s of [-1, 1]) b.add(new THREE.BoxGeometry(0.14, hh, 0.12), [(u * m.L) / 2, BODEN + hh / 2, s * f.w * 0.78], np.holzDunkel, undefined, [s * 12, 0, 0]);
  }
  // Steven: Bug (+x) mit Drachenkopf bzw. kleiner Locke, Heck mit eingerolltem Schwanz
  const fe = form(m, 1), xe = m.L / 2;
  if (art === "langschiff") {
    steven(b, [[xe - 1.2, fe.kiel + 0.2, 0], [xe + 0.3, fe.oben * 0.6, 0], [xe + 0.9, fe.oben + 0.8, 0], [xe + 1.05, fe.oben + 1.6, 0]], 0.2, np.holzDunkel);
    drachenkopf(b, np, [xe + 0.95, fe.oben + 1.55, 0], 2.2, 0, np.bemalung[0], np.bemalung[2]);
    steven(b, [[-xe + 1.2, fe.kiel + 0.2, 0], [-xe - 0.3, fe.oben * 0.6, 0], [-xe - 0.9, fe.oben + 1.0, 0], [-xe - 0.6, fe.oben + 2.0, 0], [-xe + 0.05, fe.oben + 2.1, 0], [-xe + 0.1, fe.oben + 1.55, 0], [-xe - 0.3, fe.oben + 1.5, 0]], 0.18, np.holzDunkel);
  } else {
    for (const s of [1, -1]) steven(b, [[s * (xe - 1.2), fe.kiel + 0.2, 0], [s * (xe + 0.2), fe.oben * 0.6, 0], [s * (xe + 0.6), fe.oben + 0.4, 0], [s * (xe + 0.3), fe.oben + 0.9, 0]], 0.2, np.holzDunkel);
  }
  // Schilde an der Bordwand (nur Langschiff), Ruderlöcher
  if (art === "langschiff") for (const s of [1, -1] as const) for (let x = -m.L * 0.34; x <= m.L * 0.34; x += 0.95) {
    const f = form(m, (2 * x) / m.L), i = Math.round(x / 0.95) + 20;
    schild(b, [x, f.oben - 0.22, s * (f.w + 0.3)], 0.9, s, np.bemalung[i % np.bemalung.length], i % 3 === 0 ? "#f4efe2" : np.bemalung[(i + 2) % np.bemalung.length], np.metall);
  }
  // Knorr: halbe Decks vorn und hinten, Ladung im offenen Raum
  if (art === "knorr") {
    for (const s of [1, -1]) b.add(new THREE.BoxGeometry(m.L * 0.2, 0.12, form(m, s * 0.62).w * 1.8), [s * m.L * 0.3, m.frei - 0.35, 0], "#ffffff", planks(np.holzHell));
    for (let i = 0; i < 9; i++) {
      const x = r.range(-m.L * 0.18, m.L * 0.18), z = r.range(-1.3, 1.3), y = 0.14;
      if (i % 3) b.add(new THREE.CylinderGeometry(0.34, 0.3, 0.85, 12), [x, y + 0.43, z], shade(np.holz, r.range(0.85, 1.05)));
      else b.add(ball, [x, y + 0.3, z], np.fell[0], undefined, [0, r.range(0, 90), 0], [0.5, 0.32, 0.38]);
    }
  }
  // Steuerruder an Steuerbord (+z), achtern
  const fs = form(m, -0.82);
  b.add(new THREE.BoxGeometry(0.5, 3.0, 0.12), [-m.L * 0.41, fs.oben - 1.6, fs.w + 0.35], np.holzDunkel, undefined, [0, 0, 12]);
  b.add(new THREE.CylinderGeometry(0.07, 0.07, 1.6, 6), [-m.L * 0.41 + 0.3, fs.oben + 0.4, fs.w + 0.25], np.holzDunkel, undefined, [0, 0, 70]);
  // Mast und Rah
  const MH = art === "langschiff" ? 11 : 10, rahY = fb.kiel + MH - 1.4, SW = art === "langschiff" ? 10 : 9, SH = art === "langschiff" ? 7.5 : 7;
  b.add(new THREE.CylinderGeometry(0.16, 0.22, MH, 10), [0, fb.kiel + MH / 2, 0], shade(np.holzHell, 0.9));
  void fb;
  for (const s of [-1, 1]) for (const dx of [-1.2, 1.2]) {   // Wanten
    const a = new THREE.Vector3(0, rahY + 0.6, 0), e = new THREE.Vector3(dx, form(m, (2 * dx) / m.L).oben, s * form(m, (2 * dx) / m.L).w), d = e.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize()), eu = new THREE.Euler().setFromQuaternion(q, "YXZ");
    b.add(new THREE.CylinderGeometry(0.025, 0.025, d.length(), 4), [(a.x + e.x) / 2, (a.y + e.y) / 2, (a.z + e.z) / 2], "#5a4632", undefined, [deg(eu.x), deg(eu.y), deg(eu.z)]);
  }
  g.add(b.build(`${art}-teile`));
  const rig = new THREE.Group(); rig.name = "rah"; g.add(rig);
  const rb = kit.batch();
  rb.add(new THREE.CylinderGeometry(0.12, 0.12, SW + 1, 8), [0, rahY, 0], shade(np.holzHell, 0.9), undefined, [90, 0, 0]);
  let segelTick = (_t: number) => {};
  if (modus === "segeln") {
    rig.add(rb.build("rah"));
    const geo = new THREE.PlaneGeometry(SW, SH, 12, 10).rotateY(Math.PI / 2); geo.translate(0.1, rahY - 0.15 - SH / 2, 0);
    const base = Float32Array.from(geo.getAttribute("position").array as Float32Array);
    const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (base[i * 3 + 2] + SW / 2) / 5, base[i * 3 + 1] / 5);   // 4 Streifenpaare über die Breite
    const mat = kit.mat("#ffffff", stripes("#f6f0e2", o.streifen ?? np.bemalung[0]));   // nur Segel nutzen dieses Material (nicht klonen)
    mat.side = THREE.DoubleSide;
    const sail = new THREE.Mesh(geo, mat); sail.castShadow = true; sail.name = "segel"; rig.add(sail);
    segelTick = (t: number) => {
      const p = geo.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const z = base[i * 3 + 2], y = base[i * 3 + 1], u = z / (SW / 2), v = (rahY - 0.15 - y) / SH;
        p.setX(i, 0.1 + 1.5 * (1 - u * u * 0.8) * Math.sin(Math.min(1, v) * Math.PI * 0.85) + 0.07 * Math.sin(t * 2.2 + u * 2 + ph) * v);
      }
      p.needsUpdate = true; geo.computeVertexNormals();
    };
  } else {   // gerefft: Tuchrolle unter der Rah (beim Rudern und Liegen), Bänder
    rb.add(new THREE.CylinderGeometry(0.36, 0.36, SW - 0.4, 10), [0.05, rahY - 0.42, 0], "#f6f0e2", undefined, [90, 0, 0]);
    for (let i = -2; i <= 2; i++) rb.add(new THREE.TorusGeometry(0.38, 0.04, 5, 10), [0.05, rahY - 0.42, i * 1.9], "#5a4632");
    rig.add(rb.build("rah"));
  }
  // Ruder (nur beim Rudern): je Seite eine Reihe, schlagen im Takt (Durchzug unten, Rückholen oben)
  const ruder: { o: THREE.Object3D; s: number }[] = [];
  if (modus === "rudern") {
    const rgeo = new THREE.CylinderGeometry(0.05, 0.05, 5.4, 6).translate(0, -2.7, 0), blatt = new THREE.BoxGeometry(0.06, 1.0, 0.24).translate(0, -5.0, 0);
    const mat = kit.mat(np.holzHell), matB = kit.mat(np.bemalung[0]);
    const anz = art === "langschiff" ? 12 : 4;
    for (const s of [1, -1]) for (let i = 0; i < anz; i++) {
      const x = -m.L * 0.32 + (m.L * 0.64 * (i + 0.5)) / anz, f = form(m, (2 * x) / m.L);
      const piv = new THREE.Group(); piv.position.set(x, f.oben - 0.45, s * (f.w + 0.05));
      const stange = new THREE.Mesh(rgeo, mat), bl = new THREE.Mesh(blatt, matB);
      stange.castShadow = bl.castShadow = true;
      piv.add(stange, bl); g.add(piv); ruder.push({ o: piv, s });
    }
  }
  const strand = modus === "strand";
  if (strand) { g.rotation.z = THREE.MathUtils.degToRad(4); g.rotation.x = THREE.MathUtils.degToRad(5); }
  return {
    obj: g, art, modus,
    tick: (t) => {
      segelTick(t);
      for (const { o: piv, s } of ruder) {   // Schlag: 1,6 s je Zug
        const w = (t / 1.6 + ph) * Math.PI * 2, zug = Math.sin(w);
        piv.rotation.set(-s * (1.05 + 0.18 * Math.cos(w)), 0, 0.42 * zug, "XYZ");   // nach aussen geneigt, Zug vor/zurück
      }
      if (!strand) { g.position.y = 0.06 * Math.sin(t * 1.1 + ph); g.rotation.x = 0.014 * Math.sin(t * 0.9 + ph); g.rotation.z = 0.008 * Math.sin(t * 0.7 + ph); }
    },
  };
};
