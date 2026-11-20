// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Einstieg der Testszene: zwei Compositions (Hochformat 9:16 und Querformat 16:9) mit derselben Story.
import { registerRoot } from "remotion";
import { motorCompositions } from "../../index";
import { story, storyKapitel, storyQuer, storyRand, storyRandQuer } from "./story";
import { testStyle } from "./style";
import { buildTestWorld } from "./world";

registerRoot(motorCompositions([
  { story, style: testStyle, build: buildTestWorld },
  { story: storyQuer, style: testStyle, build: buildTestWorld },
  { story: storyRand, style: testStyle, build: buildTestWorld },
  { story: storyRandQuer, style: testStyle, build: buildTestWorld },
  { story: storyKapitel, style: testStyle, build: buildTestWorld },
]));
