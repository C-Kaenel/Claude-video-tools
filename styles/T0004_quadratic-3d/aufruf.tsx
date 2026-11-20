// Herkunft: eigen (V-Video), geschrieben 2026-11-15, ohne Vorlage.
// Kapitel-Art „aufruf“ im Stil T0004 (Guide 3.3, Tokens formats.long-form.kapitelArten.aufruf): direkt nach dem hook friert das
// letzte Bild ein und wird unscharf; dann ploppt ein Like-Knopf auf, wird gedrückt, verschwindet – danach ein Abo-Knopf ebenso.
// Knöpfe im Quadratic-Look: kantige Quader-Flächen, Symbole aus Quadraten (Daumen, Glocke), beim Druck kurz eingedrückt mit
// Funken aus kleinen Würfeln. 2D-Ebene über dem Bild (Motor: `overlay`). Zeiten und Farben aus den Tokens.
import React from "react";
import { FONT } from "../../engine/v01";
import tokens from "../../shared/design-tokens.json";

const A = tokens.motion["quadratic-3d"].aufruf, C = tokens.color["quadratic-3d"].aufruf;

/** Aufruf-Abschnitt in Film-Frames (aus quadratic() berechnet). */
export type AufrufEreignis = { von: number; bis: number };

const ease = (u: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
const plopp = (u: number) => { if (u <= 0) return 0; if (u >= 1) return 1; const c = 2.2, x = u - 1; return 1 + (c + 1) * x * x * x + c * x * x; };

/** Symbol aus Quadraten (Raster `muster`, "#" = gefüllt). */
const Pixel: React.FC<{ muster: string[]; zelle: number; farbe: string }> = ({ muster, zelle, farbe }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${muster[0].length}, ${zelle}px)`, gridAutoRows: `${zelle}px` }}>
    {muster.flatMap((z, i) => [...z].map((c, j) => <div key={`${i}-${j}`} style={{ background: c === "#" ? farbe : "transparent" }} />))}
  </div>
);
const DAUMEN = ["...##...", "...##...", "..###...", "..###...", "########", "########", "########", "#######.", "######.."];
const GLOCKE = ["...##...", "..####..", ".######.", ".######.", ".######.", "########", "########", "...##..."];

/** Ein Knopf: ploppt auf (ab), wird gedrückt (druck), verschwindet (weg). Zeiten in Frames relativ zum Abschnitt. */
const Knopf: React.FC<{ f: number; ab: number; druck: number; weg: number; text: string; textGedrueckt: string; muster: string[];
  farbe: string; farbeGedrueckt: string; s: number }> = ({ f, ab, druck, weg, text, textGedrueckt, muster, farbe, farbeGedrueckt, s }) => {
  if (f < ab || f > weg + A.wegFrames) return null;
  const rein = plopp((f - ab) / A.ploppFrames), gedrueckt = f >= druck;
  const drueck = f >= druck && f < druck + A.druckFrames ? 1 - 0.12 * Math.sin(Math.PI * (f - druck) / A.druckFrames) : 1;
  const raus = 1 - ease((f - weg) / A.wegFrames);
  const skal = rein * drueck * raus;
  const tiefe = 10 * s * (f >= druck && f < druck + A.druckFrames ? 0.3 : 1);
  const funken = f >= druck && f < druck + 14 ? (f - druck) / 14 : -1;
  return (
    <div style={{ position: "relative", transform: `scale(${skal})`, opacity: skal > 0.01 ? 1 : 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22 * s, padding: `${20 * s}px ${36 * s}px`,
        background: gedrueckt ? farbeGedrueckt : farbe, color: C.schrift, fontFamily: FONT.sans, fontWeight: 800, fontSize: 46 * s,
        letterSpacing: 2 * s, boxShadow: `0 ${tiefe}px 0 ${C.kante}, 0 ${tiefe + 18 * s}px ${30 * s}px ${C.schatten}`,
        transform: `translateY(${10 * s - tiefe}px)` }}>
        <Pixel muster={muster} zelle={6 * s} farbe={C.schrift} />
        <span>{gedrueckt ? textGedrueckt : text}</span>
      </div>
      {funken >= 0 ? Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2, d = 120 * s * ease(funken);
        return <div key={i} style={{ position: "absolute", left: "50%", top: "50%", width: 12 * s, height: 12 * s, background: C.funke,
          transform: `translate(${Math.cos(a) * d * 1.6 - 6 * s}px, ${Math.sin(a) * d - 6 * s}px) rotate(${a}rad)`, opacity: 1 - funken }} />;
      }) : null}
    </div>
  );
};

/** Die Aufruf-Ebene: Unschärfe über dem eingefrorenen Bild + die beiden Knöpfe nacheinander. */
export const Aufruf: React.FC<{ frame: number; abschnitte: AufrufEreignis[]; breit: number; hoch: number }> = ({ frame, abschnitte, breit, hoch }) => {
  const a = abschnitte.find((x) => frame >= x.von && frame < x.bis);
  if (!a) return null;
  const f = frame - a.von, s = (Math.min(breit, hoch) / 1080) * A.knopfGroesse;
  const blur = A.unschaerfePx * (Math.min(breit, hoch) / 1080) * ease(f / A.unschaerfeFrames);
  const L = A.like, B = A.abo;
  return (
    <div style={{ position: "absolute", inset: 0, backdropFilter: `blur(${blur}px)`, WebkitBackdropFilter: `blur(${blur}px)`,
      background: `rgba(20,24,30,${0.18 * ease(f / A.unschaerfeFrames)})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Knopf f={f} ab={L.ab} druck={L.druck} weg={L.weg} text="LIKE" textGedrueckt="LIKED" muster={DAUMEN} farbe={C.like} farbeGedrueckt={C.likeGedrueckt} s={s} />
      <div style={{ position: "absolute" }}>
        <Knopf f={f} ab={B.ab} druck={B.druck} weg={B.weg} text="SUBSCRIBE" textGedrueckt="SUBSCRIBED" muster={GLOCKE} farbe={C.abo} farbeGedrueckt={C.aboGedrueckt} s={s} />
      </div>
    </div>
  );
};
