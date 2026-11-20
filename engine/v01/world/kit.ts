// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Werkbank des Welt-Baukastens:
//  - Kit: Materialien (Zwei-Ton) einmal je Farbe/Textur, Zufall mit festem Startwert.
//  - Batch: sammelt viele kleine Teile (Fenster, Läden, Gesimse …) und fügt sie je Material zu EINEM Netz zusammen –
//    das spart Zeichenaufrufe; Texturen werden dabei in Metern auf die Flächen gelegt (Kasten-Projektion).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { Rng } from "../core/random";
import { twoTone } from "../light/twotone";
import type { LightPreset } from "../light/presets";
import type { Painted } from "./paint";
import type { V3 } from "../camera/rig";


export class Kit {
  readonly rng: Rng;
  private mats = new Map<string, THREE.Material>();
  constructor(readonly preset: LightPreset, seed = 1) { this.rng = new Rng(seed); }

  /** Zwei-Ton-Material. Mit Textur ist die Farbe ein Multiplikator (meist "#ffffff"). */
  mat(color: string, paint?: Painted) {
    const key = `${color}|${paint?.tex.uuid ?? "-"}`;
    let m = this.mats.get(key);
    if (!m) { m = twoTone(this.preset, color, paint?.tex); this.mats.set(key, m); }
    return m;
  }

  /** Einzelnes Netz mit Schatten, Textur in Metern. */
  mesh(geo: THREE.BufferGeometry, color: string, paint?: Painted) {
    if (paint) boxUV(geo, paint.meters);
    const m = new THREE.Mesh(geo, this.mat(color, paint));
    m.castShadow = m.receiveShadow = true;
    return m;
  }

  batch() { return new Batch(this); }
}

/** Kasten-Projektion: jede Fläche bekommt die Koordinaten der Ebene, zu der sie am meisten zeigt (in Metern / Kachel). */
export const boxUV = (geo: THREE.BufferGeometry, meters: number, offset: V3 = [0, 0, 0]) => {
  const pos = geo.getAttribute("position"), nor = geo.getAttribute("normal");
  const uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + offset[0], y = pos.getY(i) + offset[1], z = pos.getZ(i) + offset[2];
    const ax = Math.abs(nor.getX(i)), ay = Math.abs(nor.getY(i)), az = Math.abs(nor.getZ(i));
    let u, v;
    if (ay >= ax && ay >= az) { u = x; v = z; }
    else if (ax >= az) { u = z * Math.sign(nor.getX(i) || 1); v = y; }
    else { u = x * Math.sign(nor.getZ(i) || 1); v = y; }
    uv[i * 2] = u / meters; uv[i * 2 + 1] = v / meters;
  }
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  return geo;
};

const tmp = new THREE.Object3D();

/** Sammelt Teile und fügt sie je Material zusammen. */
export class Batch {
  private parts = new Map<string, { color: string; paint?: Painted; geos: THREE.BufferGeometry[] }>();
  /** Benannte Teile (z. B. Fenster, Tür) als Kasten in Gruppen-Koordinaten – für die Raum-Prüfung (qa/raum.ts). */
  private teile: { art: string; min: V3; max: V3 }[] = [];
  constructor(private kit: Kit) {}

  /** Teil hinzufügen: Geometrie (wird kopiert), Lage, Farbe, Textur, Drehung [x, y, z] in Grad, Grösse. */
  add(geo: THREE.BufferGeometry, at: V3, color: string, paint?: Painted, rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) {
    tmp.position.set(...at);
    tmp.rotation.set(THREE.MathUtils.degToRad(rot[0]), THREE.MathUtils.degToRad(rot[1]), THREE.MathUtils.degToRad(rot[2]), "YXZ");
    tmp.scale.set(...scale);
    tmp.updateMatrix();
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(tmp.matrix);
    for (const name of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(name)) g.deleteAttribute(name);
    if (paint) boxUV(g, paint.meters);
    else if (!g.getAttribute("uv")) g.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(g.getAttribute("position").count * 2), 2));
    g.clearGroups();
    const key = `${color}|${paint?.tex.uuid ?? "-"}`;
    let p = this.parts.get(key);
    if (!p) { p = { color, paint, geos: [] }; this.parts.set(key, p); }
    p.geos.push(g);
    return this;
  }

  /** Teil melden (nur für die Prüfung, zeichnet nichts): Art, Grösse, Mitte. */
  teil(art: string, size: V3, at: V3) {
    this.teile.push({ art, min: [at[0] - size[0] / 2, at[1] - size[1] / 2, at[2] - size[2] / 2], max: [at[0] + size[0] / 2, at[1] + size[1] / 2, at[2] + size[2] / 2] });
    return this;
  }

  /** Kasten (Breite x, Höhe y, Tiefe z) mit Mittelpunkt `at`. */
  box(size: V3, at: V3, color: string, paint?: Painted, rot?: V3) {
    return this.add(new THREE.BoxGeometry(...size), at, color, paint, rot);
  }

  /** Alles zu einer Gruppe zusammenfügen (ein Netz je Material). */
  build(name = "teil") {
    const group = new THREE.Group();
    group.name = name;
    if (this.teile.length) group.userData.teile = this.teile;
    for (const { color, paint, geos } of this.parts.values()) {
      const merged = mergeGeometries(geos, false);
      if (!merged) continue;
      merged.computeBoundingSphere();
      const m = new THREE.Mesh(merged, this.kit.mat(color, paint));
      m.castShadow = m.receiveShadow = true;
      group.add(m);
    }
    return group;
  }
}

/** Rundbogen-Form (Tür, Tor, Fenster): Rechteck mit Halbkreis oben, Ursprung unten Mitte. */
export const archShape = (w: number, h: number) => {
  const s = new THREE.Shape(), r = w / 2;
  s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h - r);
  s.absarc(0, h - r, r, 0, Math.PI, false);
  s.lineTo(-r, 0);
  return s;
};

/** Bogen-Rahmen (Ring um eine Rundbogen-Öffnung) als Form. */
export const archFrame = (w: number, h: number, t: number) => {
  const s = new THREE.Shape(), r = w / 2, R = r + t, cy = h - r;
  s.moveTo(-R, 0); s.lineTo(-r, 0); s.lineTo(-r, cy);
  s.absarc(0, cy, r, Math.PI, 0, true);       // innen über den Scheitel
  s.lineTo(r, 0); s.lineTo(R, 0); s.lineTo(R, cy);
  s.absarc(0, cy, R, 0, Math.PI, false);      // aussen zurück
  s.closePath();
  return s;
};

export const extrude = (shape: THREE.Shape, depth: number) =>
  new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 });
