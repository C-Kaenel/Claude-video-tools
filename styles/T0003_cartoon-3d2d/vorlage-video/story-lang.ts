// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// VORLAGE für ein Langformat-Video (16:9, 1920×1080, YouTube) im Stil T0003 (Skill K0002). Kopieren nach
// productions/V####_…/src-motor/ (als story.ts) und anpassen. Beispiel (15 s): Totale auf den Platz am Kai, zwei Figuren
// im Gespräch (Halbnah), Schnitt auf die Pointe (Nahaufnahme mit Glühbirne).
// Langformat-Regeln: Einstellungen 4–8 s (Totale zum Ankommen, dann Halbnah/Nah), Figuren eher zu zweit oder in Gruppen,
// Karten und Blasen NEBEN die Figur statt darüber (das Bild ist niedrig; in der Nahaufnahme füllt das Gesicht die Höhe),
// in der Safe Area (oben 54, unten 108, links/rechts 96 px) – das Bild ist breit, die Umgebung erzählt mit.
import type { Story } from "../../../engine/v01";
import { kamera, langformat, rezept, rezeptKamera, rezeptPunkt, shot } from "../szene";

const FPS = 30;
const LEAD = 2 / FPS;
const ORT = "stadt-platz";
const LINKS = rezeptPunkt(ORT, "links"), RECHTS = rezeptPunkt(ORT, "rechts");
const ort = rezept(ORT);

export const story: Story = langformat({ id: "Vorlage-Video", format: "shortform", shots: [   // ID wird "Vorlage-Video-Lang"
  // 1) Totale: Ort zeigen, Menschen kommen an (6 s)
  shot(FPS, { id: "01-ankunft", a: 0, b: 180, camera: kamera("totale", rezeptPunkt(ORT, "mitte"), { push: 0.12, abstand: 0.8 }),
    szene: { ...ort, cast: [
      { lib: "zylinder-blau", seed: 1, keys: [{ at: -10, pos: [LINKS[0] - 3, LINKS[1]], expr: "smile" }, { at: 0.5, pos: [LINKS[0] - 3, LINKS[1]] }, { at: 4.5, pos: LINKS }] },
      { lib: "frau-gelb", seed: 2, keys: [{ at: -10, pos: RECHTS, expr: "neutral" }] },
    ] } }),
  // 2) Halbnah: Gespräch mit Sprechblase (5 s)
  shot(FPS, { id: "02-gespraech", a: 180, b: 330, camera: rezeptKamera(ORT, "halbnah", { push: 0.1 }), focus: { strength: 10, point: [rezeptPunkt(ORT, "mitte")[0], 1.6, rezeptPunkt(ORT, "mitte")[1]] },
    szene: { ...ort, cast: [
      { lib: "zylinder-blau", seed: 1, keys: [{ at: -10, pos: LINKS, expr: "smile", side: 1 }, { at: 7.0 - LEAD, expr: "shout", pose: "wave" }] },
      { lib: "frau-gelb", seed: 2, keys: [{ at: -10, pos: RECHTS, expr: "neutral", side: -1 }, { at: 9.0, expr: "smile" }] },
    ],
      fx: [{ kind: "sprechblase", h: 0.55, unlit: true, keys: [{ at: 7.0, show: true, pos: [LINKS[0] - 0.3, 2.1, LINKS[1] + 0.05], params: { text: "LOOK!", art: "ruf", schwanz: "rechts" }, motion: "sway" }, { at: 10.4, show: false }] }] } }),
  // 3) Nahaufnahme: Pointe (4 s)
  shot(FPS, { id: "03-idee", a: 330, b: 450, camera: kamera("nahaufnahme", RECHTS, { push: 0.06 }), focus: { strength: 13, point: [RECHTS[0], 1.65, RECHTS[1]] },
    kicks: [{ at: 12.0, amp: 0.004 }],
    szene: { ...ort, cast: [{ lib: "frau-gelb", seed: 2, keys: [{ at: -10, pos: RECHTS, expr: "neutral" }, { at: 12.0 - LEAD, expr: "shock" }, { at: 13.0, expr: "grin" }] }],
      fx: [{ kind: "gluehbirne", h: 0.3, unlit: true, keys: [{ at: 12.0, show: true, pos: [RECHTS[0] + 0.5, 1.55, RECHTS[1] + 0.1], params: { an: 1 }, motion: "pulse" }] }] } }),
] });
