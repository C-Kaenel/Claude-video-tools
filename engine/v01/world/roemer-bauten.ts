// Herkunft: eigen (V-Video), geschrieben 2026-11-18, ohne Vorlage.
// Bauten der Römer-Welt (Republik bis frühe Kaiserzeit): Meilenstein mit Inschrift, Goldener Meilenstein, Grabmäler am
// Strassenrand (Turm, Rundbau, Altar, Stele), Wegstation (mansio) mit Stall, Tempel mit Säulen und Giebel, Säulenhalle mit
// Läden, Triumphbogen, Statue, Marktstand, Stadthäuser (Hintergrund), Lederzelte des Legionslagers und die Steinbrücke.
// Jede Funktion liefert eine Gruppe (Ursprung = Mitte am Boden, Vorderseite nach +z, `turn` in Grad um y).
// Regel: aufeinander gestapelte Teile sind nie gleich breit (keine Seitenflächen in derselben Ebene – nichts flackert).
import * as THREE from "three";
import { Rng } from "../core/random";
import { Kit, archFrame, extrude } from "./kit";
import type { V3 } from "../camera/rig";
import { inschrift, marmor, moertel, planks, plaster, pflasterRoem, rubble, shade, stripes, tiles } from "./paint";
import type { RoemerPalette } from "./roemer";

type B = ReturnType<Kit["batch"]>;
type RP = RoemerPalette;
const ball = new THREE.IcosahedronGeometry(1, 2);
const ballGrob = new THREE.IcosahedronGeometry(1, 1);

export const bauRoem = (kit: Kit, name: string, at: V3, turn: number, f: (b: B) => void, occluder = true) => {
  const b = kit.batch(); f(b);
  const g = b.build(name); g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(turn); g.userData.occluder = occluder;
  return g;
};

/** Säule: Basis, sich verjüngender Schaft, Kapitell (Wulst + Deckplatte). y0 = Fuss, h = ganze Höhe. */
export const saeule = (b: B, x: number, y0: number, z: number, h: number, r: number, farbe: string, paint?: ReturnType<typeof marmor>, kapitell = farbe) => {
  b.add(new THREE.CylinderGeometry(r * 1.32, r * 1.4, 0.26, 18), [x, y0 + 0.13, z], farbe);
  b.add(new THREE.CylinderGeometry(r * 0.86, r, h - 0.5, 18), [x, y0 + 0.24 + (h - 0.5) / 2, z], paint ? "#ffffff" : farbe, paint);
  b.add(new THREE.CylinderGeometry(r * 1.22, r * 0.84, 0.2, 18), [x, y0 + h - 0.3, z], kapitell);
  b.box([r * 2.7, 0.14, r * 2.7], [x, y0 + h - 0.13, z], kapitell);
};

/** Satteldach (Dreieck, entlang x extrudiert): Breite w (Tiefe der Traufe in z), Firsthöhe fh, Länge l, Unterkante y. */
const satteldach = (b: B, w: number, fh: number, l: number, at: V3, farbe: string, paint?: ReturnType<typeof tiles>, rotY = 0) => {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, fh); s.closePath();
  const g = extrude(s, l); g.translate(0, 0, -l / 2);
  b.add(g, at, paint ? "#ffffff" : farbe, paint, [0, 90 + rotY, 0]);
};

// ---------------- Meilensteine ----------------
/** Meilenstein: runde Säule auf Sockel, vorne eine Inschrift mit der Meilenzahl (MP = milia passuum). */
export const meilenstein = (kit: Kit, rp: RP, at: V3, turn = 0, zahl = "XII") => {
  const g = bauRoem(kit, "meilenstein", [0, 0, 0], 0, (b) => {
    b.box([0.82, 0.32, 0.82], [0, 0.16, 0], "#ffffff", rubble(rp.travertin, shade(rp.travertin, 0.7)));
    b.add(new THREE.CylinderGeometry(0.31, 0.33, 0.62, 24), [0, 0.6, 0], rp.travertin);
    b.add(new THREE.CylinderGeometry(0.3, 0.3, 0.42, 24), [0, 1.86, 0], rp.travertin);
    b.add(new THREE.CylinderGeometry(0.36, 0.3, 0.12, 24), [0, 2.12, 0], shade(rp.travertin, 0.94));
    b.add(new THREE.CylinderGeometry(0.31, 0.31, 0.75, 24, 1, true, 1.3, Math.PI * 2 - 2.6), [0, 1.27, 0], rp.travertin);   // Rückseite des Schriftbands
  });
  const tex = inschrift(["IMP · CAESAR", "AVGVSTVS", "VIAM · STRAVIT", `MP · ${zahl}`], rp.travertin, rp.inschrift);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 0.75, 24, 1, true, -1.3, 2.6), kit.mat("#ffffff", tex));
  band.position.y = 1.27; band.castShadow = band.receiveShadow = true; g.add(band);
  g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(turn); g.userData.occluder = true;
  return g;
};

