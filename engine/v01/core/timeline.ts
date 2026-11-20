// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Zeitleiste: ein Video ist eine Folge von Shots (Einstellungen). Übergänge: harter Schnitt, Überblendung, weisser Blitz.

import type { CameraKey, Kick } from "../camera/rig";

export type Light = string; // Name einer Lichtstimmung (z. B. "day", "golden"), kommt aus dem Stil

/** Ein Shot, wie er in der Story-Datei eines Videos steht (Daten). Zeiten in Sekunden relativ zum Shot-Anfang. */
export type ShotData = {
  id: string;
  seconds: number;                       // Dauer
  light: Light;
  camera: CameraKey[];                   // Kamera-Schlüssel (siehe camera/rig.ts)
  kicks?: Kick[];                        // Stösse bei Aufprall
  focus?: { strength: number; point?: [number, number, number] }; // Tiefenschärfe: Stärke in px (bei 1080), Fokuspunkt (Standard: Blickpunkt)
  fadeIn?: number;                       // Überblendung vom vorigen Shot, in Frames (0 = harter Schnitt)
  flash?: number;                        // weisser Blitz am Anfang, in Frames
  sun?: { az: number; el: number };      // Sonne relativ zur Kamera (Grad), sonst Wert der Lichtstimmung
  data?: Record<string, unknown>;        // freie Angaben für die Welt dieses Videos (Ort, Personen …)
  /** Langform: hier beginnt ein Kapitel (Art aus shared/design-tokens.json → formats.long-form.kapitelArten, z. B. "hook").
   *  Gilt bis zum nächsten Shot mit `kapitel`. Nur für Prüfung und Zeitplan – ändert nichts am Bild. */
  kapitel?: { art: string; titel?: string };
  /** Kamera-Tiefe dieses Shots (überschreibt `Style.tiefe` feldweise) – siehe core/style.ts `Tiefe`. */
  tiefe?: Tiefe;
};

/** Kamera-Tiefe (Tiefen-Genauigkeit): ohne Angabe near 0,1 m / far 1200 m. `nearBoden`: near = Anteil der Strecke von der
 *  Kamera entlang der Blickrichtung bis zum Boden (y = 0; ohne Boden im Blick: bis zum Ursprung), höchstens `nearMax`
 *  (Standard 60 m), mindestens 0,1 m – für Vogelperspektiven aus 80–250 m, wo near 0,1 m nahe Flächen flackern lässt.
 *  Mit `tiefe` übernehmen Tusche und Tiefenschärfe near/far jedes Frame (auch ein near, das der Welt-Tick setzt) – das
 *  ändert die Tusche-Linien (richtige Tiefe), Tusche-Werte des Stils danach prüfen. */
export type Tiefe = { near?: number; far?: number; nearBoden?: number; nearMax?: number };

/** Kapitel eines Videos (aus den Shots mit `kapitel`): Art, Titel, Frames [start, end), Shot-IDs. */
export type Kapitel = { art: string; titel?: string; start: number; end: number; shots: string[] };

/** Kapitel aus der Zeitleiste: jedes beginnt an einem Shot mit `kapitel` und endet am nächsten (oder am Videoende). */
export const kapitelVon = (shots: Shot[], total: number): Kapitel[] => {
  const out: Kapitel[] = [];
  for (const s of shots) {
    if (s.kapitel) out.push({ art: s.kapitel.art, titel: s.kapitel.titel, start: s.start, end: total, shots: [] });
    if (out.length) out[out.length - 1].shots.push(s.id);
  }
  for (let i = 0; i + 1 < out.length; i++) out[i].end = out[i + 1].start;
  return out;
};

export type Story = { id: string; format: "shortform" | "longform"; shots: ShotData[] };

export type Shot = ShotData & { index: number; start: number; end: number; frames: number };

/** Rechnet Sekunden in Frames um (gerundet, damit Schnitte immer auf ganzen Frames liegen). */
export const sec = (s: number, fps: number) => Math.round(s * fps);

export const buildTimeline = (story: Story, fps: number) => {
  let t = 0;
  const shots: Shot[] = story.shots.map((s, index) => {
    const frames = sec(s.seconds, fps);
    const shot = { ...s, index, start: t, end: t + frames, frames };
    t += frames;
    return shot;
  });
  return { shots, total: t };
};

export type ActiveShot = { shot: Shot; local: number; opacity: number };

/** Welche Shots sind in Frame f sichtbar? Normal einer; während einer Überblendung zwei (der alte läuft weiter). */
export const activeAt = (shots: Shot[], f: number): ActiveShot[] => {
  const i = shots.findIndex((s) => f >= s.start && f < s.end);
  if (i < 0) return [];
  const cur = shots[i];
  const out: ActiveShot[] = [];
  const fade = cur.fadeIn ?? 0;
  if (i > 0 && fade > 0 && f < cur.start + fade) {
    const prev = shots[i - 1];
    out.push({ shot: prev, local: f - prev.start, opacity: 1 });
    out.push({ shot: cur, local: f - cur.start, opacity: (f - cur.start + 1) / (fade + 1) });
  } else {
    out.push({ shot: cur, local: f - cur.start, opacity: 1 });
  }
  return out;
};

/** Deckkraft des weissen Blitzes in Frame f (voll im ersten Frame, dann linear aus). */
export const flashAt = (shots: Shot[], f: number) => {
  for (const s of shots) {
    if (s.flash && f >= s.start && f < s.start + s.flash) return 1 - (f - s.start) / s.flash;
  }
  return 0;
};
