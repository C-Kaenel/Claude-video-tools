// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Welt des Stils T0004 quadratic-3d: grauer Void mit schwebenden Partikel-Würfeln, eine quadratische Karte (von schräg oben
// als Raute zu sehen) mit geschichteten Erd-Seiten, Kacheln, Quader-Bäumen, Felsen, Häusern, Teich, Zaun – und kleine
// Klotz-Figuren, die über die Karte laufen. Alles aus Quadern; Bewegung nur aus der Film-Zeit (bytegleich).
// Belegung: jede 1-m-Zelle der Karte trägt höchstens ein Objekt (nichts steckt ineinander).
import * as THREE from "three";
import { Kit, NOINK, Rng, type Batch, type WorldBuilder } from "../../engine/v01";
import { type Look } from "./look";
import { stufen } from "./material";

type V3 = [number, number, number];
export const KARTE = 24;   // Kantenlänge der Karte in m

// ---------- Void ----------
const voidVert = /* glsl */ `
varying vec3 vView;
void main() {
  vView = (modelViewMatrix * vec4(position, 1.0)).xyz;
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww;
}`;
const voidFrag = /* glsl */ `
uniform vec3 uDunkel;
uniform vec3 uHell;
uniform float uTanY;
uniform float uAspect;
uniform float uRadial;
varying vec3 vView;
void main() {
  vec2 uv = vec2(vView.x / (-vView.z) / (uTanY * uAspect), vView.y / (-vView.z) / uTanY);
  float r = length(uv * vec2(0.85, 1.0)) / 1.25;
  float tRad = smoothstep(0.0, 1.0, clamp(r, 0.0, 1.0));
  float tVer = clamp(0.5 - uv.y * 0.5, 0.0, 1.0);
  float t = mix(tVer, tRad, uRadial);
  gl_FragColor = vec4(mix(uHell, uDunkel, t), 1.0);
}`;

