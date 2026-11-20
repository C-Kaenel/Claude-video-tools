// Herkunft: eigen (V-Video), geschrieben 2026-11-18, ohne Vorlage.
// Requisiten der Römer-Welt: Ochse (nickt), Ochsenkarren mit Steinen, Stampfer, Werkzeug (Schaufel, Spitzhacke, Körbe),
// Steinhaufen, Kieshaufen, Mörtelkasten, Fluchtstangen, Groma (Vermessungsgerät, die Lote pendeln), Feldzeichen (Vexillum
// weht, Signum, Adler), Schildständer mit roten Schilden und Speeren, Amphoren-Gruppe, Kochfeuer. Ursprung = Mitte am Boden.
import * as THREE from "three";
import { Rng } from "../core/random";
import { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { kies, moertel, planks, rubble, shade, stripes } from "./paint";
import { rauchsaeule, type Lebendig } from "./leben";
import { amphore, bauRoem } from "./roemer-bauten";
import type { RoemerPalette } from "./roemer";

type B = ReturnType<Kit["batch"]>;
type RP = RoemerPalette;
const ball = new THREE.IcosahedronGeometry(1, 2);
const ballGrob = new THREE.IcosahedronGeometry(1, 1);
const rad = THREE.MathUtils.degToRad;

// ---------------- Tiere und Wagen ----------------
const ochsKoerper = (b: B, rp: RP, dunkel = false) => {
  const f = dunkel ? rp.ochseDunkel : rp.ochse, f2 = shade(f, 0.82);
  b.add(ball, [0, 1.05, 0], f, undefined, [0, 0, 0], [0.95, 0.5, 0.42]);
  b.add(ball, [0.45, 1.18, 0], f, undefined, [0, 0, 0], [0.5, 0.52, 0.44]);           // Widerrist
  b.add(ball, [0.62, 0.72, 0], shade(f, 1.08), undefined, [0, 0, 0], [0.22, 0.26, 0.16]);   // Wamme
  for (const x of [-0.6, 0.55]) for (const z of [-0.22, 0.22]) {
    b.add(new THREE.CylinderGeometry(0.09, 0.08, 0.72, 7), [x, 0.4, z], f2);
    b.add(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 7), [x, 0.05, z], shade(f, 0.45));   // Huf
  }
  b.add(new THREE.CylinderGeometry(0.03, 0.02, 0.8, 5), [-0.98, 0.78, 0], f2, undefined, [0, 0, -12]);   // Schwanz
  b.add(ballGrob, [-1.06, 0.38, 0], shade(f, 0.5), undefined, [0, 0, 0], [0.06, 0.12, 0.06]);
};
const ochsKopf = (kit: Kit, rp: RP, dunkel = false) => bauRoem(kit, "ochsenkopf", [0, 0, 0], 0, (b) => {
  const f = dunkel ? rp.ochseDunkel : rp.ochse;
  b.add(ball, [0.22, -0.12, 0], f, undefined, [0, 0, -30], [0.34, 0.2, 0.2]);
  b.add(ball, [0.42, -0.3, 0], shade(f, 1.15), undefined, [0, 0, 0], [0.15, 0.12, 0.15]);   // Maul
  for (const s of [-1, 1]) {
    b.add(new THREE.ConeGeometry(0.05, 0.36, 6), [0.08, 0.1, s * 0.24], rp.horn, undefined, [s * -70, 0, 0]);
    b.add(ball, [0.0, -0.02, s * 0.22], shade(f, 0.85), undefined, [0, 0, 0], [0.07, 0.04, 0.12]);   // Ohr
    b.add(ball, [0.3, 0.0, s * 0.13], "#ffffff", undefined, [0, 0, 0], [0.045, 0.045, 0.03]);
    b.add(ball, [0.32, 0.0, s * 0.145], "#1d1a24", undefined, [0, 0, 0], [0.022, 0.022, 0.02]);
  }
}, false);
/** Ochse (vorn = +x): massiger Körper, Hörner, nickt langsam mit dem Kopf. */
export const ochse = (kit: Kit, rp: RP, at: V3, turn = 0, phase = 0, dunkel = false): Lebendig => {
  const g = bauRoem(kit, "ochse", [0, 0, 0], 0, (b) => ochsKoerper(b, rp, dunkel));
  const kopf = ochsKopf(kit, rp, dunkel); kopf.position.set(0.98, 1.2, 0); g.add(kopf);
  g.position.set(...at); g.rotation.y = rad(turn);
  return { obj: g, tick: (t) => { kopf.rotation.z = -0.12 - 0.12 * Math.sin(t * 0.8 + phase); } };
};

