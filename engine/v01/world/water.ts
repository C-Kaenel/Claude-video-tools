// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Wasser: Farbverlauf nach Entfernung zur Kamera (nah → mittel → fern), darüber gemalte Wellenstriche, die mit der Zeit
// langsam treiben (Zeit kommt aus dem Frame – deterministisch), und ein heller Glanz zur Sonne hin. Nebel wie die Welt.
import * as THREE from "three";
import { waves } from "./paint";
import type { V3 } from "../camera/rig";

export type WaterColors = { near: string; mid: string; far: string };

const vert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec3 vWorld;
varying float vDist;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  vDist = -mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const frag = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform vec3 uNear; uniform vec3 uMid; uniform vec3 uFar;
uniform float uD1; uniform float uD2;
uniform sampler2D uWaves; uniform float uTile; uniform vec2 uDrift; uniform float uTime;
uniform vec3 uSunDir; uniform vec3 uSun; uniform vec3 uCam;
varying vec3 vWorld; varying float vDist;
void main() {
  vec3 c = mix(uNear, uMid, smoothstep(0.0, uD1, vDist));
  c = mix(c, uFar, smoothstep(uD1, uD2, vDist));
  vec4 w = texture2D(uWaves, vWorld.xz / uTile + uDrift * uTime);
  vec4 w2 = texture2D(uWaves, vWorld.xz / (uTile * 1.7) - uDrift * uTime * 0.6 + 0.37);
  float a = max(w.a, w2.a * 0.7);
  c = mix(c, w.a > w2.a * 0.7 ? w.rgb : w2.rgb, a * (1.0 - smoothstep(uD1, uD2 * 1.2, vDist)));
  vec3 v = normalize(uCam - vWorld);
  vec3 h = normalize(v + uSunDir);
  c += uSun * pow(max(h.y, 0.0), 180.0) * 0.6;   // Glanz
  gl_FragColor = vec4(c, 1.0);
  #include <fog_fragment>
}`;

export const water = (colors: WaterColors, size: [number, number], at: V3, sunColor = "#ffffff") => {
  const wv = waves("#ffffff", "#0b2a55");
  const mat = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uNear: { value: new THREE.Color(colors.near) }, uMid: { value: new THREE.Color(colors.mid) }, uFar: { value: new THREE.Color(colors.far) },
      uD1: { value: 18 }, uD2: { value: 110 }, uWaves: { value: null }, uTile: { value: wv.meters }, uDrift: { value: new THREE.Vector2(0.006, 0.002) },
      uTime: { value: 0 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSun: { value: new THREE.Color(sunColor) }, uCam: { value: new THREE.Vector3() },
    }]),
  });
  mat.uniforms.uWaves.value = wv.tex;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]).rotateX(-Math.PI / 2), mat);
  m.position.set(...at);
  m.receiveShadow = false;
  m.name = "wasser";
  /** Pro Frame: Zeit, Kamera, Sonnenrichtung. */
  const tick = (time: number, cam: THREE.Camera, sunDir?: THREE.Vector3) => {
    mat.uniforms.uTime.value = time;
    mat.uniforms.uCam.value.copy(cam.position);
    if (sunDir) mat.uniforms.uSunDir.value.copy(sunDir);
  };
  return { mesh: m, tick };
};
