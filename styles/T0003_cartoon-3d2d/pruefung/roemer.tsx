// Herkunft: eigen (V-Video), geschrieben 2026-11-18, ohne Vorlage.
// Prüf-Story der Römer-Welt (Strassenbau, Landstrasse mit Pinien, Gräber, Wegstation, Steinbrücke, Forum mit Goldenem
// Meilenstein), Kurz- ("Roemer") und Langformat ("Roemer-Lang"): je Ort eine Totale und eine Halbnahe von 2 s, dazu einige
// Detail-Blicke (Schichten im Schnitt, Groma, Ochsenkarren, Fluss) und drei Shots mit den Römer-Figuren auf der Landstrasse.
//   node engine/v01/qa/stills.mjs styles/T0003_cartoon-3d2d/pruefung/roemer.tsx Roemer-Lang output/roemer_ 30,90,150 0.35
//   node engine/v01/qa/raum.mjs styles/T0003_cartoon-3d2d/pruefung/roemer.tsx Roemer output/roemer_raum
// Dazu "Roemer-Figuren" (2D, ein Bild): die Römer-Figuren der Bibliothek (B0126–B0134) und eine Menge der Römer-Welt,
// und "Roemer-Karten" (2D, ein Bild): die Römer-Karten (B0135–B0139) je in zwei Zwischenständen.
import React, { useLayoutEffect, useRef, useState } from "react";
import { Composition, continueRender, delayRender, registerRoot } from "remotion";
import {
  EFFECTS, FIGURE_DESIGN, FONT, Pen, crowdSpecs, drawEffect, drawFigure, fontsReady, motorCompositions, ROEMER_PLACES, useGate,
  type CameraKey, type EffectKind, type FigureState, type Story, type V3,
} from "../../../engine/v01";
import { cartoon3d2d } from "../style";
import { CARD_COLORS, CAST, CROWD, EFFECT_COLORS } from "../figures";
import { buildSzene, langformat, shot, type CastData } from "../szene";

const FPS = 30, LEN = 60;
// Orte (ROEMER_PLACES): Totale und Halbnah
const ORTE = Object.entries(ROEMER_PLACES).flatMap(([n, p]) => (["wide", "medium"] as const).map((k) => [`ort-${n}-${k}`, p[k].pos, p[k].look, k === "wide" ? 44 : 38] as [string, V3, V3, number]));
// Detail-Blicke
const BLICKE: [string, V3, V3, number][] = [
  ["schichten-schnitt", [-2.6, 1.1, 58], [2.2, -0.6, 50], 40],
  ["groma-nah", [3.9, 1.5, 99.6], [2.3, 1.5, 97.6], 36],
  ["ochsenkarren", [12.5, 1.8, 57.5], [9.0, 1.1, 54.6], 38],
  ["fluss-ufer", [16, -3.4, -150], [0, -2, -164], 44],
  ["landstrasse-flach", [0.8, 1.6, 6], [0, 1.4, -200], 40],
];
const shots = [...ORTE, ...BLICKE].map(([id, pos, look, fov], i) => {
  const camera: CameraKey[] = [{ at: 0, pos, look, fov, push: 0.1 }];
  return shot(FPS, { id, a: i * LEN, b: (i + 1) * LEN, camera, szene: { welt: "roemer", cast: [], props: [], roemer: {} } });
});
// Figuren auf der Landstrasse: je vier bzw. fünf Römer der Bibliothek nebeneinander, dann eine Menge
const REIHE = [-1.9, -0.95, 0, 0.95, 1.9];
const reihe = (namen: string[], t0: number, posen: ("stand" | "wave" | "point" | "raise")[]): CastData[] => namen.map((lib, k) => ({
  lib, seed: k + 1, keys: [{ at: t0, pos: [REIHE[k], -12], expr: k % 2 ? "smile" : "neutral" }, { at: t0 + 0.8, pose: posen[k], expr: k === 0 ? "stern" : "grin" }] }));
const n0 = shots.length;
["fig-bauarbeiter-legionaer-vermesser-centurio", "fig-haendler-frau-reisender-kind-beamter", "fig-menge"].forEach((id, j) => {
  const i = n0 + j, t0 = (i * LEN) / FPS;
  const cast = j === 0 ? reihe(["roemer-bauarbeiter", "roemer-legionaer", "roemer-vermesser", "roemer-centurio"], t0, ["raise", "stand", "point", "stand"])
    : j === 1 ? reihe(["roemer-haendler", "roemer-frau", "roemer-reisender", "roemer-kind", "roemer-beamter"], t0, ["point", "wave", "stand", "raise", "stand"])
    : Array.from({ length: 10 }, (_, k) => ({ menge: { seed: 7, n: 10, i: k }, seed: 20 + k,
        keys: [{ at: t0, pos: [-2.2 + (k % 5) * 1.1 + (k > 4 ? 0.55 : 0), k > 4 ? -15.5 : -12] as [number, number], expr: (k % 3 ? "smile" : "neutral") as "smile" | "neutral" }] }));
  const camera: CameraKey[] = j < 2 ? [{ at: 0, pos: [0, 1.8, -1.5], look: [0, 1.1, -12.5], fov: 46, push: 0.05 }] : [{ at: 0, pos: [0, 2.0, -6], look: [0, 1.0, -14], fov: 46, push: 0.1 }];
  shots.push(shot(FPS, { id, a: i * LEN, b: (i + 1) * LEN, camera, szene: { welt: "roemer", cast, props: [], roemer: {} } }));
});
export const story: Story = { id: "Roemer", format: "shortform", shots };

