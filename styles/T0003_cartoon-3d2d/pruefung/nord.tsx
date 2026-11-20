// Herkunft: eigen (V-Video), geschrieben 2026-11-16, ohne Vorlage.
// Prüf-Story der Nord-Welt (Wikinger um 900), Kurz- ("Nord") und Langformat ("Nord-Lang"): je Blick ein Shot von 2 s –
// Fjord, Felswand, Berge mit Schnee, Kiesstrand mit Tang und Treibholz, Wiese, Bäume, Findlinge, Wolken; danach alle Blicke verschneit.
//   node engine/v01/qa/stills.mjs styles/T0003_cartoon-3d2d/pruefung/nord.tsx Nord-Lang output/nord_ 30,90,150 0.35
//   node engine/v01/qa/raum.mjs styles/T0003_cartoon-3d2d/pruefung/nord.tsx Nord output/nord_raum
// Dazu "Nord-Figuren" (2D, ein Bild): die Wikinger-Figuren der Bibliothek (B0100–B0107) und eine Menge der Nord-Welt.
import React, { useLayoutEffect, useRef, useState } from "react";
import { Composition, continueRender, delayRender, registerRoot } from "remotion";
import {
  FIGURE_DESIGN, FONT, Pen, crowdSpecs, drawFigure, fontsReady, motorCompositions, NORD_PLACES, useGate,
  type CameraKey, type FigureState, type Story, type V3,
} from "../../../engine/v01";
import { cartoon3d2d } from "../style";
import { CARD_COLORS, CAST, CROWD } from "../figures";
import { buildSzene, langformat, shot, type CastData } from "../szene";

const FPS = 30, LEN = 60;
const BLICKE: [string, V3, V3, number][] = [
  ["fjord-totale", [0, 3.2, 1], [0, 18, 120], 44],
  ["berge-totale", [0, 4, 6], [0, 16, -150], 44],
  ["wiese-halbnah", [8, 1.6, -8], [8, 0.9, -18], 38],
  ["strand-nah", [-20, 1.6, 2.5], [-20, -0.4, 8.5], 40],
  ["birken-halbnah", [-50, 1.8, -18], [-58, 3.5, -32], 40],
  ["fjord-ende", [110, 5, 3], [230, 30, 70], 44],
  ["eberesche-nah", [-35, 1.8, -31], [-39, 3, -37], 38],
  ["schiffe-fjord", [-12, 4, 5], [10, 3, 80], 44],
  ["langschiff-segelt", [-22, 3.5, 44], [-40, 4.5, 63], 40],
  ["langschiff-rudert", [52, 3.5, 80], [70, 1.5, 95], 40],
  ["req-schmiede", [-63.5, 1.7, -4.5], [-68, 0.9, -10.5], 40],
  ["req-vorplatz", [3, 1.8, -11.5], [-1, 1, -20], 42],
  ["req-hafen", [76, 1.8, 6], [80, 1.2, -1], 40],
  ["req-schafe", [30, 1.4, -26], [29, 0.6, -35], 38],
  ["req-ziegen", [50.5, 1.3, 1.2], [54.5, 0.6, -5], 38],
  ["req-runenstein", [7, 1.6, 3.5], [5, 1.6, -1.7], 38],
];
// dieselben Blicke verschneit (`nord: { winter: true }`, mit Schneefall)
const ALLE = [...BLICKE.map((b) => [...b, false] as const), ...BLICKE.map(([id, p, l, f]) => [`${id}-winter`, p, l, f, true] as const)];
// Orte des Dorfs (NORD_PLACES): Totale und Halbnah, das Langhaus innen mit `innen: true`
const ORTE = Object.entries(NORD_PLACES).filter(([n]) => n !== "fjord" && n !== "wiese")
  .flatMap(([n, p]) => (["wide", "medium"] as const).map((k) => [`ort-${n}-${k}`, p[k].pos, p[k].look, k === "wide" ? 44 : 38, false, n === "langhaus-innen"] as const));
