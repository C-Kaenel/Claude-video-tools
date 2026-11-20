// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Prüf-Story der Bild-Schleife (Skill K0003): je Variante eine Composition `Runde<N>-<V>` (16:9, 4 s), gleiche Szene,
// gleicher Ausschnitt. Testbild: node engine/v01/qa/stills.mjs styles/T0004_quadratic-3d/pruefung/runde.tsx Runde1-1 output/T0004_runden/r01/1_ 60 0.5
import { registerRoot } from "remotion";
import { motorCompositions, type Story } from "../../../engine/v01";
import { BASIS, quadStyle, rautenKamera, type Look } from "../look";
import { KARTE, quadWelt } from "../welt";

const runde1: Look[] = [
  { ...BASIS, name: "isometrisch" },
  { ...BASIS, name: "steil", el: 62, raster: 0.08, figuren: 3 },
  { ...BASIS, name: "kanten", el: 34, ink: true, void: { ...BASIS.void, modus: "vertikal" },
    partikel: { ...BASIS.partikel, anzahl: 260, groesse: [0.25, 0.55] }, grade: { ...BASIS.grade, contrast: 1.1 } },
  { ...BASIS, name: "archipel", rand: 1.7, inseln: true, figuren: 2,
    void: { dunkel: "#1d1f23", hell: "#6c7178", modus: "radial" }, partikel: { ...BASIS.partikel, anzahl: 800 } },
  { ...BASIS, name: "frost", el: 45,
    void: { dunkel: "#474c53", hell: "#b3b8be", modus: "radial" }, partikel: { ...BASIS.partikel, farbe: "#e4e8ec" },
    karte: { ...BASIS.karte, boden: ["#dfe5e9", "#d4dbe0", "#e8edf0"], gras: ["#c6d1d3", "#bccacc", "#cfd9da"], weg: "#eef2f4",
      wasser: "#7fa4bb", seite: ["#8c9197", "#787d84", "#62676e"], laub: ["#a9bcbf", "#9fb3b6", "#b5c6c8"], wand: "#f2f5f7", dach: "#6f8293" },
    figur: { ...BASIS.figur, koerper: ["#2fb2c9", "#2fb2c9", "#2fb2c9"] }, grade: { ...BASIS.grade, sat: 0.8 } },
];

// Runde 2: Bild 3 aus Runde 1 + mehr Details + näher (Wunsch des Nutzers)
const r1v3 = runde1[2];
const runde2: Look[] = [
  { ...r1v3, name: "wunsch", detail: 1, rand: -0.2 },
  { ...r1v3, name: "naeher", detail: 1, rand: -0.5 },
  { ...r1v3, name: "viel-detail", detail: 2, rand: -0.2 },
  { ...r1v3, name: "kraeftige-kanten", detail: 1, rand: -0.2, inkBreite: 3.2, partikel: { ...r1v3.partikel, anzahl: 400 } },
  { ...r1v3, name: "flach-nah", detail: 2, rand: -0.35, el: 30 },
];

// Runde 3: Mischung aus 2 (nah) und 5 (flach, viele Details), mittig (Void oben = unten)
const r2 = runde2[4];
const runde3: Look[] = [
  { ...r2, name: "wunsch", el: 32, rand: -0.45 },
  { ...r2, name: "flach", el: 30, rand: -0.5 },
  { ...r2, name: "steiler", el: 34, rand: -0.5 },
  { ...r2, name: "mehr-void", el: 32, rand: -0.3 },
  { ...r2, name: "ganz-nah", el: 32, rand: -0.6 },
];

// Runde 4: Bild 2 aus Runde 3, ca. 5 % näher (Bildbreite × 0,95); `naeher(p)` rechnet den Zoom in `rand` um
const r3 = runde3[1];
const naeher = (p: number) => ((1.75 + 0.6 * r3.rand) * (1 - p / 100) - 1.75) / 0.6;
const runde4: Look[] = [
  { ...r3, name: "wunsch", rand: naeher(5) },
  { ...r3, name: "3-prozent", rand: naeher(3) },
  { ...r3, name: "7-prozent", rand: naeher(7) },
  { ...r3, name: "flacher", rand: naeher(5), el: 29 },
  { ...r3, name: "steiler", rand: naeher(5), el: 31 },
];

const story = (id: string, lk: Look, mittig: boolean): Story => {
  const k = rautenKamera(lk, KARTE, [0, 0, 0], true, mittig);
  return { id, format: "longform", shots: [{ id: "karte", seconds: 4, light: "kalt",
    camera: [{ at: 0, pos: k.pos, look: k.look, fov: k.fov, push: 0.05 }] }] };
};

const runden = [runde1, runde2, runde3, runde4];
registerRoot(motorCompositions(runden.flatMap((r, n) => r.map((lk, i) => ({ story: story(`Runde${n + 1}-${i + 1}`, lk, n >= 2), style: quadStyle(lk), build: quadWelt(lk) })))));
