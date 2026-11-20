// Herkunft: eigen (V-Video), geschrieben 2026-11-15, ohne Vorlage.
// Platten-Prinzip des Stils T0004 (Wunsch des Nutzers): eine Szene besteht aus Platten (Orten), die nebeneinander im Void
// schweben. Neue Platten werden an die bestehende Karte angefügt statt in eine neue Szene zu schneiden: zuerst Funken an ihrem
// Ort, die dreimal pulsieren, dann erscheint die Platte (taucht auf und rastet ein). Kamera je Plattenzahl: ungerade = Raute
// (45°), gerade = gedreht, bis die Platten als gerade Rechtecke nebeneinander liegen (Antwort des Nutzers 2026-11-15).
// Bürger-Sicht: die Kamera fährt hinter eine Figur und schaut schräg von oben in ihre Laufrichtung (folgt ihr).
// Werte aus shared/design-tokens.json (motion.quadratic-3d.platten / buerger, color.quadratic-3d.funken).
import * as THREE from "three";
import { Kit, NOINK, Rng, type CameraKey, type WorldBuilder } from "../../engine/v01";
import tokens from "../../shared/design-tokens.json";
import { REFERENZ, type Look } from "./look";
import { baueOrt, baueRaum, DORF, FIGUR_VERSATZ, wegPunkt, type Ort } from "./welt";
import { stufen } from "./material";
import { ORTE, type OrtName } from "./orte";

type V3 = [number, number, number];
const PM = tokens.motion["quadratic-3d"].platten, BM = tokens.motion["quadratic-3d"].buerger, FC = tokens.color["quadratic-3d"].funken;
const KL = tokens.lens["quadratic-3d"].kamera;

export type Platte = {
  ort: OrtName | Ort;
  pos?: [number, number];       // Mitte der Platte (x, z) in m; Standard 0, 0
  ab?: number;                  // Sekunde im Takt, ab der sie angefügt wird (Funken); ohne = von Anfang an da
  leer?: boolean;               // hier läuft niemand (z. B. verschüttet, verlassen): keine Figuren
  welle?: { richtung: [number, number]; start: number; tempo: number };  // Front zieht über die Platte (start m, tempo m/s): wo sie ankommt, verschwinden die Figuren
  boden?: (x: number, z: number) => number;   // Höhe des Bodens über den Kacheln (z. B. Asche-Schicht): Figuren gehen darauf
  fensterLicht?: boolean;       // Licht in allen Fenstern (Menschen drinnen, z. B. „sie versteckten sich in ihren Häusern“)
};
/** Braucht die Platte die Platten-Welt (sonst baut eine einzelne Platte wie bisher)? */
export const besonders = (p: Platte) => p.ab !== undefined || !!p.pos || !!p.leer || !!p.welle || !!p.boden || !!p.fensterLicht;

/** Licht in den Fenstern einer Platte: jedes mit `Batch.teil("fenster", …)` gemeldete Fenster bekommt einen leuchtenden
 *  Quader, 1 cm grösser als das Fenster (deckt es ganz, keine deckungsgleichen Flächen). */
const fensterLichter = (gruppe: THREE.Group) => {
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(tokens.color["quadratic-3d"].karte.lampe).multiplyScalar(1.3) });
  gruppe.traverse((o) => {
    const teile = o.userData.teile as { art: string; min: V3; max: V3 }[] | undefined;
    for (const t of teile ?? []) if (t.art === "fenster") {
      const m = new THREE.Mesh(new THREE.BoxGeometry(t.max[0] - t.min[0] + 0.01, t.max[1] - t.min[1] + 0.01, t.max[2] - t.min[2] + 0.01), mat);
      m.position.set((t.min[0] + t.max[0]) / 2, (t.min[1] + t.max[1]) / 2, (t.min[2] + t.max[2]) / 2);
      m.name = "fensterlicht"; o.add(m);
    }
  });
};

export const ortVon = (o: OrtName | Ort): Ort => typeof o === "string" ? (o === "dorf" ? DORF : ORTE[o]) : o;
const ankunft = (p: Platte) => (p.ab === undefined ? -1 : p.ab + PM.funkenSec);   // ab hier steht die Platte