const makeVoid = (lk: Look) => {
  const mat = new THREE.ShaderMaterial({
    vertexShader: voidVert, fragmentShader: voidFrag, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: {
      uDunkel: { value: new THREE.Color(lk.void.dunkel) }, uHell: { value: new THREE.Color(lk.void.hell) },
      uTanY: { value: 0.16 }, uAspect: { value: 16 / 9 }, uRadial: { value: lk.void.modus === "radial" ? 1 : 0 },
    },
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(950, 32, 16), mat);
  m.name = "void"; m.renderOrder = -0.5; m.frustumCulled = false;
  m.userData.kulisse = true;
  m.layers.set(NOINK);
  return m;
};

// ---------- Tiefen-Genauigkeit ----------
const blick = new THREE.Vector3();
/** Vordere Schnittebene der Kamera nach ihrem Abstand zur Karte: Die Bühne setzt 0,1 m; bei 80–250 m Abstand (Raute, Hochformat)
 *  reicht die Tiefen-Genauigkeit dann nur auf mehrere Zentimeter, und nahe Flächen (Schneekappe ↔ Baumstufe) flackern.
 *  Wird nach der Kamera-Einstellung der Bühne im Welt-Tick gesetzt (eigener Stil-Code, Motor unverändert). */
export const schaerfeTiefe = (camera: THREE.PerspectiveCamera) => {
  camera.getWorldDirection(blick);
  const boden = blick.y < -0.05 ? camera.position.y / -blick.y : camera.position.length();
  const near = Math.min(60, Math.max(0.1, boden * 0.3));
  if (Math.abs(camera.near - near) > 1e-6) { camera.near = near; camera.updateProjectionMatrix(); }
};

// ---------- Partikel ----------
const makePartikel = (lk: Look, mitte: V3, groesse = KARTE, oben = 8) => {
  const n = lk.partikel.anzahl, rng = new Rng(41);
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: lk.partikel.farbe, fog: true }), n);
  mesh.name = "partikel"; mesh.userData.kulisse = true; mesh.frustumCulled = false;
  mesh.layers.set(NOINK);
  const p = Array.from({ length: n }, () => {
    let x = 0, y = 0, z = 0;
    // nicht in der Karte: ausserhalb des Kartenquaders oder deutlich darunter/darüber
    do { x = rng.range(-75, 75); y = rng.range(-45, 22); z = rng.range(-75, 75); }
    while (Math.abs(x) < groesse / 2 + 2 && Math.abs(z) < groesse / 2 + 2 && y > -9 && y < oben);
    return { x: x + mitte[0], y: y + mitte[1], z: z + mitte[2], s: rng.range(...lk.partikel.groesse), ph: rng.range(0, 6.28), w: rng.range(0.15, 0.4), r: rng.range(-0.3, 0.3) };
  });
  const o = new THREE.Object3D();
  const tick = (t: number) => {
    p.forEach((q, i) => {
      o.position.set(q.x + Math.sin(t * q.w * 0.7 + q.ph) * 0.8, q.y + Math.sin(t * q.w + q.ph) * 1.1 + t * 0.12, q.z + Math.cos(t * q.w * 0.6 + q.ph) * 0.8);
      o.rotation.set(t * q.r + q.ph, t * q.r * 0.7, 0);
      o.scale.setScalar(q.s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  return { mesh, tick };
};

// ---------- Karte ----------
/** Art der Kachel an (x, z) – Mitte der Karte = (0, 0). */
const zone = (x: number, z: number) => {
  if ((x - 5.5) ** 2 / 10 + (z + 5) ** 2 / 7 < 1) return "wasser";
  if (Math.abs(z - 2) < 1 || (Math.abs(x + 3) < 1 && z < 2)) return "weg";
  if (x < -4 && z > 4) return "platz";
  return "gras";
};

/** Belegte 1-m-Zellen der Karte. */
export class Belegung {
  private s = new Set<string>();
  constructor(private h: number) {}
  private zellen(x: number, z: number, w: number, d: number) {
    const out: string[] = [];
    for (let i = Math.floor(x - w / 2 + this.h); i < Math.ceil(x + w / 2 + this.h); i++)
      for (let j = Math.floor(z - d / 2 + this.h); j < Math.ceil(z + d / 2 + this.h); j++) out.push(`${i},${j}`);
    return out;
  }
  frei(x: number, z: number, w = 1, d = 1) { return this.zellen(x, z, w, d).every((c) => !this.s.has(c)); }
  nimm(x: number, z: number, w = 1, d = 1) { this.zellen(x, z, w, d).forEach((c) => this.s.add(c)); }
  /** prüft und belegt in einem Schritt */
  versuch(x: number, z: number, w = 1, d = 1) { if (!this.frei(x, z, w, d)) return false; this.nimm(x, z, w, d); return true; }
}

export const baueSeiten = (b: Batch, lk: Look, rng: Rng, groesse: number) => {
  const K = lk.karte, h = groesse / 2;
  b.box([groesse, 0.9, groesse], [0, -0.45, 0], K.seite[0]);
  b.box([groesse - 0.6, 1.4, groesse - 0.6], [0, -1.6, 0], K.seite[1]);
  b.box([groesse - 2, 1.6, groesse - 2], [0, -3.1, 0], K.seite[2]);
  for (let k = 0; k < groesse * 0.8; k++) {
    const w = rng.range(1, 2.6), d = rng.range(1, 2.6), y = rng.range(1, 3.5);
    b.box([w, y, d], [rng.range(-h + 2, h - 2), -3.9 - y / 2, rng.range(-h + 2, h - 2)], rng.pick(K.seite));
  }
  if (lk.detail < 1) return;
  // Steine in den Seitenwänden (leicht vorstehend) und hängende Wurzeln an den Kanten zur Kamera (+x, +z)
  for (let k = 0; k < 26 * lk.detail; k++) {
    const seite = rng.next() < 0.5, u = rng.range(-h + 1, h - 1), y = rng.range(-2.2, -0.4), s = rng.range(0.3, 0.6);
    const tief = (seite ? h : h - 0.3) + 0.08 + k * 0.004;   // je Stein eigene Tiefe: keine deckungsgleichen Flächen (Flackern)
    b.box([s, s * 0.7, s], seite ? [tief, y, u] : [u, y, tief], rng.pick([K.seite[1], K.seite[2], K.erde]));
  }
  for (let k = 0; k < 10 * lk.detail; k++) {
    const seite = rng.next() < 0.5, u = rng.range(-h + 1, h - 1), l = rng.range(0.5, 1.4);
    const v = h + 0.05 + k * 0.003;
    b.box([0.08, l, 0.08], seite ? [v, -0.15 - l / 2, u] : [u, -0.15 - l / 2, v], K.erde);
  }
};

const baueKarte = (kit: Kit, lk: Look, seed: number) => {
  const b = kit.batch(), rng = new Rng(seed), K = lk.karte, h = KARTE / 2, D = lk.detail;
  const bel = new Belegung(h);
  baueSeiten(b, lk, rng, KARTE);
  // Kacheln (1 m), Wasser und Weg belegen ihre Zellen
  const fuge = lk.raster;
  for (let i = 0; i < KARTE; i++) for (let j = 0; j < KARTE; j++) {
    const x = -h + i + 0.5, z = -h + j + 0.5, art = zone(x, z);
    const c = art === "wasser" ? K.wasser : art === "weg" ? K.weg : art === "platz" ? rng.pick(K.boden) : rng.pick(K.gras);
    const top = art === "wasser" ? 0.06 : art === "weg" ? 0.17 : rng.range(0.16, 0.24 + 0.04 * D);
    b.box([1 - fuge, top, 1 - fuge], [x, top / 2, z], c);
    if (art === "wasser" || art === "weg") bel.nimm(x, z);
  }
  const Y = 0.2;  // Oberkante der Kacheln
  // Häuser (flache Quader-Dächer, Fenster, Tür; ab Detail 1 Kamin, Fensterrahmen, Kisten)
  const haus = (x: number, z: number, w: number, d: number, hh: number) => {
    bel.nimm(x, z, w + 1, d + 1);
    b.box([w, hh, d], [x, Y + hh / 2, z], K.wand);
    b.box([w + 0.5, 0.35, d + 0.5], [x, Y + hh + 0.17, z], K.dach);
    b.box([w - 0.8, 0.5, d - 0.8], [x, Y + hh + 0.6, z], K.dach);
    b.box([0.9, 1.6, 0.06], [x, Y + 0.8, z + d / 2 + 0.03], K.holz);
    b.teil("tuer", [0.9, 1.6, 0.06], [x, Y + 0.8, z + d / 2 + 0.03]);
    for (const fx of [-w / 2 + 0.8, w / 2 - 0.8]) {
      const at: V3 = [x + fx, Y + hh * 0.62, z + d / 2 + 0.03];
      b.box([0.7, 0.7, 0.06], at, K.wasser);
      b.teil("fenster", [0.7, 0.7, 0.06], at);
      if (D >= 1) b.box([0.9, 0.12, 0.16], [at[0], at[1] - 0.41, at[2] + 0.05], K.holz);
    }
    if (D >= 1) {
      b.box([0.5, 1.0, 0.5], [x + w / 2 - 0.7, Y + hh + 1.1, z - d / 4], K.seite[1]);
      b.box([0.6, 0.12, 0.6], [x + w / 2 - 0.7, Y + hh + 1.66, z - d / 4], K.seite[2]);
      b.box([0.6, 0.6, 0.6], [x + w / 2 + 0.45, Y + 0.3, z + d / 2 + 0.2], K.holz);
      b.box([0.45, 0.45, 0.45], [x + w / 2 + 0.45, Y + 0.83, z + d / 2 + 0.2], K.holz);
    }
  };
  haus(-8, 7.5, 4.2, 3.4, 2.8);
  haus(-8.5, -1.2, 3.2, 3, 2.2);
  // Zaun am Teich-Rand und Steg
  bel.nimm(5.4, -1.4, 8.4, 1);
  for (let k = 0; k < 7; k++) b.box([0.16, 0.7, 0.16], [1.5 + k * 1.3, Y + 0.35, -1.4], K.holz);
  b.box([8.2, 0.12, 0.08], [5.4, Y + 0.55, -1.4], K.holz);
  b.box([1.2, 0.12, 3], [5.5, 0.26, -3], K.holz);
  if (D >= 1) {
    // Laternen am Weg (leuchtender Würfel oben)
    for (const lx of [-9.5, -0.5, 8.5]) {
      bel.nimm(lx, 3.5);
      b.box([0.14, 2.2, 0.14], [lx, Y + 1.1, 3.5], K.seite[2]);
      b.box([0.5, 0.08, 0.14], [lx - 0.18, Y + 2.15, 3.5], K.seite[2]);
    }
    // Feld mit Reihen (Erde + Sprossen) und Zaun
    bel.nimm(7, 7.5, 6, 5);
    for (let r = 0; r < 4; r++) {
      b.box([5, 0.12, 0.6], [7, Y + 0.06, 5.8 + r * 1.15], K.erde);
      for (let s = 0; s < 8; s++) b.box([0.2, rng.range(0.2, 0.45), 0.2], [4.85 + s * 0.62, Y + 0.2, 5.8 + r * 1.15], rng.pick(K.gras));
    }
    for (const [fx, fz, w, d] of [[7, 5, 5.8, 0.08], [7, 10, 5.8, 0.08], [4.1, 7.5, 0.08, 5], [9.9, 7.5, 0.08, 5]] as const)
      b.box([w, 0.1, d], [fx, Y + 0.5, fz], K.holz);
    for (const [fx, fz] of [[4.1, 5], [9.9, 5], [4.1, 10], [9.9, 10]]) b.box([0.15, 0.7, 0.15], [fx, Y + 0.35, fz], K.holz);
  }
  if (D >= 2) {
    // Brunnen am Platz
    bel.nimm(-9.5, 4.9, 2, 2);
    b.box([1.6, 0.7, 1.6], [-9.5, Y + 0.35, 4.9], K.fels);
    b.box([1.1, 0.06, 1.1], [-9.5, Y + 0.71, 4.9], K.wasser);
    for (const dx of [-0.65, 0.65]) b.box([0.14, 1.4, 0.14], [-9.5 + dx, Y + 1.4, 4.9], K.holz);
    b.box([1.6, 0.35, 1.0], [-9.5, Y + 2.2, 4.9], K.dach);
    // Karren
    bel.nimm(-1.5, 9, 2, 2);
    b.box([1.6, 0.5, 1.0], [-1.5, Y + 0.65, 9], K.holz);
    for (const dz of [-0.55, 0.55]) b.box([0.6, 0.6, 0.12], [-1.8, Y + 0.3, 9 + dz], K.seite[2]);
    b.box([1.0, 0.08, 0.08], [-0.2, Y + 0.6, 9], K.holz);
    b.box([0.5, 0.35, 0.5], [-1.6, Y + 1.07, 8.85], K.gras[0]);
    // Bank und Wegweiser
    bel.nimm(1, 3.6, 2, 1);
    b.box([1.6, 0.1, 0.45], [1, Y + 0.45, 3.65], K.holz);
    b.box([1.6, 0.4, 0.08], [1, Y + 0.7, 3.95], K.holz);
    for (const dx of [-0.65, 0.65]) b.box([0.1, 0.45, 0.4], [1 + dx, Y + 0.22, 3.65], K.seite[2]);
    bel.nimm(-1.5, 0.3);
    b.box([0.12, 1.6, 0.12], [-1.5, Y + 0.8, 0.3], K.holz);
    b.box([0.9, 0.25, 0.06], [-1.25, Y + 1.4, 0.3], K.wand);
    // Trittsteine und Seerosen im Teich
    for (const [sx, sz] of [[3.6, -4.2], [4.4, -5.6], [7.4, -4.4]]) b.box([0.6, 0.12, 0.6], [sx, 0.12, sz], K.fels);
    for (const [sx, sz] of [[6.6, -6.2], [7.6, -5.4], [3.5, -6.0]]) b.box([0.4, 0.04, 0.4], [sx, 0.08, sz], K.gras[2]);
  }
  // Bäume (Quader-Kronen); ab Detail 2 auch hohe, gestufte Nadelbäume
  for (let k = 0, n = 0; k < 600 && n < 16 + 6 * D; k++) {
    const x = Math.round(rng.range(-h + 1, h - 1)) + 0.5, z = Math.round(rng.range(-h + 1, h - 1)) + 0.5;
    if (Math.abs(x) < 4 && Math.abs(z) < 4) continue;
    if (Math.abs(x) > h - 1 || Math.abs(z) > h - 1 || !bel.versuch(x, z, 2, 2)) continue;
    const s = rng.range(0.9, 1.25);
    if (D >= 2 && rng.next() < 0.35) {
      b.box([0.36, 0.8, 0.36], [x, Y + 0.4, z], K.stamm);
      [[1.7, 0.7], [1.3, 0.7], [0.9, 0.6], [0.45, 0.5]].reduce((y, [w, hh]) => {
        b.box([w * s, hh * s, w * s], [x, y + (hh * s) / 2, z], rng.pick(K.laub)); return y + hh * s;
      }, Y + 0.8);
    } else {
      b.box([0.42 * s, 1.3 * s, 0.42 * s], [x, Y + 0.65 * s, z], K.stamm);
      b.box([1.7 * s, 1.3 * s, 1.7 * s], [x, Y + 1.9 * s, z], rng.pick(K.laub));
      b.box([1.1 * s, 0.9 * s, 1.1 * s], [x, Y + 2.9 * s, z], rng.pick(K.laub));
      if (D >= 1) b.box([0.5 * s, 0.5 * s, 0.5 * s], [x + 0.55 * s, Y + 1.5 * s, z + 0.6 * s], rng.pick(K.laub));
    }
    n++;
  }
  // Felsen
  for (let k = 0; k < 9 + 4 * D; k++) {
    const x = rng.range(-h + 1.5, h - 1.5), z = rng.range(-h + 1.5, h - 1.5), s = rng.range(0.5, 1.1);
    if (!bel.versuch(x, z, 1.4, 1.4)) continue;
    b.box([s * 1.2, s * 0.7, s], [x, Y + s * 0.35, z], K.fels);
    b.box([s * 0.6, s * 0.5, s * 0.6], [x + s * 0.3, Y + s * 0.95, z - s * 0.1], K.fels);
  }
  // Gras-Büschel und Blumen (kleine Würfel)
  for (let k = 0; k < 90 * D; k++) {
    const x = Math.floor(rng.range(-h, h)) + 0.5, z = Math.floor(rng.range(-h, h)) + 0.5;
    if (!bel.versuch(x, z)) continue;
    const blume = rng.next() < 0.22;
    for (let q = 0; q < 3; q++) {
      const s = rng.range(0.12, 0.24), ox = rng.range(-0.3, 0.3), oz = rng.range(-0.3, 0.3);
      b.box([s, s * (blume ? 1 : 1.6), s], [x + ox, Y + 0.04 + s * 0.6, z + oz], blume && q === 0 ? rng.pick(K.blumen) : rng.pick(K.gras));
    }
  }
  return b.build("karte");
};

/** Leuchtende Laternen-Würfel (unbeleuchtet hell, damit sie im kalten Licht glimmen). */
const baueLampen = (lk: Look) => {
  const g = new THREE.Group(); g.name = "lampen";
  if (lk.detail < 1) return g;
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(lk.karte.lampe).multiplyScalar(1.4) });
  for (const lx of [-9.5, -0.5, 8.5]) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), mat);
    m.position.set(lx - 0.36, 0.2 + 1.95, 3.5); g.add(m);
  }
  return g;
};

