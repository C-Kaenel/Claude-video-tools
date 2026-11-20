// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Kapitel-Module für das Langformat (16:9): ein Kapitel = eine Kapitel-Art (hook, montage, erklaerung, beispiel, zeitreise,
// vergleich, mythos, zahlen, spannung, panorama, aufloesung, abspann, aufruf). `kapitel()` baut aus wenigen Angaben (Ort-Rezept, Figuren,
// Karten je Takt) alle Shots: Titelkarte 2–3 s, Einstellungslängen, Kamera-Muster, Kriechen, Überblendungen, Stoss + Blitz am
// Höhepunkt – und die Musik-Stimmung und Geräusche für die Ton-Datei. Alle Werte kommen aus shared/design-tokens.json
// (formats.long-form, Tabelle „Kapitel-Arten“ im Guide); hier steht nur, WIE ein Modul sie anwendet.
import tokens from "../../shared/design-tokens.json";
import type { CameraKey, ShotData, V3 } from "../../engine/v01";
import { cameraAt } from "../../engine/v01";
import { kamera, rezept, rezeptKamera, rezeptPunkt, shot, type CastData, type FxData, type PropData, type SzeneDaten } from "./szene";

const LF = tokens.formats["long-form"];
type ArtWerte = { wofuer: string; laengeSec: number[]; shotSec: number[]; netWordsPerSec: number | null; pausen: string; kamera: string;
  karten: string; musik: string[]; shotSecPhasen?: { aufbau: number[]; hoehepunkt: number[] }; text?: string };
const ARTEN = LF.kapitelArten as unknown as Record<string, ArtWerte>;
export type KapitelArt = "hook" | "montage" | "erklaerung" | "beispiel" | "zeitreise" | "vergleich" | "mythos" | "zahlen" | "spannung"
  | "panorama" | "aufloesung" | "abspann" | "aufruf";
export const KAPITEL_ARTEN = Object.keys(ARTEN) as KapitelArt[];
/** Werte einer Kapitel-Art aus den Tokens (Länge, Einstellung, Netto-Tempo, Pausen, Kamera, Karten, Musik). */
export const kapitelWerte = (art: KapitelArt) => ARTEN[art];

const mitte = (r: number[]) => (r[0] + r[r.length - 1]) / 2;
const klemme = (v: number, r: number[]) => Math.min(r[r.length - 1], Math.max(r[0], v));
const CREEP = LF.creepPctPerFrame as number[];            // Kriechen in Prozent pro Frame [ruhig, lebhaft]
const FADE = LF.crossfadeFrames as number[];              // Überblendung in Frames [kurz, lang]
const TITEL_SEC = mitte(LF.chapterTitleSec as number[]);  // Titelkarte 2–3 s
const BLITZ = tokens.motion["cartoon-3d2d"].flashFrames as number;

type Muster = "totale" | "halbnah" | "nahaufnahme";
/** Wie jede Art die Kamera führt (Reihenfolge der Muster je Takt) und wie stark sie kriecht (0 = ruhig … 1 = lebhaft). */
const FUEHRUNG: Record<KapitelArt, { muster: Muster[]; tempo: number; fade?: number }> = {
  hook: { muster: ["halbnah", "nahaufnahme"], tempo: 1 },
  montage: { muster: ["totale", "halbnah", "nahaufnahme"], tempo: 1 },
  erklaerung: { muster: ["halbnah"], tempo: 0 },
  beispiel: { muster: ["halbnah", "nahaufnahme"], tempo: 0.5 },
  zeitreise: { muster: ["totale"], tempo: 0.3, fade: mitte([16, FADE[1]]) },   // Überblendung 16–24 Frames je Epoche
  vergleich: { muster: ["halbnah"], tempo: 0.3 },
  mythos: { muster: ["halbnah", "nahaufnahme"], tempo: 0.6 },
  zahlen: { muster: ["halbnah"], tempo: 0 },
  spannung: { muster: ["halbnah", "nahaufnahme"], tempo: 1 },
  panorama: { muster: ["totale"], tempo: 0 },
  aufloesung: { muster: ["totale", "halbnah"], tempo: 0.4 },
  abspann: { muster: ["halbnah", "totale"], tempo: 0 },
  aufruf: { muster: ["halbnah"], tempo: 0 },   // keine eigene Kamera: Standbild des hook (siehe aufrufKapitel)
};

