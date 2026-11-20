// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Prüf-Story der Kapitel-Module (Langformat 16:9): jede der 13 Kapitel-Arten einmal (aufruf direkt nach dem hook), kurz (2–3 Takte je Art), in allen drei
// Welten. Composition "Kapitel" (pruefung/kapitel.tsx). Ton: `kapitelTonDatei()` → Ton-Datei (Musik-Abschnitte je Art, Geräusche).
import type { Story } from "../../../engine/v01";
import { kapitel, kapitelTon, pruefeFolge, type Kapitel, type KapitelArt, type Takt, type TaktFx } from "../kapitel";
import { rezeptPunkt, type CastData } from "../szene";

const steh = (lib: string, ort: string, punkt: string, seed: number, extra: CastData["keys"] = []): CastData =>
  ({ lib, seed, keys: [{ at: -10, pos: rezeptPunkt(ort, punkt), expr: "smile" }, ...extra] });
/** Karte an einer Stelle im Bild (x −1…1, y −1…1; Langformat: seitlich der Figur), `hoehe` = Anteil der Bildhöhe. Zeiten ab Takt-Beginn. */
const karte = (kind: TaktFx["kind"], hoehe: number, params: Record<string, unknown>, bild: [number, number], o: { an?: number; aus?: number; dann?: Record<string, unknown>; motion?: "pulse" | "sway" | "bob" } = {}): TaktFx => {
  const keys: TaktFx["keys"] = [{ at: o.an ?? 0.4, show: true, pos: [0, 0, 0], params, motion: o.motion }];
  if (o.dann) keys.push({ at: (o.an ?? 0.4) + 2.5, params: o.dann });
  if (o.aus) keys.push({ at: o.aus, show: false });
  return { kind, h: 1, hoehe, unlit: true, bild, keys };
};

