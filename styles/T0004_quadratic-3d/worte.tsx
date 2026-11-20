// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Wortfolge des Stils T0004 (Wunsch des Nutzers statt Tafeln): eine Zeile Text erscheint Wort für Wort – jedes Wort taucht
// unterhalb seiner Zeile auf, gleitet hoch, dann folgt das nächste. Dramatische Wörter (`rot`) leuchten rot. Am Ende gleitet
// die Zeile nach oben weg. 2D-Ebene über dem Bild (Motor: `overlay`), Lage in der Safe Area des Formats aus den Tokens.
// Schrift Inter (FONT.sans, fett 800, eng gesetzt) – klarer Apple-ähnlicher Look.
import React from "react";
import { FONT } from "../../engine/v01";
import tokens from "../../shared/design-tokens.json";

const W = tokens.color["quadratic-3d"].worte, M = tokens.motion["quadratic-3d"].worte;
const SAFE = tokens.safeArea;

export type Wortzeile = {
  text: string;                 // ganze Zeile; `{n}` = Zahl, die bis `wert` hochzählt
  ab: number;                   // Sekunden ab Takt-Anfang
  bis?: number;                 // Ende (Standard: Ende des Takts)
  rot?: string[];               // Wörter, die rot erscheinen (Gross/klein egal, ohne Satzzeichen)
  ueber?: string;               // kleine Zeile darüber (z. B. "CHAPTER 2")
  wert?: number;
  lage?: "unten" | "mitte" | "oben";
};

/** Zeile mit Film-Frames (von quadratic() aus den Shots berechnet). */
export type WortEreignis = Wortzeile & { von: number; bisFrame: number };

const ease = (u: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
const sauber = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, "").toLowerCase();

/** Die Text-Ebene: zeigt alle Zeilen, die im aktuellen Frame stehen. */
export const Worte: React.FC<{ frame: number; zeilen: WortEreignis[]; breit: number; hoch: number }> = ({ frame, zeilen, breit, hoch }) => {
  const quer = breit > hoch, k = hoch / (quer ? 1080 : 1920);
  const safe = quer ? SAFE["long-form"] : SAFE["short-form"];
  const groesse = (quer ? M.groesseLangPx : M.groesseKurzPx) * k;
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {zeilen.filter((z) => frame >= z.von && frame < z.bisFrame + M.wegFrames).map((z, zi) => {
        const woerter = z.text.split(/\s+/).filter(Boolean);
        const raus = ease((frame - z.bisFrame) / M.wegFrames);
        const lage = z.lage ?? "unten";
        const y = lage === "oben" ? { top: safe.topPx * k + hoch * 0.06 } : lage === "mitte" ? { top: hoch * 0.45 } : { bottom: safe.bottomPx * k + hoch * (quer ? 0.1 : 0.03) };
        return (
          <div key={zi} style={{ position: "absolute", left: safe.leftPx * k, right: safe.rightPx * k, ...y, textAlign: "center",
            transform: `translateY(${-raus * groesse * 0.9}px)`, opacity: 1 - raus }}>
            {z.ueber ? <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: groesse * 0.36, letterSpacing: groesse * 0.06, color: W.leise,
              opacity: ease((frame - z.von) / M.wortFrames), marginBottom: groesse * 0.15 }}>{z.ueber}</div> : null}
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", columnGap: groesse * 0.28, rowGap: groesse * 0.05 }}>
              {woerter.map((w, i) => {
                const start = z.von + i * M.abstandFrames, u = ease((frame - start) / M.wortFrames);
                const rot = (z.rot ?? []).some((r) => sauber(r) === sauber(w));
                const zahl = z.wert !== undefined && w.includes("{n}")
                  ? w.replace("{n}", Math.round(z.wert * ease((frame - start) / (M.zaehlenSec * 30))).toLocaleString("en-US")) : w;
                return (
                  <span key={i} style={{ display: "inline-block", overflow: "hidden", lineHeight: 1.12, paddingBottom: groesse * 0.04 }}>
                    <span style={{ display: "inline-block", fontFamily: FONT.sans, fontWeight: 800, letterSpacing: -groesse * 0.02, fontSize: groesse, color: rot ? W.rot : W.weiss,
                      transform: `translateY(${(1 - u) * 110}%)`, opacity: u > 0 ? 1 : 0,
                      textShadow: `0 ${groesse * 0.04}px ${groesse * 0.18}px ${W.schatten}` }}>{zahl}</span>
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
