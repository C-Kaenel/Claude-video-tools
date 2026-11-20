// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Kapitel-Module des Stils T0004 für die Langform: `kapitel(art, { nr, start, titel, takte })` baut die Shots einer der 13
// Kapitel-Arten (formats.long-form.kapitelArten in shared/design-tokens.json) – Einstellungslänge, Kamera-Art, Schnitt oder
// Überblendung, Stoss/Blitz, Wortfolge und Musik-Stimmung. Ein Takt = eine Einstellung: ein Ort oder mehrere Platten (neue
// Platten mit Funken angefügt, Kamera je Plattenzahl), optional Bürger-Sicht. `aufruf(…)` friert das letzte hook-Bild ein
// (Like-/Abo-Knöpfe). `kurz(takte)` baut die Kurzform (Schnitt alle 2–3 s). `tonDatei()` macht daraus die Ton-Datei.
import { cameraAt, type ShotData, type Story } from "../../engine/v01";
import tokens from "../../shared/design-tokens.json";
import { kameraSchluessel, type Format } from "./kamera";
import type { OrtName } from "./orte";
import type { Ort } from "./welt";
import { besonders, buergerKamera, deckeln, figurWelt, plattenKamera, zielFahrt, type Platte } from "./platten";
import type { Wortzeile } from "./worte";

const LF = tokens.formats["long-form"], ARTEN = LF.kapitelArten, TON = tokens.motion["quadratic-3d"].ton;
const TM = tokens.motion["quadratic-3d"];
export type KapitelArt = keyof typeof ARTEN;
export const KAPITEL_ARTEN = Object.keys(ARTEN) as KapitelArt[];

export type KameraArt = "raute" | "nah" | "folgen" | "weit" | "ran";
export type Takt = {
  ort?: OrtName | Ort;          // ein Ort (Name des Stils oder eigener Ort) – oder `platten`
  platten?: Platte[];           // mehrere Platten; mit `ab` angefügt (Funken, dann erscheint sie); Kamera je Plattenzahl
  buerger?: { platte?: number; figur: number; ab: number; bis?: number };   // Bürger-Sicht (hinter der Figur, schräg von oben, Bild für Bild)
  ziel?: { punkt: [number, number, number] | { platte?: number; figur: number }; nah?: number };   // weiche Fahrt zu einem Ziel (am Ende Bildmitte); nah 0,6–0,75, 1 = nur schwenken
  sek?: number;                 // Länge (Standard: Mitte von shotSec der Art)
  kamera?: KameraArt;           // Standard je Art
  figur?: number;               // welcher Figur nah/folgen gilt
  worte?: Wortzeile[];          // Wortfolge, Zeiten relativ zum Takt
  stoss?: number;               // Stoss bei Sekunde …
  blitz?: boolean;              // weisser Blitz am Anfang
  phase?: "aufbau" | "hoehepunkt";   // nur spannung
};

/** Standard je Art: Kamera, Überblendung (Frames), Schieben. */
const STIL: Record<Exclude<KapitelArt, "aufruf">, { kamera: KameraArt; fade: number }> = {
  hook: { kamera: "raute", fade: 0 }, montage: { kamera: "raute", fade: 0 }, erklaerung: { kamera: "raute", fade: 12 },
  beispiel: { kamera: "folgen", fade: 0 }, zeitreise: { kamera: "raute", fade: 20 }, vergleich: { kamera: "raute", fade: 0 },
  mythos: { kamera: "raute", fade: 0 }, zahlen: { kamera: "raute", fade: 12 }, spannung: { kamera: "ran", fade: 0 },
  panorama: { kamera: "weit", fade: 18 }, aufloesung: { kamera: "raute", fade: 12 }, abspann: { kamera: "weit", fade: 12 },
};

export type TonEreignis = { t: number; klang: string; db: number; pan?: number; dauer?: number };
export type Kapitel = { art: KapitelArt; start: number; ende: number; shots: ShotData[]; ton: { stimmung: string; bildpause: boolean; ereignisse: TonEreignis[] } };

const mitte = (r: number[]) => (r[0] + r[1]) / 2;
const klang = (name: keyof typeof TON.klaenge, t: number): TonEreignis => ({ t, klang: TON.klaenge[name][0] as string, db: TON.klaenge[name][1] as number });

