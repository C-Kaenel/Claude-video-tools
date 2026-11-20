// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Prüf-Story der Kapitel-Module (T0004): Composition `Quadratic-3D-Kapitel` (16:9) – jede der 13 Kapitel-Arten einmal (aufruf direkt nach dem hook), je mit
// wenigen Takten (absichtlich kürzer als `laengeSec`, nur zum Ansehen und Prüfen). Alle sechs Orte kommen vor.
// Testbilder: node engine/v01/qa/stills.mjs styles/T0004_quadratic-3d/pruefung/kapitel.tsx Quadratic-3D-Kapitel output/x_ 60 0.35
import { registerRoot } from "remotion";
import { motorCompositions } from "../../../engine/v01";
import { aufruf, kapitel, kapitelTon, storyLang, type Kapitel, type KapitelArt, type Takt } from "../kapitel";
import { quadratic } from "../szene";

const folge: [Exclude<KapitelArt, "aufruf">, string | undefined, Takt[]][] = [
  ["hook", undefined, [{ ort: "dorf", worte: [{ text: "Who built this place?", ab: 0.3, rot: ["built"] }] }, { ort: "berg", stoss: 0.3 }, { ort: "kolosseum", kamera: "nah", figur: 1 }]],
  ["montage", "Everything at Once", [{ ort: "amsterdam" }, { ort: "hotel" }, { ort: "schneewald" }, { ort: "kolosseum" }]],
  ["erklaerung", "How It Works", [{ ort: "amsterdam", worte: [{ text: "Step one: the canal", ab: 3 }] }]],
  ["beispiel", "One Traveller", [{ ort: "amsterdam", kamera: "folgen" }, { ort: "berg", kamera: "nah" }]],
  ["zeitreise", "Through the Ages", [{ ort: "kolosseum", worte: [{ text: "AD 80", ab: 0.6 }] }, { ort: "amsterdam", worte: [{ text: "1650", ab: 0.6 }] }]],
  ["vergleich", "Then and Now", [{ ort: "berg", worte: [{ text: "Summer or winter?", ab: 0.5, rot: ["winter"] }] }, { ort: "schneewald" }]],
  ["mythos", "Myth or Fact", [{ ort: "hotel", worte: [{ text: "Everyone says it was a myth", ab: 1, rot: ["myth"] }] }, { ort: "hotel", kamera: "nah", stoss: 0, blitz: true, worte: [{ text: "It was real", ab: 0.3, rot: ["real"] }] }]],
  ["zahlen", "By the Numbers", [{ ort: "kolosseum", worte: [{ text: "{n} seats", wert: 50000, ab: 0.8 }] }]],
  ["spannung", "The Storm", [{ ort: "berg", phase: "aufbau" }, { ort: "schneewald", phase: "aufbau" }, { ort: "berg", phase: "hoehepunkt", stoss: 1.5, blitz: true, worte: [{ text: "Then the storm hit", ab: 1.5, rot: ["storm"] }] }]],
  ["panorama", undefined, [{ ort: "schneewald", sek: 8 }]],
  ["aufloesung", "The Answer", [{ ort: "dorf" }, { ort: "amsterdam" }]],
  ["abspann", "One More Thing", [{ ort: "dorf", worte: [{ text: "Where do we go next?", ab: 1 }] }]],
];

let start = 0;
export const kapitelPruefung: Kapitel[] = [];
folge.forEach(([art, titel, takte]) => {
  const k = kapitel(art, { nr: kapitelPruefung.length + 1, start, titel, takte });
  kapitelPruefung.push(k); start = k.ende;
  if (art === "hook") { const a = aufruf({ nr: kapitelPruefung.length + 1, hook: k }); kapitelPruefung.push(a); start = a.ende; }
});
export const storyKapitel = storyLang("Quadratic-3D-Kapitel", kapitelPruefung);
export const tonKapitel = kapitelTon("Quadratic-3D-Kapitel", kapitelPruefung);

registerRoot(motorCompositions([quadratic(storyKapitel)]));
