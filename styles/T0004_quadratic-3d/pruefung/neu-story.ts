// Herkunft: eigen (V-Video), geschrieben 2026-11-15, ohne Vorlage.
// Daten der Prüf-Storys in neu.tsx (ohne registerRoot, damit ton.mjs die Ton-Dateien daraus schreiben kann).
import { aufruf, kapitel, kapitelTon, storyLang } from "../kapitel";

// 1) hook + aufruf
const hook = kapitel("hook", { nr: 1, start: 0, takte: [
  { ort: "berg", sek: 3, stoss: 1.2 },
  { ort: "dorf", sek: 3.5, worte: [{ text: "Why did nobody leave?", ab: 0.6, rot: ["leave"] }] },
] });
const auf = aufruf({ nr: 2, hook });
export const storyAufruf = storyLang("Quadratic-3D-Aufruf", [hook, auf]);
export const tonAufruf = kapitelTon("Quadratic-3D-Aufruf", [hook, auf]);

// 2) Platten anfügen: Dorf → + Kolosseum (2 = gerade) → + Amsterdam (3 = Raute)
const platten = kapitel("erklaerung", { nr: 1, start: 0, takte: [{ sek: 14, platten: [
  { ort: "dorf", pos: [-12.5, 0] },
  { ort: "kolosseum", pos: [12.5, 0], ab: 2.5 },
  { ort: "amsterdam", pos: [-12.5, -25], ab: 8 },
] }] });
export const storyPlatten = storyLang("Quadratic-3D-Platten", [platten]);
export const tonPlatten = kapitelTon("Quadratic-3D-Platten", [platten]);

// 3) Bürger-Sicht in Amsterdam
const buerger = kapitel("beispiel", { nr: 1, start: 0, takte: [{ ort: "amsterdam", kamera: "raute", sek: 11, buerger: { figur: 0, ab: 1.5, bis: 9 } }] });
export const storyBuerger = storyLang("Quadratic-3D-Buerger", [buerger]);
export const tonBuerger = kapitelTon("Quadratic-3D-Buerger", [buerger]);

// 4) Erfahrungen aus V0009: Ziel-Fahrt (zur Brücke, 30 % näher), glatte Bürger-Sicht, Platte ohne Läufer mit Fensterlicht,
//    Front, an der die Figuren verschwinden
const v9 = kapitel("erklaerung", { nr: 1, start: 0, takte: [
  { ort: "amsterdam", sek: 6, ziel: { punkt: [3.5, 0.5, 0.5], nah: 0.7 } },
  { ort: "amsterdam", sek: 10, buerger: { figur: 0, ab: 1, bis: 7 } },
  { sek: 6, platten: [{ ort: "amsterdam", leer: true, fensterLicht: true }] },
  { sek: 7, platten: [{ ort: "kolosseum", welle: { richtung: [1, 1], start: -16, tempo: 4 } }] },
] });
export const storyV9 = storyLang("Quadratic-3D-V9", [v9]);
export const tonV9 = kapitelTon("Quadratic-3D-V9", [v9]);