const baueInsel = (kit: Kit, lk: Look, seed: number) => {
  const b = kit.batch(), rng = new Rng(seed), K = lk.karte, g = 6;
  baueSeiten(b, { ...lk, detail: 0 }, rng, g);
  for (let i = 0; i < g; i++) for (let j = 0; j < g; j++) b.box([1, 0.2, 1], [-g / 2 + i + 0.5, 0.1, -g / 2 + j + 0.5], rng.pick(K.gras));
  b.box([0.4, 1.2, 0.4], [0, 0.8, 0], K.stamm); b.box([1.6, 1.4, 1.6], [0, 2.1, 0], K.laub[0]);
  return b.build("insel");
};

// ---------- Figuren ----------
export type Figur = { root: THREE.Group; beinL: THREE.Object3D; beinR: THREE.Object3D; armL: THREE.Object3D; armR: THREE.Object3D };

export const baueFigur = (kit: Kit, koerper: string, lk: Look): Figur => {
  const F = lk.figur, root = new THREE.Group();
  root.name = "figur"; root.userData.figure = true;
  const teil = (size: V3, at: V3, color: string, parent: THREE.Object3D = root) => {
    const m = kit.mesh(new THREE.BoxGeometry(...size), color);
    m.position.set(...at); parent.add(m); return m;
  };
  const gelenk = (at: V3) => { const g = new THREE.Group(); g.position.set(...at); root.add(g); return g; };
  const beinL = gelenk([-0.14, 0.82, 0]), beinR = gelenk([0.14, 0.82, 0]);
  teil([0.22, 0.82, 0.26], [0, -0.41, 0], F.beine, beinL); teil([0.22, 0.82, 0.26], [0, -0.41, 0], F.beine, beinR);
  teil([0.6, 0.72, 0.36], [0, 1.18, 0], koerper);
  const armL = gelenk([-0.39, 1.5, 0]), armR = gelenk([0.39, 1.5, 0]);
  teil([0.17, 0.66, 0.2], [0, -0.33, 0], koerper, armL); teil([0.17, 0.66, 0.2], [0, -0.33, 0], koerper, armR);
  teil([0.46, 0.46, 0.46], [0, 1.8, 0], F.kopf);
  teil([0.5, 0.14, 0.5], [0, 2.07, 0], F.haar);
  return { root, beinL, beinR, armL, armR };
};

