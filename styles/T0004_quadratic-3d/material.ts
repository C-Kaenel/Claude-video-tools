// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Licht-Material des Stils T0004: wie das Zwei-Ton-Material des Motors (Licht / Schatten mit weichem Übergang), aber im Licht
// zusätzlich nach dem Einfallswinkel abgestuft – bei Sonne von vorne rechts oben liegen Deckel, rechte und linke Seite eines
// Quaders alle im Licht und bleiben trotzdem unterscheidbar (Deckel hell, rechts mittel, links etwas dunkler).
// `stufen()` tauscht in einer fertigen Gruppe jedes Zwei-Ton-Material gegen dieses (gleiche Farbe).
import * as THREE from "three";
import type { LightPreset } from "../../engine/v01";

const vert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
varying vec3 vNormalV;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  #include <fog_vertex>
  vNormalV = normalize(transformedNormal);
}`;

const frag = /* glsl */ `
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
uniform vec3 uAlbedo;
uniform vec3 uLit;
uniform vec3 uShade;
uniform vec3 uLift;
uniform float uEdge;
uniform float uSoft;
uniform float uStufe;
varying vec3 vNormalV;
void main() {
  float ndl = 0.0;
  #if NUM_DIR_LIGHTS > 0
    ndl = max(dot(normalize(vNormalV), directionalLights[0].direction), 0.0);
  #endif
  float licht = ndl * getShadowMask();
  float t = smoothstep(uEdge - uSoft, uEdge + uSoft, licht);
  float stufe = 1.0 - uStufe + uStufe * ndl;           // im Licht: steiler Einfall = heller
  vec3 col = uAlbedo * mix(uShade, uLit * stufe, t) + uLift * uAlbedo;
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;

const lin = (hex: string, gain = 1) => new THREE.Color(hex).multiplyScalar(gain);

export const stufenMaterial = (p: LightPreset, albedo: THREE.Color, stufe: number) => {
  const m = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, lights: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.lights, THREE.UniformsLib.fog, {
      uAlbedo: { value: albedo.clone() }, uLit: { value: lin(p.lit, p.litGain) }, uShade: { value: lin(p.shade) },
      uLift: { value: lin(p.lift) }, uEdge: { value: p.edge }, uSoft: { value: p.soft }, uStufe: { value: stufe },
    }]),
  });
  m.userData.stufen = true;
  return m;
};

/** Ersetzt in `root` alle Zwei-Ton-Materialien (ohne Textur) durch das Stufen-Material derselben Farbe. */
export const stufen = (root: THREE.Object3D, p: LightPreset, stufe: number) => {
  const cache = new Map<string, THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh, mat = mesh.material as THREE.ShaderMaterial | undefined;
    if (!mesh.isMesh || !mat || !mat.userData?.twoTone || mat.defines?.USE_MAP !== undefined) return;
    const c = mat.uniforms.uAlbedo.value as THREE.Color, key = c.getHexString();
    let n = cache.get(key);
    if (!n) { n = stufenMaterial(p, c, stufe); cache.set(key, n); }
    mesh.material = n;
  });
};