/** Ochsenkarren (vorn = +x): zwei Speichenräder, Kasten aus Brettern, voll mit Steinen, Deichsel mit Joch, zwei Ochsen. */
export const ochsenkarren = (kit: Kit, rp: RP, at: V3, turn = 0, phase = 0, ladung: "steine" | "kies" | "amphoren" = "steine"): Lebendig => {
  const r = new Rng(7);
  const g = bauRoem(kit, "ochsenkarren", [0, 0, 0], 0, (b) => {
    const brett = planks(rp.holz);
    b.box([2.6, 0.12, 1.5], [0, 0.95, 0], "#ffffff", brett);
    for (const s of [-1, 1]) b.box([2.6, 0.5, 0.08], [0, 1.24, s * 0.79], "#ffffff", brett);
    for (const s of [-1, 1]) b.box([0.08, 0.5, 1.5], [s * 1.34, 1.24, 0], "#ffffff", brett);
    b.add(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 8), [0, 0.6, 0], rp.holzDunkel, undefined, [90, 0, 0]);   // Achse
    for (const s of [-1, 1]) {   // Räder mit acht Speichen
      b.add(new THREE.TorusGeometry(0.56, 0.06, 6, 22), [0, 0.6, s * 0.98], rp.holzDunkel);
      b.add(new THREE.TorusGeometry(0.6, 0.025, 4, 22), [0, 0.6, s * 0.98], rp.eisen);
      for (let i = 0; i < 4; i++) b.box([1.1, 0.06, 0.05], [0, 0.6, s * 0.98], rp.holz, undefined, [0, 0, i * 45]);
      b.add(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 10), [0, 0.6, s * 0.98], rp.holzDunkel, undefined, [90, 0, 0]);
    }
    b.box([3.0, 0.1, 0.12], [2.7, 0.95, 0], rp.holzDunkel);                      // Deichsel
    b.box([0.14, 0.14, 1.9], [4.15, 1.42, 0], rp.holz);                          // Joch
    for (const s of [-1, 1]) b.add(new THREE.TorusGeometry(0.2, 0.03, 5, 12, Math.PI), [4.15, 1.3, s * 0.55], rp.holzDunkel, undefined, [0, 90, 180]);
    if (ladung === "steine") for (let i = 0; i < 14; i++)
      b.add(ballGrob, [r.range(-1.0, 1.0), 1.2 + r.range(0, 0.35), r.range(-0.55, 0.55)], "#ffffff", rubble(rp.statumen, rp.statumenFuge), [r.range(0, 90), r.range(0, 180), 0], [r.range(0.22, 0.32), r.range(0.16, 0.24), r.range(0.2, 0.3)]);
    else if (ladung === "kies") b.add(ball, [0, 1.3, 0], "#ffffff", kies(rp.kies, rp.kiesFuge), [0, 0, 0], [1.2, 0.35, 0.7]);
    else for (let i = 0; i < 8; i++) amphore(b, rp, [-0.9 + (i % 4) * 0.6, 1.0, i < 4 ? -0.35 : 0.35], 0.8);
  });
  const o1 = ochse(kit, rp, [4.6, 0, 0.55], 0, phase), o2 = ochse(kit, rp, [4.6, 0, -0.55], 0, phase + 1.4, true);
  g.add(o1.obj, o2.obj);
  g.position.set(...at); g.rotation.y = rad(turn); g.userData.occluder = true;
  return { obj: g, tick: (t) => { o1.tick(t); o2.tick(t); } };
};

