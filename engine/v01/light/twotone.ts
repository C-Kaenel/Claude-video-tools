// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Zwei-Ton-Material für die Welt: jede Fläche ist entweder "im Licht" oder "im Schatten", mit weichem Übergang.
// Licht = Albedo × Lichtfarbe, Schatten = Albedo × Schattenfarbe (+ Aufhellung). Echte Schatten der Sonne und Nebel
// kommen über die eingebauten Bausteine von three.js (Tool).
import * as THREE from "three";
import type { LightPreset } from "./presets";

const vert = /* glsl */ `
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
varying vec3 vNormalV;
void main() {
  #include <uv_vertex>
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
#include <uv_pars_fragment>
#include <map_pars_fragment>
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
varying vec3 vNormalV;
void main() {
  vec3 albedo = uAlbedo;
  #ifdef USE_MAP
    albedo *= texture2D(map, vMapUv).rgb;
  #endif
  float ndl = 0.0;
  #if NUM_DIR_LIGHTS > 0
    ndl = max(dot(normalize(vNormalV), directionalLights[0].direction), 0.0);
  #endif
  float lightAmount = ndl * getShadowMask();
  float t = smoothstep(uEdge - uSoft, uEdge + uSoft, lightAmount);
  vec3 col = albedo * mix(uShade, uLit, t) + uLift * albedo;
  gl_FragColor = vec4(col, 1.0);
  #include <fog_fragment>
}`;

const lin = (hex: string, gain = 1) => new THREE.Color(hex).multiplyScalar(gain);

/** Material für Welt-Objekte. `albedo` ist die Grundfarbe (Bildschirm-Wert), `map` eine optionale gemalte Textur. */
export const twoTone = (preset: LightPreset, albedo: string, map?: THREE.Texture) => {
  const m = new THREE.ShaderMaterial({
    vertexShader: vert, fragmentShader: frag, lights: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.lights, THREE.UniformsLib.fog, {
      uAlbedo: { value: lin(albedo) }, uLit: { value: lin(preset.lit, preset.litGain) }, uShade: { value: lin(preset.shade) },
      uLift: { value: lin(preset.lift) }, uEdge: { value: preset.edge }, uSoft: { value: preset.soft },
      map: { value: map ?? null }, mapTransform: { value: new THREE.Matrix3() },
    }]),
  });
  if (map) { (m as unknown as { map: THREE.Texture }).map = map; m.defines = { USE_MAP: "", USE_UV: "" }; }
  m.userData.twoTone = true;
  return m;
};

/** Wechselt bei allen Zwei-Ton-Materialien einer Szene die Lichtstimmung (z. B. beim Shot-Wechsel). */
export const setTwoTone = (scene: THREE.Object3D, preset: LightPreset) => {
  scene.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.ShaderMaterial | undefined;
    if (!mat || !mat.userData?.twoTone) return;
    mat.uniforms.uLit.value = lin(preset.lit, preset.litGain);
    mat.uniforms.uShade.value = lin(preset.shade);
    mat.uniforms.uLift.value = lin(preset.lift);
    mat.uniforms.uEdge.value = preset.edge;
    mat.uniforms.uSoft.value = preset.soft;
  });
};
