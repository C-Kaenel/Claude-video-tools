// Herkunft: eigen (V-Video), geschrieben 2026-11-09, ohne Vorlage.
// Bewegte Teile der Welt („Leben“): wehende Fahne, flackernde Fackel, Feuer mit Rauchsäule (Signalfeuer, brennende
// Ruinen, Kaminrauch), Laternenkette mit blinkenden Laternen, kreisende Vögel. Jedes Teil liefert `{ obj, tick }`;
// `tick(t)` bekommt die Shot-Sekunde und rechnet die Bewegung nur aus der Zeit – jedes Bild ist für sich gleich (Teil-Render).
// Teile werden nie unsichtbar geschaltet (visible=false), nur sehr klein – sonst ist das Bild nicht mehr bytegleich.
import * as THREE from "three";
import { Rng } from "../core/random";
import type { Kit } from "./kit";
import type { V3 } from "../camera/rig";

export type Lebendig = { obj: THREE.Object3D; tick: (t: number) => void };

const glow = (color: string, k = 1, opacity = 1) => {
  const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), fog: true });
  if (opacity < 1) { m.transparent = true; m.opacity = opacity; m.depthWrite = false; }
  return m;
};
/** Unruhiges Flackern 0…1 aus drei Sinus-Wellen (kein Zufall pro Bild – nur die Zeit zählt). */
export const flacker = (t: number, ph: number) =>
  0.5 + 0.25 * Math.sin(t * 11.3 + ph) + 0.15 * Math.sin(t * 23.7 + ph * 2.1) + 0.1 * Math.sin(t * 37.1 + ph * 3.7);

/** Wehende Fahne an einer Stange. `at` = Fuss der Stange, `turn` = Richtung, in die die Fahne weht (Grad um y). */
export const fahne = (kit: Kit, at: V3, farbe: string, o: { h?: number; w?: number; rand?: string; turn?: number; phase?: number; holz?: string } = {}): Lebendig => {
  const h = o.h ?? 3.2, w = o.w ?? 1.5, fh = w * 0.62, ph = o.phase ?? 0;
  const g = new THREE.Group(); g.name = "fahne";
  const stange = kit.mesh(new THREE.CylinderGeometry(0.04, 0.05, h, 8), o.holz ?? "#6b4a2e");
  stange.position.y = h / 2; g.add(stange);
  const spitze = kit.mesh(new THREE.ConeGeometry(0.08, 0.22, 8), "#c9a24a"); spitze.position.y = h + 0.11; g.add(spitze);
  const geo = new THREE.PlaneGeometry(w, fh, 14, 4); geo.translate(w / 2, h - fh / 2 - 0.08, 0);
  const base = Float32Array.from(geo.getAttribute("position").array as Float32Array);
  const mat = (kit.mat(farbe) as THREE.Material).clone(); mat.side = THREE.DoubleSide;
  const tuch = new THREE.Mesh(geo, mat); tuch.castShadow = true; g.add(tuch);
  if (o.rand) {   // farbiger Saum (Flammenrand) – bewegt sich mit dem Tuch
    const rgeo = new THREE.PlaneGeometry(w, 0.14, 14, 1); rgeo.translate(w / 2, h - fh - 0.08 - 0.07, 0.001);
    const rbase = Float32Array.from(rgeo.getAttribute("position").array as Float32Array);
    const rm = (kit.mat(o.rand) as THREE.Material).clone(); rm.side = THREE.DoubleSide;
    const saum = new THREE.Mesh(rgeo, rm); g.add(saum);
    (g.userData as { saum?: [THREE.BufferGeometry, Float32Array] }).saum = [rgeo, rbase];
  }
  g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(o.turn ?? 0);
  const welle = (pos: THREE.BufferAttribute, b: Float32Array, t: number) => {
    for (let i = 0; i < pos.count; i++) {
      const x = b[i * 3], y = b[i * 3 + 1], k = x / w;
      pos.setZ(i, k * (0.22 * Math.sin(x * 3.1 - t * 7 + ph) + 0.06 * Math.sin(y * 4 + t * 5 + ph)));
      pos.setY(i, y - k * k * 0.12 + k * 0.03 * Math.sin(x * 2.2 - t * 7 + ph));
    }
    pos.needsUpdate = true;
  };
  return { obj: g, tick: (t) => {
    welle(geo.getAttribute("position") as THREE.BufferAttribute, base, t); geo.computeVertexNormals();
    const s = (g.userData as { saum?: [THREE.BufferGeometry, Float32Array] }).saum;
    if (s) welle(s[0].getAttribute("position") as THREE.BufferAttribute, s[1], t);
  } };
};

