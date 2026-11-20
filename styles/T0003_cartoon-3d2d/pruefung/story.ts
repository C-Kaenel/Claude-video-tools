// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Prüf-Story für den Welt-Bildbogen: jeder Ort der Stadt in Totale und Halbnah, bei Tag und am Abend.
// Jeder Shot dauert 1 s; Bild 15 jedes Shots kommt auf den Bogen.
import { PLACES, type ShotData, type Story } from "../../../engine/v01";

const ORDER = ["laborstrasse", "gasse", "platz", "kai", "brueckenkopf", "park", "flussufer"] as const;

export const SHOTS: ShotData[] = [];
for (const light of ["day", "golden"] as const)
  for (const name of ORDER)
    for (const kind of ["wide", "medium"] as const) {
      const c = PLACES[name][kind];
      SHOTS.push({
        id: `${name}-${kind}-${light}`, seconds: 1, light,
        camera: [{ at: 0, pos: c.pos, look: c.look, fov: kind === "wide" ? 44 : 36, push: 0 }],
        focus: kind === "medium" ? { strength: 11, point: PLACES[name].at } : undefined,
      });
    }

export const story: Story = { id: "Weltbogen", format: "shortform", shots: SHOTS };