const shots = [...ALLE.map((a) => [...a, false] as const), ...ORTE].map(([id, pos, look, fov, winter, innen], i) => {
  const camera: CameraKey[] = [{ at: 0, pos, look, fov, push: 0.1 }];
  return shot(FPS, { id, a: i * LEN, b: (i + 1) * LEN, camera, szene: { welt: "nord", cast: [], props: [], nord: { winter, innen } } });
});
// Figuren im Dorf: je vier Wikinger der Bibliothek vor dem grossen Langhaus, dann eine Menge
const REIHE = [-1.75, -0.58, 0.58, 1.75];
const vier = (namen: string[], t0: number, posen: ("stand" | "wave" | "point" | "raise")[]): CastData[] => namen.map((lib, k) => ({
  lib, seed: k + 1, keys: [{ at: t0, pos: [REIHE[k], -13], expr: k % 2 ? "smile" : "neutral" }, { at: t0 + 0.8, pose: posen[k], expr: k === 0 ? "stern" : "grin" }] }));
const FIG: [string, CastData[]][] = [
  ["fig-krieger-jarl-schmied-fischer", []], ["fig-frau-kind-skalde-haendler", []], ["fig-menge", []],
];
const n0 = shots.length;
FIG.forEach(([id], j) => {
  const i = n0 + j, t0 = (i * LEN) / FPS;
  const cast = j === 0 ? vier(["wikinger-krieger", "wikinger-jarl", "wikinger-schmied", "wikinger-fischer"], t0, ["stand", "point", "raise", "stand"])
    : j === 1 ? vier(["wikinger-frau", "wikinger-kind", "wikinger-skalde", "wikinger-haendler"], t0, ["wave", "raise", "stand", "point"])
    : Array.from({ length: 10 }, (_, k) => ({ menge: { seed: 7, n: 10, i: k }, seed: 20 + k,
        keys: [{ at: t0, pos: [-4.5 + (k % 5) * 2.2 + (k > 4 ? 1.1 : 0), k > 4 ? -15.5 : -12] as [number, number], expr: (k % 3 ? "smile" : "neutral") as "smile" | "neutral" }] }));
  const camera: CameraKey[] = j < 2 ? [{ at: 0, pos: [0, 1.6, -1], look: [0, 1.0, -13], fov: 38, push: 0.1 }] : [{ at: 0, pos: [0, 2.2, -1], look: [0, 1.0, -14], fov: 46, push: 0.1 }];
  shots.push(shot(FPS, { id, a: i * LEN, b: (i + 1) * LEN, camera, szene: { welt: "nord", cast, props: [], nord: {} } }));
});
export const story: Story = { id: "Nord", format: "shortform", shots };

// ---------- 2D-Bogen der Figuren ----------
const W = 2400, H = 1500, NAMEN = ["wikinger-krieger", "wikinger-jarl", "wikinger-schmied", "wikinger-fischer", "wikinger-frau", "wikinger-kind", "wikinger-skalde", "wikinger-haendler"];
const base: FigureState = { pose: "stand", phase: 0, time: 0, expr: "smile", look: 0, side: 0, blink: false };
const Bogen: React.FC = () => {
  const ready = useGate("schriften", () => [fontsReady()]);
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("nord-figuren"));
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    const g = ref.current.getContext("2d")!;
    g.fillStyle = "#efe9dc"; g.fillRect(0, 0, W, H);
    const bild = (spec: typeof CAST[string], st: FigureState, x: number, y: number) => {
      const k = 0.5, c = document.createElement("canvas"); c.width = FIGURE_DESIGN[0] * k; c.height = FIGURE_DESIGN[1] * k;
      drawFigure(new Pen(c.getContext("2d")!, k), spec, st, CARD_COLORS); g.drawImage(c, x, y);
    };
    const text = (t: string, x: number, y: number, size = 26) => { g.fillStyle = "#241726"; g.font = `${size}px ${FONT.serif}`; g.textAlign = "center"; g.fillText(t, x, y); };
    NAMEN.forEach((n, i) => { bild(CAST[n], { ...base, expr: i === 0 ? "stern" : i % 2 ? "smile" : "grin" }, i * 300, 0); text(n, i * 300 + 150, 660); });
    crowdSpecs(7, 8, CROWD, "nord").forEach((sp, i) => bild(sp, { ...base, expr: "neutral", side: i % 3 === 2 ? 0.6 : 0 }, i * 300, 700));
    text("Menge der Nord-Welt (crowdSpecs … \"nord\")", W / 2, 1380, 32);
    continueRender(handle);
  }, [ready, handle]);
  return <canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} />;
};

const Motor = motorCompositions([{ story, style: cartoon3d2d, build: buildSzene }, { story: langformat(story), style: cartoon3d2d, build: buildSzene }]);
const Root: React.FC = () => (<><Composition id="Nord-Figuren" component={Bogen} durationInFrames={1} fps={30} width={W} height={H} /><Motor /></>);
registerRoot(Root);
