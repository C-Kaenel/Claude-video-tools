// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Prüfung der Figuren:
//  - "Figurenbogen" (ein Bild, 2D): alle 16 Ausdrücke, alle Haltungen, die Besetzung, Ansichten, Bauweisen, Hautwechsel.
//  - "Figurenszene" (3D, 7 s): Besetzung in der Laborstrasse bei Tag und Abend – gehen, winken, blinzeln, Menge, Hautwechsel.
import React, { useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Composition, continueRender, delayRender, registerRoot } from "remotion";
import {
  Actor, EXPRESSIONS, FIGURE_DESIGN, FONT, POSES, Kit, crowdSpecs, drawFigure, fontsReady, motorCompositions, Pen, town, useGate,
  type ActorKey, type FigureSpec, type FigureState, type Story, type WorldBuilder,
} from "../../../engine/v01";
import { cartoon3d2d, LOOKS } from "../style";
import { CARD_COLORS, CARD_TINT, CAST, CROWD, SICK } from "../figures";
import { langformat } from "../szene";

// ---------- 2D-Bogen ----------
const W = 2400, H = 3000;
const base: FigureState = { pose: "stand", phase: 0, time: 0, expr: "neutral", look: 0, side: 0, blink: false };

const figureImage = (spec: FigureSpec, st: FigureState, k = 0.8) => {
  const c = document.createElement("canvas"); c.width = FIGURE_DESIGN[0] * k; c.height = FIGURE_DESIGN[1] * k;
  drawFigure(new Pen(c.getContext("2d")!, k), spec, st, CARD_COLORS);
  return c;
};

const Sheet: React.FC = () => {
  const ready = useGate("schriften", () => [fontsReady()]);
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("figurenbogen"));
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    const g = ref.current.getContext("2d")!;
    g.fillStyle = "#efe9dc"; g.fillRect(0, 0, W, H);
    const title = (t: string, y: number) => { g.fillStyle = "#241726"; g.font = `44px ${FONT.display}`; g.textAlign = "left"; g.fillText(t, 40, y); };
    const label = (t: string, x: number, y: number) => { g.fillStyle = "#3a2f40"; g.font = `24px ${FONT.serif}`; g.textAlign = "center"; g.fillText(t, x, y); };
    // 1) Ausdrücke: Oberkörper, 8 × 2
    title(`${EXPRESSIONS.length} Ausdrücke (Figur: rufer)`, 70);
    EXPRESSIONS.forEach((e, i) => {
      const img = figureImage(CAST.rufer, { ...base, expr: e }, 1.0);
      const x = 30 + (i % 9) * 260, y = 100 + Math.floor(i / 9) * 400;   // 9 je Zeile, damit alle Ausdrücke in zwei Zeilen passen
      g.drawImage(img, 0, 250, 600, 560, x, y, 250, 233 * 1.3);
      label(e, x + 125, y + 345);
    });
    // 2) Haltungen
    title("Haltungen (Figur: zylinder_blau)", 930);
    POSES.forEach((p, i) => {
      const st: FigureState = { ...base, pose: p, phase: p === "fall" ? 0.7 : 0.18, time: 0.3, expr: p === "fall" ? "shock" : p === "shout" ? "shout" : "neutral" };
      const img = figureImage(CAST["zylinder-blau"], st);
      const x = 30 + i * 196, y = 960;
      g.drawImage(img, x - 20, y - 20, 240, 500 + 20);
      label(p, x + 100, y + 525);
    });
    // 3) Besetzung
    title("Besetzung aus V0002 / V0003", 1580);
    Object.entries(CAST).forEach(([name, spec], i) => {
      const img = figureImage(spec, { ...base, expr: i % 3 === 0 ? "smile" : i % 3 === 1 ? "neutral" : "smile_closed" });
      const x = 20 + i * 236, y = 1610;
      g.drawImage(img, x, y - 20, 240, 500 + 20);
      label(name, x + 120, y + 525);
    });
    // 4) Ansichten, Blick, Blinzeln, Bauweisen, Hautwechsel, Menge
    title("Ansicht, Blick, Blinzeln, Bauweise, Hautwechsel, Menge", 2230);
    const extras: [string, FigureSpec, Partial<FigureState>][] = [
      ["Ansicht links", CAST.patient, { side: -1 }], ["Ansicht rechts", CAST.patient, { side: 1 }],
      ["Blick links", CAST.patient, { look: -1 }], ["blinzelt", CAST.patient, { blink: true }],
      ["Kind", { ...CAST.zeitungsjunge }, {}], ["kräftig", { ...CAST.rufer, build: "stout", name: "kraeftig" }, { expr: "grin" }],
      ["krank", CAST.patient, { skin: SICK[0], expr: "pained" }], ["grün", CAST.patient, { skin: SICK[2], expr: "dazed" }],
    ];
    extras.forEach(([name, spec, s], i) => {
      const img = figureImage(spec, { ...base, ...s });
      const x = 20 + i * 236, y = 2260;
      g.drawImage(img, x, y - 20, 240, 500 + 20);
      label(name, x + 120, y + 525);
    });
    crowdSpecs(5, 4, CROWD).forEach((spec, i) => {
      const img = figureImage(spec, base, 0.5);
      g.drawImage(img, 1900 + (i % 2) * 240, 2240 + Math.floor(i / 2) * 330, 144, 300);
    });
    label("Menge (Zufall 5)", 2140, 2950);
    continueRender(handle);
  }, [ready, handle]);
  return <canvas ref={ref} width={W} height={H} style={{ width: "100%", height: "100%" }} />;
};

