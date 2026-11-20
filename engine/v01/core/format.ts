// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Bildformate des Motors. Kurzform 9:16 und Langform 16:9 sind nur Parameter.

export type FormatName = "shortform" | "longform";

export type Format = { name: FormatName; width: number; height: number; fps: number };

export const FORMATS: Record<FormatName, Format> = {
  shortform: { name: "shortform", width: 1080, height: 1920, fps: 30 },
  longform: { name: "longform", width: 1920, height: 1080, fps: 30 },
};

/** Massstab für alle Pixelgrössen (Linien, Unschärfe, Leuchten): kürzere Bildseite / 1080.
 *  1080x1920 und 1920x1080 ergeben beide 1; ein 2K-Export (1440x2560) 1,333. */
export const pxScaleFor = (width: number, height: number) => Math.min(width, height) / 1080;