/** Goldener Meilenstein (miliarium aureum) auf dem Forum: Marmor-Sockel mit Stufen, vergoldete Säule mit Ringen und Kugel. */
export const goldenerMeilenstein = (kit: Kit, rp: RP, at: V3, turn = 0) => {
  const g = bauRoem(kit, "goldener-meilenstein", [0, 0, 0], 0, (b) => {
    const m = marmor(rp.marmor, rp.marmorAder);
    b.box([2.6, 0.22, 2.6], [0, 0.11, 0], "#ffffff", m);
    b.box([2.1, 0.22, 2.1], [0, 0.32, 0], "#ffffff", m);
    b.box([1.5, 1.0, 1.5], [0, 0.92, 0], "#ffffff", m);
    b.box([1.7, 0.14, 1.7], [0, 1.47, 0], shade(rp.marmor, 0.95));
    b.add(new THREE.CylinderGeometry(0.46, 0.5, 0.2, 24), [0, 1.62, 0], rp.gold);
    b.add(new THREE.CylinderGeometry(0.36, 0.42, 2.3, 24), [0, 2.85, 0], rp.gold);
    for (const y of [2.0, 2.85, 3.7]) b.add(new THREE.TorusGeometry(0.41 - (y - 2) * 0.03, 0.045, 6, 24), [0, y, 0], shade(rp.gold, 0.78), undefined, [90, 0, 0]);
    b.add(new THREE.CylinderGeometry(0.5, 0.37, 0.2, 24), [0, 4.08, 0], rp.gold);
    b.add(ball, [0, 4.45, 0], rp.gold, undefined, [0, 0, 0], [0.3, 0.3, 0.3]);
  });
  const tex = inschrift(["MILIARIVM", "AVREVM"], rp.marmor, shade(rp.gold, 0.6));
  const tafel = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.8), kit.mat("#ffffff", tex)); tafel.position.set(0, 0.95, 0.76); g.add(tafel);
  g.position.set(...at); g.rotation.y = THREE.MathUtils.degToRad(turn); g.userData.occluder = true;
  return g;
};

// ---------------- Grabmäler am Strassenrand ----------------
export type GrabArt = "turm" | "rund" | "altar" | "stele";
export const grabmal = (kit: Kit, rp: RP, art: GrabArt, at: V3, turn = 0, seed = 1) => {
  const r = new Rng(seed * 5 + 3), m = marmor(rp.marmor, rp.marmorAder), tv = rubble(rp.travertin, shade(rp.travertin, 0.72));
  const tafel = (b: B, w: number, h: number, y: number, z: number) => {
    b.box([w, h, 0.06], [0, y, z + 0.03], shade(rp.marmor, 0.97));
    for (let i = 0; i < 3; i++) b.box([w * (0.75 - i * 0.12), 0.035, 0.02], [0, y + h * 0.25 - i * h * 0.25, z + 0.065], rp.inschrift);
  };
  return bauRoem(kit, `grabmal-${art}`, at, turn, (b) => {
    if (art === "turm") {
      b.box([3.2, 0.9, 3.2], [0, 0.45, 0], "#ffffff", tv);
      b.box([2.6, 2.8, 2.6], [0, 2.3, 0], "#ffffff", m);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box([0.26, 2.7, 0.26], [sx * 1.25, 2.3, sz * 1.25], shade(rp.marmor, 0.93));
      b.box([2.9, 0.26, 2.9], [0, 3.83, 0], shade(rp.marmor, 0.95));
      b.add(new THREE.ConeGeometry(2.0, 2.2, 4), [0, 5.06, 0], "#ffffff", tiles(rp.ziegel), [0, 45, 0]);
      b.add(ballGrob, [0, 6.2, 0], rp.bronze, undefined, [0, 0, 0], [0.18, 0.28, 0.18]);
      tafel(b, 1.4, 0.8, 2.6, 1.3);
    } else if (art === "rund") {
      b.box([5.2, 1.1, 5.2], [0, 0.55, 0], "#ffffff", tv);
      b.add(new THREE.CylinderGeometry(2.3, 2.3, 2.4, 32), [0, 2.3, 0], "#ffffff", m);
      b.add(new THREE.CylinderGeometry(2.42, 2.42, 0.32, 32), [0, 3.3, 0], shade(rp.marmor, 0.9));   // Fries
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; b.add(ballGrob, [Math.sin(a) * 2.44, 3.3, Math.cos(a) * 2.44], rp.zypresse[0], undefined, [0, 0, 0], [0.14, 0.12, 0.14]); }   // Girlanden
      b.add(new THREE.ConeGeometry(2.2, 1.7, 32), [0, 4.3, 0], rp.gras);   // Erdhügel mit Gras
      b.add(new THREE.CylinderGeometry(0.08, 0.1, 0.6, 6), [0, 5.3, 0], rp.pinieStamm);
      b.add(new THREE.ConeGeometry(0.42, 2.2, 10), [0, 6.6, 0], rp.zypresse[1]);
      tafel(b, 1.6, 0.7, 2.2, 2.27);
    } else if (art === "altar") {
      b.box([2.4, 0.5, 1.8], [0, 0.25, 0], "#ffffff", tv);
      b.box([1.8, 1.7, 1.2], [0, 1.35, 0], "#ffffff", m);
      b.box([2.0, 0.2, 1.4], [0, 2.3, 0], shade(rp.marmor, 0.95));
      for (const s of [-1, 1]) b.add(new THREE.CylinderGeometry(0.2, 0.2, 1.36, 14), [s * 0.78, 2.6, 0], rp.marmor, undefined, [90, 0, 0]);   // Polster (Voluten)
      b.add(new THREE.ConeGeometry(0.45, 0.4, 3), [0, 2.6, 0.62], shade(rp.marmor, 0.96), undefined, [90, 0, 180]);
      for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.3, 0.06, 6, 14, Math.PI), [s * 0.5, 1.75, 0.62], rp.zypresse[0], undefined, [0, 0, 180]);   // Kranz
      tafel(b, 1.0, 0.5, 1.15, 0.6);
    } else {
      b.box([1.3, 0.3, 0.7], [0, 0.15, 0], "#ffffff", tv);
      b.box([1.0, 2.0, 0.26], [0, 1.3, 0], "#ffffff", m);
      const s = new THREE.Shape(); s.moveTo(-0.58, 0); s.lineTo(0.58, 0); s.lineTo(0, 0.42); s.closePath();
      const gg = extrude(s, 0.3); gg.translate(0, 0, -0.15); b.add(gg, [0, 2.3, 0], shade(rp.marmor, 0.95));
      b.add(ballGrob, [0, 1.75, 0.14], shade(rp.marmor, 0.9), undefined, [0, 0, 0], [0.18, 0.22, 0.04]);   // Bildnis
      tafel(b, 0.7, 0.5, 0.95, 0.13);
    }
    void r;
  });
};

