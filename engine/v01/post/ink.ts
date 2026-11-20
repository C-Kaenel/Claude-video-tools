// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Welt-Tusche: fast schwarze Linien an Umrissen und Knicken der 3D-Welt.
//  - Umriss: Ein Pixel wird schwarz, wenn ein Nachbar im Abstand der Linienbreite deutlich weiter weg liegt
//    (nur die VORDERE Seite einer Kante wird gezeichnet).
//  - Knick: zweite Ableitung der inversen Tiefe – auf ebenen Flächen ist sie null, an Knicken nicht.
//  - Breite nimmt mit der Entfernung ab (logarithmisch), Farbe wird in der Ferne leicht nebelig.
//  - Ausnahmen: Himmel und alles auf der Ebene NOINK (Figuren, Karten, Wolken) – über eine Masken-Zeichnung.
import * as THREE from "three";
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";

export const NOINK = 3; // Kamera-Ebene für Objekte ohne Welt-Tusche

export type InkParams = {
  color: string; widthNear: number; widthFar: number; distNear: number; distFar: number;
  jump: number; crease: number; fogTint: number;
};

const RMAX = 9;
const frag = /* glsl */ `
uniform sampler2D uMask;
uniform vec3 uInk;
uniform vec3 uFog;
uniform vec4 uW;      // widthNear, widthFar, distNear, distFar
uniform vec4 uP;      // pxScale, jump, crease, fogTint
uniform vec2 uFogRange;

float distAt(const in vec2 p) { return -getViewZ(readDepth(p)); }

const vec2 DIRS[8] = vec2[8](vec2(1.,0.), vec2(-1.,0.), vec2(0.,1.), vec2(0.,-1.),
  vec2(0.7071,0.7071), vec2(-0.7071,0.7071), vec2(0.7071,-0.7071), vec2(-0.7071,-0.7071));

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  outputColor = inputColor;
  if (depth >= 0.99999 || texture2D(uMask, uv).r > 0.5) return;
  float d = -getViewZ(depth);
  float t = clamp(log(max(d, 1e-3) / uW.z) / log(uW.w / uW.z), 0.0, 1.0);
  float w = mix(uW.x, uW.y, t) * uP.x;
  float ink = 0.0;
  float iz = 1.0 / d;
  // Neigung der Fläche (inverse Tiefe ist auf Ebenen linear im Bild): kleinere der beiden einseitigen Differenzen,
  // damit eine Kante daneben die Schätzung nicht verfälscht. So bekommt ein flacher Boden am Horizont keine Linie.
  float ixp = 1.0 / distAt(uv + vec2(1., 0.) * texelSize) - iz, ixm = iz - 1.0 / distAt(uv - vec2(1., 0.) * texelSize);
  float iyp = 1.0 / distAt(uv + vec2(0., 1.) * texelSize) - iz, iym = iz - 1.0 / distAt(uv - vec2(0., 1.) * texelSize);
  vec2 grad = vec2(abs(ixp) < abs(ixm) ? ixp : ixm, abs(iyp) < abs(iym) ? iyp : iym);
  for (int k = 1; k <= ${RMAX}; k++) {
    float r = float(k);
    if (r > w + 0.5) break;
    float a = clamp(w + 0.5 - r, 0.0, 1.0);           // weicher Rand der Linie
    for (int j = 0; j < 8; j++) {
      vec2 o = DIRS[j] * r;
      float expect = iz + dot(grad, o);               // inverse Tiefe, wenn die Fläche einfach weiterginge
      // Sprung: relativ zur Entfernung, aber höchstens 0,3 m – so bekommen auch ferne Fassaden-Kanten ihre Linie
      if (expect - 1.0 / distAt(uv + o * texelSize) > min(iz * uP.y, 0.3 * iz * iz)) ink = max(ink, a);
    }
  }
  float s = max(1.0, w * 0.4);
  float cx = abs(1.0 / distAt(uv + vec2(s, 0.) * texelSize) + 1.0 / distAt(uv - vec2(s, 0.) * texelSize) - 2.0 * iz) / iz;
  float cy = abs(1.0 / distAt(uv + vec2(0., s) * texelSize) + 1.0 / distAt(uv - vec2(0., s) * texelSize) - 2.0 * iz) / iz;
  float crease = smoothstep(uP.z, uP.z * 2.0, max(cx, cy));
  ink = max(ink, crease * 0.9);
  float fogK = smoothstep(uFogRange.x, uFogRange.y, d) * uP.w;
  vec3 col = mix(uInk, uFog, fogK);
  outputColor = vec4(mix(inputColor.rgb, col, ink), inputColor.a);
}`;

