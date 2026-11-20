// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Stil T0003 cartoon-3d2d: alle Look-Werte des eigenen Cartoon-Stils (flache Figuren in einer bunten, gemalten 3D-Stadt
// mit schwarzer Tusche). Farben aus shared/design-tokens.json; Licht- und Farbkorrektur-Werte hier
// (Messwerte in README.md).
import tokens from "../../shared/design-tokens.json";
import type { AquaLook, AquaPalette, BayreuthLook, BayreuthPalette, RoemerLook, RoemerPalette, Grade, HanseLook, HansePalette, KoreaLook, KoreaPalette, LightPreset, NordLook, NordPalette, Style, TownLook, WorldPalette } from "../../engine/v01";

const C = tokens.color["cartoon-3d2d"];
const L = C.light;
const line = tokens.line["cartoon-3d2d"];
const lens = tokens.lens["cartoon-3d2d"];

export const PALETTE: WorldPalette = C.world as unknown as WorldPalette;

/** Tag: Sonne hinten rechts (Fassaden zur Kamera im Licht), kühle Schatten. */
const day: LightPreset = {
  sky: { colors: L.day.skyStops, elevations: [0, 6, 18, 36, 70] },
  fog: { color: L.day.fog, near: L.day.fogNearM, far: L.day.fogFarM },
  sun: { az: 135, el: 42, color: L.day.sun, intensity: 1 },
  lit: "#fff5e8", litGain: 1.0, shade: "#98a2c4", lift: "#10131f",
  edge: 0.22, soft: 0.06, shadows: true,
};

/** Abend: tiefe Sonne von vorn links, Fassaden zur Kamera im violett-blauen Schatten, warme Lichtkanten. */
const golden: LightPreset = {
  sky: { colors: L.golden.skyStops, elevations: [0, 6, 18, 36, 70] },
  fog: { color: L.golden.fog, near: L.golden.fogNearM, far: L.golden.fogFarM },
  sun: { az: -35, el: 10, color: L.golden.sun, intensity: 1 },
  lit: "#ffc08c", litGain: 0.72, shade: "#8a83c4", lift: "#201a42",
  edge: 0.22, soft: 0.06, shadows: true,
};

const dayGrade: Grade = {
  curve: [0, 0.07, 0.21, 0.49, 0.77, 0.92, 1], sat: [0.67, 0.67, 0.65],
  tint: { shadows: [0.004, 0, 0.012], mids: [0, 0, 0], highs: [0.006, 0.003, 0] }, vignette: [0.14, 0.42],
};
const goldenGrade: Grade = {
  curve: [0, 0.085, 0.255, 0.535, 0.795, 0.915, 0.985], sat: [0.645, 0.645, 0.645],
  tint: { shadows: [0.01, 0, 0.02], mids: [0.004, 0, 0.006], highs: [0.01, 0.004, 0] }, vignette: [0.2, 0.4],
};

export const cartoon3d2d: Style = {
  name: "T0003_cartoon-3d2d",
  lights: { day, golden },
  grades: { day: dayGrade, golden: goldenGrade },
  punch: tokens.grade["cartoon-3d2d"].punch,
  post: {
    ink: { color: C.worldInk, widthNear: line.worldInkNearPx, widthFar: line.worldInkFarPx, distNear: line.nearM, distFar: line.farM, jump: 0.04, crease: 0.004, fogTint: 1 },
    dof: { maxRadius: 16 },
    bloom: { threshold: lens.bloom.threshold, intensity: lens.bloom.intensity, radius: 1.0 },
    msaa: lens.msaa,
  },
  fovDefault: 40,
};

/** Was die Stadt je Lichtstimmung braucht (Wasser, Wolken, Leuchten). */
export const LOOKS: Record<string, TownLook> = {
  day: { palette: PALETTE, water: L.day.water, clouds: L.day.cloud, sunColor: L.day.sun, lampGlow: 1.0 },
  golden: { palette: PALETTE, water: L.golden.water, clouds: L.golden.cloud, sunColor: L.golden.sun, lampGlow: 3.0 },
};

