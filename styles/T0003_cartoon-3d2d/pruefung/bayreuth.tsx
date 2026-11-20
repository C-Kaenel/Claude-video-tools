// Herkunft: eigen (V-Video), geschrieben 2026-11-16, ohne Vorlage.
// Prüf-Story der Bayreuth-Welt (Festspielhaus 1876), Kurz- ("Bayreuth") und Langformat ("Bayreuth-Lang"): je Ort aus BAYREUTH_PLACES
// Totale und Halbnah (2 s), mit den Figuren B0108–B0111 und Mengen der Epoche – aussen, Saal, Vorhang (zu und öffnend), Bühne,
// Orchestergraben, Garderobe.
//   node engine/v01/qa/stills.mjs styles/T0003_cartoon-3d2d/pruefung/bayreuth.tsx Bayreuth-Lang output/bay_ 30,90,150 0.5
//   node engine/v01/qa/raum.mjs styles/T0003_cartoon-3d2d/pruefung/bayreuth.tsx Bayreuth output/bay_raum
import { registerRoot } from "remotion";
import { BAYREUTH_PLACES, motorCompositions, type CameraKey, type FigureSpec, type Story } from "../../../engine/v01";
import { cartoon3d2d } from "../style";
import { CAST } from "../figures";
import { buildSzene, langformat, shot, type CastData, type SzeneDaten } from "../szene";

const FPS = 30, LEN = 60, X = 400, G = 470;
const fluegel: FigureSpec = { ...CAST.saenger, name: "saenger-fluegel", coat: "#2f6fd0", mantel: { color: "#d8262e", fibel: "#e6b43a" }, hat: { kind: "fluegelhelm", color: "#e6b43a", band: "#ffffff" }, bart: { color: "#4a3020", art: "voll" }, hair: { style: "long", color: "#4a3020" } };
const walkuere: FigureSpec = { name: "walkuere", build: "adult", height: 1.7, skin: "#f2c9a6", coat: "#f3ead2", garment: "dress", hair: { style: "long", color: "#e6b85c" },
  hat: { kind: "fluegelhelm", color: "#d4dbe4", band: "#ffffff" }, kette: "#c3cad4", belt: "#e6b43a", schild: { color: "#d4dbe4", muster: "#e6b43a", art: "ring" }, ding: { art: "speer" }, buttons: false, zeit: "stadt" };
const sitzt = (k: number, x: number): [number, number] => [X + x, 8.5 + k * 0.95 + 0.4];

type Blick = { id: string; ort: keyof typeof BAYREUTH_PLACES; art: "wide" | "medium"; szene: (t0: number) => Partial<SzeneDaten> };
const BLICKE: Blick[] = [
  { id: "aussen", ort: "aussen", art: "wide", szene: () => ({}) },
  { id: "aussen", ort: "aussen", art: "medium", szene: () => ({}) },
  { id: "saal", ort: "saal", art: "wide", szene: () => ({ bayreuth: { vorhang: 0 } }) },
  { id: "saal", ort: "saal", art: "medium", szene: () => ({ bayreuth: { vorhang: 0 } }) },
  { id: "vorhang-oeffnet", ort: "vorhang", art: "wide", szene: (t0) => ({ bayreuth: { vorhang: { t0: t0 + 0.2, t1: t0 + 1.8 } } }) },
  { id: "vorhang-zu", ort: "vorhang", art: "medium", szene: () => ({ bayreuth: { vorhang: 0 } }) },
  { id: "buehne", ort: "buehne", art: "wide", szene: () => ({}) },
  { id: "buehne", ort: "buehne", art: "medium", szene: () => ({}) },
  { id: "graben", ort: "graben", art: "wide", szene: () => ({}) },
  { id: "graben", ort: "graben", art: "medium", szene: () => ({}) },
  { id: "garderobe", ort: "garderobe", art: "wide", szene: () => ({}) },
  { id: "garderobe", ort: "garderobe", art: "medium", szene: () => ({}) },
];
const besetzung = (ort: Blick["ort"], art: Blick["art"], t0: number): CastData[] => {
  const k = (pos: [number, number], extra: Partial<CastData["keys"][number]> = {}) => [{ at: t0, pos, expr: "smile" as const, ...extra }];
  switch (ort) {
    case "aussen": return [
      { lib: "publikum-1876", seed: 1, keys: k([2.5, 17]) }, { lib: "doepler", seed: 2, keys: k([4.2, 16.6], { expr: "grin" }) },
      ...Array.from({ length: 10 }, (_, i) => ({ menge: { seed: 3, n: 10, i }, seed: 10 + i, keys: k([-9 + (i % 5) * 4.2 + (i > 4 ? 2 : 0), i > 4 ? 12 : 8]) })),
    ];
    case "saal": return Array.from({ length: 12 }, (_, i) => ({ menge: { seed: 5, n: 12, i }, seed: 20 + i, keys: k(sitzt([4, 6, 8][i % 3], -5 + Math.floor(i / 3) * 3.1 + (i % 3) * 0.5), { pose: "sit" }) }));
    case "vorhang": return [];
    case "buehne": return [
      { lib: "saenger", seed: 1, keys: [{ at: t0, pos: [X, -6.5], expr: "shout", pose: "raise" }] },
      { spec: fluegel, seed: 2, keys: k([X + 2.6, -7.6], { expr: "stern" }) },
      { spec: walkuere, seed: 3, keys: k([X - 2.6, -7.6], { expr: "grin", pose: "point" }) },
    ];
    case "graben": return [{ lib: "dirigent", seed: 1, groundY: -2.2, keys: [{ at: t0, pos: [X, 5.4], expr: "stern", pose: "raise" }] }];
    case "garderobe": return art === "medium" ? [] : [
      { lib: "doepler", seed: 1, keys: k([G + 0.4, -0.7], { pose: "point", spiegeln: true }) },
      { lib: "saenger", seed: 2, keys: k([G - 1.9, 0.9], { expr: "grin" }) },
    ];
  }
  return [];
};
const shots = BLICKE.map((b, i) => {
  const p = BAYREUTH_PLACES[b.ort][b.art], t0 = (i * LEN) / FPS;
  const camera: CameraKey[] = [{ at: 0, pos: p.pos, look: p.look, fov: b.art === "wide" ? 44 : 38, push: 0.1 }];
  return shot(FPS, { id: `${b.id}-${b.art}`, a: i * LEN, b: (i + 1) * LEN, camera, szene: { welt: "bayreuth", cast: besetzung(b.ort, b.art, t0), props: [], ...b.szene(t0) } });
});
export const story: Story = { id: "Bayreuth", format: "shortform", shots };
registerRoot(motorCompositions([{ story, style: cartoon3d2d, build: buildSzene }, { story: langformat(story), style: cartoon3d2d, build: buildSzene }]));
