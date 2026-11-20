// Herkunft: eigen (V-Video), geschrieben 2026-11-15, ohne Vorlage.
// Prüf-Storys der Bausteine vom 2026-11-15 (Wünsche des Nutzers über die Organisation), je eine Composition (16:9):
//   Quadratic-3D-Aufruf  – hook (2 Takte) + aufruf: letztes Bild friert ein, unscharf, Like- und Abo-Knopf
//   Quadratic-3D-Platten – Platten anfügen: Funken pulsieren 3×, Platte erscheint; 1 Platte Raute, 2 gerade, 3 wieder Raute
//   Quadratic-3D-Buerger – Bürger-Sicht: Kamera fährt hinter eine Figur, schräg von oben, folgt ihr, zurück in die Raute
//   Quadratic-3D-V9      – Erfahrungen aus V0009: Ziel-Fahrt, glatte Bürger-Sicht, leere Platte mit Fensterlicht, Front
// Ton: node styles/T0004_quadratic-3d/vorlage-video/ton.mjs styles/T0004_quadratic-3d/pruefung/neu-story.ts tonAufruf output/x.json
import { registerRoot } from "remotion";
import { motorCompositions } from "../../../engine/v01";
import { quadratic } from "../szene";
import { storyAufruf, storyPlatten, storyBuerger, storyV9 } from "./neu-story";

registerRoot(motorCompositions([quadratic(storyAufruf), quadratic(storyPlatten), quadratic(storyBuerger), quadratic(storyV9)]));
