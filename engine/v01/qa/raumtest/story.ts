// Herkunft: eigen (V-Video), geschrieben 2026-11-13, ohne Vorlage.
// Prüf-Story für den Selbsttest der Raum-Prüfung (qa/selbsttest_raum.mjs): ein sauberer Shot und je ein Shot mit
// genau einem absichtlich eingebauten Fehler. Die Welt baut world.ts nach der Shot-ID.
import type { ShotData, Story } from "../../index";

const vorn = (y = 1.6, z = 7, lookY = 1.2): ShotData["camera"] => [{ at: 0, pos: [0, y, z], look: [0, lookY, 0], fov: 40 }];

// Erwartete Fund-Art je Shot: steht in qa/selbsttest_raum.mjs (Shot-ID = Art; "sauber" und "baeume" ohne Funde).
const shots: ShotData[] = [
  { id: "sauber", seconds: 2, light: "day", camera: [{ at: 0, pos: [-1, 2.2, 9], look: [0, 1.4, -2], fov: 44 }, { at: 2, pos: [1, 2.2, 8.5], look: [0, 1.4, -2], move: 60 }] },
  { id: "flackern", seconds: 2, light: "day", camera: [{ at: 0, pos: [0, 3, 6], look: [0, 0, 0], fov: 40 }] },
  // weit vom Weltmittelpunkt (x = 5400): deckungsgleich gekippt (Fund) und 0,6 m übereinander mit zufällig gleichem n·p (kein Fund)
  { id: "fern-flackern", seconds: 2, light: "day", camera: [{ at: 0, pos: [5400, 3, 6], look: [5400, 0, 0], fov: 40 }] },
  { id: "fern-schichten", seconds: 2, light: "day", camera: [{ at: 0, pos: [5400, 3, 6], look: [5400, 0, 0], fov: 40 }] },
  { id: "fenster-tuer", seconds: 2, light: "day", camera: vorn(1.8, 9, 1.6) },
  { id: "steckt-in", seconds: 2, light: "day", camera: [{ at: 0, pos: [1.5, 1.8, 4], look: [0, 0.6, 0], fov: 40 }] },
  { id: "laeuft-durch", seconds: 2, light: "day", camera: vorn() },
  { id: "durcheinander", seconds: 2, light: "day", camera: vorn() },
  { id: "anschnitt", seconds: 2, light: "day", camera: [{ at: 0, pos: [0, 0.5, 2.5], look: [0, 0.5, 0], fov: 40 }] },
  { id: "verdeckt", seconds: 2, light: "day", camera: vorn() },
  { id: "zeit", seconds: 2, light: "day", camera: vorn() },
  { id: "baeume", seconds: 2, light: "day", camera: [{ at: 0, pos: [0, 3.2, 14], look: [0, 3, 5], fov: 44 }] },
  // Würfel-Kopf (wie T0004): der Strahl zur Kopfmitte trifft die eigene Würfelfläche – kein „verdeckt“
  { id: "wuerfelkopf", seconds: 2, light: "day", camera: [{ at: 0, pos: [0.6, 1.75, 3.2], look: [0, 1.5, 0], fov: 40 }] },
  // zusammengefasste Welt (ein Netz je Material) mit `userData.objekte`, Kamera 120 m weg (Vogelperspektive) – genug Details
  { id: "vogel", seconds: 2, light: "day", camera: [{ at: 0, pos: [70, 85, 70], look: [0, 0, 0], fov: 12 }] },
];

export const raumStory: Story = { id: "RaumTest", format: "shortform", shots };
/** Dieselbe Prüf-Story im Querformat (Langform 16:9) – die Raum-Prüfung muss dort genauso finden. */
export const raumStoryQuer: Story = { id: "RaumTestQuer", format: "longform", shots };
