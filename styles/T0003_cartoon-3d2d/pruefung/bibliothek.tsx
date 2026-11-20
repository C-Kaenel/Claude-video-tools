// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Prüfung der Effekt-Karten + Vorschaubilder der Bibliothek:
//  - "Bibliotheksbogen" (2D, ein Bild): alle Figuren und Effekt-Karten der Bibliothek (erst Figuren, dann Karten, je nach B-ID) in festen Feldern
//    (8 Spalten à 400 × 560, so viele Zeilen wie nötig) – daraus schneidet tools/bibliothek/vorschau.py die Vorschaubilder.
//  - "Effektszene" (3D, 6 s): Effekt-Karten in Aktion (Aufploppen, Schwanken, Pulsieren, Buchstabenwechsel, Füllstand).
//  - "Kamerabogen" (3D): jedes Kamera-Muster (B0040–B0044) auf eine Figur in der Laborstrasse, je 1 s.
import React, { useLayoutEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Composition, continueRender, delayRender, registerRoot } from "remotion";
import {
  Actor, EffectActor, FIGURE_DESIGN, FONT, Kit, Pen, cameraFromPattern, drawEffect, drawFigure, fontsReady, motorCompositions, town, useGate,
  type CameraPattern, type EffectKind, type FigureState, type ShotData, type Story, type WorldBuilder,
} from "../../../engine/v01";
import { FIGUREN, KARTEN, KAMERAS } from "../../../library/eintraege";
import { cartoon3d2d, LOOKS } from "../style";
import { CARD_COLORS, CARD_TINT, CAST, EFFECT_COLORS } from "../figures";
import { langformat } from "../szene";
import { EFFECTS } from "../../../engine/v01";

const CW = 400, CH = 560, COLS = 8;
const ROWS = Math.ceil((Object.keys(FIGUREN).length + Object.keys(KARTEN).length) / COLS);   // so viele Zeilen, wie Einträge da sind
const base: FigureState = { pose: "stand", phase: 0, time: 0, expr: "smile", look: 0, side: 0, blink: false };

const Sheet: React.FC = () => {
  const ready = useGate("schriften", () => [fontsReady()]);
  const ref = useRef<HTMLCanvasElement>(null);
  const [handle] = useState(() => delayRender("bibliotheksbogen"));
  useLayoutEffect(() => {
    if (!ready || !ref.current) return;
    const g = ref.current.getContext("2d")!;
    g.fillStyle = "#efe9dc"; g.fillRect(0, 0, CW * COLS, CH * ROWS);
    const cells: { id: string; name: string; paint: (c: HTMLCanvasElement) => [number, number] }[] = [];
    for (const [name, e] of Object.entries(FIGUREN)) cells.push({ id: e.id, name, paint: (c) => {
      c.width = FIGURE_DESIGN[0]; c.height = FIGURE_DESIGN[1]; drawFigure(new Pen(c.getContext("2d")!, 1), CAST[name], base, CARD_COLORS); return FIGURE_DESIGN;
    } });
    for (const [name, e] of Object.entries(KARTEN)) cells.push({ id: e.id, name, paint: (c) => {
      const kind = (e as { kind: EffectKind }).kind, [w, h] = EFFECTS[kind].design;
      c.width = w; c.height = h; drawEffect(new Pen(c.getContext("2d")!, 1), kind, (e as { params: Record<string, unknown> }).params, EFFECT_COLORS); return [w, h];
    } });
    cells.forEach((cell, i) => {
      const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
      const c = document.createElement("canvas");
      const [w, h] = cell.paint(c);
      const k = Math.min((CW - 40) / w, (CH - 110) / h);
      g.drawImage(c, x + (CW - w * k) / 2, y + 20 + (CH - 110 - h * k) / 2, w * k, h * k);
      g.fillStyle = "#241726"; g.textAlign = "center";
      g.font = `30px ${FONT.display}`; g.fillText(cell.id, x + CW / 2, y + CH - 58);
      g.font = `26px ${FONT.serif}`; g.fillText(cell.name, x + CW / 2, y + CH - 22);
    });
    continueRender(handle);
  }, [ready, handle]);
  return <canvas ref={ref} width={CW * COLS} height={CH * ROWS} style={{ width: "100%", height: "100%" }} />;
};

