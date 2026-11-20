// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Tiefenschärfe: Unschärfe-Radius je Pixel aus dem Abstand zur Fokusebene; gesammelt über eine Spirale von Stichproben
// (fest, kein Zufall → deterministisch). Hintergrund kann nicht über scharfen Vordergrund "laufen".
import * as THREE from "three";
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";

export type DofParams = { maxRadius: number }; // grösster Unschärfe-Radius in px (bei 1080)

const N = 48;
const frag = /* glsl */ `
uniform vec4 uD; // focus (m), strength cInf (px bei 1080), pxScale, maxRadius (px bei 1080)
float coc(const in float d) { return clamp(uD.y * uD.z * abs(1.0 - uD.x / max(d, 1e-3)), 0.0, uD.w * uD.z); }
void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (uD.y < 0.25) { outputColor = inputColor; return; }
  float d = -getViewZ(depth);
  float c = coc(d);
  float R = uD.w * uD.z;
  vec3 acc = inputColor.rgb;
  float wsum = 1.0;
  for (int i = 0; i < ${N}; i++) {
    float fi = float(i);
    float a = fi * 2.3999632;                 // goldener Winkel
    float r = sqrt((fi + 0.5) / float(${N}));
    float rr = r * R;
    vec2 q = uv + vec2(cos(a), sin(a)) * rr * texelSize;
    float dq = -getViewZ(readDepth(q));
    float cq = coc(dq);
    float w = smoothstep(rr - 1.0, rr + 1.0, cq);       // die Stichprobe ist selbst so unscharf, dass sie hierher reicht
    if (dq > d) w *= smoothstep(rr - 1.0, rr + 1.0, c); // Hintergrund nur, soweit auch dieses Pixel unscharf ist
    acc += texture2D(inputBuffer, q).rgb * w;
    wsum += w;
  }
  outputColor = vec4(acc / wsum, inputColor.a);
}`;

export class DofEffect extends Effect {
  constructor(p: DofParams) {
    super("DofEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      uniforms: new Map([["uD", new THREE.Uniform(new THREE.Vector4(10, 0, 1, p.maxRadius))]]),
    });
  }
  set(focus: number, strength: number, pxScale: number) {
    const v = this.uniforms.get("uD")!.value as THREE.Vector4;
    v.x = focus; v.y = strength; v.z = pxScale;
  }
}