/** Masken-Zeichnung: Welt schwarz, NOINK-Ebene weiss (mit Tiefe, damit Verdecktes richtig bleibt). */
class InkMask {
  target = new THREE.WebGLRenderTarget(1, 1, { depthBuffer: true });
  black = new THREE.MeshBasicMaterial({ color: 0x000000 });
  white = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    const keepBg = scene.background, keepFog = scene.fog, keepOver = scene.overrideMaterial, keepMask = camera.layers.mask;
    scene.background = null; scene.fog = null;
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    scene.overrideMaterial = this.black;
    camera.layers.enableAll(); camera.layers.disable(NOINK);
    renderer.render(scene, camera);
    // NOINK-Ebene weiss – Karten nur dort, wo sie gezeichnet sind (Durchsichtiges bleibt Welt, sonst fehlt die Tusche
    // in einem unsichtbaren Rechteck um jede Figur); Kontaktschatten zählen nicht.
    scene.overrideMaterial = null;
    camera.layers.set(NOINK);
    const swapped: [THREE.Mesh, THREE.Material | THREE.Material[]][] = [], masked: THREE.ShaderMaterial[] = [], hidden: THREE.Object3D[] = [];
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !o.layers.isEnabled(NOINK)) return;
      if (o.name === "kontaktschatten") { if (o.visible) { o.visible = false; hidden.push(o); } return; }
      const mat = m.material as THREE.ShaderMaterial;
      if (mat?.uniforms?.uMask) { mat.uniforms.uMask.value = 1; masked.push(mat); }
      else { swapped.push([m, m.material]); m.material = this.white; }
    });
    const ac = renderer.autoClear; renderer.autoClear = false;
    renderer.render(scene, camera);
    renderer.autoClear = ac;
    swapped.forEach(([m, mat]) => { m.material = mat; });
    masked.forEach((mat) => { mat.uniforms.uMask.value = 0; });
    hidden.forEach((o) => { o.visible = true; });
    camera.layers.mask = keepMask; scene.overrideMaterial = keepOver; scene.background = keepBg; scene.fog = keepFog;
  }
}

export class InkEffect extends Effect {
  private mask = new InkMask();
  constructor(private scene: THREE.Scene, private cam: THREE.Camera, p: InkParams) {
    super("InkEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      uniforms: new Map<string, THREE.Uniform>([
        ["uMask", new THREE.Uniform(null)],
        ["uInk", new THREE.Uniform(new THREE.Color(p.color))],
        ["uFog", new THREE.Uniform(new THREE.Color("#ffffff"))],
        ["uW", new THREE.Uniform(new THREE.Vector4(p.widthNear, p.widthFar, p.distNear, p.distFar))],
        ["uP", new THREE.Uniform(new THREE.Vector4(1, p.jump, p.crease, p.fogTint))],
        ["uFogRange", new THREE.Uniform(new THREE.Vector2(100, 400))],
      ]),
    });
  }
  set pxScale(v: number) { (this.uniforms.get("uP")!.value as THREE.Vector4).x = v; }
  setFog(color: string, near: number, far: number) {
    (this.uniforms.get("uFog")!.value as THREE.Color).set(color);
    (this.uniforms.get("uFogRange")!.value as THREE.Vector2).set(near, far);
  }
  update(renderer: THREE.WebGLRenderer) {
    this.mask.render(renderer, this.scene, this.cam);
    this.uniforms.get("uMask")!.value = this.mask.target.texture;
  }
  setSize(width: number, height: number) { this.mask.target.setSize(width, height); }
  dispose() { this.mask.target.dispose(); super.dispose(); }
}