/** Ein Takt = eine Einstellung im Kapitel. Zeiten in `cast`/`fx` in Sekunden AB TAKT-BEGINN (Start-Schlüssel `at: -10` bleiben). */
export type Takt = {
  ort: string;                         // Szenen-Rezept (library/rezepte/), z. B. "hanse-markt"
  kamera?: Muster | CameraKey[];       // Standard: Muster der Kapitel-Art
  punkt?: string;                      // Rezept-Punkt für die Nahaufnahme (Standard "mitte")
  dauer?: number;                      // Sekunden; Standard Mitte der Einstellungslänge der Art (immer auf ihren Bereich begrenzt)
  cast?: CastData[]; fx?: TaktFx[]; props?: PropData[];
  light?: "day" | "golden";
  hoehepunkt?: boolean;                // Stoss + Blitz zu Beginn (mythos: Auflösung, spannung: Höhepunkt, hook: Knall)
};
/** Karte eines Takts. `bild: [x, y, abstand?]` setzt den Anker an eine Stelle im BILD (x −1 links … 1 rechts, y −1 unten … 1 oben,
 *  abstand in m vor der Linse, Standard = Abstand zur Figur am Rezept-Punkt `punkt`) statt an `pos` – so bleibt sie sicher in der Safe Area,
 *  egal welche Kamera das Modul wählt (gerechnet mit der Kamera am Takt-Ende). Gut: |x| ≤ 0,55, y −0,5…0,5.
 *  `hoehe` (0…1) = Kartenhöhe als Anteil der Bildhöhe (ersetzt `h`, nur zusammen mit `bild`). */
export type TaktFx = FxData & { bild?: [number, number, number?]; hoehe?: number };
export type KapitelTon = { abschnitt: { ab: number; stimmung: string; bildpause?: boolean }; ereignisse: { t: number; klang: string; db: number; pan?: number; dauer?: number }[] };
export type Kapitel = { art: KapitelArt; start: number; ende: number; shots: ShotData[]; ton: KapitelTon };

const versetze = <T extends { keys: { at: number }[] }>(xs: T[] | undefined, t0: number): T[] =>
  (xs ?? []).map((x) => ({ ...x, keys: x.keys.map((k) => ({ ...k, at: k.at < 0 ? k.at : k.at + t0 })) }));

/** Weltpunkt an Bildstelle (x, y) im Abstand d vor der Kamera (Querformat 16:9, senkrechter Bildwinkel fov). */
export const bildPunkt = (cam: CameraKey, x: number, y: number, d?: number, aspect = 16 / 9): V3 => {
  const f = cam.look.map((v, i) => v - cam.pos[i]), lf = Math.hypot(...f), fw = f.map((v) => v / lf);
  const rl = Math.hypot(fw[0], fw[2]) || 1, rt = [-fw[2] / rl, 0, fw[0] / rl];           // rechts (waagrecht)
  const up = [rt[1] * fw[2] - rt[2] * fw[1], rt[2] * fw[0] - rt[0] * fw[2], rt[0] * fw[1] - rt[1] * fw[0]];   // oben
  const dist = d ?? lf, ty = Math.tan(((cam.fov ?? 40) * Math.PI) / 360), tx = ty * aspect;
  return cam.pos.map((v, i) => v + dist * (fw[i] + x * tx * rt[i] + y * ty * up[i])) as V3;
};
/** Kamera am Ende eines Halts mit Kriechen (`push` % pro Frame, wie der Motor: Abstand zum Blickpunkt schrumpft, höchstens auf die Hälfte). */
const nachKriechen = (cam: CameraKey, frames: number): CameraKey => {
  const k = Math.max(0.5, 1 - ((cam.push ?? 0) / 100) * frames);
  return { ...cam, pos: cam.look.map((v, i) => v + (cam.pos[i] - v) * k) as V3 };
};
/** Karten mit `bild` an die Bildstelle setzen – gerechnet mit der Kamera am ENDE des Takts: das Kriechen schiebt Karten nach aussen,
 *  so stehen sie zum Schluss genau an der Stelle und vorher weiter innen (nie aus der Safe Area). */
