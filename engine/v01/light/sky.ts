// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Himmel: grosse Kugel um die Kamera, Farbe nach Höhe über dem Horizont (weiche Übergänge zwischen den Stufen).
import * as THREE from "three";
import type { SkyStops } from "./presets";

const MAX = 6;

const vert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // immer ganz hinten
}`;

const frag = /* glsl */ `
uniform vec3 uCol[${MAX}];
uniform float uEl[${MAX}];
uniform int uN;
varying vec3 vDir;
void main() {
  float el = degrees(asin(clamp(vDir.y, -1.0, 1.0)));
  vec3 c = uCol[0];
  for (int i = 1; i < ${MAX}; i++) {
    if (i >= uN) break;
    float t = smoothstep(uEl[i - 1], uEl[i], el);
    c = mix(c, uCol[i], t);
  }
  gl_FragColor = vec4(c, 1.0);
}`;

/** Farben werden als Bildschirm-Werte (sRGB) angegeben und hier in lineare Werte umgerechnet. */
export const makeSky = (stops: SkyStops, radius = 900) => {
  const cols = Array.from({ length: MAX }, (_, i) => new THREE.Color(stops.colors[Math.min(i, stops.colors.length - 1)]));
  const els = Array.from({ length: MAX }, (_, i) => stops.elevations[Math.min(i, stops.elevations.length - 1)]);
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false,
    uniforms: { uCol: { value: cols }, uEl: { value: els }, uN: { value: Math.min(MAX, stops.colors.length) } },
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 24), mat);
  mesh.name = "sky";
  mesh.renderOrder = -1;
  mesh.frustumCulled = false;
  return mesh;
};
