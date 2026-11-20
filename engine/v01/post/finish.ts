// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Letzte Stufe: Tonemapping (neutral, nach dem offenen Khronos-Standard "PBR Neutral") und Farbkorrektur.
// Die Farbkorrektur arbeitet auf Bildschirm-Werten (sRGB): Tonkurve (aus 7 Stützpunkten), Sättigung getrennt für
// Schatten/Mitten/Lichter, Farbtönung je Zone, Vignette. PUNCH macht die Kurve steiler und die Farben kräftiger.
import * as THREE from "three";
import { BlendFunction, Effect } from "postprocessing";

export const CURVE_X = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];

export type Grade = {
  curve: number[];                                  // 7 Werte bei CURVE_X (0..1)
  sat: [number, number, number];                    // Schatten, Mitten, Lichter
  tint: { shadows: [number, number, number]; mids: [number, number, number]; highs: [number, number, number] }; // Zusatz in 0..1
  vignette: [number, number];                       // Stärke, Beginn (Radius 0..1)
};
export type Punch = { contrast: number; sat: number };

export const NO_GRADE: Grade = { curve: [...CURVE_X], sat: [1, 1, 1], tint: { shadows: [0, 0, 0], mids: [0, 0, 0], highs: [0, 0, 0] }, vignette: [0, 0.5] };

/** PUNCH: Kurve um den Mittelpunkt steiler (Endpunkte fest, bleibt monoton), Sättigung mal Faktor. */
export const applyPunch = (g: Grade, p: Punch): Grade => {
  const mid = g.curve[3];
  const curve = g.curve.map((v, i) => (i === 0 || i === g.curve.length - 1 ? v : mid + (v - mid) * p.contrast));
  for (let i = 1; i < curve.length; i++) curve[i] = Math.min(1, Math.max(curve[i], curve[i - 1] + 1e-4));
  return { ...g, curve, sat: [g.sat[0] * p.sat, g.sat[1] * p.sat, g.sat[2] * p.sat] };
};

/** Monotone kubische Interpolation (Fritsch–Carlson) → Tabelle mit 256 Werten. Kein Überschwingen zwischen den Punkten. */
export const curveTable = (ys: number[], n = 256) => {
  const xs = CURVE_X, k = xs.length;
  const d = xs.slice(1).map((x, i) => (ys[i + 1] - ys[i]) / (x - xs[i]));
  const m = new Array(k).fill(0);
  m[0] = d[0]; m[k - 1] = d[k - 2];
  for (let i = 1; i < k - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < k - 1; i++) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
    if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
  }
  const out = new Float32Array(n * 4);
  for (let j = 0; j < n; j++) {
    const x = j / (n - 1);
    let i = 0; while (i < k - 2 && x > xs[i + 1]) i++;
    const hgt = xs[i + 1] - xs[i], t = (x - xs[i]) / hgt, t2 = t * t, t3 = t2 * t;
    const y = (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * hgt * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * hgt * m[i + 1];
    out.set([y, y, y, 1], j * 4);
  }
  return out;
};

const frag = /* glsl */ `
uniform sampler2D uCurve;
uniform vec3 uSat;
uniform vec3 uTintS;
uniform vec3 uTintM;
uniform vec3 uTintH;
uniform vec2 uVig;
uniform float uAmount;

vec3 neutralTonemap(vec3 c) {
  const float start = 0.76;
  const float desat = 0.15;
  float x = min(c.r, min(c.g, c.b));
  float off = x < 0.08 ? x - 6.25 * x * x : 0.04;
  c -= off;
  float peak = max(c.r, max(c.g, c.b));
  if (peak < start) return c;
  float d = 1.0 - start;
  float np = 1.0 - d * d / (peak + d - start);
  c *= np / peak;
  float g = 1.0 - 1.0 / (desat * (peak - np) + 1.0);
  return mix(c, vec3(np), g);
}
vec3 toSrgb(vec3 c) { return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
float curve(float v) { return texture2D(uCurve, vec2(clamp(v, 0.0, 1.0) * (255.0 / 256.0) + 0.5 / 256.0, 0.5)).r; }

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = toSrgb(clamp(neutralTonemap(max(inputColor.rgb, 0.0)), 0.0, 1.0));
  vec3 g = vec3(curve(c.r), curve(c.g), curve(c.b));
  float y = dot(g, vec3(0.2126, 0.7152, 0.0722));
  float ws = 1.0 - smoothstep(0.0, 0.45, y), wh = smoothstep(0.55, 1.0, y), wm = 1.0 - ws - wh;
  float s = uSat.x * ws + uSat.y * wm + uSat.z * wh;
  g = mix(vec3(y), g, s);
  g += uTintS * ws + uTintM * wm + uTintH * wh;
  vec2 p = uv - 0.5;
  float r = length(p * vec2(1.0, 1.0)) * 1.4142;
  g *= 1.0 - uVig.x * smoothstep(uVig.y, 1.0, r);
  g = mix(c, clamp(g, 0.0, 1.0), uAmount);
  outputColor = vec4(toLin(g), inputColor.a);
}`;

export class FinishEffect extends Effect {
  private table = new THREE.DataTexture(new Float32Array(256 * 4), 256, 1, THREE.RGBAFormat, THREE.FloatType);
  constructor() {
    super("FinishEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([
        ["uCurve", new THREE.Uniform(null)], ["uSat", new THREE.Uniform(new THREE.Vector3(1, 1, 1))],
        ["uTintS", new THREE.Uniform(new THREE.Vector3())], ["uTintM", new THREE.Uniform(new THREE.Vector3())], ["uTintH", new THREE.Uniform(new THREE.Vector3())],
        ["uVig", new THREE.Uniform(new THREE.Vector2(0, 0.5))], ["uAmount", new THREE.Uniform(1)],
      ]),
    });
    this.table.magFilter = THREE.LinearFilter; this.table.minFilter = THREE.LinearFilter;
    this.table.colorSpace = THREE.NoColorSpace;
    this.uniforms.get("uCurve")!.value = this.table;
    this.setGrade(NO_GRADE);
  }
  setGrade(g: Grade, amount = 1) {
    (this.table.image.data as Float32Array).set(curveTable(g.curve));
    this.table.needsUpdate = true;
    const u = this.uniforms;
    (u.get("uSat")!.value as THREE.Vector3).set(...g.sat);
    (u.get("uTintS")!.value as THREE.Vector3).set(...g.tint.shadows);
    (u.get("uTintM")!.value as THREE.Vector3).set(...g.tint.mids);
    (u.get("uTintH")!.value as THREE.Vector3).set(...g.tint.highs);
    (u.get("uVig")!.value as THREE.Vector2).set(...g.vignette);
    u.get("uAmount")!.value = amount;
  }
}