// ---------------- Baustelle ----------------
/** Stampfer (Ramme): drei schwere Holzklötze mit Griffstangen, an einen Bock gelehnt. */
export const stampfer = (kit: Kit, rp: RP, at: V3, turn = 0) => bauRoem(kit, "stampfer", at, turn, (b) => {
  b.box([1.6, 0.1, 0.1], [0, 1.1, 0], rp.holzDunkel);
  for (const x of [-0.75, 0.75]) b.box([0.1, 1.15, 0.1], [x, 0.56, 0], rp.holzDunkel, undefined, [12, 0, 0]);
  for (let i = 0; i < 3; i++) {
    const x = -0.5 + i * 0.5;
    b.add(new THREE.CylinderGeometry(0.2, 0.22, 0.42, 10), [x, 0.21, 0.45], rp.holz, undefined, [-18, 0, 0]);
    b.add(new THREE.CylinderGeometry(0.035, 0.035, 1.5, 6), [x, 0.95, 0.24], shade(rp.holz, 1.1), undefined, [-18, 0, 0]);
    b.box([0.42, 0.05, 0.05], [x, 1.55, 0.03], rp.holzDunkel, undefined, [-18, 0, 0]);   // Querholz
  }
}, false);

/** Werkzeug: Schaufeln und Spitzhacken an einem Bock, Weidenkörbe mit Kies. */
export const werkzeug = (kit: Kit, rp: RP, at: V3, turn = 0) => bauRoem(kit, "werkzeug", at, turn, (b) => {
  b.box([2.0, 0.1, 0.1], [0, 1.0, 0], rp.holzDunkel);
  for (const x of [-0.95, 0.95]) b.box([0.1, 1.05, 0.1], [x, 0.5, 0], rp.holzDunkel);
  for (let i = 0; i < 3; i++) {   // Schaufeln (Eisenblatt unten)
    const x = -0.65 + i * 0.35;
    b.add(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 6), [x, 0.75, 0.16], rp.holz, undefined, [-10, 0, 0]);
    b.box([0.22, 0.3, 0.03], [x, 0.12, 0.28], rp.eisen, undefined, [-10, 0, 0]);
  }
  for (let i = 0; i < 2; i++) {   // Spitzhacken (dolabra): Stiel, Blatt + Spitze
    const x = 0.35 + i * 0.4;
    b.add(new THREE.CylinderGeometry(0.028, 0.028, 1.2, 6), [x, 0.6, 0.15], rp.holz, undefined, [-10, 0, 0]);
    b.box([0.5, 0.06, 0.05], [x, 1.18, 0.05], rp.eisen);
    b.add(new THREE.ConeGeometry(0.04, 0.2, 5), [x - 0.32, 1.18, 0.05], rp.eisen, undefined, [0, 0, 90]);
  }
  for (const [x, z] of [[-1.5, 0.6], [1.5, 0.5], [1.2, 1.1]] as const) korbKies(b, rp, [x, 0, z]);
}, false);

/** Weidenkorb mit Kies. */
export const korbKies = (b: B, rp: RP, at: V3, s = 1) => {
  b.add(new THREE.CylinderGeometry(0.32 * s, 0.24 * s, 0.4 * s, 12, 1, true), [at[0], at[1] + 0.2 * s, at[2]], "#ffffff", stripes(rp.korb, shade(rp.korb, 0.78)));
  b.add(new THREE.CylinderGeometry(0.24 * s, 0.24 * s, 0.04, 12), [at[0], at[1] + 0.02, at[2]], shade(rp.korb, 0.8));
  b.add(ball, [at[0], at[1] + 0.36 * s, at[2]], "#ffffff", kies(rp.kies, rp.kiesFuge), [0, 0, 0], [0.29 * s, 0.1 * s, 0.29 * s]);
  b.add(new THREE.TorusGeometry(0.2 * s, 0.02, 4, 10, Math.PI), [at[0], at[1] + 0.4 * s, at[2]], shade(rp.korb, 0.85));
};