// ---------- Kamera ----------
/** Kamera, die alle Platten zeigt: Azimut 45° (Raute) oder 0° (gerade), Blickwinkel und Rand wie Bild 1, mittig. */
export const plattenPose = (platten: Platte[], quer: boolean, gerade: boolean) => {
  const e = (REFERENZ.el * Math.PI) / 180, az = gerade ? 0 : Math.PI / 4;
  const vorn = new THREE.Vector3(Math.sin(az), 0, Math.cos(az));                     // von der Mitte zur Kamera (waagrecht)
  const rechts = new THREE.Vector3(vorn.z, 0, -vorn.x);
  const hoch = new THREE.Vector3(-vorn.x * Math.sin(e), Math.cos(e), -vorn.z * Math.sin(e));
  const xs: number[] = [], ys: number[] = [];
  for (const p of platten) {
    const o = ortVon(p.ort), g = o.groesse / 2, [cx, cz] = p.pos ?? [0, 0];
    for (const dx of [-g, g]) for (const dz of [-g, g]) for (const y of [KL.kartenKoerperM.unten, o.oben]) {
      const v = new THREE.Vector3(cx + dx, y, cz + dz);
      xs.push(v.dot(rechts)); ys.push(v.dot(hoch));
    }
  }
  const breiteM = (Math.max(...xs) - Math.min(...xs)), hoeheM = (Math.max(...ys) - Math.min(...ys));
  // Rand wie Bild 1: Kartendiagonale × 1,3775 in der Breite, Kartenkörper × 1,04 in der Höhe
  const rand = (1.75 + 0.6 * REFERENZ.rand) / 1;
  let w = breiteM * rand, hgt = hoeheM * 1.04;
  const asp = quer ? 16 / 9 : 9 / 16;
  if (w / asp < hgt) w = hgt * asp; else hgt = w / asp;
  const dist = hgt / 2 / Math.tan((REFERENZ.fov * Math.PI) / 360);
  const mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2;
  const look = rechts.clone().multiplyScalar(mx).add(hoch.clone().multiplyScalar(my));
  // Blickpunkt auf Höhe 0 schieben ändert nichts am Bild (entlang der Blickrichtung) – nur der Lesbarkeit halber nicht nötig
  const blick = vorn.clone().multiplyScalar(Math.cos(e)).add(new THREE.Vector3(0, Math.sin(e), 0));
  const pos = look.clone().addScaledVector(blick, dist);
  return { pos: pos.toArray() as V3, look: look.toArray() as V3, fov: REFERENZ.fov, dist };
};

/** Kamera-Schlüssel eines Platten-Takts: bei jeder neuen Platte gleitet die Kamera (mit den Funken) zur neuen Ansicht. */
export const plattenKamera = (platten: Platte[], quer: boolean, sek: number): CameraKey[] => {
  const zeiten = [...new Set(platten.filter((p) => p.ab !== undefined && p.ab < sek).map((p) => p.ab as number))].sort((a, b) => a - b);
  const sicht = (t: number) => {
    // ab den Funken gehört die neue Platte schon zum Bild (man soll sehen, wo sie entsteht)
    const da = platten.filter((p) => p.ab === undefined || p.ab <= t + 1e-6);
    return { ...plattenPose(da, quer, da.length % 2 === 0) };
  };
  const k0 = sicht(-1);
  const keys: CameraKey[] = [{ at: 0, pos: k0.pos, look: k0.look, fov: k0.fov, push: tokens.motion["quadratic-3d"].kameraPushPctProFrame }];
  for (const t of zeiten) {
    const k = sicht(t);
    keys.push({ at: t, pos: k.pos, look: k.look, fov: k.fov, move: Math.round(PM.kameraSec * 30), push: 0 });
  }
  return keys;
};

/** Wo Figur `figur` der Platte `platte` zur Shot-Zeit t steht (Welt), und wohin sie läuft. */
export const figurWelt = (platten: Platte[], platte: number, figur: number, t: number) => {
  const p = platten[platte], o = ortVon(p.ort), [cx, cz] = p.pos ?? [0, 0];
  const w = o.wege[figur] ?? o.wege[0], q = wegPunkt(w, t + figur * FIGUR_VERSATZ);
  const d = new THREE.Vector2(q.dx, q.dz); if (d.lengthSq() < 1e-9) d.set(1, 1); d.normalize();
  return { pos: [cx + q.x, 0.2, cz + q.z] as V3, dir: [d.x, d.y] as [number, number] };
};

const sm = (u: number) => { const x = Math.min(1, Math.max(0, u)); return x * x * x * (x * (x * 6 - 15) + 10); };
const mix3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

/** Kehrt die Figur im Zeitfenster [a, b] um? Gibt die Sekunde der Umkehr zurück (sonst undefined). */
export const umkehr = (platten: Platte[], platte: number, figur: number, a: number, b: number) => {
  let d0 = figurWelt(platten, platte, figur, a).dir;
  for (let t = a + 1 / 30; t <= b; t += 1 / 30) {
    const d = figurWelt(platten, platte, figur, t).dir;
    if (d0[0] * d[0] + d0[1] * d[1] < 0) return t;
    d0 = d;
  }
  return undefined;
};

