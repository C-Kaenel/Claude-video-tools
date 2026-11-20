// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Effekt-Karte in der Welt mit Spur (Daten): wann sie erscheint (Aufploppen mit Überschwingen), verschwindet, wo sie
// steht, wie sie sich bewegt (schwanken, pulsieren) und welche Angaben sie hat. Zahlen-Angaben gleiten zwischen zwei
// Schlüsseln (z. B. Thermometer steigt), Texte wechseln hart. Jede Karte ist eine eigene Zeichnung (`Card`).
import * as THREE from "three";
import { Card } from "./card";
import { EFFECTS, drawEffect, type EffectColors, type EffectKind } from "./effects";

export type EffectMotion = "none" | "sway" | "pulse" | "bob";
export type EffectKey = {
  at: number;                         // Sekunde im Shot
  show?: boolean;                     // true = erscheinen (Aufploppen), false = verschwinden
  pos?: [number, number, number];     // Weltpunkt des Ankers
  params?: Record<string, unknown>;   // Angaben der Karte (Zahlen gleiten bis zum nächsten Schlüssel)
  motion?: EffectMotion;
};

const POP_IN = 0.3, POP_OUT = 0.18;
const TIMED = new Set<EffectKind>(["herz", "fliege", "mikroskop", "warnlicht", "funkeln", "reiter", "miasma", "ratte", "aufruf", "rabe", "notenblatt"]);
/** Kulissen-Karten (Teil der Szene, kein Hinweis/Text): die Prüf-Ebene "karten" lässt sie weg wie Figuren. */
export const KULISSE = new Set<EffectKind>(["erdhuegel", "reiter", "kanone", "steinblock"]);
/** Aufploppen: 0 → 1 mit Überschwingen (≈ 12 %). */
export const popScale = (u: number) => {
  if (u <= 0) return 0; if (u >= 1) return 1;
  const c1 = 1.9, c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
};

export class EffectActor {
  readonly card: Card;
  readonly root = new THREE.Group();
  private keys: EffectKey[];
  constructor(readonly kind: EffectKind, heightM: number, keys: EffectKey[], colors: EffectColors,
    o: { tint?: string; unlit?: boolean; facing?: "camera" | "flat" | "fixed"; turn?: number } = {}) {
    const def = EFFECTS[kind];
    const [dw, dh] = def.design;
    const anchor = ("anchor" in def ? def.anchor : undefined) ?? [dw / 2, dh];
    this.card = new Card({ design: def.design, size: [heightM * dw / dh, heightM], anchor, facing: o.facing, unlit: o.unlit, tint: o.tint, resolution: 1.2 },
      (pen, st) => drawEffect(pen, kind, st as Record<string, unknown>, colors));
    if (o.turn) this.card.group.rotation.y = THREE.MathUtils.degToRad(o.turn);
    this.root.add(this.card.group);
    this.root.name = `effekt-${kind}`;
    this.root.userData.protect = true;
    if (KULISSE.has(kind)) this.root.userData.kulisse = true;
    this.keys = [...keys].sort((a, b) => a.at - b.at);
  }

  private paramsAt(t: number) {
    const out: Record<string, unknown> = {};
    const ks = this.keys.filter((k) => k.params);
    for (let i = 0; i < ks.length; i++) {
      if (ks[i].at > t) break;
      const cur = ks[i].params!, next = ks[i + 1];
      // ändert sich ein Text zum nächsten Schlüssel, wird nicht geglättet (z. B. Schild: neues Wortpaar)
      const textChange = next && Object.entries(next.params ?? {}).some(([k, v]) => typeof v === "string" && cur[k] !== undefined && cur[k] !== v);
      for (const [k, v] of Object.entries(cur)) {
        const nv = next?.params?.[k];
        if (typeof v === "number" && typeof nv === "number" && !textChange) {
          const u = Math.min(1, (t - ks[i].at) / Math.max(1e-6, next!.at - ks[i].at));
          out[k] = v + (nv - v) * u;
        } else out[k] = v;
      }
    }
    return out;
  }

  update(t: number, camera: THREE.Camera) {
    // sichtbar? (letzter show-Schlüssel)
    let showAt = -Infinity, hideAt = -Infinity, pos: [number, number, number] = [0, 0, 0], motion: EffectMotion = "none";
    let posAt = -Infinity, motionAt = -Infinity, prevMotion: EffectMotion = "none";
    for (const k of this.keys) {
      if (k.at > t) break;
      if (k.show === true) showAt = k.at;
      if (k.show === false) hideAt = k.at;
      if (k.pos) { pos = k.pos; posAt = k.at; }
      if (k.motion) { prevMotion = motion; motion = k.motion; motionAt = k.at; }
    }
    // Bewegung weich ein- und ausblenden (0,3 s), damit nichts springt, wenn sie wechselt
    const ramp = Math.min(1, Math.max(0, (t - motionAt) / 0.3));
    let moving = motion, amount = motion === "none" ? 0 : ramp;
    if (motion === "none" && prevMotion !== "none" && ramp < 1) { moving = prevMotion; amount = 1 - ramp; }
    // Lage gleitet linear zum nächsten Schlüssel mit Lage (z. B. fallender Tropfen, heranfahrende Hand)
    const nextPos = this.keys.find((k) => k.at > t && k.pos);
    if (nextPos && posAt > -Infinity) {
      const u = (t - posAt) / (nextPos.at - posAt);
      pos = pos.map((v, i) => v + (nextPos.pos![i] - v) * u) as [number, number, number];
    }
    let s = 0;
    if (showAt > hideAt) s = popScale((t - showAt) / POP_IN);
    else if (hideAt > -Infinity && showAt > -Infinity) s = Math.max(0, 1 - (t - hideAt) / POP_OUT);
    // Nie unsichtbar schalten (visible=false): sonst übersetzt WebGL die Shader je nach Vorgeschichte des Render-Tabs in
    // anderer Reihenfolge, und das Bild ist nicht mehr bytegleich. Versteckt = Grösse fast null.
    if (s <= 0.001) { this.card.mesh.scale.setScalar(1e-5); this.card.face(camera); return; }
    const live = t - showAt;
    const pulse = moving === "pulse" ? 1 + amount * 0.06 * Math.sin(live * Math.PI * 2 * 1.2) : 1;
    this.root.position.set(pos[0], pos[1] + (moving === "bob" ? amount * 0.04 * Math.sin(live * Math.PI * 2 * 0.8) : 0), pos[2]);
    this.card.mesh.scale.setScalar(s * pulse);
    this.card.mesh.rotation.z = moving === "sway" ? THREE.MathUtils.degToRad(amount * 4 * Math.sin(live * Math.PI * 2 * 0.7)) : 0;
    // Zeit nur an Karten, die sich selbst bewegen – alle anderen werden nur neu gezeichnet, wenn sich Angaben ändern
    const params = TIMED.has(this.kind) ? { ...this.paramsAt(t), zeit: live } : this.paramsAt(t);
    this.card.draw(params, JSON.stringify(params, (_k, v) => (typeof v === "number" ? Math.round(v * 1000) / 1000 : v)));
    this.card.face(camera);
  }
}