const platziere = (fx: TaktFx[] | undefined, camStart: CameraKey, figur: [number, number], frames: number): FxData[] => {
  const cam = nachKriechen(camStart, frames);
  const d = Math.hypot(figur[0] - cam.pos[0], 1.5 - cam.pos[1], figur[1] - cam.pos[2]);   // Standard: so weit weg wie die Figur
  const ty = Math.tan(((cam.fov ?? 40) * Math.PI) / 360);
  return (fx ?? []).map(({ bild, hoehe, ...f }) => {
    if (!bild) return f;
    const dist = bild[2] ?? d;
    return { ...f, h: hoehe ? hoehe * 2 * dist * ty : f.h, keys: f.keys.map((k) => (k.pos ? { ...k, pos: bildPunkt(cam, bild[0], bild[1], dist) } : k)) };
  });
};

const kameraFuer = (t: Takt, m: Muster | CameraKey[], push: number): CameraKey[] => {
  const keys = Array.isArray(m) ? m
    : m === "nahaufnahme" ? kamera("nahaufnahme", rezeptPunkt(t.ort, t.punkt ?? "mitte"), { abstand: 1.2 })   // Langformat: Hut bleibt im Bild
    : rezeptKamera(t.ort, m);
  return keys.map((k) => ({ ...k, push }));
};

/** Titelkarte vor der Kamera: 6 m vor der Linse, so gross, dass sie gut 40 % der Bildhöhe füllt. */
const titelFx = (cam: CameraKey, nr: number, titel: string, frage: string | undefined, farbe?: string): FxData => {
  const d = cam.look.map((v, i) => v - cam.pos[i]), n = Math.hypot(...d), abst = 6;
  const pos = cam.pos.map((v, i) => v + (d[i] / n) * abst) as V3;
  const h = 2 * abst * Math.tan(((cam.fov ?? 40) * Math.PI) / 360) * 0.42;
  // bleibt bis zum Schnitt stehen – der nächste Takt blendet über (ein Wegploppen kurz vor dem Schnitt wäre ein Sprung im Bild)
  return { kind: "titelkarte", h, unlit: true, keys: [{ at: 0.15, show: true, pos, params: { nummer: `CHAPTER ${nr}`, titel, frage: frage ?? "", farbe: farbe ?? "" } }] };
};

/**
 * Baut ein Kapitel. `start` = Film-Sekunde des Beginns (Ende des vorigen Kapitels), `nr` = Kapitelnummer (1 = ohne Überblendung
 * und ohne Titelkarte, das ist der Hook), `titel`/`frage` für die Titelkarte. Rückgabe: Shots, Ende (Film-Sekunde) und Ton.
 */