/** Wege der Figuren: Punkte auf der Karte (x, z) entlang der Wege; laufen hin und zurück. */
const WEGE: [number, number][][] = [
  [[-3, 9], [-3, 2], [6, 2], [10, 2]],
  [[-10, 2], [-3, 2], [-3, -7]],
  [[4, 2], [-1, 2], [-3, 2], [-3, 8]],
  [[10, 2], [2, 2]],
];

/** Lage auf einem Weg zur Zeit t (s) bei v m/s, hin und zurück; dx/dz = Laufrichtung. Auch für Kameras, die einer Figur folgen. */
export const wegPunkt = (weg: [number, number][], t: number, v = 1.3) => {
  if (weg.length === 1) return { x: weg[0][0], z: weg[0][1], dx: 1, dz: 1 };
  const seg = weg.slice(1).map((p, i) => Math.hypot(p[0] - weg[i][0], p[1] - weg[i][1]));
  const L = seg.reduce((a, b) => a + b, 0);
  let s = (t * v) % (2 * L); const zurueck = s > L; if (zurueck) s = 2 * L - s;
  let i = 0; while (i < seg.length - 1 && s > seg[i]) { s -= seg[i]; i++; }
  const a = weg[i], b = weg[i + 1], u = Math.min(1, s / seg[i]);
  return { x: a[0] + (b[0] - a[0]) * u, z: a[1] + (b[1] - a[1]) * u, dx: (b[0] - a[0]) * (zurueck ? -1 : 1), dz: (b[1] - a[1]) * (zurueck ? -1 : 1) };
};
/** Zeit-Versatz der Figur i (damit mehrere Figuren nicht im Gleichschritt laufen). */
export const FIGUR_VERSATZ = 3.7;