// ---------- 3D-Szene ----------
const LINE: [string, number, ActorKey[]][] = [
  ["rufer", -43.2, [{ at: 0, expr: "shout", pose: "shout" }, { at: 2.2, expr: "laugh", pose: "stand" }]],
  ["zylinder-blau", -41.6, [{ at: 0, expr: "smile", pose: "wave" }]],
  ["frau-gelb", -40.0, [{ at: 0, expr: "nervous", look: -0.6 }, { at: 2.5, expr: "relief" }]],
  ["schirmmuetze", -38.4, [{ at: 0, expr: "grin", pose: "point" }]],
];

const buildScene: WorldBuilder = ({ scene, shot, style, fps }) => {
  const kit = new Kit(style.lights[shot.light], 1);
  const t = town(kit, LOOKS[shot.light] ?? LOOKS.day, 1);
  scene.add(t.root);
  const tint = CARD_TINT[shot.light] ?? "#ffffff";
  const actors: Actor[] = LINE.map(([name, x, keys], i) => new Actor(CAST[name], [{ at: 0, pos: [x, -1.0] }, ...keys], CARD_COLORS, { tint, seed: i + 1, groundY: 0 }));
  // geht quer durchs Bild
  actors.push(new Actor(CAST["frau-blau"], [{ at: 0, pos: [-46, 0.6], side: 1 }, { at: 3.5, pos: [-36, 0.6] }], CARD_COLORS, { tint, seed: 9, groundY: 0 }));
  // wird krank (Hautwechsel)
  actors.push(new Actor(CAST.patient, [{ at: 0, pos: [-35.4, -0.4], expr: "neutral" }, { at: 1, skin: SICK[1], skinFade: 2, expr: "pained" }, { at: 3, skin: SICK[2], skinFade: 1, expr: "dazed" }], CARD_COLORS, { tint, seed: 10, groundY: 0 }));
  // Menge im Hintergrund
  crowdSpecs(7, 10, CROWD).forEach((spec, i) => actors.push(new Actor(spec, [{ at: 0, pos: [-58 + i * 1.6, -2.4 - (i % 2) * 0.8] }, { at: 4, pos: [-52 + i * 1.6, -2.4 - (i % 2) * 0.8] }], CARD_COLORS, { tint, seed: 20 + i, groundY: 0 })));
  actors.forEach((a) => scene.add(a.root));
  const sun = scene.children.find((o) => (o as THREE.DirectionalLight).isDirectionalLight);
  return ({ time, camera }) => {
    t.tick(time, camera, sun?.userData.dir as THREE.Vector3 | undefined);
    actors.forEach((a) => a.update(time, fps, camera));
  };
};

const story: Story = { id: "Figurenszene", format: "shortform", shots: [
  { id: "tag", seconds: 4, light: "day", camera: [{ at: 0, pos: [-39.6, 1.9, 9.5], look: [-39.6, 1.3, -1], fov: 44, push: 0.1 }], focus: { strength: 7, point: [-39.6, 1.2, -1] } },
  { id: "abend", seconds: 3, light: "golden", camera: [{ at: 0, pos: [-39.0, 1.5, 4.2], look: [-40.6, 1.4, -1], fov: 38 }], focus: { strength: 12, point: [-40.6, 1.4, -1] } },
] };

const Motor = motorCompositions([story, langformat(story)].map((s) => ({ story: s, style: cartoon3d2d, build: buildScene })));   // Kurz- und Langformat
const Root: React.FC = () => (
  <>
    <Composition id="Figurenbogen" component={Sheet} durationInFrames={1} fps={30} width={W} height={H} />
    <Motor />
  </>
);
registerRoot(Root);
