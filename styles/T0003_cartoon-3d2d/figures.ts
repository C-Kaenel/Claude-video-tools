// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Figuren-Werte des Stils T0003: Farben der Karten (Kontur, Mund, Zunge …), Licht-Tönung der Karten je Stimmung,
// Paletten für Menschenmengen, Effekt-Farben; die Besetzung kommt aus der Bibliothek (B0001–B0010).
import tokens from "../../shared/design-tokens.json";
import { FONT, type CardColors, type CrowdPalette, type EffectColors, type FigureSpec } from "../../engine/v01";
import { FIGUREN } from "../../library/eintraege";

const C = tokens.color["cartoon-3d2d"];
const K = C.cards;

export const CARD_COLORS: CardColors = { ink: C.characterInk, mouth: C.mouth, tongue: C.tongue, teeth: K.teeth, sweat: K.sweat, zorn: K.zorn, paper: K.paper };
export const CARD_TINT: Record<string, string> = K.tint;
export const SICK = K.sick;
export const CROWD: CrowdPalette = { skins: C.skin, coats: C.coats, hair: K.hair, hats: K.hats };

/** Besetzung = Figuren der Bibliothek (Heimat: library/figuren/), Schlüssel = Name, z. B. CAST["frau-gelb"]. */
export const CAST: Record<string, FigureSpec> = Object.fromEntries(
  Object.entries(FIGUREN).map(([name, e]) => [name, (e as { spec: FigureSpec }).spec]));

/** Farben der Effekt-Karten. */
export const EFFECT_COLORS: EffectColors = { ...(C.effects as unknown as Omit<EffectColors, "ink" | "paper" | "fonts">), ink: C.characterInk, paper: K.paper, fonts: FONT };