export const kapitel = (art: KapitelArt, o: { nr: number; start: number; titel?: string; frage?: string; takte?: Takt[]; fps?: number; farbe?: string;
  titelkarte?: boolean; vorher?: Kapitel; dauer?: number; kommentar?: boolean }): Kapitel => {
  if (art === "aufruf") return aufrufKapitel({ ...o, fps: o.fps ?? 30 });
  const fps = o.fps ?? 30, w = ARTEN[art], f = FUEHRUNG[art];
  const takte = o.takte ?? [], titel = o.titel ?? "";
  const push = CREEP[0] + (CREEP[1] - CREEP[0]) * f.tempo;
  const shots: ShotData[] = [];
  const ereignisse: KapitelTon["ereignisse"] = [];
  let t = o.start;
  const frames = (s: number) => Math.round(s * fps);
  const add = (dauer: number, mk: (a: number, b: number) => ShotData) => { const a = frames(t), b = frames(t + dauer); shots.push(mk(a, b)); t = b / fps; };

  // Titelkarte (alle Kapitel ausser dem ersten): Halbnah des ersten Orts ohne Figuren (fast waagrechter Blick, sonst steht die
  // Karte schräg im Bild), Karte vor der Kamera, Überblendung vom vorigen Kapitel
  if (o.titelkarte ?? o.nr > 1) {
    const t0 = takte[0], cam = kameraFuer(t0, "halbnah", CREEP[0]);
    const fx = titelFx(cam[0], o.nr, titel, o.frage, o.farbe);
    ereignisse.push({ t, klang: "whoosh", db: -8, dauer: 0.5 });
    add(TITEL_SEC, (a, b) => shot(fps, { id: `k${o.nr}-${art}-titel`, a, b, light: t0.light, camera: cam, fadeIn: FADE[0],
      szene: { ...rezept(t0.ort), cast: [], fx: versetze([fx], a / fps) } }));
  }

  takte.forEach((tk, i) => {
    const phasen = w.shotSecPhasen;
    const bereich = art === "spannung" && phasen ? (tk.hoehepunkt ? phasen.hoehepunkt : phasen.aufbau) : w.shotSec;
    const dauer = klemme(tk.dauer ?? mitte(bereich), bereich);
    const m = tk.kamera ?? (art === "spannung" && tk.hoehepunkt ? "nahaufnahme" : f.muster[i % f.muster.length]);
    let cam = kameraFuer(tk, m, push);
    if (art === "abspann" && i === takte.length - 1 && !Array.isArray(m)) {   // Abspann: Rückfahrt über den ganzen Takt (Abstand × 1,4)
      const c = cam[0], back = c.pos.map((v, j) => v + (v - c.look[j]) * 0.4) as V3;
      cam = [{ ...c, push: 0 }, { ...c, at: 0.01, pos: back, move: frames(dauer), push: 0 }];
    }
    if (art === "panorama" && !Array.isArray(m)) {   // weite Fahrt: von links nach rechts über die ganze Dauer
      const c = cam[0], side: V3 = [-(c.look[2] - c.pos[2]), 0, c.look[0] - c.pos[0]], n = Math.hypot(side[0], side[2]) || 1, s = 3 / n;
      cam = [{ ...c, pos: [c.pos[0] - side[0] * s, c.pos[1], c.pos[2] - side[2] * s], push: 0 },
        { ...c, at: 0.01, pos: [c.pos[0] + side[0] * s, c.pos[1], c.pos[2] + side[2] * s], move: frames(dauer), push: 0 }];
    }
    const t0 = t, hoch = !!tk.hoehepunkt;
    if (hoch) ereignisse.push({ t: t0 + 0.1, klang: art === "mythos" ? "stamp" : "impact", db: -4 });
    const fade = i === 0 && (o.titelkarte ?? o.nr > 1) ? FADE[0] : i > 0 && f.fade ? f.fade : undefined;
    add(dauer, (a, b) => shot(fps, { id: `k${o.nr}-${art}-${i + 1}`, a, b, light: tk.light, camera: cam, fadeIn: fade,
      flash: hoch ? BLITZ : undefined, kicks: hoch ? [{ at: t0 + 0.1, amp: 0.006 }] : undefined,
      szene: { ...rezept(tk.ort), props: [...rezept(tk.ort).props ?? [], ...(tk.props ?? [])], cast: versetze(tk.cast, t0), fx: versetze(platziere(tk.fx, cam[0], rezeptPunkt(tk.ort, tk.punkt ?? "mitte"), cam.length > 1 ? 0 : frames(dauer)), t0) } }));
  });

  const abschnitt: KapitelTon["abschnitt"] = { ab: o.start, stimmung: w.musik[0], ...(art === "panorama" ? { bildpause: true } : {}) };
  return { art, start: o.start, ende: t, shots, ton: { abschnitt, ereignisse } };
};

/** Unschärfe des Standbilds im aufruf: in `schritte` gleich langen Stufen über `frames` Frames (Tokens: 8–12 Frames) bis `px`
 *  (Tiefenschärfe-Stärke, px bei 1080; der Stil begrenzt den Radius auf dof.maxRadius). */
const AUFRUF_UNSCHAERFE = { frames: 10, schritte: 5, px: 22 };

/** Aufruf-Leiste (Effekt-Karte `aufruf`, B0099): ploppt auf, der Finger klickt nacheinander Daumen, SUBSCRIBE und Glocke an
 *  (Zeiten ab Kapitel-Beginn in AUFRUF_KLICKS, gemessen am Sprechtext: „liking“, „subscribing“, danach die Glocke), geht wieder;
 *  die Leiste bleibt bis zum Schnitt. Alle Zahlen in jedem Schlüssel, damit sie gleiten. `a` = Aufploppen, `k` = Klicks. */