type Plan = { art: KapitelArt; titel?: string; frage?: string; takte?: Takt[] };
const PLAN: Plan[] = [
  { art: "hook", titel: "WHY?", takte: [
    { ort: "hanse-markt", cast: [steh("hinrik", "hanse-markt", "links", 1, [{ at: 0.6, expr: "shout", pose: "shout" }]), steh("gesche", "hanse-markt", "rechts", 2)],
      fx: [karte("sprechblase", 0.13, { text: "WHY?", art: "ruf", schwanz: "links" }, [-0.05, 0.25], { an: 0.7 })] },
    { ort: "hanse-markt", punkt: "rechts", hoehepunkt: true, cast: [steh("gesche", "hanse-markt", "rechts", 2, [{ at: 0.1, expr: "shock" }])],
      fx: [karte("popstern", 0.2, { text: "?!" }, [0.42, 0.15], { an: 0.2 })] },
  ] },
  { art: "aufruf" },   // Standbild des hook, unscharf, Like- und Abo-Knopf, Sprechblase zu „comments“
  { art: "montage", titel: "A WORLD IN MOTION", frage: "What changed?", takte: ["stadt-platz", "stadt-strasse", "stadt-kai", "stadt-park"].map((ort, i) => ({ ort,
    cast: [steh(["rufer", "frau-gelb", "zylinder-blau", "frau-rosa"][i], ort, "mitte", 10 + i)],
    fx: [karte("popstern", 0.2, { text: ["1", "2", "3", "4"][i] }, [0.4, 0.2], { an: 0.3 })] })) },
  { art: "zeitreise", titel: "500 YEARS", frage: "How did we get here?", takte: [
    { ort: "hanse-gasse", cast: [steh("magd", "hanse-gasse", "mitte", 20)], fx: [karte("popstern", 0.2, { text: "1400" }, [0.38, 0.25])] },
    { ort: "korea-tor", cast: [steh("seoyeon", "korea-tor", "mitte", 21)], fx: [karte("popstern", 0.2, { text: "1600" }, [0.38, 0.25])] },
    { ort: "stadt-strasse", cast: [steh("zylinder-gruen", "stadt-strasse", "mitte", 22)], fx: [karte("popstern", 0.2, { text: "1900" }, [0.38, 0.25])] },
  ] },
  { art: "panorama", titel: "THE HARBOUR", takte: [{ ort: "hanse-kai" }] },
  { art: "erklaerung", titel: "HOW IT WORKS", frage: "Step by step", takte: [
    { ort: "hanse-kran", cast: [steh("hinrik", "hanse-kran", "rechts", 30)],
      fx: [karte("kontobuch", 0.34, { fortschritt: 0 }, [-0.3, -0.25], { an: 0.5, dann: { fortschritt: 1 } })] },
    { ort: "hanse-kran", kamera: "halbnah", cast: [steh("zimmermann", "hanse-kran", "links", 31, [{ at: 1.5, pose: "point", expr: "smile" }])],
      fx: [karte("heringsfass", 0.32, { offen: 0 }, [0.4, -0.45], { an: 0.5, dann: { offen: 1 } })] },
  ] },
  { art: "beispiel", titel: "ONE MERCHANT", frage: "What was his day like?", takte: [
    { ort: "hanse-markt", cast: [steh("hinrik", "hanse-markt", "mitte", 40, [{ at: 1.0, expr: "grin", pose: "wave" }])],
      fx: [karte("sprechblase", 0.13, { text: "HERRING!", art: "rede", schwanz: "links" }, [0.15, 0.3], { an: 1.0 })] },
    { ort: "hanse-markt", cast: [steh("hinrik", "hanse-markt", "mitte", 40, [{ at: -10, expr: "laugh" }])] },
  ] },
  { art: "vergleich", titel: "THEN AND NOW", takte: [
    { ort: "korea-dorf", cast: [steh("dorf-mann", "korea-dorf", "mitte", 50)], fx: [karte("geteilt", 0.3, { links: "VILLAGE", rechts: "TOWN" }, [0.3, -0.3])] },
    { ort: "hanse-gasse", cast: [steh("magd", "hanse-gasse", "mitte", 51)], fx: [karte("geteilt", 0.3, { links: "VILLAGE", rechts: "TOWN" }, [0.3, -0.3])] },
  ] },
  { art: "mythos", titel: "MYTH OR FACT?", takte: [
    { ort: "hanse-gasse", cast: [steh("schiffer", "hanse-gasse", "links", 60, [{ at: -10, expr: "nervous" }])],
      fx: [karte("stempel", 0.24, { text: "MYTH" }, [0.35, 0.1], { an: 0.6 })] },
    { ort: "hanse-gasse", hoehepunkt: true, cast: [steh("schiffer", "hanse-gasse", "links", 60, [{ at: 0.1, expr: "relief_open" }])],
      fx: [karte("stempel", 0.24, { text: "FACT" }, [0.35, 0.1], { an: 0.15 })] },
  ] },
  { art: "zahlen", titel: "BY THE NUMBERS", frage: "How many?", takte: [
    { ort: "stadt-kai", cast: [steh("rufer", "stadt-kai", "rechts", 70)],
      fx: [karte("zahl", 0.4, { wert: 0, ziel: 2000, titel: "PEOPLE", einheit: "" }, [-0.3, -0.4], { an: 0.4, dann: { wert: 1400 } })] },
    { ort: "stadt-kai", kamera: "totale", cast: [steh("rufer", "stadt-kai", "rechts", 70)] },
  ] },
  { art: "spannung", titel: "THE NIGHT IT HAPPENED", takte: [
    { ort: "hanse-markt", cast: [steh("stadtwache", "hanse-markt", "mitte", 80, [{ at: -10, expr: "nervous" }])],
      fx: [karte("warnlicht", 0.14, { an: 1, blinken: 2 }, [0.35, 0.1])] },
    { ort: "hanse-markt", kamera: "halbnah", cast: [steh("stadtwache", "hanse-markt", "mitte", 80, [{ at: -10, expr: "shock" }])] },
    { ort: "hanse-markt", hoehepunkt: true, cast: [steh("stadtwache", "hanse-markt", "mitte", 80, [{ at: -10, expr: "angry" }])],
      fx: [karte("herz", 0.16, { schlag: 2.4 }, [0.35, 0.05], { an: 0.3, motion: "pulse" })] },
  ] },
  { art: "aufloesung", titel: "THE ANSWER", takte: [
    { ort: "hanse-markt", cast: [steh("gesche", "hanse-markt", "mitte", 90)] },
    { ort: "stadt-platz", cast: [steh("frau-gelb", "stadt-platz", "mitte", 91, [{ at: 0.5, expr: "grin" }])],
      fx: [karte("gluehbirne", 0.13, { an: 1 }, [0.2, 0.25], { an: 0.5, motion: "pulse" })] },
  ] },
  { art: "abspann", titel: "WHAT DO YOU THINK?", takte: [
    { ort: "stadt-park", cast: [steh("zylinder-blau", "stadt-park", "mitte", 95)],
      fx: [karte("sprechblase", 0.13, { text: "AND YOU?", art: "rede", schwanz: "links" }, [0.15, 0.3], { an: 0.8 })] },
    { ort: "stadt-park", cast: [steh("zylinder-blau", "stadt-park", "mitte", 95)] },
  ] },
];

const FPS = 30;
export const KAPITEL: Kapitel[] = [];
let nr = 0;   // Kapitelnummer der Titelkarten – der aufruf zählt nicht mit
for (const [i, p] of PLAN.entries()) {
  if (p.art !== "aufruf") nr++;
  KAPITEL.push(kapitel(p.art, { nr, start: i ? KAPITEL[i - 1].ende : 0, titel: p.titel, frage: p.frage, takte: p.takte, fps: FPS, vorher: KAPITEL[i - 1] }));
}

export const story: Story = { id: "Kapitel", format: "longform", shots: KAPITEL.flatMap((k) => k.shots) };
export const hinweise = pruefeFolge(KAPITEL);

/** Ton-Datei für die Prüf-Story (Musik-Abschnitte und Geräusche aus den Kapiteln). */
export const kapitelTonDatei = () => {
  const t = kapitelTon(KAPITEL, { bpm: 112 }), ende = KAPITEL[KAPITEL.length - 1].ende;
  return { video: "Kapitel (Prüf-Story der Kapitel-Module, Langformat)", dauer: { frames: Math.round(ende * FPS), fps: FPS },
    musik: { bpm: 112, abschnitte: t.abschnitte, schluss: true },
    betten: [{ klang: "air", ab: 0, bis: ende, db: -14 }], ereignisse: t.ereignisse };
};
