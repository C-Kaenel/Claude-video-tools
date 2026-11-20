// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Einstieg der Prüf-Story "Kapitel" (Langformat 16:9): jede Kapitel-Art einmal (pruefung/kapitel-story.ts).
//   node engine/v01/qa/raum.mjs styles/T0003_cartoon-3d2d/pruefung/kapitel.tsx Kapitel output/kapitel_raum
import { registerRoot } from "remotion";
import { motorCompositions } from "../../../engine/v01";
import { cartoon3d2d } from "../style";
import { buildSzene } from "../szene";
import { story } from "./kapitel-story";

registerRoot(motorCompositions([{ story, style: cartoon3d2d, build: buildSzene }]));
