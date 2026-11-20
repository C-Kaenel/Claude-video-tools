// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Vorlage Kurzformat (9:16, 10 s) im Stil T0004: vier Einstellungen à 2,5 s auf verschiedenen Karten, Wortfolge (Hook-Frage),
// einmal selten nah an eine Figur. Composition `Quadratic-3D-Kurz`.
import tokens from "../../../shared/design-tokens.json";
import { kurz, storyKurz, tonDatei } from "../kapitel";

const s = kurz([
  { ort: "dorf", worte: [{ text: "Why is it so cold?", ab: 0.3, rot: ["cold"] }] },
  { ort: "amsterdam", stoss: 0.1 },
  { ort: "kolosseum", kamera: "nah", figur: 1 },
  { ort: "schneewald", worte: [{ text: "Three days later", ab: 0.4 }] },
]);

export const storyKurzVorlage = storyKurz("Quadratic-3D-Kurz", s.shots);
export const tonKurz = tonDatei("Quadratic-3D-Kurz (10 s)", s.ende, [{ ab: 0, stimmung: tokens.motion["quadratic-3d"].ton.stimmung.kurz }], s.ton);