// ---------------- Wegstation (mansio) ----------------
/** Wegstation: zweistöckiges Haus mit Ziegeldach und Säulenvorhalle, Stall mit Heu, Hofmauer mit Tor, Brunnen und Trog, Schild. */
export const mansio = (kit: Kit, rp: RP) => {
  return bauRoem(kit, "mansio", [0, 0, 0], 0, (b) => {
    const putz = plaster(rp.putz[1]), sockel = rubble(rp.travertin, shade(rp.travertin, 0.7)), dach = tiles(rp.ziegel);
    // Haus 14 × 7, Sockel, zwei Geschosse
    b.box([14.3, 0.6, 7.3], [0, 0.3, -1.5], "#ffffff", sockel);
    b.box([14, 5.6, 7], [0, 3.4, -1.5], "#ffffff", putz);
    b.box([14.4, 0.3, 7.4], [0, 6.35, -1.5], shade(rp.putz[2], 0.95));
    satteldach(b, 8.4, 2.4, 15.2, [0, 6.5, -1.5], rp.ziegel, dach);
    for (let i = 0; i < 6; i++) {   // Fenster mit Läden (oben) und Fenster unten
      const x = -5.6 + i * 2.25;
      b.box([0.8, 0.9, 0.08], [x, 4.9, 2.04], shade(rp.holzDunkel, 0.7));
      b.box([0.36, 0.95, 0.06], [x - 0.6, 4.9, 2.07], rp.tuch[1]); b.box([0.36, 0.95, 0.06], [x + 0.6, 4.9, 2.07], rp.tuch[1]);
      if (i !== 2 && i !== 3) b.box([0.7, 0.6, 0.08], [x, 2.3, 2.04], shade(rp.holzDunkel, 0.7));
    }
    b.box([2.0, 2.6, 0.1], [0, 1.9, 2.05], rp.holzDunkel);   // Tor
    b.box([0.1, 2.5, 0.06], [0, 1.9, 2.12], shade(rp.holzDunkel, 0.7));
    // Vorhalle: 6 Säulen, Pultdach
    for (let i = 0; i < 6; i++) saeule(b, -6.25 + i * 2.5, 0.6, 3.6, 3.0, 0.2, rp.putz[4]);
    b.box([14.2, 0.32, 0.5], [0, 3.76, 3.6], shade(rp.putz[4], 0.95));
    b.box([14.6, 0.14, 2.3], [0, 4.08, 2.95], "#ffffff", dach, [-9, 0, 0]);
    b.box([14.1, 0.16, 3.0], [0, 0.66, 3.4], shade(rp.travertin, 0.92));   // Boden der Vorhalle
    // Schild
    b.box([2.2, 0.55, 0.08], [0, 4.4, 4.0], rp.holz);
    b.box([1.6, 0.12, 0.03], [0, 4.4, 4.05], rp.inschrift);
    // Stall rechts: offen nach vorn, Pfosten, Pultdach, Heu
    b.box([6.4, 3.0, 0.3], [10.6, 1.5, -4.6], "#ffffff", planks(rp.holz));
    b.box([0.3, 3.0, 6.0], [13.65, 1.5, -1.75], "#ffffff", planks(rp.holz));
    for (const x of [7.8, 10.6, 13.4]) b.box([0.22, 2.7, 0.22], [x, 1.35, 1.0], rp.holzDunkel);
    b.box([7.0, 0.14, 6.6], [10.6, 3.05, -1.8], "#ffffff", dach, [8, 0, 0]);
    for (let i = 0; i < 5; i++) b.add(ballGrob, [8.6 + i * 1.0, 0.45, -3.4 + (i % 2) * 0.5], shade(rp.heu, 0.95 + i * 0.03), undefined, [0, i * 30, 0], [0.7, 0.45, 0.6]);
    // Hofmauer links mit Tor
    b.box([0.45, 1.8, 9], [-9.6, 0.9, 2.6], "#ffffff", plaster(rp.putz[2]));
    b.box([6, 1.8, 0.45], [-12.4, 0.9, 7.0], "#ffffff", plaster(rp.putz[2]));
    b.box([0.5, 2.2, 0.5], [-9.6, 1.1, 7.0], shade(rp.putz[2], 0.9));
    // Brunnen (puteal) und Trog
    b.add(new THREE.CylinderGeometry(0.62, 0.66, 0.85, 20), [-4.5, 0.43, 6.0], rp.marmor);
    b.add(new THREE.CylinderGeometry(0.46, 0.46, 0.06, 20), [-4.5, 0.83, 6.0], rp.wasser);
    b.box([2.2, 0.55, 0.7], [4.2, 0.28, 6.2], shade(rp.travertin, 0.9));
    b.box([2.0, 0.06, 0.5], [4.2, 0.53, 6.2], rp.wasser);
    b.teil("tuer", [2.0, 2.6, 0.2], [0, 1.9, 2.05]);
  });
};

