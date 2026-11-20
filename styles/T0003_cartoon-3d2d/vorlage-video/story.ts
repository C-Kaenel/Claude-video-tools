// Herkunft: eigen (V-Video), geschrieben 2026-11-08, ohne Vorlage.
// VORLAGE für ein neues Video im Stil T0003 (Skill K0002). Kopieren nach productions/V####_…/src-motor/ und anpassen.
// Beispiel (10 s): Ein Rufer am Kai ruft „HELLO!“, Schnitt, eine Frau erschrickt und eine Glühbirne geht an.
// Regeln: Zeiten in Film-Sekunden; jeder harte Kamera-Schnitt ist ein eigener Shot; Ausdruck-Wechsel 2 Frames vor dem Wort.
import type { Story } from "../../../engine/v01";
import { kamera, ort, shot } from "../szene";

const FPS = 30;
const LEAD = 2 / FPS;
const RUFER: [number, number] = [24, -2.8];   // Boden x, z (Strasse am Kai; Häuser bei z −6,5, Fluss hinter der Kamera)
const FRAU: [number, number] = [25.6, -4.6];  // auf dem Gehsteig (steht automatisch 0,15 m höher)

export const story: Story = { id: "Vorlage-Video", format: "shortform", shots: [
  shot(FPS, { id: "01-ruf", a: 0, b: 150, camera: kamera("halbnah", RUFER), focus: { strength: 11, point: [RUFER[0], 1.6, RUFER[1]] },
    kicks: [{ at: 1.0, amp: 0.006 }],
    szene: { cast: [{ lib: "rufer", seed: 1, keys: [{ at: -10, pos: RUFER, expr: "smile" }, { at: 1.0 - LEAD, expr: "shout", pose: "shout" }] }],
      fx: [{ kind: "sprechblase", h: 0.6, unlit: true, keys: [{ at: 1.0, show: true, pos: [RUFER[0] + 0.2, 2.05, RUFER[1] + 0.05], params: { text: "HELLO!", art: "ruf", schwanz: "links" }, motion: "sway" }, { at: 4.2, show: false }] }] } }),
  shot(FPS, { id: "02-idee", a: 150, b: 300, camera: kamera("halbnah", FRAU, { push: 0.08 }), focus: { strength: 12, point: [FRAU[0], 1.65, FRAU[1]] },
    szene: { cast: [{ lib: "frau-gelb", seed: 2, keys: [{ at: -10, pos: FRAU, expr: "neutral" }, { at: 6.0 - LEAD, expr: "shock" }, { at: 7.5, expr: "grin" }] }],
      fx: [{ kind: "gluehbirne", h: 0.32, unlit: true, keys: [{ at: 7.5, show: true, pos: [FRAU[0] + 0.22, 2.08, FRAU[1] + 0.1], params: { an: 1 }, motion: "pulse" }] }] } }),
] };

// Orte zum Nachschlagen: ort("kai"), ort("platz"), ort("laborstrasse") … – je mit .at, .wide, .medium
export const ORT_BEISPIEL = ort("kai");