/** Shots aus Takten (gemeinsam für Kapitel und Kurzform). */
const shotsAus = (takte: Takt[], start: number, format: Format, std: { kamera: KameraArt; fade: number; sek: (t: Takt) => number }, idVorsatz: string) => {
  const shots: ShotData[] = [], ton: TonEreignis[] = [];
  let t0 = start;
  takte.forEach((tk, i) => {
    const sek = tk.sek ?? std.sek(tk), kam = tk.kamera ?? std.kamera;
    const platten: Platte[] = tk.platten ?? [{ ort: tk.ort ?? "dorf" }];
    const einfach = platten.length === 1 && !besonders(platten[0]);
    // eine Platte: Kamera-Arten wie bisher; mehrere/angefügte: Kamera folgt der Plattenzahl
    let camera = einfach ? kameraSchluessel(kam, platten[0].ort, format, sek, tk.figur ?? 0) : plattenKamera(platten, format === "lang", sek);
    if (tk.buerger) {
      const b = tk.buerger, vorher = camera.filter((k) => k.at < b.ab).map((k) => ({ ...k, push: 0 }));
      camera = [...vorher, ...buergerKamera(platten, { ...b, bis: b.bis ?? sek }, camera[0], sek, `${idVorsatz}${i + 1}`)];
    } else if (tk.ziel) {
      const z = tk.ziel.punkt, ziel = Array.isArray(z) ? z : figurWelt(platten, z.platte ?? 0, z.figur, sek).pos;
      camera = zielFahrt(camera[0], sek, ziel as [number, number, number], tk.ziel.nah ?? TM.kamera.zielNah);
    } else {
      camera = deckeln(camera, sek);
    }
    const name = platten.map((p) => typeof p.ort === "string" ? p.ort : p.ort.name).join("+");
    const shot: ShotData = {
      id: `${idVorsatz}${String(i + 1).padStart(2, "0")}-${name}`, seconds: sek, light: "kalt", camera,
      fadeIn: i === 0 && start === 0 ? 0 : std.fade, data: { platten, worte: tk.worte ?? [] },
    };
    for (const p of platten) if (p.ab !== undefined && p.ab < sek) {
      for (let k = 0; k < TM.platten.pulse; k++) ton.push(klang("funken", t0 + p.ab + (k * TM.platten.funkenSec) / TM.platten.pulse));
      ton.push(klang("erscheinen", t0 + p.ab + TM.platten.funkenSec));
    }
    if (tk.stoss !== undefined) { shot.kicks = [{ at: tk.stoss, amp: 0.05 }]; ton.push(klang("stoss", t0 + tk.stoss)); }
    if (tk.blitz) { shot.flash = 4; ton.push(klang("blitz", t0)); }
    for (const z of tk.worte ?? []) {
      ton.push(klang(z.wert !== undefined ? "zahl" : "zeile", t0 + z.ab));
      // rote Wörter bekommen einen dumpfen Schlag, wenn sie auftauchen
      z.text.split(/\s+/).forEach((w, j) => {
        if ((z.rot ?? []).some((r) => r.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase() === w.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase()))
          ton.push(klang("rot", t0 + z.ab + (j * TM.worte.abstandFrames) / 30));
      });
    }
    shots.push(shot); t0 += sek;
  });
  return { shots, ton, ende: t0 };
};

/** Ein Kapitel. `titel`: Titel-Tafel am Anfang (nicht bei hook). Zeiten in Film-Sekunden. */
export const kapitel = (art: Exclude<KapitelArt, "aufruf">, o: { nr: number; start: number; titel?: string; takte: Takt[]; format?: Format }): Kapitel => {
  const A = ARTEN[art], format = o.format ?? "lang";
  const takte = o.takte.map((t, i) => {
    if (i === 0 && o.titel && art !== "hook" && art !== "panorama") {
      const bis = 0.2 + TM.worte.titelSec;
      // Titel oben; Zeilen, die gleichzeitig stehen, bleiben unten (Standard)
      return { ...t, worte: [{ text: o.titel.toUpperCase(), ueber: `CHAPTER ${o.nr}`, ab: 0.2, bis, lage: "oben" as const }, ...(t.worte ?? [])] };
    }
    return t;
  });
  const sek = (t: Takt) => {
    if (art === "spannung" && "shotSecPhasen" in A) return mitte(t.phase === "hoehepunkt" ? A.shotSecPhasen.hoehepunkt : A.shotSecPhasen.aufbau);
    return mitte(A.shotSec);
  };
  const r = shotsAus(takte, o.start, format, { ...STIL[art], sek }, `k${o.nr}-`);
  r.shots[0].kapitel = { art, titel: o.titel };
  return { art, start: o.start, ende: r.ende, shots: r.shots, ton: { stimmung: TON.stimmung[art], bildpause: art === "panorama", ereignisse: r.ton } };
};

