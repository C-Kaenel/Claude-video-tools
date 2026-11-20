// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Verzeichnis der Orte des Stils T0004 (je Ort eine Karte). "dorf" = Karte von Bild 1 (welt.ts → quadWelt).
import type { Ort } from "../welt";
import { KARTE } from "../welt";
import { hotel } from "./hotel";
import { amsterdam } from "./amsterdam";
import { kolosseum } from "./kolosseum";
import { berg } from "./berg";
import { schneewald } from "./schneewald";

export const ORTE = { hotel, amsterdam, kolosseum, berg, schneewald } satisfies Record<string, Ort>;
export type OrtName = keyof typeof ORTE | "dorf";
export const ORT_NAMEN: OrtName[] = ["dorf", ...(Object.keys(ORTE) as (keyof typeof ORTE)[])];

/** Grösse, höchster Punkt und Figuren-Wege eines Orts (Name des Stils, "dorf" oder ein eigener Ort eines Videos). */
export const ortMasse = (name: OrtName | Ort): { groesse: number; oben: number; wege: [number, number][][] } =>
  typeof name !== "string" ? name : name === "dorf" ? { groesse: KARTE, oben: 2.6, wege: DORF_WEGE } : ORTE[name];

/** Wege der Figuren auf der Dorf-Karte (wie WEGE in welt.ts; Bild 1 hat eine Figur). */
export const DORF_WEGE: [number, number][][] = [[[-3, 9], [-3, 2], [6, 2], [10, 2]]];