// ---------------- Forum: Tempel, Säulenhalle, Bogen, Statue, Marktstand, Stadthäuser ----------------
/** Tempel auf hohem Podium: Freitreppe, 6 Säulen vorn (2 Reihen), Gebälk mit Fries, Giebel mit blauem Feld und goldener
 *  Scheibe, Cella mit Tür, Ziegeldach. Grösse ca. 15 × 26 m, Firsthöhe ~17 m. */
export const tempel = (kit: Kit, rp: RP) => {
  return bauRoem(kit, "tempel", [0, 0, 0], 0, (b) => {
    const m = marmor(rp.marmor, rp.marmorAder), tv = rubble(rp.travertin, shade(rp.travertin, 0.72));
    const W = 14, D = 24, PH = 3.2, CH = 9.5, R = 0.55;
    b.box([W, PH, D], [0, PH / 2, -D / 2 + 6], "#ffffff", tv);                        // Podium (vorn bei z 6)
    b.box([W + 0.3, 0.3, D + 0.3], [0, PH - 0.05, -D / 2 + 6], shade(rp.travertin, 0.9));   // Gesims
    for (let i = 0; i < 12; i++) b.box([10.2, PH / 12, 0.42], [0, (i + 0.5) * (PH / 12), 6 + 0.21 + (12 - i) * 0.42 - 0.42], "#ffffff", m);   // Treppe
    const y0 = PH + 0.1;
    for (const z of [5.0, 2.4]) for (let i = 0; i < 6; i++) saeule(b, -5.5 + i * 2.2, y0, z, CH, R, rp.marmor, m, shade(rp.marmor, 0.96));
    b.box([W - 1.2, CH, 19], [0, y0 + CH / 2, -8.5], "#ffffff", m);   // Cella hinter den Säulen (vorn bei z 1,0)
    b.box([2.4, 4.6, 0.12], [0, y0 + 2.3, 1.06], rp.bronze);   // Tür
    b.teil("tuer", [2.4, 4.6, 0.2], [0, y0 + 2.3, 1.06]);
    const ey = y0 + CH;
    b.box([W - 0.2, 0.7, 23], [0, ey + 0.35, -D / 2 + 6 + 0.1 + 0.5], shade(rp.marmor, 0.97));    // Architrav
    b.box([W - 0.1, 0.8, 23.2], [0, ey + 1.1, -D / 2 + 6 + 0.1 + 0.5], rp.tuch[1]);                // Fries (blau)
    for (let i = 0; i < 13; i++) b.box([0.35, 0.6, 0.08], [-6 + i * 1.0, ey + 1.1, 6.24], rp.gold);   // Triglyphen vorn
    b.box([W + 0.5, 0.36, 23.6], [0, ey + 1.68, -D / 2 + 6 + 0.5], shade(rp.marmor, 0.93));       // Gesims
    // Giebel: Rahmen (Marmor) mit zurückgesetztem blauem Feld und goldener Scheibe
    const gh = 3.4, gw = W + 0.3, gy = ey + 1.86;
    const aussen = new THREE.Shape(); aussen.moveTo(-gw / 2, 0); aussen.lineTo(gw / 2, 0); aussen.lineTo(0, gh); aussen.closePath();
    const loch = new THREE.Path(); loch.moveTo(-gw / 2 + 1.1, 0.35); loch.lineTo(0, gh - 0.55); loch.lineTo(gw / 2 - 1.1, 0.35); loch.closePath();
    aussen.holes.push(loch);
    b.add(extrude(aussen, 0.5), [0, gy, 5.85], rp.marmor);
    const feld = new THREE.Shape(); feld.moveTo(-gw / 2 + 1.1, 0.35); feld.lineTo(gw / 2 - 1.1, 0.35); feld.lineTo(0, gh - 0.55); feld.closePath();
    b.add(extrude(feld, 0.2), [0, gy, 5.95], rp.tuch[1]);
    b.add(new THREE.CylinderGeometry(0.7, 0.7, 0.16, 24), [0, gy + 1.15, 6.2], rp.gold, undefined, [90, 0, 0]);
    for (const s of [-1, 1]) b.add(ballGrob, [s * 3.0, gy + 0.75, 6.2], rp.gold, undefined, [0, 0, 0], [0.5, 0.3, 0.1]);
    satteldach(b, W + 1.2, gh + 0.4, 23.0, [0, gy - 0.1, -D / 2 + 6 + 0.5 - 0.6], rp.ziegel, tiles(rp.ziegel), -90);
    for (const x of [0, -gw / 2 + 0.2, gw / 2 - 0.2]) b.add(ballGrob, [x, x === 0 ? gy + gh + 0.45 : gy + 0.4, 6.1], rp.gold, undefined, [0, 0, 0], [0.32, 0.45, 0.2]);   // Akroterien
  });
};

