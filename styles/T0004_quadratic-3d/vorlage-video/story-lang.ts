// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Vorlage Langformat (16:9) im Stil T0004: vier kurze Kapitel aus den Kapitel-Modulen (hook → aufruf → erklaerung → panorama),
// je ein paar Takte; in der Erklärung wird eine Platte angefügt (Funken, Kamera dreht auf gerade). Composition
// `Quadratic-3D-Lang`. Alle 13 Arten: pruefung/kapitel.tsx; Platten, Bürger-Sicht, Aufruf einzeln: pruefung/neu.tsx.
import { aufruf, kapitel, kapitelTon, storyLang } from "../kapitel";

const k1 = kapitel("hook", { nr: 1, start: 0, takte: [
  { ort: "dorf", sek: 3, worte: [{ text: "Where did the town go?", ab: 0.4, rot: ["go"] }] },
  { ort: "berg", sek: 2.5, stoss: 0.2 },
] });
const k2 = aufruf({ nr: 2, hook: k1 });
const k3 = kapitel("erklaerung", { nr: 3, start: k2.ende, titel: "How It Works", takte: [
  { sek: 7, platten: [{ ort: "amsterdam", pos: [-12.5, 0] }, { ort: "kolosseum", pos: [12.5, 0], ab: 1.5 }] },
] });
const k4 = kapitel("panorama", { nr: 4, start: k3.ende, takte: [{ ort: "schneewald", sek: 5 }] });

export const kapitelLang = [k1, k2, k3, k4];
export const storyLangVorlage = storyLang("Quadratic-3D-Lang", kapitelLang);
export const tonLang = kapitelTon("Quadratic-3D-Lang", kapitelLang);
