// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Leuchten: nur sehr helle Stellen (über der Schwelle, z. B. Sonne, Lampen) strahlen weich in die Umgebung.
// Ablauf in update(): helle Anteile herausziehen (halbe Grösse) → in zwei Stufen weichzeichnen → im Bild dazuaddieren.
import * as THREE from "three";
import { BlendFunction, Effect } from "postprocessing";

export type BloomParams = { threshold: number; intensity: number; radius: number };

const quadVert = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const brightFrag = /* glsl */ `
uniform sampler2D tSrc; uniform float uT; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb; float m = max(c.r, max(c.g, c.b));
  float k = smoothstep(uT, uT * 1.25, m); gl_FragColor = vec4(c * k, 1.0); }`;
const blurFrag = /* glsl */ `
uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){
  vec3 s = texture2D(tSrc, vUv).rgb * 0.2270270;
  s += (texture2D(tSrc, vUv + uDir * 1.3846153).rgb + texture2D(tSrc, vUv - uDir * 1.3846153).rgb) * 0.3162162;
  s += (texture2D(tSrc, vUv + uDir * 3.2307692).rgb + texture2D(tSrc, vUv - uDir * 3.2307692).rgb) * 0.0702703;
  gl_FragColor = vec4(s, 1.0); }`;
const frag = /* glsl */ `
uniform sampler2D uB1; uniform sampler2D uB2; uniform float uI;
void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 b = texture2D(uB1, uv).rgb + texture2D(uB2, uv).rgb;
  outputColor = vec4(inputColor.rgb + b * uI, inputColor.a);
}`;

const rt = () => new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, depthBuffer: false });

export class BloomEffect extends Effect {
  private quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  private qScene = new THREE.Scene();
  private qCam = new THREE.Camera();
  private bright = new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: brightFrag, uniforms: { tSrc: { value: null }, uT: { value: 1 } }, depthTest: false, depthWrite: false });
  private blur = new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: blurFrag, uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, depthTest: false, depthWrite: false });
  private a1 = rt(); private b1 = rt(); private a2 = rt(); private b2 = rt();
  constructor(private p: BloomParams) {
    super("BloomEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, THREE.Uniform>([["uB1", new THREE.Uniform(null)], ["uB2", new THREE.Uniform(null)], ["uI", new THREE.Uniform(p.intensity)]]),
    });
    this.quad.frustumCulled = false;
    this.qScene.add(this.quad);
  }
  private draw(renderer: THREE.WebGLRenderer, mat: THREE.ShaderMaterial, src: THREE.Texture, dst: THREE.WebGLRenderTarget) {
    mat.uniforms.tSrc.value = src;
    this.quad.material = mat;
    renderer.setRenderTarget(dst);
    renderer.render(this.qScene, this.qCam);
  }
  private blurInto(renderer: THREE.WebGLRenderer, a: THREE.WebGLRenderTarget, b: THREE.WebGLRenderTarget) {
    const r = this.p.radius;
    this.blur.uniforms.uDir.value.set(r / a.width, 0); this.draw(renderer, this.blur, a.texture, b);
    this.blur.uniforms.uDir.value.set(0, r / a.height); this.draw(renderer, this.blur, b.texture, a);
  }
  update(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    this.bright.uniforms.uT.value = this.p.threshold;
    this.draw(renderer, this.bright, inputBuffer.texture, this.a1);
    this.blurInto(renderer, this.a1, this.b1);
    this.draw(renderer, this.blur, this.a1.texture, this.a2);     // halbe → viertel Grösse
    this.blurInto(renderer, this.a2, this.b2);
    this.uniforms.get("uB1")!.value = this.a1.texture;
    this.uniforms.get("uB2")!.value = this.a2.texture;
  }
  setSize(width: number, height: number) {
    const w2 = Math.max(1, Math.round(width / 2)), h2 = Math.max(1, Math.round(height / 2));
    this.a1.setSize(w2, h2); this.b1.setSize(w2, h2);
    this.a2.setSize(Math.max(1, w2 >> 1), Math.max(1, h2 >> 1)); this.b2.setSize(Math.max(1, w2 >> 1), Math.max(1, h2 >> 1));
  }
  dispose() { [this.a1, this.b1, this.a2, this.b2].forEach((t) => t.dispose()); super.dispose(); }
}
