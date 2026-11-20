// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Einstieg der Vorlage im Stil T0004: Compositions `Quadratic-3D-Kurz` (1080×1920) und `Quadratic-3D-Lang` (1920×1080).
import { registerRoot } from "remotion";
import { motorCompositions } from "../../../engine/v01";
import { quadratic } from "../szene";
import { storyKurzVorlage } from "./story";
import { storyLangVorlage } from "./story-lang";

registerRoot(motorCompositions([quadratic(storyKurzVorlage), quadratic(storyLangVorlage)]));