const AUFRUF_X = { like: 330, abo: 800, glocke: 1290 };   // Fingerspitze über dem Teil (Karten-Pixel, siehe Karte aufruf)
const aufrufKeys = (a: number, k: number[], pos: V3): FxData["keys"] => {
  const z = { hand: 0, hx: 1500, druck: 0, like: 0, abo: 0, glocke: 0, funken: 0, glockeAb: k[2] - a + 0.06 };
  const keys: FxData["keys"] = [{ at: a, show: true, pos, params: { ...z } }];
  const step = (at: number, d: Partial<typeof z>) => { Object.assign(z, d); keys.push({ at, params: { ...z } }); };
  step(k[0] - 0.4, {});
  (["like", "abo", "glocke"] as const).forEach((teil, i) => {
    step(k[i] - (i ? 0.3 : 0.12), { hand: 1, hx: AUFRUF_X[teil] });   // hinfahren (der erste: Hand kommt herein)
    step(k[i] - 0.06, {});
    step(k[i], { druck: 1 });
    step(k[i] + 0.06, { [teil]: 1, funken: 0.3 });
    step(k[i] + 0.2, { druck: 0, funken: 1 });
    step(k[i] + 0.4, { funken: 0 });
  });
  step(k[2] + 0.75, { hand: 0, hx: 1500 });
  return keys;
};
const AUFRUF_AUF = 0.45, AUFRUF_KLICKS = [1.15, 2.0, 2.85];   // Aufploppen, Klicks (Sekunde ab Kapitel-Beginn)
const AUFRUF_KOMMENTAR = 3.7;                                   // „comments“

/**
 * Kapitel aufruf (direkt nach dem hook, ohne Titelkarte): das letzte Bild des hook (`vorher`) friert ein (Welt, Figuren, Karten
 * stehen – Szene `standbild`), wird in AUFRUF_UNSCHAERFE.frames unscharf; dann ploppt die Aufruf-Leiste auf (Daumen, SUBSCRIBE,
 * Glocke), ein Finger klickt die drei nacheinander an; zu „comments“ eine Sprechblase darüber (abschaltbar mit `kommentar: false`).
 * Leiste und Blase bleiben bis zum Schnitt.
 * Länge = gesprochener Text der Tokens (kapitelArten.aufruf.text) mit netWordsPerSec, begrenzt auf laengeSec (oder `dauer`).
 * Die Karten stehen nah vor der Linse (scharf), die Welt dahinter wird unscharf.
 */
const aufrufKapitel = (o: { nr: number; start: number; fps: number; vorher?: Kapitel; dauer?: number; kommentar?: boolean }): Kapitel => {
  const fps = o.fps, w = ARTEN.aufruf;
  if (!o.vorher) throw new Error("Kapitel aufruf braucht `vorher` (das hook-Kapitel davor)");
  const last = o.vorher.shots[o.vorher.shots.length - 1], d = last.data as unknown as SzeneDaten & { start: number };
  const { start: _alt, ...szeneD } = d;   // Film-Start setzt shot() neu
  const lastFrames = Math.round(last.seconds * fps), stand = o.vorher.ende - 1 / fps;   // Film-Sekunde des letzten hook-Bilds
  const pose = cameraAt(last.camera, last.kicks, lastFrames - 1, fps);
  const cam: CameraKey = { at: 0, pos: pose.pos, look: pose.look, fov: pose.fov, roll: pose.roll, push: 0 };
  const woerter = (w.text ?? "").split(/\s+/).filter(Boolean).length;
  const laenge = klemme(o.dauer ?? woerter / (w.netWordsPerSec ?? 2.36), w.laengeSec);
  const blick = Math.hypot(...pose.look.map((v, i) => v - pose.pos[i])), nah = Math.min(2.5, blick * 0.35);   // Karten vor der Welt
  const ty = Math.tan((pose.fov * Math.PI) / 360), mitteBild = bildPunkt(cam, 0, 0, nah);
  const shots: ShotData[] = [];
  let t = o.start;
  const add = (frames: number, id: string, px: number, fx: FxData[]) => {
    const a = Math.round(t * fps), b = a + frames;
    shots.push(shot(fps, { id, a, b, light: last.light as "day" | "golden", camera: [cam], focus: { strength: px, point: mitteBild },
      szene: { ...szeneD, standbild: stand - a / fps, fx: [...(szeneD.fx ?? []), ...fx] } }));
    t = b / fps;
  };
  const U = AUFRUF_UNSCHAERFE, stufe = U.frames / U.schritte;
  for (let i = 1; i <= U.schritte; i++) add(stufe, `k${o.nr}-aufruf-unschaerfe${i}`, (U.px * i) / U.schritte, []);
  const s0 = t, h = 0.55 * 2 * nah * ty;   // Leisten-Karte ≈ 55 % der Bildhöhe (die Leiste selbst knapp ein Drittel davon)
  const rel = (x: number) => x - (s0 - o.start);   // Sekunde ab Kapitel-Beginn → ab Haupt-Shot (versetze addiert dessen Film-Start)
  const fx: FxData[] = [{ kind: "aufruf", h, unlit: true, frei: true, keys: aufrufKeys(rel(AUFRUF_AUF), AUFRUF_KLICKS.map(rel), bildPunkt(cam, 0, -0.18, nah)) }];
  if (o.kommentar ?? true) fx.push({ kind: "sprechblase", h: 0.36 * 2 * nah * ty, unlit: true, frei: true,
    keys: [{ at: rel(AUFRUF_KOMMENTAR), show: true, pos: bildPunkt(cam, 0.02, 0.05, nah), params: { text: "COMMENT!", art: "rede", schwanz: "links" }, motion: "bob" }] });
  add(Math.round((o.start + laenge - s0) * fps), `k${o.nr}-aufruf`, U.px, versetze(fx, s0));
  const ereignisse: KapitelTon["ereignisse"] = [
    { t: o.start, klang: "whoosh", db: -10, dauer: 0.3 },
    { t: o.start + AUFRUF_AUF, klang: "pop", db: -8 },
    ...AUFRUF_KLICKS.flatMap((k, i) => [{ t: o.start + k, klang: "clack", db: -9 }, { t: o.start + k + 0.06, klang: i === 2 ? "ring" : "sparkle", db: i === 2 ? -11 : -12 }]),
    ...(o.kommentar ?? true ? [{ t: o.start + AUFRUF_KOMMENTAR, klang: "pop", db: -9 }] : []),
  ];
  return { art: "aufruf", start: o.start, ende: t, shots, ton: { abschnitt: { ab: o.start, stimmung: w.musik[0] }, ereignisse } };
};