/** Säulenhalle mit Läden (tabernae): Säulenreihe vorn, Pultdach, Rückwand mit Türen und bunten Vorhängen. Länge l entlang x. */
export const saeulenhalle = (kit: Kit, rp: RP, l: number, seed = 1) => {
  const r = new Rng(seed * 7 + 1);
  return bauRoem(kit, "saeulenhalle", [0, 0, 0], 0, (b) => {
    const m = marmor(rp.marmor, rp.marmorAder), n = Math.round(l / 3.2), H = 5.2, T = 5;
    b.box([l + 0.4, 0.3, T + 0.6], [0, 0.15, -T / 2], shade(rp.travertin, 0.95));
    for (let i = 0; i <= n; i++) saeule(b, -l / 2 + (i * l) / n, 0.3, 0, H, 0.26, rp.marmor, m);
    b.box([l + 0.3, 0.6, 0.7], [0, 0.3 + H + 0.3, 0], shade(rp.marmor, 0.96));
    b.box([l + 0.8, 0.16, T + 1.2], [0, 0.3 + H + 0.95, -T / 2], "#ffffff", tiles(rp.ziegel), [-12, 0, 0]);
    b.box([l + 0.2, H + 2.6, 0.5], [0, (H + 2.6) / 2, -T], "#ffffff", plaster(rp.putz[r.int(0, 3)]));
    for (let i = 0; i < n; i++) {   // Ladentüren mit Vorhang
      const x = -l / 2 + ((i + 0.5) * l) / n;
      b.box([1.7, 2.6, 0.08], [x, 1.6, -T + 0.29], shade(rp.holzDunkel, 0.6));
      b.box([1.8, 1.0, 0.06], [x, 2.55, -T + 0.36], r.pick(rp.tuch));
      b.teil("tuer", [1.7, 2.6, 0.2], [x, 1.6, -T + 0.29]);
    }
  });
};

