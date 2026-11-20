// Herkunft: eigen (V-Video), geschrieben 2026-11-18, ohne Vorlage.
// Fliessendes Wasser der Römer-Wasser-Welt: eigener Shader, in dem helle Glanzstriche in Fliessrichtung wandern (Kanal, Rinne,
// Strahl, Überlauf, Wasserfall). Jede Fläche trägt ein Attribut `fluss` (quer 0…1, längs in Metern); die Striche laufen
// längs, die Ränder sind dunkler. Dazu Spritzer (Tropfen im Bogen + Ring), Tropfen (fällt, Ring auf dem Wasser) und Dampf.
// Alles nur aus der Shot-Zeit (bytegleiche Einzelbilder); nichts wird unsichtbar geschaltet, nur klein.
import * as THREE from "three";
import { Rng } from "../core/random";
import type { V3 } from "../camera/rig";
import type { Lebendig } from "./leben";

export type FlussFarben = { hell: string; tief: string; glanz: string };

const vert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
attribute vec2 fluss;
varying vec2 vF;
void main() {
  vF = fluss;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const frag = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uHell; uniform vec3 uTief; uniform vec3 uGlanz; uniform float uTime; uniform float uTempo; uniform float uDichte; uniform float uAlpha;
varying vec2 vF;
float h1(float n) { return fract(sin(n * 91.345) * 47453.21); }
void main() {
  float q = vF.x, l = vF.y;
  vec3 c = mix(uTief, uHell, 0.55 + 0.45 * sin(q * 3.14159));
  // Glanzstriche: 7 Spuren quer, je Spur kurze Striche mit eigenem Versatz und Tempo
  float spur = floor(q * 7.0), inSpur = fract(q * 7.0);
  float v = l * uDichte - uTime * uTempo * (0.8 + 0.4 * h1(spur + 3.0)) + h1(spur) * 10.0;
  float zelle = floor(v), u = fract(v);
  float an = step(0.45, h1(zelle * 7.0 + spur * 13.0));
  float strich = an * smoothstep(0.0, 0.08, u) * (1.0 - smoothstep(0.32, 0.45, u)) * smoothstep(0.1, 0.35, inSpur) * (1.0 - smoothstep(0.65, 0.9, inSpur));
  // zweite, feinere Welle
  float w = sin(l * 2.3 * uDichte - uTime * uTempo * 2.0 + q * 9.0) * 0.5 + 0.5;
  c = mix(c, uHell * 1.12, smoothstep(0.82, 1.0, w) * 0.35);
  c = mix(c, uGlanz, strich * 0.9);
  gl_FragColor = vec4(c, uAlpha);
  #include <fog_fragment>
}`;

const material = (f: FlussFarben, tempo: number, dichte: number, alpha: number) => new THREE.ShaderMaterial({
  vertexShader: vert, fragmentShader: frag, fog: true, side: THREE.DoubleSide, transparent: alpha < 1, depthWrite: alpha >= 1,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uHell: { value: new THREE.Color(f.hell) }, uTief: { value: new THREE.Color(f.tief) }, uGlanz: { value: new THREE.Color(f.glanz) },
    uTime: { value: 0 }, uTempo: { value: tempo }, uDichte: { value: dichte }, uAlpha: { value: alpha },
  }]),
});

/** Gemeinsame Uhr: alle fliessenden Flächen einer Welt bekommen dieselbe Zeit. */
export class FlussUhr {
  private mats: THREE.ShaderMaterial[] = [];
  mat(f: FlussFarben, tempo = 1.6, dichte = 0.9, alpha = 1) { const m = material(f, tempo, dichte, alpha); this.mats.push(m); return m; }
  tick(t: number) { for (const m of this.mats) m.uniforms.uTime.value = t; }
}

const setFluss = (geo: THREE.BufferGeometry, f: (i: number) => [number, number]) => {
  const n = geo.getAttribute("position").count, a = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { const [q, l] = f(i); a[i * 2] = q; a[i * 2 + 1] = l; }
  geo.setAttribute("fluss", new THREE.BufferAttribute(a, 2));
  return geo;
};
const fertig = (geo: THREE.BufferGeometry, mat: THREE.Material, name: string) => {
  const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = false; m.receiveShadow = false; m.userData.occluder = false;
  return m;
};

/** Wasser in einer Rinne: waagrechtes Band von a nach b (Mitte), Breite w, fliesst von a nach b. */
export const rinne = (uhr: FlussUhr, f: FlussFarben, a: V3, b: V3, w: number, o: { tempo?: number; dichte?: number } = {}) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), L = d.length();
  const geo = new THREE.PlaneGeometry(w, L, 2, Math.max(1, Math.round(L / 2))).rotateX(-Math.PI / 2);   // längs = −z
  const pos = geo.getAttribute("position");
  setFluss(geo, (i) => [pos.getX(i) / w + 0.5, (-pos.getZ(i) + L / 2)]);
  const m = fertig(geo, uhr.mat(f, o.tempo, o.dichte), "fluss-rinne");
  m.position.copy(A.clone().add(B).multiplyScalar(0.5));
  m.rotation.y = Math.atan2(-d.x, -d.z);
  m.rotation.x = 0;
  const neig = Math.atan2(d.y, Math.hypot(d.x, d.z));
  m.rotateX(neig);
  return m;
};

/** Wasserstrahl als Schlauch entlang eines Bogens (von a, Richtung/Weite bis b, Durchhang `bogen` nach oben). */
export const strahl = (uhr: FlussUhr, f: FlussFarben, a: V3, b: V3, r: number, o: { bogen?: number; tempo?: number } = {}) => {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), mid = A.clone().lerp(B, 0.5); mid.y += o.bogen ?? 0.3;
  const kurve = new THREE.QuadraticBezierCurve3(A, mid, B), L = kurve.getLength();
  const geo = new THREE.TubeGeometry(kurve, 16, r, 8, false), uv = geo.getAttribute("uv");
  setFluss(geo, (i) => [Math.abs(uv.getY(i) - 0.5) * 2, uv.getX(i) * L * 3]);
  return fertig(geo, uhr.mat(f, o.tempo ?? 3, 1.6), "fluss-strahl");
};

/** Fallendes Wasser (Überlauf, Wasserfall): senkrechter Vorhang, oben Mitte `at`, Breite w, Höhe h, Blick nach `turn` (Grad). */
export const vorhang = (uhr: FlussUhr, f: FlussFarben, at: V3, w: number, h: number, turn = 0, o: { tempo?: number; neig?: number } = {}) => {
  const geo = new THREE.PlaneGeometry(w, h, 3, 4); geo.translate(0, -h / 2, 0);
  const pos = geo.getAttribute("position");
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i); pos.setZ(i, (o.neig ?? 0.25) * (-y / h) ** 2 * h); }   // fällt im Bogen nach vorn
  geo.computeVertexNormals();
  setFluss(geo, (i) => [pos.getX(i) / w + 0.5, -pos.getY(i)]);
  const m = fertig(geo, uhr.mat(f, o.tempo ?? 3.4, 1.4), "fluss-vorhang");
  m.position.set(...at); m.rotation.y = THREE.MathUtils.degToRad(turn);
  return m;
};

/** Wasserfläche in einem Becken (rechteckig, w × d), langsam treibende Glanzstriche entlang `turn`. */
export const becken = (uhr: FlussUhr, f: FlussFarben, at: V3, w: number, d: number, turn = 0, o: { tempo?: number; rund?: boolean; durch?: number } = {}) => {
  const geo = o.rund ? new THREE.CircleGeometry(w / 2, 40).rotateX(-Math.PI / 2) : new THREE.PlaneGeometry(w, d, 2, 2).rotateX(-Math.PI / 2);
  const pos = geo.getAttribute("position");
  setFluss(geo, (i) => [pos.getX(i) / w + 0.5, -pos.getZ(i) + d / 2]);
  const m = fertig(geo, uhr.mat(f, o.tempo ?? 0.35, 0.6, o.durch ?? 1), "fluss-becken");
  m.position.set(...at); m.rotation.y = THREE.MathUtils.degToRad(turn);
  return m;
};

// ---------------- Spritzer, Tropfen, Dampf ----------------
const glowMat = (farbe: string, opacity = 1) => {
  const m = new THREE.MeshBasicMaterial({ color: farbe, fog: true });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; m.depthWrite = false; }
  return m;
};
const kugel = new THREE.IcosahedronGeometry(1, 1);

/** Spritzer: Tropfen springen im Bogen aus dem Auftreffpunkt, dazu wachsende Ringe auf der Fläche. `kraft` ≈ Höhe in m. */
export const spritzer = (at: V3, o: { n?: number; kraft?: number; weite?: number; farbe?: string; ring?: string; tempo?: number; seed?: number; tropfen?: number } = {}): Lebendig => {
  const g = new THREE.Group(); g.name = "spritzer";
  const n = o.n ?? 10, k = o.kraft ?? 0.5, wt = o.weite ?? 0.6, tempo = o.tempo ?? 1.3, rng = new Rng(o.seed ?? 5), gr = o.tropfen ?? 0.045;
  const mat = glowMat(o.farbe ?? "#e8fbff");
  const tr = Array.from({ length: n }, () => {
    const m = new THREE.Mesh(kugel, mat); g.add(m);
    return { m, a: rng.range(0, Math.PI * 2), w: rng.range(0.5, 1.1), h: rng.range(0.6, 1.1), off: rng.next() };
  });
  const ringGeo = new THREE.RingGeometry(0.85, 1, 28).rotateX(-Math.PI / 2);
  const ringe = [0, 0.5].map((off) => { const m = new THREE.Mesh(ringGeo, glowMat(o.ring ?? "#ffffff", 0.7)); m.position.y = 0.01; g.add(m); return { m, off }; });
  g.position.set(...at);
  return { obj: g, tick: (t) => {
    for (const d of tr) {
      const u = (t * tempo + d.off) % 1, r = u * wt * d.w;
      d.m.position.set(Math.cos(d.a) * r, 4 * k * d.h * u * (1 - u), Math.sin(d.a) * r);
      d.m.scale.setScalar(Math.max(1e-4, gr * (1 - 0.6 * u)));
    }
    for (const r of ringe) {
      const u = (t * tempo * 0.6 + r.off) % 1;
      r.m.scale.setScalar(Math.max(1e-4, wt * (0.2 + u)));
      (r.m.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - u);
    }
  } };
};

/** Tropfen: fällt aus Höhe h (über `at`) und gibt einen Ring auf dem Boden/Wasser. */
export const tropfen = (at: V3, h: number, o: { tempo?: number; phase?: number; farbe?: string } = {}): Lebendig => {
  const g = new THREE.Group(); g.name = "tropfen";
  const tempo = o.tempo ?? 0.7, ph = o.phase ?? 0, mat = glowMat(o.farbe ?? "#bfefff");
  const d = new THREE.Mesh(kugel, mat); g.add(d);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24).rotateX(-Math.PI / 2), glowMat("#ffffff", 0.7)); ring.position.y = 0.01; g.add(ring);
  g.position.set(...at);
  return { obj: g, tick: (t) => {
    const u = (t * tempo + ph) % 1, fall = Math.min(1, u / 0.55);
    d.position.y = h * (1 - fall * fall);
    d.scale.set(0.035, fall < 1 ? 0.05 : 1e-4, 0.035);
    const ru = Math.max(0, (u - 0.55) / 0.45);
    ring.scale.setScalar(Math.max(1e-4, ru * 0.35));
    (ring.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - ru) * (ru > 0 ? 1 : 0);
  } };
};

/** Dampf: weiche weisse Bäusche steigen langsam auf, wachsen und vergehen (Bad, Küche, Ofen). Fläche w × d. */
export const dampf = (at: V3, o: { w?: number; d?: number; hoehe?: number; n?: number; tempo?: number; groesse?: number; seed?: number; farbe?: string; dichte?: number } = {}): Lebendig => {
  const g = new THREE.Group(); g.name = "dampf";
  const w = o.w ?? 2, dd = o.d ?? 2, H = o.hoehe ?? 2.5, n = o.n ?? 10, tempo = o.tempo ?? 0.12, gr = o.groesse ?? 0.5, rng = new Rng(o.seed ?? 9);
  const ps = Array.from({ length: n }, (_, i) => {
    const m = new THREE.Mesh(kugel, glowMat(o.farbe ?? "#ffffff", 0.5)); g.add(m);
    return { m, x: rng.range(-w / 2, w / 2), z: rng.range(-dd / 2, dd / 2), off: i / n, s: rng.range(0.7, 1.3), dx: rng.range(-0.4, 0.4) };
  });
  g.position.set(...at);
  return { obj: g, tick: (t) => {
    for (const p of ps) {
      const u = (t * tempo + p.off) % 1;
      p.m.position.set(p.x + p.dx * u, u * H, p.z);
      p.m.scale.setScalar(Math.max(1e-4, gr * p.s * (0.4 + 1.2 * u) * Math.min(1, u * 6)));
      (p.m.material as THREE.MeshBasicMaterial).opacity = (o.dichte ?? 0.5) * Math.pow(1 - u, 1.2);
    }
  } };
};