/** Haufen grober Steine (für die unterste Schicht, statumen). */
export const steinhaufen = (kit: Kit, rp: RP, at: V3, s = 1, seed = 1) => {
  const r = new Rng(seed * 23 + 3), p = rubble(rp.statumen, rp.statumenFuge);
  return bauRoem(kit, "steinhaufen", at, 0, (b) => {
    for (let i = 0; i < 22; i++) {
      const a = r.range(0, Math.PI * 2), d = r.range(0, 1.2) * s, y = (1.25 - d / s) * 0.45 * s;
      b.add(ballGrob, [Math.cos(a) * d, Math.max(0.12, y) * s, Math.sin(a) * d], "#ffffff", p, [r.range(0, 90), r.range(0, 180), r.range(0, 40)], [r.range(0.24, 0.36) * s, r.range(0.17, 0.26) * s, r.range(0.22, 0.32) * s]);
    }
  });
};
/** Kieshaufen (für die mittlere Schicht, rudus): flacher Kegel mit Kies-Textur. */
export const kieshaufen = (kit: Kit, rp: RP, at: V3, s = 1) => bauRoem(kit, "kieshaufen", at, 0, (b) => {
  b.add(new THREE.ConeGeometry(1.5 * s, 1.0 * s, 20), [0, 0.48 * s, 0], "#ffffff", kies(rp.rudus, rp.kiesFuge));
  b.add(new THREE.ConeGeometry(0.9 * s, 0.5 * s, 16), [0.9 * s, 0.22 * s, 0.6 * s], "#ffffff", kies(rp.kies, rp.kiesFuge));
});
/** Mörtelkasten: Holzkasten mit Kalkmörtel, Kelle, Kalksäcke daneben. */
export const moertelkasten = (kit: Kit, rp: RP, at: V3, turn = 0) => bauRoem(kit, "moertelkasten", at, turn, (b) => {
  const brett = planks(rp.holzDunkel);
  b.box([2.0, 0.08, 1.1], [0, 0.04, 0], "#ffffff", brett);
  for (const s of [-1, 1]) b.box([2.0, 0.42, 0.08], [0, 0.25, s * 0.55], "#ffffff", brett);
  for (const s of [-1, 1]) b.box([0.08, 0.42, 1.18], [s * 1.0, 0.25, 0], "#ffffff", brett);
  b.box([1.9, 0.06, 1.0], [0, 0.33, 0], "#ffffff", moertel(rp.kalk, rp.kiesel));
  b.add(new THREE.CylinderGeometry(0.025, 0.025, 1.0, 6), [0.3, 0.55, 0.1], rp.holz, undefined, [0, 30, 60]);   // Rührholz
  for (let i = 0; i < 3; i++) b.add(ball, [-1.6 + i * 0.1, 0.25, -0.3 + i * 0.4], "#f0e8d8", undefined, [0, i * 40, 0], [0.32, 0.25, 0.24]);   // Kalksäcke
}, false);

// ---------------- Vermessung ----------------
/** Fluchtstange: rot-weiss gestreifter Stab mit Spitze. */
export const fluchtstange = (kit: Kit, rp: RP, at: V3, h = 2.4) => bauRoem(kit, "fluchtstange", at, 0, (b) => {
  const n = 6;
  for (let i = 0; i < n; i++) b.add(new THREE.CylinderGeometry(0.035, 0.035, h / n, 8), [0, (i + 0.5) * (h / n), 0], i % 2 ? "#ffffff" : rp.rot);
  b.add(new THREE.ConeGeometry(0.035, 0.12, 8), [0, -0.05, 0], rp.eisen, undefined, [180, 0, 0]);
  b.add(new THREE.ConeGeometry(0.06, 0.14, 8), [0, h + 0.07, 0], rp.gold);
}, false);