/** Triumphbogen: drei Durchgänge, vier Säulen vorn und hinten, Attika mit Inschrift, vergoldete Figur oben. 12 × 15 m. */
export const triumphbogen = (kit: Kit, rp: RP) => {
  const g = bauRoem(kit, "triumphbogen", [0, 0, 0], 0, (b) => {
    const m = marmor(rp.marmor, rp.marmorAder), W = 12, H = 10.5, D = 4.4;
    const s = new THREE.Shape(); s.moveTo(-W / 2, 0); s.lineTo(W / 2, 0); s.lineTo(W / 2, H); s.lineTo(-W / 2, H); s.closePath();
    const loch = (x: number, w: number, h: number) => { const p = new THREE.Path(), r = w / 2; p.moveTo(x - r, 0); p.lineTo(x - r, h - r); p.absarc(x, h - r, r, Math.PI, 0, true); p.lineTo(x + r, 0); p.closePath(); return p; };
    s.holes.push(loch(0, 4.2, 7.6), loch(-4.15, 1.9, 4.6), loch(4.15, 1.9, 4.6));
    const kg = extrude(s, D); kg.translate(0, 0, -D / 2); b.add(kg, [0, 0, 0], "#ffffff", m);
    for (const z of [D / 2 + 0.45, -D / 2 - 0.45]) for (const x of [-5.4, -2.8, 2.8, 5.4]) {
      b.box([1.0, 2.0, 1.0], [x, 1.0, z], shade(rp.marmor, 0.94));
      saeule(b, x, 2.0, z, 6.6, 0.34, rp.marmor, m);
      b.box([1.0, 1.9, 0.9], [x, 9.55, z - Math.sign(z) * 0.1], shade(rp.marmor, 0.95));   // Gebälk-Vorsprung über der Säule
    }
    b.box([W + 0.6, 0.5, D + 0.6], [0, H + 0.25, 0], shade(rp.marmor, 0.92));
    b.box([W - 0.4, 3.0, D - 0.4], [0, H + 2.0, 0], "#ffffff", m);   // Attika
    b.box([W + 0.2, 0.36, D + 0.2], [0, H + 3.68, 0], shade(rp.marmor, 0.92));
    // Reliefs über den Seitendurchgängen und Siegesgöttinnen in den Zwickeln (gold)
    for (const x of [-4.15, 4.15]) b.box([2.2, 1.3, 0.1], [x, 6.6, D / 2 + 0.05], shade(rp.marmor, 0.88));
    for (const x of [-1.6, 1.6]) b.add(ballGrob, [x, 8.3, D / 2 + 0.08], rp.gold, undefined, [0, 0, x * 10], [0.7, 0.32, 0.08]);
    // Quadriga-Andeutung oben: goldene Figur auf Sockel
    b.box([2.4, 0.6, 1.6], [0, H + 4.16, 0], shade(rp.marmor, 0.95));
    b.add(new THREE.CylinderGeometry(0.32, 0.52, 1.7, 12), [0, H + 5.3, 0], rp.gold);
    b.add(ball, [0, H + 6.4, 0], rp.gold, undefined, [0, 0, 0], [0.3, 0.32, 0.3]);
    b.add(new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8), [0.5, H + 6.3, 0], rp.gold, undefined, [0, 0, -30]);
  });
  const tex = inschrift(["SENATVS · POPVLVSQVE", "ROMANVS"], rp.marmor, shade(rp.bronze, 0.6));
  for (const s of [1, -1]) {
    const t = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 2.0), kit.mat("#ffffff", tex));
    t.position.set(0, 10.5 + 2.0, s * 2.03); t.rotation.y = s > 0 ? 0 : Math.PI; g.add(t);
  }
  return g;
};

/** Statue auf Sockel: Gestalt in Toga (Marmor oder Bronze), ein Arm erhoben. */
export const statue = (kit: Kit, rp: RP, at: V3, turn = 0, bronze = false) => {
  const c = bronze ? rp.bronze : rp.marmor, c2 = bronze ? shade(rp.bronze, 0.82) : shade(rp.marmor, 0.9);
  return bauRoem(kit, "statue", at, turn, (b) => {
    b.box([1.4, 0.3, 1.4], [0, 0.15, 0], shade(rp.marmor, 0.92));
    b.box([1.1, 1.6, 1.1], [0, 1.1, 0], "#ffffff", marmor(rp.marmor, rp.marmorAder));
    b.box([1.3, 0.2, 1.3], [0, 2.0, 0], shade(rp.marmor, 0.92));
    b.add(new THREE.CylinderGeometry(0.28, 0.44, 1.5, 12), [0, 2.85, 0], c);            // Gewand
    b.add(new THREE.CylinderGeometry(0.12, 0.42, 0.9, 12), [0.06, 3.3, 0.02], c2, undefined, [0, 0, -14]);   // Toga-Bausch
    b.add(ball, [0, 3.85, 0], c, undefined, [0, 0, 0], [0.18, 0.21, 0.18]);
    b.add(new THREE.CylinderGeometry(0.07, 0.08, 0.8, 8), [0.38, 3.85, 0.05], c, undefined, [0, 0, -40]);   // erhobener Arm
    b.add(new THREE.CylinderGeometry(0.07, 0.08, 0.7, 8), [-0.3, 3.15, 0.08], c, undefined, [0, 0, 12]);
  });
};

