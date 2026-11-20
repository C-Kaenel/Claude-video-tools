// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Kamera-Arten des Stils T0004 – immer 45° zu den Kartenachsen und mit dem Blickwinkel von Bild 1, damit jede Karte eine
// Raute bleibt: raute (Totale, mittig), nah (selten: in eine Figur hinein), folgen (nah, gleitet mit der Figur), weit
// (Rückfahrt in den Void), ran (langsam heranfahren). Werte aus shared/design-tokens.json (lens/motion → quadratic-3d).
import type { CameraKey } from "../../engine/v01";
import tokens from "../../shared/design-tokens.json";
import { REFERENZ, rautenKamera } from "./look";
import { FIGUR_VERSATZ, wegPunkt } from "./welt";
import { ortMasse, type OrtName } from "./orte";
import type { Ort } from "./welt";

export type Format = "kurz" | "lang";
type V3 = [number, number, number];
const KL = tokens.lens["quadratic-3d"].kamera, KM = tokens.motion["quadratic-3d"].kamera;
const PUSH = tokens.motion["quadratic-3d"].kameraPushPctProFrame;

/** Totale auf die Raute (wie Bild 1); `faktor` > 1 = weiter weg. */
export const raute = (ort: OrtName | Ort, format: Format, faktor = 1) => {
  const m = ortMasse(ort);
  const k = rautenKamera(REFERENZ, m.groesse, KL.look as V3, format === "lang", KL.mittig, KL.kartenKoerperM.unten, m.oben);
  const pos = k.look.map((v, i) => v + (k.pos[i] - v) * faktor) as V3;
  return { pos, look: k.look, fov: k.fov, dist: k.dist * faktor };
};

/** Kamera nah an einem Punkt (Bildbreite `breite` m), gleiche Richtung wie die Raute. */
export const nahAn = (punkt: V3, format: Format, breite = KM.nahBreiteM) => {
  const hoehe = format === "lang" ? breite * 9 / 16 : breite * 16 / 9;
  const dist = hoehe / 2 / Math.tan((REFERENZ.fov * Math.PI) / 360);
  const e = (REFERENZ.el * Math.PI) / 180, hz = Math.cos(e) * dist / Math.SQRT2;
  return { pos: [punkt[0] + hz, punkt[1] + Math.sin(e) * dist, punkt[2] + hz] as V3, look: punkt, fov: REFERENZ.fov };
};

/** Wo Figur `i` eines Orts zur Shot-Zeit `t` steht (Brusthöhe). */
export const figurBei = (ort: OrtName | Ort, i: number, t: number): V3 => {
  const w = ortMasse(ort).wege[i] ?? ortMasse(ort).wege[0];
  const p = wegPunkt(w, t + i * FIGUR_VERSATZ);
  return [p.x, 1.2, p.z];
};

/** Kamera-Schlüssel eines Takts. */
export const kameraSchluessel = (art: "raute" | "nah" | "folgen" | "weit" | "ran", ort: OrtName | Ort, format: Format, sek: number, figur = 0): CameraKey[] => {
  if (art === "raute") { const k = raute(ort, format); return [{ at: 0, pos: k.pos, look: k.look, fov: k.fov, push: PUSH }]; }
  if (art === "ran") { const k = raute(ort, format); return [{ at: 0, pos: k.pos, look: k.look, fov: k.fov, push: 0.2 }]; }
  if (art === "weit") {
    const a = raute(ort, format), b = raute(ort, format, KM.weitFaktor);
    return [{ at: 0, pos: a.pos, look: a.look, fov: a.fov, push: 0 }, { at: 0.3, pos: b.pos, look: b.look, fov: b.fov, move: Math.round((sek - 0.3) * 30), push: 0 }];
  }
  if (art === "nah") { const k = nahAn(figurBei(ort, figur, 0), format); return [{ at: 0, pos: k.pos, look: k.look, fov: k.fov, push: 0.08 }]; }
  // folgen: alle `folgenSchrittS` ein Schlüssel auf die Figur, weich gleitend
  const keys: CameraKey[] = [];
  for (let t = 0; t <= sek + 1e-6; t += KM.folgenSchrittS) {
    const k = nahAn(figurBei(ort, figur, t), format, KM.folgenBreiteM);
    keys.push(t === 0 ? { at: 0, pos: k.pos, look: k.look, fov: k.fov, push: 0 } : { at: t - KM.folgenSchrittS, pos: k.pos, look: k.look, fov: k.fov, move: Math.round(KM.folgenSchrittS * 30), push: 0 });
  }
  return keys;
};

/** Kamera-Abstand der Raute (für den Nebel des Stils im jeweiligen Format). */
export const rautenAbstand = (format: Format) => raute("dorf", format).dist;