/** Prüft eine Kapitel-Folge gegen die Regeln aus den Tokens (`kapitelRegeln`): Beginn hook, Ende aufloesung + abspann, nie zweimal
 *  dieselbe Art hintereinander (ausser beispiel), etwa alle 2 Kapitel ein panorama, jede Länge im Bereich der Art. Rückgabe: Hinweise. */
export const pruefeFolge = (kap: Kapitel[]) => {
  const h: string[] = [], arten = kap.map((k) => k.art);
  if (arten[0] !== "hook") h.push("Beginn ist nicht hook");
  if (arten.filter((a) => a === "aufruf").length !== 1 || arten[1] !== "aufruf") h.push("aufruf fehlt direkt nach dem hook (genau einmal)");
  if (arten.slice(-2).join() !== "aufloesung,abspann") h.push("Ende ist nicht aufloesung + abspann");
  arten.forEach((a, i) => { if (i > 0 && a === arten[i - 1] && a !== "beispiel") h.push(`${a} zweimal hintereinander`); });
  let ohne = 0;
  for (const a of arten) { if (a === "aufruf") continue; ohne = a === "panorama" ? 0 : ohne + 1; if (ohne > 3) { h.push("mehr als 3 Kapitel ohne panorama"); break; } }
  kap.forEach((k) => { const r = ARTEN[k.art].laengeSec, d = k.ende - k.start; if (d < r[0] - 0.5 || d > r[r.length - 1] + TITEL_SEC + 0.5) h.push(`${k.art}: ${d.toFixed(1)} s ausserhalb ${r[0]}–${r[r.length - 1]} s`); });
  return h;
};

/** Ton-Datei-Teile aus den Kapiteln: Musik-Abschnitte (Stimmung je Art, Bildpause lauter) und Geräusche (Übergänge, Höhepunkte).
 *  audio/v01 spielt die Akkorde eines Abschnitts genau einmal (ein Akkord = ein Takt à 4 Schläge) – darum wird die Folge
 *  `akkorde` so oft wiederholt, bis der Abschnitt bis zum Kapitelende klingt (sonst entstehen Musiklücken). */
export const kapitelTon = (kap: Kapitel[], o: { bpm?: number; akkorde?: string[] } = {}) => {
  const takt = (4 * 60) / (o.bpm ?? 112), folge = o.akkorde ?? ["C", "Am", "F", "G"];
  return {
    abschnitte: kap.map((k) => {
      const n = Math.ceil((k.ende - k.start) / takt);
      return { ...k.ton.abschnitt, akkorde: Array.from({ length: n }, (_, i) => folge[i % folge.length]) };
    }),
    ereignisse: kap.flatMap((k) => k.ton.ereignisse),
  };
};