/** Kapitel-Art „aufruf“ direkt nach dem hook: das letzte Bild des hook friert ein, wird unscharf, dann Like- und Abo-Knopf. */
export const aufruf = (o: { nr: number; hook: Kapitel; fps?: number }): Kapitel => {
  const fps = o.fps ?? 30, letzt = o.hook.shots[o.hook.shots.length - 1], frames = Math.round(letzt.seconds * fps);
  const pose = cameraAt(letzt.camera, letzt.kicks, frames - 1, fps);
  const A = TM.aufruf, start = o.hook.ende;
  const shot: ShotData = {
    id: `k${o.nr}-01-aufruf`, seconds: A.sek, light: "kalt", fadeIn: 0,
    camera: [{ at: 0, pos: pose.pos, look: pose.look, fov: pose.fov, roll: pose.roll, push: 0 }],
    data: { ...(letzt.data ?? {}), worte: [], zeitFest: (frames - 1) / fps, aufruf: true },
    kapitel: { art: "aufruf" },
  };
  const t = (f: number) => start + f / 30;
  const ton = [klang("knopf", t(A.like.ab)), klang("druck", t(A.like.druck)), klang("knopf", t(A.abo.ab)), klang("druck", t(A.abo.druck))];
  return { art: "aufruf", start, ende: start + A.sek, shots: [shot], ton: { stimmung: TON.stimmung.aufruf, bildpause: false, ereignisse: ton } };
};

/** Kurzform: Takte mit Schnitt alle ~2,5 s (Token kurzShotSec). */
export const kurz = (takte: Takt[]) => shotsAus(takte, 0, "kurz", { kamera: "raute", fade: 0, sek: () => TM.kamera.kurzShotSec }, "s");

/** Prüft eine Kapitel-Folge gegen die Regeln der Tokens (Beginn hook, Ende aufloesung + abspann, keine Art zweimal hintereinander
 *  ausser beispiel, Längen). Gibt Meldungen zurück (leer = gut). */
export const pruefeFolge = (kap: Kapitel[]) => {
  const m: string[] = [];
  if (kap[0]?.art !== "hook") m.push("Beginn ist nicht hook");
  if (kap.length > 2 && kap[1]?.art !== "aufruf") m.push("direkt nach dem hook fehlt aufruf");
  // Wortfolge nur an extremen Stellen (Nutzer): höchstens eine Zeile je ~45 s (ohne Kapiteltitel)
  const zeilen = kap.flatMap((k) => k.shots.flatMap((sh) => (((sh.data ?? {}) as { worte?: Wortzeile[] }).worte ?? []).filter((z) => !z.ueber)));
  const dauer = kap.length ? kap[kap.length - 1].ende - kap[0].start : 0;
  if (zeilen.length > Math.max(2, dauer / TM.worte.hoechstensJeSec)) m.push(`Wortfolge zu oft: ${zeilen.length} Zeilen in ${Math.round(dauer)} s (nur an extremen Stellen, ~1 je ${TM.worte.hoechstensJeSec} s)`);
  if (kap.length > 1 && (kap[kap.length - 2].art !== "aufloesung" || kap[kap.length - 1].art !== "abspann")) m.push("Ende ist nicht aufloesung + abspann");
  kap.forEach((k, i) => {
    if (i && kap[i - 1].art === k.art && k.art !== "beispiel") m.push(`${k.art} zweimal hintereinander`);
    const L = ARTEN[k.art].laengeSec, d = k.ende - k.start;
    if (d < L[0] || d > L[1]) m.push(`Kapitel ${i + 1} ${k.art}: ${d.toFixed(1)} s (Soll ${L[0]}–${L[1]} s)`);
  });
  return m;
};

/** Story aus Kapiteln (Langform) bzw. Shots (Kurzform). */
export const storyLang = (id: string, kap: Kapitel[]): Story => ({ id, format: "longform", shots: kap.flatMap((k) => k.shots) });
export const storyKurz = (id: string, shots: ShotData[]): Story => ({ id, format: "shortform", shots });

/** Ton-Datei (audio/v01) für Kapitel oder Kurzform: kalte Moll-Musik je Stimmung, Wind-Bett, Ereignisse der Tafeln/Stösse. */
export const tonDatei = (video: string, ende: number, abschnitte: { ab: number; stimmung: string; bildpause?: boolean }[], ereignisse: TonEreignis[]) => ({
  video, herkunft: "styles/T0004_quadratic-3d/kapitel.ts (tonDatei)",
  dauer: { frames: Math.round(ende * 30), fps: 30 },
  musik: { bpm: TON.bpm, abschnitte: abschnitte.map((a) => ({ ab: a.ab, akkorde: TON.akkorde, stimmung: a.stimmung, ...(a.bildpause ? { bildpause: true } : {}) })), schluss: true },
  betten: [{ klang: TON.bett.klang, ab: 0, bis: ende, db: TON.bett.db }],
  ereignisse: [...ereignisse].sort((a, b) => a.t - b.t),
});
export const kapitelTon = (video: string, kap: Kapitel[]) =>
  tonDatei(video, kap[kap.length - 1].ende, kap.map((k) => ({ ab: k.start, stimmung: k.ton.stimmung, bildpause: k.ton.bildpause })), kap.flatMap((k) => k.ton.ereignisse));