/** Groma: Stange (2 m) mit drehbarem Arm, darauf das Kreuz mit vier Loten an Schnüren; die Lote pendeln leicht. */
export const groma = (kit: Kit, rp: RP, at: V3, turn = 0, phase = 0): Lebendig => {
  const g = bauRoem(kit, "groma", [0, 0, 0], 0, (b) => {
    b.add(new THREE.CylinderGeometry(0.04, 0.05, 2.1, 8), [0, 1.05, 0], rp.holz);
    b.add(new THREE.ConeGeometry(0.05, 0.16, 8), [0, -0.06, 0], rp.eisen, undefined, [180, 0, 0]);
    b.box([0.42, 0.05, 0.06], [0.19, 2.08, 0], rp.holzDunkel);                    // Ausleger (Arm)
    b.add(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 6), [0.38, 2.14, 0], rp.bronze);
    b.box([1.6, 0.05, 0.06], [0.38, 2.22, 0], rp.holz);                            // Kreuz
    b.box([0.06, 0.05, 1.6], [0.38, 2.22, 0], rp.holz);
    b.add(ballGrob, [0.38, 2.26, 0], rp.bronze, undefined, [0, 0, 0], [0.06, 0.04, 0.06]);
  });
  const lote: THREE.Group[] = [];
  for (const [dx, dz] of [[0.78, 0], [-0.78, 0], [0, 0.78], [0, -0.78]] as const) {
    const lot = bauRoem(kit, "lot", [0, 0, 0], 0, (b) => {
      b.add(new THREE.CylinderGeometry(0.006, 0.006, 0.9, 4), [0, -0.45, 0], "#2a2522");
      b.add(new THREE.ConeGeometry(0.05, 0.14, 8), [0, -0.96, 0], rp.bronze, undefined, [180, 0, 0]);
      b.add(ballGrob, [0, -0.88, 0], rp.bronze, undefined, [0, 0, 0], [0.05, 0.04, 0.05]);
    }, false);
    lot.position.set(0.38 + dx, 2.2, dz); g.add(lot); lote.push(lot);
  }
  g.position.set(...at); g.rotation.y = rad(turn); g.userData.occluder = true;
  return { obj: g, tick: (t) => lote.forEach((l, i) => { l.rotation.z = 0.07 * Math.sin(t * 2.1 + phase + i * 1.3); l.rotation.x = 0.05 * Math.sin(t * 1.7 + phase + i * 0.7); }) };
};

