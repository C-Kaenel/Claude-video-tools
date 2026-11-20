// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Einstieg für Videos im Stil T0004: `quadratic(story)` liefert den Eintrag für motorCompositions – Stil (Look von Bild 1,
// Nebel passend zum Format), Welt je Shot (`shot.data.platten` bzw. älter `shot.data.ort`; `zeitFest` = eingefrorenes Bild),
// Wortfolge (`shot.data.worte`) und Aufruf-Ebene (`shot.data.aufruf`: Unschärfe + Like-/Abo-Knöpfe) als 2D-Ebene.
import React from "react";
import { buildTimeline, FORMATS, type MotorVideoProps, type Story, type WorldBuilder } from "../../engine/v01";
import { REFERENZ, quadStyle } from "./look";
import { ortWelt, quadWelt, type Ort } from "./welt";
import { ORTE, type OrtName } from "./orte";
import { rautenAbstand } from "./kamera";
import { besonders, plattenWelt, type Platte } from "./platten";
import { Worte, type WortEreignis, type Wortzeile } from "./worte";
import { Aufruf, type AufrufEreignis } from "./aufruf";

type Daten = { ort?: OrtName | Ort; platten?: Platte[]; zeitFest?: number };

/** Welt je Shot. Eine einzelne Platte ohne Lage/Zeit baut wie bisher (Bild 1 und die Orte bleiben bytegleich). */
export const welt: WorldBuilder = (ctx) => {
  const d = (ctx.shot.data ?? {}) as Daten;
  const platten = d.platten ?? [{ ort: d.ort ?? "dorf" }];
  const p0 = platten[0];
  const einfach = platten.length === 1 && !besonders(p0);
  const ort = (o: OrtName | Ort) => (typeof o === "string" ? (o === "dorf" ? null : ORTE[o]) : o);
  const bau = einfach ? (ort(p0.ort) ? ortWelt(REFERENZ, ort(p0.ort)!) : quadWelt(REFERENZ)) : plattenWelt(REFERENZ, platten);
  const tick = bau(ctx);
  if (d.zeitFest === undefined) return tick;
  const fest = d.zeitFest;   // aufruf: das letzte Bild des hook steht still (Figuren, Partikel, Funken)
  return (c) => tick?.({ ...c, time: fest, local: Math.round(fest * ctx.fps) });
};

/** Alle Wortzeilen der Story in Film-Frames (Shot-Anfang aus der Zeitleiste des Motors). */
export const wortEreignisse = (story: Story): WortEreignis[] => {
  const fps = FORMATS[story.format].fps, tl = buildTimeline(story, fps);
  return tl.shots.flatMap((sh) => (((sh.data ?? {}) as { worte?: Wortzeile[] }).worte ?? []).map((z) => ({
    ...z, von: sh.start + Math.round(z.ab * fps), bisFrame: z.bis !== undefined ? sh.start + Math.round(z.bis * fps) : sh.end,
  })));
};

/** Aufruf-Abschnitte (Kapitel-Art aufruf) in Film-Frames. */
export const aufrufEreignisse = (story: Story): AufrufEreignis[] => {
  const tl = buildTimeline(story, FORMATS[story.format].fps);
  return tl.shots.filter((sh) => ((sh.data ?? {}) as { aufruf?: boolean }).aufruf).map((sh) => ({ von: sh.start, bis: sh.end }));
};

/** Eintrag für motorCompositions. */
export const quadratic = (story: Story): MotorVideoProps & { id?: string } => {
  const fmt = FORMATS[story.format], zeilen = wortEreignisse(story), aufrufe = aufrufEreignisse(story);
  const overlay: React.FC<{ frame: number }> = ({ frame }) => React.createElement(React.Fragment, null,
    React.createElement(Aufruf, { frame, abschnitte: aufrufe, breit: fmt.width, hoch: fmt.height }),
    React.createElement(Worte, { frame, zeilen, breit: fmt.width, hoch: fmt.height }));
  return { story, style: quadStyle(REFERENZ, rautenAbstand(story.format === "longform" ? "lang" : "kurz")), build: welt, overlay };
};