/** Korea-Welt (Festungen, Hanok, Berge) je Lichtstimmung – Farben aus den Tokens (color.cartoon-3d2d.korea). */
export const KOREA_PALETTE: KoreaPalette = C.korea as unknown as KoreaPalette;
export const KOREA_LOOKS: Record<string, KoreaLook> = {
  day: { palette: PALETTE, korea: KOREA_PALETTE, clouds: L.day.cloud },
  golden: { palette: PALETTE, korea: KOREA_PALETTE, clouds: L.golden.cloud },
};

/** Hanse-Welt (Hafen um 1400: Giebelhäuser, Koggen, Kran, Kirche) je Lichtstimmung – Farben aus den Tokens (color.cartoon-3d2d.hanse). */
export const HANSE_PALETTE: HansePalette = C.hanse as unknown as HansePalette;
export const HANSE_LOOKS: Record<string, HanseLook> = {
  day: { ...LOOKS.day, hanse: HANSE_PALETTE },
  golden: { ...LOOKS.golden, hanse: HANSE_PALETTE },
};

/** Nord-Welt (Wikinger um 900: Fjord, Felsen, Schnee, Kiesstrand, Wiese, Birken, Kiefern) je Lichtstimmung – Farben aus den
 *  Tokens (color.cartoon-3d2d.nord). */
export const BAYREUTH_PALETTE: BayreuthPalette = C.bayreuth as unknown as BayreuthPalette;
export const BAYREUTH_LOOKS: Record<string, BayreuthLook> = {
  day: { palette: PALETTE, bay: BAYREUTH_PALETTE, clouds: L.day.cloud, sunColor: L.day.sun },
  golden: { palette: PALETTE, bay: BAYREUTH_PALETTE, clouds: L.golden.cloud, sunColor: L.golden.sun },
};
export const NORD_PALETTE: NordPalette = C.nord as unknown as NordPalette;
export const NORD_LOOKS: Record<string, NordLook> = {
  day: { palette: PALETTE, nord: NORD_PALETTE, sunColor: L.day.sun },
  golden: { palette: PALETTE, nord: NORD_PALETTE, sunColor: L.golden.sun },
};

/** Römer-Welt (Strassenbau, Landstrasse, Forum, Steinbrücke) je Lichtstimmung – Farben aus den Tokens (color.cartoon-3d2d.roemer). */
export const ROEMER_PALETTE: RoemerPalette = C.roemer as unknown as RoemerPalette;
export const ROEMER_LOOKS: Record<string, RoemerLook> = {
  day: { palette: PALETTE, rp: ROEMER_PALETTE, clouds: L.day.cloud, sunColor: L.day.sun },
  golden: { palette: PALETTE, rp: ROEMER_PALETTE, clouds: L.golden.cloud, sunColor: L.golden.sun },
};

/** Römer-Wasser-Welt (Quelle, Aquädukte, Tunnel, Siphon, Wasserschloss, Strasse, Thermen, Cloaca, Frührom, Innenräume, heute)
 *  je Lichtstimmung – Farben aus den Tokens (color.cartoon-3d2d.aqua, dazu roemer und nord für Bäume und Tiere). */
export const AQUA_PALETTE: AquaPalette = C.aqua as unknown as AquaPalette;
export const AQUA_LOOKS: Record<string, AquaLook> = {
  day: { palette: PALETTE, ap: AQUA_PALETTE, rp: ROEMER_PALETTE, np: NORD_PALETTE, clouds: L.day.cloud, sunColor: L.day.sun },
  golden: { palette: PALETTE, ap: AQUA_PALETTE, rp: ROEMER_PALETTE, np: NORD_PALETTE, clouds: L.golden.cloud, sunColor: L.golden.sun },
};