/** Flammen (zwei Kegel) mit Lichthof, flackert. Grösse 1 ≈ Fackel. */
const flammen = (size: number, ph: number) => {
  const g = new THREE.Group();
  const aussen = new THREE.Mesh(new THREE.ConeGeometry(0.16 * size, 0.55 * size, 8), glow("#ff7a1f", 1.1));
  const innen = new THREE.Mesh(new THREE.ConeGeometry(0.09 * size, 0.34 * size, 8), glow("#ffe066", 1.15));
  const hof = new THREE.Mesh(new THREE.SphereGeometry(0.42 * size, 12, 8), glow("#ffb347", 1, 0.32));
  aussen.position.y = 0.27 * size; innen.position.y = 0.17 * size; hof.position.y = 0.25 * size;
  g.add(aussen, innen, hof);
  const tick = (t: number) => {
    const f = flacker(t, ph);
    aussen.scale.set(1 - 0.12 * f, 0.75 + 0.5 * f, 1 - 0.12 * f);
    innen.scale.set(1, 0.8 + 0.4 * flacker(t + 0.13, ph + 1), 1);
    aussen.rotation.z = 0.12 * Math.sin(t * 6.1 + ph);
    hof.scale.setScalar(0.85 + 0.35 * f);
    (hof.material as THREE.MeshBasicMaterial).opacity = 0.18 + 0.28 * f;
  };
  return { g, tick };
};

/** Fackel auf einem Pfahl (Höhe h) mit flackernder Flamme. */
export const fackel = (kit: Kit, at: V3, o: { h?: number; phase?: number } = {}): Lebendig => {
  const h = o.h ?? 1.9, g = new THREE.Group(); g.name = "fackel";
  const pfahl = kit.mesh(new THREE.CylinderGeometry(0.05, 0.07, h, 8), "#5b3d26"); pfahl.position.y = h / 2; g.add(pfahl);
  const schale = kit.mesh(new THREE.CylinderGeometry(0.16, 0.08, 0.2, 10), "#3a3634"); schale.position.y = h + 0.05; g.add(schale);
  const f = flammen(1, o.phase ?? 0); f.g.position.y = h + 0.12; g.add(f.g);
  g.position.set(...at);
  return { obj: g, tick: f.tick };
};

/**
 * Feuer mit Rauchsäule. `sockel`: steinerner Signalfeuer-Ofen (Bongsu). `feuer`: Grösse der Flammen (0 = nur Rauch, z. B. Kamin).
 * Der Rauch steigt in Wolken auf, wächst, treibt mit dem Wind (`wind` [x, z] m bis oben) und wird durchsichtig.
 */
export const rauchsaeule = (kit: Kit, at: V3, o: { hoehe?: number; dicke?: number; feuer?: number; sockel?: boolean; wind?: [number, number]; farbe?: string; tempo?: number; phase?: number; n?: number } = {}): Lebendig => {
  const g = new THREE.Group(); g.name = "rauch";
  const H = o.hoehe ?? 18, D = o.dicke ?? 1.6, wind = o.wind ?? [5, 1], ph = o.phase ?? 0, n = o.n ?? 12, tempo = o.tempo ?? 0.09;
  let y0 = 0;
  if (o.sockel) {
    const b = kit.batch();
    b.add(new THREE.CylinderGeometry(1.5, 1.8, 1.6, 12), [0, 0.8, 0], "#9c958a");
    b.add(new THREE.CylinderGeometry(0.9, 1.2, 1.2, 12), [0, 2.2, 0], "#8a8378");
    g.add(b.build("signalfeuer"));
    y0 = 2.8;
  }
  const flame = (o.feuer ?? 0) > 0 ? flammen(o.feuer!, ph) : null;
  if (flame) { flame.g.position.y = y0 - 0.1; g.add(flame.g); }
  const kugel = new THREE.IcosahedronGeometry(1, 1);
  const rng = new Rng(Math.round(ph * 1000) + 7);
  const puffs = Array.from({ length: n }, (_, i) => {
    const m = new THREE.Mesh(kugel, glow(o.farbe ?? "#e4e0d8", 1, 0.8));
    g.add(m);
    return { m, off: i / n, dx: rng.range(-0.4, 0.4), dz: rng.range(-0.4, 0.4), s: rng.range(0.8, 1.2) };
  });
  g.position.set(...at);
  return { obj: g, tick: (t) => {
    flame?.tick(t);
    for (const p of puffs) {
      const u = (t * tempo + p.off + ph) % 1;
      const y = y0 + 0.4 + u * H;
      p.m.position.set(p.dx * D + wind[0] * u * u, y, p.dz * D + wind[1] * u * u);
      const s = D * p.s * (0.35 + 1.4 * u) * Math.min(1, u * 8);
      p.m.scale.setScalar(Math.max(1e-4, s));
      (p.m.material as THREE.MeshBasicMaterial).opacity = 0.85 * Math.pow(1 - u, 1.3);
    }
  } };
};

