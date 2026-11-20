// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Natur im Code: Bäume (Stamm + Krone aus weichen Ballen), Büsche, Blumen, Wolken. Form aus festem Startwert.
import * as THREE from "three";
import { Rng } from "../core/random";
import { NOINK } from "../post/ink";
import { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { shade } from "./paint";
import type { WorldPalette } from "./palette";

const ball = new THREE.IcosahedronGeometry(1, 3);

/** Laubbaum, Höhe in m. */
export const tree = (kit: Kit, pal: WorldPalette, at: V3, height = 6, seed = 1) => {
  const rng = new Rng(seed);
  const b = kit.batch();
  const trunk = height * 0.42;
  b.add(new THREE.CylinderGeometry(0.16 * height / 6, 0.24 * height / 6, trunk, 10), [0, trunk / 2, 0], pal.bark);
  const leaf = rng.pick(pal.leaves), r0 = height * 0.26;
  const n = rng.int(5, 7);
  b.add(ball, [0, trunk + r0 * 0.9, 0], leaf, undefined, [0, 0, 0], [r0 * 1.1, r0, r0 * 1.1]);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng.range(-0.3, 0.3), d = r0 * rng.range(0.55, 0.8), r = r0 * rng.range(0.55, 0.75);
    b.add(ball, [Math.cos(a) * d, trunk + r0 * rng.range(0.5, 1.3), Math.sin(a) * d], shade(leaf, rng.range(0.9, 1.08)), undefined, [0, 0, 0], [r, r * 0.92, r]);
  }
  const g = b.build("baum");
  g.position.set(...at);
  g.userData.occluder = true;
  return g;
};

/** Busch aus drei bis fünf Ballen. */
export const bush = (kit: Kit, pal: WorldPalette, at: V3, size = 1, seed = 1) => {
  const rng = new Rng(seed + 101);
  const b = kit.batch();
  const leaf = shade(rng.pick(pal.leaves), 0.92);
  for (let i = 0, n = rng.int(3, 5); i < n; i++) {
    const r = size * rng.range(0.45, 0.65);
    b.add(ball, [rng.range(-0.5, 0.5) * size, r * 0.75, rng.range(-0.35, 0.35) * size], shade(leaf, rng.range(0.92, 1.08)), undefined, [0, 0, 0], [r, r * 0.85, r]);
  }
  const g = b.build("busch");
  g.position.set(...at);
  return g;
};

/** Blumenbeet: viele kleine Blüten auf einem Grasstreifen (Fläche w × d). */
export const flowers = (kit: Kit, pal: WorldPalette, at: V3, w: number, d: number, seed = 1) => {
  const rng = new Rng(seed + 202);
  const b = kit.batch();
  const bloom = new THREE.IcosahedronGeometry(0.09, 1);
  const stem = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4);
  for (let i = 0, n = Math.round(w * d * 9); i < n; i++) {
    const x = rng.range(-w / 2, w / 2), z = rng.range(-d / 2, d / 2), h = rng.range(0.22, 0.36);
    b.add(stem, [x, h / 2, z], shade(pal.leaves[0], 0.8), undefined, [0, 0, 0], [1, h / 0.3, 1]);
    b.add(bloom, [x, h, z], rng.pick(pal.flowers));
  }
  const g = b.build("blumen");
  g.position.set(...at);
  return g;
};

export type CloudColors = { lit: string; mid: string; shade: string };

/** Wolke: weiche Ballen, oben hell, unten schattig; ohne Tusche und ohne Nebel (liegt im Himmel). */
export const cloud = (colors: CloudColors, at: V3, scale = 1, seed = 1) => {
  const rng = new Rng(seed + 303);
  const mat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: { uLit: { value: new THREE.Color(colors.lit) }, uMid: { value: new THREE.Color(colors.mid) }, uShade: { value: new THREE.Color(colors.shade) } },
    vertexShader: `varying float vUp; void main(){ vUp = normalize(mat3(modelMatrix) * normal).y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 uLit; uniform vec3 uMid; uniform vec3 uShade; varying float vUp;
      void main(){ vec3 c = vUp > 0.15 ? mix(uMid, uLit, smoothstep(0.15, 0.45, vUp)) : mix(uShade, uMid, smoothstep(-0.5, 0.15, vUp)); gl_FragColor = vec4(c, 1.0); }`,
  });
  const g = new THREE.Group(); g.name = "wolke";
  for (let i = 0, n = rng.int(4, 6); i < n; i++) {
    const r = scale * rng.range(5, 9);
    const m = new THREE.Mesh(ball, mat);
    m.scale.set(r * 1.25, r, r);
    m.position.set((i - n / 2) * scale * 7 + rng.range(-2, 2) * scale, rng.range(0, 4) * scale, rng.range(-3, 3) * scale);
    m.layers.set(NOINK);
    g.add(m);
  }
  g.position.set(...at);
  return g;
};
