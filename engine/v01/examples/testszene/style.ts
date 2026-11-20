// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Test-Stil zum Prüfen des Motor-Kerns. Farben aus shared/design-tokens.json, Rest neutrale Testwerte.
// Der echte Cartoon-Stil liegt unter styles/T0003_cartoon-3d2d/.
import tokens from "../../../../shared/design-tokens.json";
import { NEUTRAL_DAY, type LightPreset, type Style, type Grade } from "../../index";

const L = tokens.color["cartoon-3d2d"].light;
const line = tokens.line["cartoon-3d2d"];
const bloom = tokens.lens["cartoon-3d2d"].bloom;

const elev = [0, 3, 8, 16, 40];
const day: LightPreset = {
  ...NEUTRAL_DAY,
  sky: { colors: L.day.skyStops, elevations: elev },
  fog: { color: L.day.fog, near: L.day.fogNearM, far: L.day.fogFarM },
  sun: { az: 75, el: 48, color: L.day.sun, intensity: 1 },
};
const golden: LightPreset = {
  ...NEUTRAL_DAY,
  sky: { colors: L.golden.skyStops, elevations: [0, 4, 10, 20, 40] },
  fog: { color: L.golden.fog, near: L.golden.fogNearM, far: L.golden.fogFarM },
  sun: { az: 20, el: 9, color: L.golden.sun, intensity: 1 },
  lit: "#ffc28a", litGain: 1.5, shade: "#3c3a72", lift: "#0a0c22",
};
const gentle: Grade = {
  curve: [0, 0.09, 0.26, 0.58, 0.83, 0.94, 1], sat: [1, 1.04, 1],
  tint: { shadows: [0.006, 0, 0.012], mids: [0, 0, 0], highs: [0.004, 0.002, 0] }, vignette: [0.12, 0.45],
};

export const testStyle: Style = {
  name: "testszene",
  lights: { day, golden },
  grades: { day: gentle, golden: { ...gentle, vignette: [0.2, 0.4] } },
  punch: tokens.grade["cartoon-3d2d"].punch,
  post: {
    ink: { color: "#030303", widthNear: line.worldInkNearPx, widthFar: line.worldInkFarPx, distNear: line.nearM, distFar: line.farM, jump: 0.04, crease: 0.004, fogTint: 0.3 },
    dof: { maxRadius: 16 },
    bloom: { threshold: bloom.threshold, intensity: bloom.intensity, radius: 1.0 },
    msaa: 4,
  },
};