/**
 * Laternenkette zwischen zwei Punkten (je mit Pfosten), Laternen hängen am durchhängenden Seil und blinken
 * nacheinander (Lauflicht) in ihren Farben.
 */
export const laternenkette = (kit: Kit, a: V3, b: V3, o: { n?: number; farben?: string[]; h?: number; tempo?: number; phase?: number } = {}): Lebendig => {
  const g = new THREE.Group(); g.name = "laternen";
  const h = o.h ?? 3.4, n = o.n ?? 8, farben = o.farben ?? ["#e8463a", "#3f7fd6", "#f2c230"], ph = o.phase ?? 0, tempo = o.tempo ?? 1.6;
  for (const p of [a, b]) { const m = kit.mesh(new THREE.CylinderGeometry(0.06, 0.08, h, 8), "#5b3d26"); m.position.set(p[0], p[1] + h / 2, p[2]); g.add(m); }
  const pa = new THREE.Vector3(a[0], a[1] + h, a[2]), pb = new THREE.Vector3(b[0], b[1] + h, b[2]);
  const seilPt = (u: number) => pa.clone().lerp(pb, u).add(new THREE.Vector3(0, -0.6 * 4 * u * (1 - u), 0));
  const pts = Array.from({ length: 17 }, (_, i) => seilPt(i / 16));
  const seil = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.02, 4), kit.mat("#3a2c22"));
  g.add(seil);
  const lat = Array.from({ length: n }, (_, i) => {
    const u = (i + 1) / (n + 1), p = seilPt(u), farbe = farben[i % farben.length];
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.14, 0.42, 10), glow(farbe, 1));
    m.position.set(p.x, p.y - 0.32, p.z);
    const deckel = kit.mesh(new THREE.CylinderGeometry(0.08, 0.17, 0.08, 10), "#2c2622"); deckel.position.set(p.x, p.y - 0.08, p.z);
    g.add(m, deckel);
    return { m, base: new THREE.Color(farbe), i };
  });
  const c = new THREE.Color();
  return { obj: g, tick: (t) => {
    for (const l of lat) {
      const welle = 0.5 + 0.5 * Math.sin(t * tempo * Math.PI * 2 - l.i * 0.9 + ph);
      const an = welle > 0.55 ? 1.35 : 0.55 + 0.4 * welle;   // hell aufblinken, dann glimmen
      (l.m.material as THREE.MeshBasicMaterial).color.copy(c.copy(l.base).multiplyScalar(an));
      l.m.rotation.z = 0.08 * Math.sin(t * 1.7 + l.i);
    }
  } };
};

/** Schwarm Vögel, der um einen Punkt kreist und mit den Flügeln schlägt (`farbe`: z. B. weiss für Möwen). */
export const voegel = (at: V3, o: { n?: number; radius?: number; tempo?: number; groesse?: number; seed?: number; farbe?: string } = {}): Lebendig => {
  const g = new THREE.Group(); g.name = "voegel";
  const n = o.n ?? 6, r = o.radius ?? 14, tempo = o.tempo ?? 0.12, gr = o.groesse ?? 0.9, rng = new Rng(o.seed ?? 3);
  const mat = glow(o.farbe ?? "#2b2a33", 1), fl = new THREE.BoxGeometry(gr * 0.55, gr * 0.05, gr * 0.22); fl.translate(gr * 0.27, 0, 0);
  const birds = Array.from({ length: n }, () => {
    const b = new THREE.Group(), l = new THREE.Mesh(fl, mat), rr = new THREE.Mesh(fl, mat);
    rr.scale.x = -1; b.add(l, rr); g.add(b);
    return { b, l, rr, a0: rng.range(0, Math.PI * 2), dr: rng.range(-0.25, 0.25) * r, dy: rng.range(-2, 2), ph: rng.range(0, 6), w: rng.range(0.85, 1.15) };
  });
  g.position.set(...at);
  return { obj: g, tick: (t) => {
    for (const v of birds) {
      const a = v.a0 + t * tempo * Math.PI * 2 * v.w, rad = r + v.dr;
      v.b.position.set(Math.cos(a) * rad, v.dy + 0.6 * Math.sin(t * 0.9 + v.ph), Math.sin(a) * rad);
      v.b.rotation.y = -a;
      const flap = 0.55 * Math.sin(t * 9 * v.w + v.ph);
      v.l.rotation.z = flap; v.rr.rotation.z = -flap;
    }
  } };
};
