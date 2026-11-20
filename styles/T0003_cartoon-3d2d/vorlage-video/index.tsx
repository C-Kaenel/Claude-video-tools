// Herkunft: eigen (V-Video), geschrieben 2026-11-08, ohne Vorlage. VORLAGE: Einstieg eines Videos im Stil T0003.
// Composition-ID = story.id. Optional `overlay` = Text-Ebene (siehe productions/V0003_…/src-motor/text.tsx).
// Zwei Vorlagen: "Vorlage-Video" (Kurzformat 9:16, story.ts) und "Vorlage-Video-Lang" (Langformat 16:9, story-lang.ts).
// Ein Video registriert nur seine eine Story.
import { registerRoot } from "remotion";
import { motorCompositions } from "../../../engine/v01";
import { cartoon3d2d } from "../style";
import { buildSzene } from "../szene";
import { story } from "./story";
import { story as storyLang } from "./story-lang";

registerRoot(motorCompositions([story, storyLang].map((s) => ({ story: s, style: cartoon3d2d, build: buildSzene }))));