// ---------- 2D-Bogen der Figuren ----------
const NAMEN = ["roemer-bauarbeiter", "roemer-legionaer", "roemer-vermesser", "roemer-centurio", "roemer-haendler", "roemer-frau", "roemer-reisender", "roemer-kind", "roemer-beamter"];
const W = NAMEN.length * 300, H = 1500;
const base: FigureState = { pose: "stand", phase: 0, time: 0, expr: "smile", look: 0, side: 0, blink: false };
const Bogen: React.FC = () => {
  const ready = useGate("schriften", () => [fontsReady()]);
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("roemer-figuren"));
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    const g = ref.current.getContext("2d")!;
    g.fillStyle = "#efe9dc"; g.fillRect(0, 0, W, H);
    const bild = (spec: typeof CAST[string], st: FigureState, x: number, y: number) => {
      const k = 0.5, c = document.createElement("canvas"); c.width = FIGURE_DESIGN[0] * k; c.height = FIGURE_DESIGN[1] * k;
      drawFigure(new Pen(c.getContext("2d")!, k), spec, st, CARD_COLORS); g.drawImage(c, x, y);
    };
    const text = (t: string, x: number, y: number, size = 26) => { g.fillStyle = "#241726"; g.font = `${size}px ${FONT.serif}`; g.textAlign = "center"; g.fillText(t, x, y); };
    NAMEN.forEach((n, i) => { bild(CAST[n], { ...base, expr: i === 3 ? "stern" : i % 2 ? "smile" : "grin" }, i * 300, 0); text(n, i * 300 + 150, 660); });
    crowdSpecs(7, NAMEN.length, CROWD, "roemer").forEach((sp, i) => bild(sp, { ...base, expr: "neutral", side: i % 3 === 2 ? 0.6 : 0 }, i * 300, 700));
    text("Menge der Römer-Welt (crowdSpecs … \"roemer\")", W / 2, 1380, 32);
    continueRender(handle);
  }, [ready, handle]);
  return <canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} />;
};

// ---------- 2D-Bogen der Karten (B0135–B0139) mit Zwischenständen ----------
const KARTEN_PROBE: [EffectKind, Record<string, unknown>][] = [
  ["groma", { sicht: 0.4, zeit: 0.3 }], ["groma", { sicht: 1, zeit: 1.1 }],
  ["strassenschichten", { fortschritt: 1.5 }], ["strassenschichten", { fortschritt: 4 }],
  ["meilenstein", { wert: 4 }], ["meilenstein", { wert: 49 }],
  ["strassennetz", { fortschritt: 0.3 }], ["strassennetz", { fortschritt: 1 }],
  ["heute-alt-neu", { wisch: 0.15 }], ["heute-alt-neu", { wisch: 0.6 }],
];
const KW = 800, KH = 560;
const KartenBogen: React.FC = () => {
  const ready = useGate("schriften", () => [fontsReady()]);
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("roemer-karten"));
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    const g = ref.current.getContext("2d")!;
    g.fillStyle = "#efe9dc"; g.fillRect(0, 0, KW * 2, KH * 5);
    KARTEN_PROBE.forEach(([kind, p], i) => {
      const [w, h] = EFFECTS[kind].design, c = document.createElement("canvas"); c.width = w; c.height = h;
      drawEffect(new Pen(c.getContext("2d")!, 1), kind, { ...EFFECTS[kind].defaults, ...p }, EFFECT_COLORS);
      const k = Math.min((KW - 40) / w, (KH - 60) / h), x = (i % 2) * KW, y = Math.floor(i / 2) * KH;
      g.drawImage(c, x + (KW - w * k) / 2, y + 10, w * k, h * k);
      g.fillStyle = "#241726"; g.font = `22px ${FONT.serif}`; g.textAlign = "center"; g.fillText(`${kind} ${JSON.stringify(p)}`, x + KW / 2, y + KH - 14);
    });
    continueRender(handle);
  }, [ready, handle]);
  return <canvas ref={ref} width={KW * 2} height={KH * 5} style={{ width: "100%", height: "100%" }} />;
};

const Motor = motorCompositions([{ story, style: cartoon3d2d, build: buildSzene }, { story: langformat(story), style: cartoon3d2d, build: buildSzene }]);
const Root: React.FC = () => (<><Composition id="Roemer-Figuren" component={Bogen} durationInFrames={1} fps={30} width={W} height={H} /><Composition id="Roemer-Karten" component={KartenBogen} durationInFrames={1} fps={30} width={KW * 2} height={KH * 5} /><Motor /></>);
registerRoot(Root);