// ---------- Effektszene ----------
const buildEffects: WorldBuilder = ({ scene, shot, style, fps }) => {
  const kit = new Kit(style.lights[shot.light], 1);
  const t = town(kit, LOOKS[shot.light] ?? LOOKS.day, 1);
  scene.add(t.root);
  const tint = CARD_TINT[shot.light] ?? "#ffffff";
  const rufer = new Actor(CAST.rufer, [{ at: 0, pos: [-40.9, -1.4], expr: "neutral" }, { at: 0.6, expr: "shout", pose: "shout" }, { at: 2.4, expr: "smile", pose: "stand" }], CARD_COLORS, { tint, seed: 2, groundY: 0 });
  const patient = new Actor(CAST.patient, [{ at: 0, pos: [-39.3, -1.0], expr: "nervous" }, { at: 3, expr: "pained", skin: "#a9cf86", skinFade: 2.5 }], CARD_COLORS, { tint, seed: 3, groundY: 0 });
  const fx: EffectActor[] = [
    new EffectActor("sprechblase", 0.95, [{ at: 0.6, show: true, pos: [-41.3, 2.3, -1.4], params: { text: "HELLO!", art: "ruf", schwanz: "rechts" }, motion: "sway" }, { at: 2.4, show: false }], EFFECT_COLORS, { unlit: true }),
    new EffectActor("ladenschild", 1.05, [{ at: 0, show: true, pos: [-41.3, 0, -3.2], params: { von: "HOLLA", zu: "HALLO", fortschritt: 0 } }, { at: 1.5, params: { fortschritt: 0 } }, { at: 3.5, params: { fortschritt: 1 } }], EFFECT_COLORS, { tint }),
    new EffectActor("thermometer", 0.9, [{ at: 2.6, show: true, pos: [-38.85, 1.55, -0.9], params: { stand: 0.2 }, motion: "bob" }, { at: 5.5, params: { stand: 0.95 } }], EFFECT_COLORS, { tint }),
    new EffectActor("mikroskop", 1.2, [{ at: 3.0, show: true, pos: [-39.6, 2.75, -0.6], params: { menge: 0.1 } }, { at: 5.8, params: { menge: 0.9 } }], EFFECT_COLORS, { unlit: true }),
    new EffectActor("warnlicht", 0.35, [{ at: 0, show: true, pos: [-38.0, 3.3, -5.9], params: { an: 1 }, motion: "pulse" }], EFFECT_COLORS, { tint }),
    new EffectActor("popstern", 0.7, [{ at: 4.2, show: true, pos: [-41.0, 1.0, -0.6], params: { text: "POP!" } }, { at: 4.9, show: false }], EFFECT_COLORS, { unlit: true }),
    new EffectActor("fliege", 0.12, [{ at: 0, show: true, pos: [-39.0, 2.15, -0.7], motion: "bob" }], EFFECT_COLORS, { tint }),
  ];
  [rufer, patient].forEach((a) => scene.add(a.root));
  fx.forEach((e) => scene.add(e.root));
  const sun = scene.children.find((o) => (o as THREE.DirectionalLight).isDirectionalLight);
  return ({ time, camera }) => {
    t.tick(time, camera, sun?.userData.dir as THREE.Vector3 | undefined);
    rufer.update(time, fps, camera); patient.update(time, fps, camera);
    fx.forEach((e) => e.update(time, camera));
  };
};
const effectStory: Story = { id: "Effektszene", format: "shortform", shots: [
  { id: "effekte", seconds: 6, light: "day", camera: [{ at: 0, pos: [-40.1, 1.9, 6.8], look: [-40.1, 1.7, -1], fov: 44, push: 0.05 }], focus: { strength: 6, point: [-40.2, 1.5, -1] } },
] };

// ---------- Kamerabogen ----------
const camShots: ShotData[] = Object.values(KAMERAS).map((e) => ({
  id: `kamera-${(e as { name: string }).name}`, seconds: 1, light: "day",
  camera: cameraFromPattern((e as { pattern: CameraPattern }).pattern, [-40, 0, -1.5], 0).map((k) => ({ ...k, push: 0 })),
  focus: { strength: (e as { pattern: CameraPattern }).pattern.focus, point: [-40, 1.3, -1.5] },
}));
const buildCams: WorldBuilder = ({ scene, shot, style, fps }) => {
  const kit = new Kit(style.lights[shot.light], 1);
  const t = town(kit, LOOKS.day, 1);
  scene.add(t.root);
  const a = new Actor(CAST["zylinder-blau"], [{ at: 0, pos: [-40, -1.5], expr: "smile" }], CARD_COLORS, { seed: 4, groundY: 0 });
  const b = new Actor(CAST["frau-gelb"], [{ at: 0, pos: [-38.9, 0.6], expr: "neutral" }], CARD_COLORS, { seed: 5, groundY: 0 });
  scene.add(a.root, b.root);
  return ({ time, camera }) => { t.tick(time, camera); a.update(time, fps, camera); b.update(time, fps, camera); };
};
const camStory: Story = { id: "Kamerabogen", format: "shortform", shots: camShots };

// je Kurzformat und Langformat (<id>-Lang, 16:9)
const Motor = motorCompositions([effectStory, langformat(effectStory)].map((story) => ({ story, style: cartoon3d2d, build: buildEffects }))
  .concat([camStory, langformat(camStory)].map((story) => ({ story, style: cartoon3d2d, build: buildCams }))));
const Root: React.FC = () => (
  <>
    <Composition id="Bibliotheksbogen" component={Sheet} durationInFrames={1} fps={30} width={CW * COLS} height={CH * ROWS} />
    <Motor />
  </>
);
registerRoot(Root);