// ---------------- Feldzeichen und Lager ----------------
/** Vexillum: Stange mit Querholz, rotes Fahnentuch mit goldenem Rand und Fransen, das leicht schwingt. */
export const vexillum = (kit: Kit, rp: RP, at: V3, turn = 0, phase = 0): Lebendig => {
  const g = bauRoem(kit, "vexillum", [0, 0, 0], 0, (b) => {
    b.add(new THREE.CylinderGeometry(0.04, 0.05, 3.4, 8), [0, 1.7, 0], rp.holzDunkel);
    b.add(new THREE.ConeGeometry(0.07, 0.3, 4), [0, 3.55, 0], rp.gold);
    b.box([1.1, 0.06, 0.06], [0, 3.1, 0.05], rp.holzDunkel);
    for (const s of [-1, 1]) b.add(ballGrob, [s * 0.58, 3.1, 0.05], rp.gold, undefined, [0, 0, 0], [0.06, 0.06, 0.06]);
  });
  const tuch = bauRoem(kit, "vexillum-tuch", [0, 0, 0], 0, (b) => {
    b.box([1.0, 1.1, 0.03], [0, -0.58, 0], rp.rot);
    b.box([0.86, 0.06, 0.07], [0, -0.16, 0], rp.gold); b.box([0.86, 0.06, 0.07], [0, -1.0, 0], rp.gold);   // dicker als das Tuch: keine deckungsgleichen Flächen
    b.add(ballGrob, [0, -0.58, 0.045], rp.gold, undefined, [0, 0, 0], [0.18, 0.18, 0.025]);   // Lorbeer-Scheibe
    for (let i = 0; i < 10; i++) b.box([0.03, 0.16, 0.022], [-0.45 + i * 0.1, -1.19, 0], rp.gold);   // Fransen (stecken ins Tuch, dünner als das Tuch)
  }, false);
  tuch.position.set(0, 3.07, 0.06); g.add(tuch);
  g.position.set(...at); g.rotation.y = rad(turn); g.userData.occluder = true;
  return { obj: g, tick: (t) => { tuch.rotation.x = -0.12 - 0.1 * Math.sin(t * 1.6 + phase); tuch.rotation.y = 0.06 * Math.sin(t * 1.1 + phase); } };
};
/** Signum: Stange mit Scheiben (phalerae), Kranz und offener Hand oben; `adler`: stattdessen goldener Adler (aquila). */
export const signum = (kit: Kit, rp: RP, at: V3, turn = 0, adler = false) => bauRoem(kit, adler ? "aquila" : "signum", at, turn, (b) => {
  b.add(new THREE.CylinderGeometry(0.04, 0.05, 3.6, 8), [0, 1.8, 0], rp.holzDunkel);
  if (!adler) {
    for (let i = 0; i < 5; i++) b.add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 16), [0, 1.6 + i * 0.38, 0.05], i === 2 ? rp.gold : rp.bronze, undefined, [90, 0, 0]);
    b.add(new THREE.TorusGeometry(0.22, 0.04, 6, 16), [0, 3.55, 0.03], rp.zypresse[1]);
    b.box([0.2, 0.28, 0.05], [0, 3.95, 0], rp.gold); for (let i = 0; i < 4; i++) b.box([0.04, 0.14, 0.04], [-0.075 + i * 0.05, 4.15, 0], rp.gold);
    b.box([0.6, 0.05, 0.05], [0, 3.2, 0], rp.gold);
    for (const s of [-1, 1]) b.box([0.04, 0.4, 0.02], [s * 0.28, 3.0, 0], rp.rot);
  } else {
    b.box([0.4, 0.14, 0.3], [0, 3.62, 0], rp.gold);
    b.add(ball, [0, 3.85, 0], rp.gold, undefined, [0, 0, 0], [0.13, 0.18, 0.12]);
    b.add(ball, [0, 4.1, 0.06], rp.gold, undefined, [0, 0, 0], [0.08, 0.08, 0.09]);
    b.add(new THREE.ConeGeometry(0.03, 0.1, 5), [0, 4.08, 0.17], shade(rp.gold, 0.8), undefined, [90, 0, 0]);
    for (const s of [-1, 1]) b.box([0.55, 0.3, 0.04], [s * 0.3, 4.0, -0.02], rp.gold, undefined, [0, 0, s * 25]);   // Flügel
  }
}, true);
/** Schildständer: Holzgestell mit drei roten Rechteck-Schilden (scutum, gebogen, goldener Buckel und Blitze) und Speeren (pila). */
export const scutumstaender = (kit: Kit, rp: RP, at: V3, turn = 0) => bauRoem(kit, "scutumstaender", at, turn, (b) => {
  b.box([2.4, 0.1, 0.1], [0, 0.9, -0.15], rp.holzDunkel);
  for (const x of [-1.15, 1.15]) b.box([0.1, 0.95, 0.1], [x, 0.47, -0.15], rp.holzDunkel);
  for (let i = 0; i < 3; i++) {
    const x = -0.75 + i * 0.75, schild = new THREE.CylinderGeometry(1.0, 1.0, 1.1, 18, 1, true, -0.34, 0.68);
    b.add(schild, [x, 0.6, -1.05], rp.rot, undefined, [-8, 0, 0]);
    b.add(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 14), [x, 0.6, 0.0], rp.gold, undefined, [82, 0, 0]);   // Buckel
    for (const s of [-1, 1]) b.box([0.04, 0.42, 0.02], [x + s * 0.13, 0.6, -0.03], rp.gold, undefined, [-8, 0, s * 30]);   // Blitze
  }
  for (let i = 0; i < 4; i++) {
    const x = -1.0 + i * 0.66;
    b.add(new THREE.CylinderGeometry(0.02, 0.025, 2.0, 6), [x, 1.0, -0.3], rp.holz, undefined, [-8, 0, 0]);
    b.add(new THREE.ConeGeometry(0.025, 0.35, 5), [x, 2.15, -0.46], rp.eisen, undefined, [-8, 0, 0]);
  }
}, false);
/** Gruppe Amphoren (an Wand oder Stand gelehnt, einige liegend). */
export const amphoren = (kit: Kit, rp: RP, at: V3, turn = 0, n = 6, seed = 1) => {
  const r = new Rng(seed * 29 + 1);
  return bauRoem(kit, "amphoren", at, turn, (b) => {
    for (let i = 0; i < n; i++) amphore(b, rp, [(i % 3) * 0.48 - 0.48, 0, Math.floor(i / 3) * 0.5 - 0.25 + r.range(-0.05, 0.05)], r.range(0.85, 1.05));
  }, false);
};
/** Kochfeuer des Lagers: Steinkreis, Holzscheite, Bronzekessel auf Dreibein, Flammen und Rauch. */
export const kochfeuer = (kit: Kit, rp: RP, at: V3, phase = 0): Lebendig => {
  const g = bauRoem(kit, "kochfeuer", [0, 0, 0], 0, (b) => {
    for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2; b.add(ballGrob, [Math.cos(a) * 0.62, 0.1, Math.sin(a) * 0.62], rp.fels, undefined, [0, i * 40, 0], [0.18, 0.13, 0.16]); }
    for (let i = 0; i < 3; i++) b.add(new THREE.CylinderGeometry(0.035, 0.035, 2.0, 6), [Math.cos(i * 2.1) * 0.35, 0.95, Math.sin(i * 2.1) * 0.35], rp.holzDunkel, undefined, [0, -i * 120, 18]);
    b.add(new THREE.SphereGeometry(0.3, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), [0, 1.0, 0], rp.bronze);
    b.add(new THREE.TorusGeometry(0.3, 0.025, 5, 16), [0, 1.0, 0], shade(rp.bronze, 0.8), undefined, [90, 0, 0]);
  }, false);
  const rauch = rauchsaeule(kit, [0, 0.05, 0], { feuer: 0.55, hoehe: 4, dicke: 0.25, wind: [0.5, 0.2], n: 5, tempo: 0.13, phase });
  g.add(rauch.obj); g.position.set(...at);
  return { obj: g, tick: rauch.tick };
};