export const laufe = (f: Figur, weg: [number, number][], t: number, v = 1.3, y = 0.2) => {
  if (weg.length === 1) {   // steht: schaut zur Kamera (+x, +z), Arme ruhig
    f.root.position.set(weg[0][0], y, weg[0][1]); f.root.rotation.y = Math.PI / 4;
    f.beinL.rotation.x = f.beinR.rotation.x = f.armL.rotation.x = f.armR.rotation.x = 0; return;
  }
  const p = wegPunkt(weg, t, v);
  f.root.position.set(p.x, y, p.z);
  f.root.rotation.y = Math.atan2(p.dx, p.dz);
  const sw = Math.sin(t * v * 4.2) * 0.6;
  f.beinL.rotation.x = sw; f.beinR.rotation.x = -sw; f.armL.rotation.x = -sw * 0.8; f.armR.rotation.x = sw * 0.8;
};

// ---------- Welt ----------
export const quadWelt = (lk: Look): WorldBuilder => ({ scene, shot, style }) => {
  const kit = new Kit(style.lights[shot.light], 3);
  const voidMesh = makeVoid(lk);
  scene.add(voidMesh);
  const part = makePartikel(lk, [0, 0, 0]);
  scene.add(part.mesh);
  scene.add(baueKarte(kit, lk, 7), baueLampen(lk));
  const inseln: { g: THREE.Group; y: number; ph: number }[] = [];
  if (lk.inseln) {
    const lagen: V3[] = [[-24, -5, 14], [19, 3, -22], [26, -9, 20]];
    lagen.forEach((p, i) => {
      const g = baueInsel(kit, lk, 20 + i);
      g.position.set(...p); scene.add(g); inseln.push({ g, y: p[1], ph: i * 2.1 });
    });
  }
  const farben = lk.figur.koerper;
  const figuren = Array.from({ length: lk.figuren }, (_, i) => {
    const f = baueFigur(kit, farben[i % farben.length], lk);
    scene.add(f.root); return f;
  });
  if (lk.stufe > 0) stufen(scene, style.lights[shot.light], lk.stufe);
  return ({ time, camera }) => {
    schaerfeTiefe(camera);
    const u = (voidMesh.material as THREE.ShaderMaterial).uniforms;
    u.uTanY.value = Math.tan((camera.fov * Math.PI) / 360); u.uAspect.value = camera.aspect;
    part.tick(time);
    inseln.forEach((s) => { s.g.position.y = s.y + Math.sin(time * 0.5 + s.ph) * 0.4; });
    figuren.forEach((f, i) => laufe(f, WEGE[i % WEGE.length], time + i * FIGUR_VERSATZ));
  };
};

