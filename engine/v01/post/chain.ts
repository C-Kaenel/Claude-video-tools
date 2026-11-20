// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Effekt-Kette in fester Reihenfolge: Szene → Tusche → Tiefenschärfe → Leuchten + Tonemapping + Farbkorrektur.
// Gerüst (Zwischenbilder, Tiefe, Kantenglättung, Zusammenfassen) aus dem Tool `postprocessing` (Zlib), Effekte eigen.
import * as THREE from "three";
import { EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { InkEffect, type InkParams } from "./ink";
import { DofEffect, type DofParams } from "./dof";
import { BloomEffect, type BloomParams } from "./bloom";
import { FinishEffect } from "./finish";

export type PostParams = { ink: InkParams | null; dof: DofParams; bloom: BloomParams; msaa: number };
export type PostToggles = { ink: boolean; dof: boolean; bloom: boolean; finish: boolean };

export const makeChain = (gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.PerspectiveCamera, p: PostParams, on: PostToggles) => {
  gl.toneMapping = THREE.NoToneMapping;
  const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: p.msaa });
  composer.addPass(new RenderPass(scene, camera));
  const ink = p.ink && on.ink ? new InkEffect(scene, camera, p.ink) : null;
  const dof = new DofEffect(p.dof);
  const bloom = new BloomEffect(p.bloom);
  const finish = new FinishEffect();
  const passes: EffectPass[] = [];
  const pass = (...e: ConstructorParameters<typeof EffectPass> extends [unknown, ...infer R] ? R : never) => { const x = new EffectPass(camera, ...e); passes.push(x); composer.addPass(x); };
  if (ink) pass(ink);
  if (on.dof) pass(dof);
  const last = [on.bloom ? bloom : null, on.finish ? finish : null].filter(Boolean) as (BloomEffect | FinishEffect)[];
  if (last.length) pass(...last);
  /** near/far der Kamera in die Effekte übernehmen (EffectPass liest sie sonst nur beim Aufbau) – jedes Frame nach dem Welt-Tick. */
  const kameraTiefe = (cam: THREE.PerspectiveCamera) => {
    for (const x of passes) {
      const u = (x.fullscreenMaterial as THREE.ShaderMaterial).uniforms;
      if (u.cameraNear && u.cameraNear.value !== cam.near) u.cameraNear.value = cam.near;
      if (u.cameraFar && u.cameraFar.value !== cam.far) u.cameraFar.value = cam.far;
    }
  };
  return { composer, ink, dof, bloom, finish, kameraTiefe };
};