/** Marktstand: Tisch mit Tuch, gestreiftes Sonnendach, Amphoren, Körbe mit Obst, Brote. */
export const marktstand = (kit: Kit, rp: RP, at: V3, turn = 0, seed = 1) => {
  const r = new Rng(seed * 13 + 7), tuch = r.pick(rp.tuch), obst = ["#e34b3a", "#f2c230", "#7cc24a", "#e8862a", "#8e4fb8"];
  return bauRoem(kit, "marktstand", at, turn, (b) => {
    b.box([2.6, 0.08, 1.1], [0, 0.86, 0], rp.holz);
    for (const x of [-1.2, 1.2]) for (const z of [-0.45, 0.45]) b.box([0.08, 0.86, 0.08], [x, 0.43, z], rp.holzDunkel);
    b.box([2.7, 0.5, 0.04], [0, 0.6, 0.57], tuch);
    for (const x of [-1.3, 1.3]) for (const z of [-0.6, 0.6]) b.box([0.07, 2.4, 0.07], [x, 1.2, z], rp.holzDunkel);
    b.box([3.0, 0.06, 1.6], [0, 2.42, 0], "#ffffff", stripes(r.pick(rp.tuch), "#fff6e0"), [-8, 0, 0]);
    for (let i = 0; i < 3; i++) {
      const x = -0.85 + i * 0.85, f = r.pick(obst);
      b.add(new THREE.CylinderGeometry(0.3, 0.24, 0.22, 12), [x, 1.0, 0.05], rp.korb);
      for (let k = 0; k < 6; k++) b.add(ball, [x + r.range(-0.16, 0.16), 1.15 + r.range(0, 0.06), 0.05 + r.range(-0.16, 0.16)], f, undefined, [0, 0, 0], [0.08, 0.08, 0.08]);
    }
    for (let i = 0; i < 3; i++) b.add(ball, [-0.9 + i * 0.3, 0.97, -0.38], "#d9a05a", undefined, [0, 0, 0], [0.13, 0.08, 0.13]);   // Brote
    amphore(b, rp, [1.7, 0, -0.2], 1.0); amphore(b, rp, [1.95, 0, 0.3], 0.9); amphore(b, rp, [-1.75, 0, 0.2], 0.95);
  }, false);
};

/** Amphore (Ton): Bauch, Hals, zwei Henkel, spitzer Fuss im Ständer-Ring. */
export const amphore = (b: B, rp: RP, at: V3, s = 1) => {
  const pts = [[0.02, 0], [0.09, 0.12], [0.2, 0.4], [0.22, 0.55], [0.18, 0.75], [0.07, 0.85], [0.06, 1.0], [0.09, 1.04]].map(([x, y]) => new THREE.Vector2(x * s, y * s));
  b.add(new THREE.LatheGeometry(pts, 14), [at[0], at[1] + 0.06 * s, at[2]], rp.amphore);
  for (const k of [-1, 1]) b.add(new THREE.TorusGeometry(0.09 * s, 0.022 * s, 5, 10, Math.PI), [at[0] + k * 0.1 * s, at[1] + 0.92 * s, at[2]], shade(rp.amphore, 0.9), undefined, [0, 0, k > 0 ? -70 : 70]);
  b.add(new THREE.TorusGeometry(0.1 * s, 0.025 * s, 5, 14), [at[0], at[1] + 0.12 * s, at[2]], rp.holzDunkel, undefined, [90, 0, 0]);
};

/** Stadthaus (Hintergrund ums Forum): 2–4 Geschosse, Putz in Farben, Fensterreihen, Balkon, Ziegel-Walmdach. */
export const stadthaus = (kit: Kit, rp: RP, w: number, d: number, stock: number, seed = 1) => {
  const r = new Rng(seed * 17 + 5), h = stock * 3.1, farbe = r.pick(rp.putz);
  return bauRoem(kit, "stadthaus", [0, 0, 0], 0, (b) => {
    b.box([w, h, d], [0, h / 2, 0], "#ffffff", plaster(farbe));
    b.box([w + 0.3, 0.25, d + 0.3], [0, h + 0.12, 0], shade(farbe, 0.85));
    b.add(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.3, 2.2, 4), [0, h + 1.35, 0], "#ffffff", tiles(rp.ziegel), [0, 45, 0], [w / Math.hypot(w, d) * 1.414, 1, d / Math.hypot(w, d) * 1.414]);
    const nx = Math.max(1, Math.floor(w / 2.4));
    for (let k = 0; k < stock; k++) for (let i = 0; i < nx; i++) {
      const x = -w / 2 + ((i + 0.5) * w) / nx, y = 1.7 + k * 3.1;
      b.box([0.8, k ? 1.1 : 1.6, 0.08], [x, y, d / 2 + 0.04], shade(rp.holzDunkel, 0.6));
      if (k) b.box([0.95, 0.08, 0.12], [x, y - 0.65, d / 2 + 0.08], shade(farbe, 0.8));
    }
    if (stock > 1 && r.next() < 0.6) {   // Holzbalkon
      b.box([w * 0.6, 0.12, 0.9], [0, 3.2, d / 2 + 0.45], rp.holz);
      b.box([w * 0.6, 0.6, 0.06], [0, 3.55, d / 2 + 0.88], rp.holzDunkel);
    }
  });
};