/** Bürger-Sicht, Bild für Bild (Erfahrung aus V0009): weich von der Totale `k0` hinter die Figur (ab `ab`), folgt glatt
 *  (geglättete Lage, Drehung höchstens `drehGradProSek`), ab `bis` weich zurück. Fehler, wenn die Figur im Fenster umkehrt
 *  (die Kamera würde sich um 180° drehen) – dann das Fenster verschieben. */
export const buergerKamera = (platten: Platte[], b: { platte?: number; figur: number; ab: number; bis: number }, k0: CameraKey, sek: number, name = ""): CameraKey[] => {
  const pl = b.platte ?? 0, raus = b.bis < sek - 0.5, ende = raus ? Math.min(sek, b.bis + BM.hineinSec) : sek;
  const u = umkehr(platten, pl, b.figur, b.ab, ende);
  if (u !== undefined) throw new Error(`${name}: Figur ${b.figur} kehrt bei ${u.toFixed(2)} s um (Bürger-Sicht ${b.ab.toFixed(2)}–${ende.toFixed(2)} s) – Fenster verschieben`);
  const pos = (t: number) => figurWelt(platten, pl, b.figur, t).pos;
  const vel = (t: number) => { const a = pos(t - 0.6), c = pos(t + 0.6); return [c[0] - a[0], c[2] - a[2]]; };
  let [vx, vz] = vel(b.ab), L = Math.hypot(vx, vz) || 1;
  let dir: [number, number] = [vx / L, vz / L], p = pos(b.ab);
  const maxDreh = (BM.drehGradProSek * Math.PI) / 180 / 30, f0 = Math.round(b.ab * 30);
  const keys: CameraKey[] = [];
  for (let f = f0; f <= Math.round(ende * 30); f++) {
    const t = f / 30;
    [vx, vz] = vel(t); L = Math.hypot(vx, vz);
    if (L > 0.05) {
      const ziel = Math.atan2(vz / L, vx / L), jetzt = Math.atan2(dir[1], dir[0]);
      let d = ziel - jetzt; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
      const w = jetzt + Math.max(-maxDreh, Math.min(maxDreh, d)); dir = [Math.cos(w), Math.sin(w)];
    }
    p = mix3(p, pos(t), f === f0 ? 1 : BM.glatt);
    const fp: V3 = [p[0] - dir[0] * BM.hinterM, p[1] + BM.hoeheM, p[2] - dir[1] * BM.hinterM];
    const fl: V3 = [p[0] + dir[0] * BM.vorM, p[1] + BM.blickHoeheM, p[2] + dir[1] * BM.vorM];
    const s = raus && t > b.bis ? 1 - sm((t - b.bis) / BM.hineinSec) : sm((t - b.ab) / BM.hineinSec);
    const fov0 = k0.fov ?? 40;
    keys.push({ at: t, pos: mix3(k0.pos, fp, s), look: mix3(k0.look, fl, s), fov: fov0 + (BM.fov - fov0) * s, move: 1, push: 0 });
  }
  return keys;
};

/** Ziel-Fahrt (Erfahrung aus V0009): eine weiche Fahrt über die ganze Einstellung; am Ende liegt `ziel` in der Bildmitte und
 *  der Abstand ist `nah` × Startabstand (0,6–0,75 = 25–40 % näher; 1 = nur schwenken, z. B. einer hohen Säule nach). */
export const zielFahrt = (k0: CameraKey, sek: number, ziel: V3, nah: number): CameraKey[] => {
  const off = k0.pos.map((v, i) => v - k0.look[i]);
  const pos = ziel.map((v, i) => v + off[i] * nah) as V3;
  return [{ ...k0, push: 0 }, { at: 0, pos, look: ziel, fov: k0.fov, move: Math.round(sek * 30), push: 0 }];
};

/** Schieben im Halt deckeln: jeder Halt schiebt höchstens `schiebenMaxPct` % – lange Einstellungen fuhren sonst bis zur
 *  halben Entfernung zur Kartenmitte (Erfahrung V0009). */
export const deckeln = (keys: CameraKey[], sek: number): CameraKey[] => {
  const ende = Math.round(sek * 30), MAX = tokens.motion["quadratic-3d"].kamera.schiebenMaxPct;
  return keys.map((k, i) => {
    const pp = k.push ?? 0.2;
    if (pp <= 0) return k;
    const ab = Math.round(k.at * 30) + (i === 0 ? 0 : k.move ?? 24);
    const halt = Math.max(1, (i + 1 < keys.length ? Math.round(keys[i + 1].at * 30) : ende) - ab);
    return pp * halt > MAX ? { ...k, push: MAX / halt } : k;
  });
};

