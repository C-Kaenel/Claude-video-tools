// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Einstieg der Prüf-Story (Welt-Bildbogen).
import { registerRoot } from "remotion";
import { motorCompositions } from "../../../engine/v01";
import { cartoon3d2d } from "../style";
import { buildTown } from "../world";
import { story } from "./story";
import { langformat } from "../szene";

// "Weltbogen" = Kurzformat 9:16, "Weltbogen-Lang" = Langformat 16:9
registerRoot(motorCompositions([{ story, style: cartoon3d2d, build: buildTown }, { story: langformat(story), style: cartoon3d2d, build: buildTown }]));
