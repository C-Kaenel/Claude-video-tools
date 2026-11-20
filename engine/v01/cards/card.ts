// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Karte = gezeichnete Fläche an einem Weltpunkt. Sie schaut zur Kamera (aufrecht, Standard), liegt flach oder hat eine
// feste Drehung. Karten werden vom Szenenlicht getönt (Farbe `card` der Lichtstimmung), bekommen Nebel, aber KEINE
// Welt-Tusche (eigene Kontur). Texte/Papier können `unlit` sein, damit sie lesbar bleiben.
// Die Leinwand wird nur neu gezeichnet, wenn sich der Zustand ändert (Schlüssel-Vergleich).
import * as THREE from "three";
import { NOINK } from "../post/ink";
import { Pen } from "./draw";

const vert = /* glsl */ `
#include <common>
#include <fog_pars_vertex>
varying vec2 vUv;
void main() {
  vUv = uv;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;
const frag = /* glsl */ `
#include <common>
#include <fog_pars_fragment>
uniform sampler2D uMap; uniform vec3 uTint; uniform float uOpacity; uniform float uMask;
varying vec2 vUv;
void main() {
  vec4 c = texture2D(uMap, vUv);
  if (c.a < 0.5) discard;
  if (uMask > 0.5) { gl_FragColor = vec4(1.0); return; }   // Tusche-Maske: nur die gezeichnete Form
  gl_FragColor = vec4(c.rgb * uTint, uOpacity);
  #include <fog_fragment>
}`;

export type CardFacing = "camera" | "flat" | "fixed";
export type CardOptions = {
  design: [number, number];      // Zeichenfläche in Design-Einheiten (Breite, Höhe)
  size: [number, number];        // Grösse in der Welt (m)
  anchor?: [number, number];     // Ankerpunkt in Design-Einheiten (Standard: unten Mitte)
  facing?: CardFacing;
  unlit?: boolean;               // Tönung durch das Licht aus (Texte, Papier)
  resolution?: number;           // Leinwand-Pixel je Design-Einheit (Standard 1.5)
  tint?: string;                 // Licht-Tönung (Bildschirm-Wert), meist vom Stil
};

export class Card {
  readonly mesh: THREE.Mesh;
  readonly group = new THREE.Group();
  private canvas: HTMLCanvasElement;
  private tex: THREE.CanvasTexture;
  private key = "";
  private mat: THREE.ShaderMaterial;

  constructor(readonly o: CardOptions, private paint: (pen: Pen, state: unknown) => void) {
    const k = o.resolution ?? 1.5;
    this.canvas = document.createElement("canvas");
    this.canvas.width = Math.round(o.design[0] * k); this.canvas.height = Math.round(o.design[1] * k);
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: vert, fragmentShader: frag, fog: true, transparent: false,
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
        uMap: { value: null }, uMask: { value: 0 }, uTint: { value: new THREE.Color(o.unlit ? "#ffffff" : (o.tint ?? "#ffffff")) }, uOpacity: { value: 1 },
      }]),
    });
    this.mat.uniforms.uMap.value = this.tex;
    const [aw, ah] = o.anchor ?? [o.design[0] / 2, o.design[1]];
    const geo = new THREE.PlaneGeometry(o.size[0], o.size[1]);
    // Geometrie so verschieben, dass der Ankerpunkt (Design-Einheiten, y nach unten) im Ursprung liegt
    geo.translate(o.size[0] * (0.5 - aw / o.design[0]), o.size[1] * (ah / o.design[1] - 0.5), 0);
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.layers.set(NOINK);
    this.mesh.renderOrder = 1;
    this.group.add(this.mesh);
    if (o.facing === "flat") this.mesh.rotation.x = -Math.PI / 2;
  }

  /** Zeichnet neu, falls sich der Zustand (als Schlüssel) geändert hat. */
  draw(state: unknown, key = JSON.stringify(state)) {
    if (key === this.key) return;
    this.key = key;
    const g = this.canvas.getContext("2d", { willReadFrequently: true })!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.paint(new Pen(g, this.canvas.width / this.o.design[0]), state);
    this.tex.needsUpdate = true;
  }

  setTint(hex: string) { if (!this.o.unlit) this.mat.uniforms.uTint.value.set(hex); }

  /** Pro Frame: zur Kamera drehen (nur um die Hochachse, Karte bleibt aufrecht). */
  face(camera: THREE.Camera) {
    if ((this.o.facing ?? "camera") !== "camera") return;
    const p = this.group.getWorldPosition(new THREE.Vector3());
    this.group.rotation.y = Math.atan2(camera.position.x - p.x, camera.position.z - p.z);
  }
}

/** Weicher Kontaktschatten (Ellipse auf dem Boden), ohne Tiefe – stört die Tusche nicht. */
export const contactShadow = (width: number, depth = width * 0.4, opacity = 0.35) => {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(20,12,30,1)"); grad.addColorStop(0.55, "rgba(20,12,30,0.75)"); grad.addColorStop(1, "rgba(20,12,30,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, depth).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, fog: true }));
  m.position.y = 0.012;
  m.layers.set(NOINK);
  m.renderOrder = 0;
  m.name = "kontaktschatten";
  return m;
};
