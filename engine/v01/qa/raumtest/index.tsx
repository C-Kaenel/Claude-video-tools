// Herkunft: eigen (V-Video), geschrieben 2026-11-13, ohne Vorlage.
// Einstieg der Prüf-Story RaumTest (Hochformat) und RaumTestQuer (Querformat) – Selbsttest der Raum-Prüfung, Aufruf über qa/selbsttest_raum.mjs.
import { registerRoot } from "remotion";
import { motorCompositions } from "../../index";
import { testStyle } from "../../examples/testszene/style";
import { raumStory, raumStoryQuer } from "./story";
import { buildRaumTest } from "./world";

registerRoot(motorCompositions([
  { story: raumStory, style: testStyle, build: buildRaumTest },
  { story: raumStoryQuer, style: testStyle, build: buildRaumTest },
]));