// ---------- Orte (Stufe 2 und später: jede Karte ein Ort) ----------
/** Was ein Ort beim Bauen bekommt. Kacheln und Objekte kommen in den Batch `b`; `bel` verhindert Ineinanderstecken. */
export type OrtKontext = {
  kit: Kit; lk: Look; b: Batch; bel: Belegung; rng: Rng; h: number; Y: number;
  /** jede 1-m-Zelle: [Farbe, Höhe] oder null (keine Kachel); `belegt` = Zelle für Objekte sperren */
  kacheln: (fn: (x: number, z: number) => [string, number, boolean?] | null) => void;
  /** Zellen entlang der Figuren-Wege sperren (vor allen zufälligen Objekten aufrufen) */
  wegeFrei: () => void;
};
export type Extra = { obj: THREE.Object3D; tick?: (t: number) => void };
export type Ort = {
  name: string;
  groesse: number;              // Kantenlänge der Karte in m
  oben: number;                 // höchster Punkt (m) – für die mittige Kamera
  wege: [number, number][][];   // ein Weg je Figur (ein Punkt = steht)
  farben?: string[];            // Körperfarben der Figuren (sonst Tokens)
  ohneSeiten?: boolean;         // Kartenkörper baut der Ort selbst (z. B. DORF)
  seed?: number;
  baue: (c: OrtKontext) => Extra[] | void;
};