// ---------------- Legionslager ----------------
/** Lederzelt (Legionärs-Zelt für acht Mann): Firstzelt aus Lederbahnen, Spannseile, offene Tür vorn. 3 × 3 m. */
export const zelt = (kit: Kit, rp: RP, at: V3, turn = 0) => {
  return bauRoem(kit, "zelt", at, turn, (b) => {
    const s = new THREE.Shape(); s.moveTo(-1.6, 0); s.lineTo(1.6, 0); s.lineTo(1.5, 0.7); s.lineTo(0, 2.1); s.lineTo(-1.5, 0.7); s.closePath();
    const g = extrude(s, 3.2); g.translate(0, 0, -1.6); b.add(g, [0, 0, 0], "#ffffff", stripes(rp.zelt, rp.zeltDunkel), [0, 90, 0]);
    const t = new THREE.Shape(); t.moveTo(-0.55, 0); t.lineTo(0.55, 0); t.lineTo(0, 1.5); t.closePath();
    b.add(extrude(t, 0.04), [1.6, 0, 0], shade(rp.leder, 0.45), undefined, [0, 90, 0]);   // Türöffnung (dunkel) vorn
    for (const s2 of [-1, 1]) for (const z of [-1.2, 0, 1.2]) {   // Spannseile mit Heringen
      b.add(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4), [z, 0.42, s2 * 1.95], "#e9e0c8", undefined, [s2 * 50, 0, 0]);
      b.add(new THREE.CylinderGeometry(0.03, 0.02, 0.28, 5), [z, 0.1, s2 * 2.3], rp.holzDunkel, undefined, [s2 * 20, 0, 0]);
    }
    b.add(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), [1.75, 1.0, 0], rp.holzDunkel);
  }, false);
};

// ---------------- Steinbrücke ----------------
/** Steinbrücke über einen Fluss, Strasse läuft gerade darüber (entlang z). Länge l (z), Breite w (x), drei Bögen mit Radius r
 *  um die Mitten `boegen` (z), Fahrbahn-Oberkante y 0, Fuss bei y fuss. Pfeiler mit Wellenbrechern, Brüstungen. */
export const bruecke = (kit: Kit, rp: RP, l: number, w: number, boegen: number[], r: number, fuss: number) => {
  return bauRoem(kit, "bruecke", [0, 0, 0], 0, (b) => {
    const st = rubble(rp.travertin, shade(rp.travertin, 0.7)), kr = shade(rp.travertin, 0.86);
    const s = new THREE.Shape(); s.moveTo(-l / 2, fuss); s.lineTo(l / 2, fuss); s.lineTo(l / 2, 0); s.lineTo(-l / 2, 0); s.closePath();
    for (const zc of boegen) {
      const p = new THREE.Path(); const sy = -r - 0.7;   // Kämpfer unter dem Scheitel (Scheitel bei y −0,7)
      p.moveTo(zc - r, fuss + 0.01); p.lineTo(zc - r, sy); p.absarc(zc, sy, r, Math.PI, 0, true); p.lineTo(zc + r, fuss + 0.01); p.closePath();
      s.holes.push(p);
    }
    // Profil liegt in der Ebene (z, y): extrudiert entlang x
    const g = extrude(s, w); g.translate(0, 0, -w / 2); b.add(g, [0, 0, 0], "#ffffff", st, [0, 90, 0]);
    for (const zc of boegen) {   // Bogensteine (Keilsteine) als Ring vor beiden Seiten
      const ring = archFrame(2 * r, 2 * r + 0.0, 0.55);
      for (const sx of [1, -1]) b.add(extrude(ring, 0.12), [sx * (w / 2 + (sx > 0 ? 0 : 0.12)), -r - 0.7 - r, zc], kr, undefined, [0, 90, 0]);
    }
    for (let i = 0; i < boegen.length - 1; i++) {   // Wellenbrecher (dreieckig) flussaufwärts (+x) und abwärts
      const zc = (boegen[i] + boegen[i + 1]) / 2, pw = boegen[i + 1] - boegen[i] - 2 * r;
      for (const sx of [1, -1]) {
        const t = new THREE.Shape(); t.moveTo(-pw / 2, 0); t.lineTo(pw / 2, 0); t.lineTo(0, pw * 0.8); t.closePath();
        const gg = extrude(t, Math.abs(fuss) - 1.2); b.add(gg, [sx * w / 2, fuss, zc], kr, undefined, [-90, sx > 0 ? -90 : 90, 0]);
      }
    }
    for (const sx of [-1, 1]) {   // Brüstungen mit Abdeckplatte
      b.box([0.36, 0.85, l], [sx * (w / 2 - 0.18), 0.42, 0], "#ffffff", st);
      b.box([0.5, 0.12, l + 0.1], [sx * (w / 2 - 0.18), 0.9, 0], kr);
    }
    b.box([w + 0.3, 0.3, l + 0.2], [0, -0.45, 0], kr);   // Gesims unter der Brüstung
  }, false);   // Teil der Landschaft: wird für die Sichtlinie nie ausgeblendet
};

/** Polygon-Pflaster als Fahrbahn-Fläche (für Szenen, die Pflaster brauchen). */
export const pflasterTextur = (rp: RP) => pflasterRoem(rp.pflaster, rp.pflasterFuge);
export const moertelTextur = (rp: RP) => moertel(rp.kalk, rp.kiesel);