// ---------------- Auswahl nach Namen (Szenen-Requisiten kind "roemerteil") ----------------
export type RoemerRequisit = "ochse" | "ochsenkarren" | "stampfer" | "werkzeug" | "korb" | "steinhaufen" | "kieshaufen" | "moertelkasten"
  | "fluchtstange" | "groma" | "vexillum" | "signum" | "aquila" | "scutumstaender" | "amphoren" | "amphore" | "kochfeuer";
export const ROEMER_REQUISITEN: RoemerRequisit[] = ["ochse", "ochsenkarren", "stampfer", "werkzeug", "korb", "steinhaufen", "kieshaufen", "moertelkasten",
  "fluchtstange", "groma", "vexillum", "signum", "aquila", "scutumstaender", "amphoren", "amphore", "kochfeuer"];
/** Ein Requisit der Römer-Welt nach Namen: Gruppe oder bewegtes Teil. */
export const roemerRequisit = (kit: Kit, rp: RP, art: RoemerRequisit, at: V3, turn = 0, seed = 1): THREE.Object3D | Lebendig => {
  switch (art) {
    case "ochse": return ochse(kit, rp, at, turn, seed * 0.7, seed % 2 === 0);
    case "ochsenkarren": return ochsenkarren(kit, rp, at, turn, seed * 0.5);
    case "stampfer": return stampfer(kit, rp, at, turn);
    case "werkzeug": return werkzeug(kit, rp, at, turn);
    case "korb": return bauRoem(kit, "korb", at, turn, (b) => korbKies(b, rp, [0, 0, 0]), false);
    case "steinhaufen": return steinhaufen(kit, rp, at, 1, seed);
    case "kieshaufen": return kieshaufen(kit, rp, at);
    case "moertelkasten": return moertelkasten(kit, rp, at, turn);
    case "fluchtstange": return fluchtstange(kit, rp, at);
    case "groma": return groma(kit, rp, at, turn, seed);
    case "vexillum": return vexillum(kit, rp, at, turn, seed);
    case "signum": return signum(kit, rp, at, turn);
    case "aquila": return signum(kit, rp, at, turn, true);
    case "scutumstaender": return scutumstaender(kit, rp, at, turn);
    case "amphoren": return amphoren(kit, rp, at, turn, 6, seed);
    case "amphore": return bauRoem(kit, "amphore", at, turn, (b) => amphore(b, rp, [0, 0, 0]), false);
    case "kochfeuer": return kochfeuer(kit, rp, at, seed);
  }
};
