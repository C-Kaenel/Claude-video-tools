// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Story der Testszene (10 s) – reine Daten. Prüft jede Funktion des Motor-Kerns.
import type { ShotData, Story } from "../../index";

const shots: ShotData[] = [
  { // 1: Tag, Gleitfahrt nach 1 s, danach Schieben im Halt
    id: "fahrt", seconds: 3, light: "day",
    camera: [
      { at: 0, pos: [-9, 3.2, 14], look: [-2, 1.6, 0], fov: 42 },
      { at: 1, pos: [-4, 2.4, 9], look: [0, 1.8, 0], move: 30, push: 0.25 },
    ],
  },
  { // 2: harter Schnitt + weisser Blitz, goldenes Licht, Stoss bei 1 s, Tiefenschärfe auf die Karte
    id: "abend", seconds: 3.5, light: "golden", flash: 4,
    camera: [{ at: 0, pos: [2.2, 2.0, 5.5], look: [0.6, 2.2, 1.2], fov: 38, push: 0.3 }],
    kicks: [{ at: 1, amp: 0.08 }],
    focus: { strength: 13, point: [0.6, 2.2, 1.2] },
    sun: { az: 15, el: 8 },
  },
  { // 3: Überblendung 10 Frames, Schräglage, Schnitt im Shot; ein Hindernis steht im Weg (muss verschwinden)
    id: "blende", seconds: 3.5, light: "day", fadeIn: 10,
    camera: [
      { at: 0, pos: [0, 3, 14], look: [0, 2, -2], fov: 40, roll: 4 },
      { at: 2, pos: [8, 6, 16], look: [0, 1.5, -6], cut: true, roll: 0, push: 0.15 },
    ],
  },
];

export const story: Story = { id: "Testszene", format: "shortform", shots };
export const storyQuer: Story = { id: "TestszeneQuer", format: "longform", shots };
/** Langform mit Kapiteln (Prüfung je Kapitel): hook → erklaerung → panorama. Bild gleich wie TestszeneQuer. */
export const storyKapitel: Story = { id: "TestszeneKapitel", format: "longform", shots: [
  { ...shots[0], kapitel: { art: "hook", titel: "The Question" } },
  { ...shots[1], kapitel: { art: "erklaerung", titel: "How It Works" } },
  { ...shots[2], kapitel: { art: "panorama" } },
] };

/** Prüf-Variante für den Selbsttest der Prüfung: die Karte "TEST" ragt oben aus der Safe Area (muss von qa/pruefung.py gefunden werden). */
export const storyRand: Story = { id: "TestszeneRand", format: "shortform", shots: [
  { id: "rand", seconds: 2, light: "golden", camera: [{ at: 0, pos: [2.2, 2.0, 5.5], look: [2.4, 1.0, 1.2], fov: 38, push: 0.3 }] },
] };
/** Dasselbe im Querformat (Langform): die Karte ragt oben aus der Safe Area der Langform. */
export const storyRandQuer: Story = { id: "TestszeneRandQuer", format: "longform", shots: [
  { id: "rand", seconds: 2, light: "golden", camera: [{ at: 0, pos: [0.6, 1.4, 5.5], look: [0.6, 0.6, 1.2], fov: 38, push: 0.3 }] },
] };