// ---------- Funken ----------
/** Funken an einer Stelle: kleine leuchtende Würfel und Kreuz-Sterne, pulsieren `PM.pulse`-mal, dann weg. */
const baueFunken = (mitte: V3, groesse: number, seed: number) => {
  const r = new Rng(seed), g = new THREE.Group(); g.name = "funken"; g.userData.kulisse = true;
  const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(FC.hell).multiplyScalar(1.6), fog: false });
  const mat2 = new THREE.MeshBasicMaterial({ color: new THREE.Color(FC.kalt).multiplyScalar(1.3), fog: false });
  const teile = Array.from({ length: PM.funkenAnzahl }, (_, i) => {
    const s = new THREE.Group();
    const m = i % 3 === 0 ? mat2 : mat, d = r.range(0.25, 0.6);
    s.add(new THREE.Mesh(new THREE.BoxGeometry(d, d * 0.18, d * 0.18), m), new THREE.Mesh(new THREE.BoxGeometry(d * 0.18, d, d * 0.18), m),
      new THREE.Mesh(new THREE.BoxGeometry(d * 0.18, d * 0.18, d), m));
    s.position.set(mitte[0] + r.range(-0.42, 0.42) * groesse, r.range(0.4, 3.5), mitte[2] + r.range(-0.42, 0.42) * groesse);
    s.rotation.set(r.range(0, 1), r.range(0, 6), 0);
    s.traverse((o) => o.layers.set(NOINK));
    g.add(s); return { s, ph: r.range(0, 0.25), y: s.position.y };
  });
  /** u = Zeit seit Beginn der Funken (s) */
  const tick = (u: number) => teile.forEach(({ s, ph, y }) => {
    const dauer = PM.funkenSec, aktiv = u >= 0 && u < dauer;
    const puls = aktiv ? Math.pow(Math.max(0, Math.sin(Math.PI * PM.pulse * ((u + ph) / dauer))), 1.5) : 0;
    s.scale.setScalar(Math.max(1e-4, puls));
    s.position.y = y + u * 0.25; s.rotation.y += 0;
  });
  return { g, tick };
};

// ---------- Welt ----------
const ease = (u: number) => { const c = 1.7; const x = Math.min(1, Math.max(0, u)) - 1; return 1 + (c + 1) * x * x * x + c * x * x; };

/** Welt einer Platten-Szene: Void, Partikel, alle Platten (spätere zuerst unsichtbar, dann Funken + Erscheinen). */
export const plattenWelt = (lk: Look, platten: Platte[]): WorldBuilder => ({ scene, shot, style }) => {
  const kit = new Kit(style.lights[shot.light], 3);
  const groesse = Math.max(...platten.map((p) => ortVon(p.ort).groesse + 2 * Math.max(...(p.pos ?? [0, 0]).map(Math.abs))));
  const raum = baueRaum(lk, groesse, Math.max(...platten.map((p) => ortVon(p.ort).oben)));
  scene.add(...raum.objekte);
  const teile = platten.map((p, i) => {
    const o = baueOrt(kit, lk, ortVon(p.ort)), [x, z] = p.pos ?? [0, 0];
    o.group.position.set(x, 0, z);
    if (p.leer) o.figuren.forEach((f) => f.root.parent?.remove(f.root));
    if (p.fensterLicht) fensterLichter(o.group);
    scene.add(o.group);
    const funken = p.ab !== undefined ? baueFunken([x, 0, z], ortVon(p.ort).groesse, 50 + i) : null;
    if (funken) scene.add(funken.g);
    return { p, o, funken, x, z };
  });
  if (lk.stufe > 0) stufen(scene, style.lights[shot.light], lk.stufe);
  return ({ time, camera }) => {
    raum.tick(time, camera);
    teile.forEach(({ p, o, funken, x, z }) => {
      o.tick(time);
      if (!p.leer && (p.boden || p.welle)) o.figuren.forEach((f) => {
        const fx = f.root.position.x, fz = f.root.position.z;   // Platten-Koordinaten
        if (p.boden) f.root.position.y = 0.2 + p.boden(fx, fz);
        if (p.welle) {
          const [rx, rz] = p.welle.richtung, L = Math.hypot(rx, rz) || 1;
          const erreicht = (fx * rx + fz * rz) / L <= p.welle.start + p.welle.tempo * time - 0.5;
          f.root.scale.setScalar(erreicht ? 1e-4 : 1);   // nie visible = false (bytegleich)
        }
      });
      if (p.ab === undefined) return;
      funken?.tick(time - p.ab);
      const u = (time - ankunft(p)) / (PM.erscheinenFrames / 30);
      const s = u <= 0 ? 1e-4 : ease(u);
      o.group.scale.setScalar(Math.max(1e-4, s));
      o.group.position.set(x, (1 - Math.min(1, Math.max(0, u))) * -PM.auftauchenM, z);
    });
  };
};