/** Ein Ort als Gruppe (ohne Void/Partikel): Kartenkörper, Kacheln, Objekte, Figuren. `tick(t)` bewegt Extras und Figuren
 *  (Shot-Zeit). Mehrere Gruppen nebeneinander = Platten (platten.ts). */
export const baueOrt = (kit: Kit, lk: Look, ort: Ort) => {
  const group = new THREE.Group(); group.name = `platte-${ort.name}`;
  const b = kit.batch(), rng = new Rng(ort.seed ?? 7), h = ort.groesse / 2, bel = new Belegung(h), Y = 0.2;
  if (!ort.ohneSeiten) baueSeiten(b, lk, rng, ort.groesse);
  const ctx: OrtKontext = {
    kit, lk, b, bel, rng, h, Y,
    kacheln: (fn) => {
      for (let i = 0; i < ort.groesse; i++) for (let j = 0; j < ort.groesse; j++) {
        const x = -h + i + 0.5, z = -h + j + 0.5, k = fn(x, z);
        if (!k) continue;
        b.box([1, k[1], 1], [x, k[1] / 2, z], k[0]);
        if (k[2]) bel.nimm(x, z);
      }
    },
    wegeFrei: () => ort.wege.forEach((w) => {
      if (w.length === 1) { bel.nimm(w[0][0], w[0][1], 1.6, 1.6); return; }
      for (let i = 1; i < w.length; i++) {
        const [a, c] = [w[i - 1], w[i]], n = Math.ceil(Math.hypot(c[0] - a[0], c[1] - a[1]) * 2);
        for (let k = 0; k <= n; k++) bel.nimm(a[0] + (c[0] - a[0]) * k / n, a[1] + (c[1] - a[1]) * k / n, 1.2, 1.2);
      }
    }),
  };
  const extras = ort.baue(ctx) ?? [];
  group.add(b.build(ort.name));
  extras.forEach((e) => group.add(e.obj));
  const farben = ort.farben ?? lk.figur.koerper;
  const figuren = ort.wege.map((_, i) => { const f = baueFigur(kit, farben[i % farben.length], lk); group.add(f.root); return f; });
  const tick = (time: number) => {
    extras.forEach((e) => e.tick?.(time));
    figuren.forEach((f, i) => laufe(f, ort.wege[i], time + i * FIGUR_VERSATZ, 1.3, figurY(ort, i)));
  };
  return { group, tick, figuren };
};

/** Void + Partikel einer Szene (für ortWelt und platten.ts); `tick` stellt Void, Partikel und Schnittebene ein. */
export const baueRaum = (lk: Look, groesse: number, oben: number) => {
  const voidMesh = makeVoid(lk), part = makePartikel(lk, [0, 0, 0], groesse, Math.max(8, oben + 3));
  const tick = (time: number, camera: THREE.PerspectiveCamera) => {
    schaerfeTiefe(camera);
    const u = (voidMesh.material as THREE.ShaderMaterial).uniforms;
    u.uTanY.value = Math.tan((camera.fov * Math.PI) / 360); u.uAspect.value = camera.aspect;
    part.tick(time);
  };
  return { objekte: [voidMesh, part.mesh], tick };
};

export const ortWelt = (lk: Look, ort: Ort): WorldBuilder => ({ scene, shot, style }) => {
  const kit = new Kit(style.lights[shot.light], 3);
  const raum = baueRaum(lk, ort.groesse, ort.oben);
  scene.add(...raum.objekte);
  const o = baueOrt(kit, lk, ort);
  scene.add(o.group);
  if (lk.stufe > 0) stufen(scene, style.lights[shot.light], lk.stufe);
  return ({ time, camera }) => { raum.tick(time, camera); o.tick(time); };
};

/** Die Karte von Bild 1 als Ort (für Platten-Szenen); Bild 1 selbst baut weiter quadWelt (unverändert). */
export const DORF: Ort = {
  name: "dorf", groesse: KARTE, oben: 2.6, wege: [WEGE[0]], ohneSeiten: true,
  baue: ({ kit, lk }) => [{ obj: baueKarte(kit, lk, 7) }, { obj: baueLampen(lk) }],
};

/** Standhöhe einer Figur (Orte mit Gelände können sie über `userData` setzen – Standard: Kachel-Oberkante). */
const figurY = (_ort: Ort, _i: number) => 0.2;

/** Leuchtender Würfel (unbeleuchtet hell) – Lampen, Fenster am Abend. */
export const leuchte = (farbe: string, size: V3, at: V3, gain = 1.4) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ color: new THREE.Color(farbe).multiplyScalar(gain) }));
  m.position.set(...at); m.name = "leuchte"; return m;
};
