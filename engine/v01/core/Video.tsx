// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Ein Video des Motors: verteilt die Shots auf die Zeitleiste, überblendet, blitzt, wartet auf Schriften und legt
// optional die Text-Ebene und die Safe-Area-Hilfslinien darüber.
import React, { useMemo } from "react";
import { AbsoluteFill, Composition, getInputProps, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { FORMATS } from "./format";
import { activeAt, buildTimeline, flashAt, kapitelVon, type Story } from "./timeline";
import { fontsReady } from "./fonts";
import { useGate } from "./gate";
import { Stage } from "./Stage";
import type { Style, WorldBuilder } from "./style";
import TOKENS from "../../../shared/design-tokens.json";

export type MotorVideoProps = {
  story: Story;
  style: Style;
  build: WorldBuilder;
  /** optionale 2D-Ebene über dem Bild (Text-Ebene); bekommt das aktuelle Frame */
  overlay?: React.FC<{ frame: number }>;
};

/** Safe-Area-Linien nur für Testbilder: PROPS='{"guides":true}'. Format automatisch (Hochformat = Kurzform, Querformat =
 *  Langform); Ränder aus shared/design-tokens.json → safeArea (gelten für die kürzere Seite 1080, sonst im Verhältnis). */
const Guides: React.FC<{ w: number; h: number }> = ({ w, h }) => {
  const sa = (w < h ? TOKENS.safeArea["short-form"] : TOKENS.safeArea["long-form"]) as Partial<Record<"topPx" | "bottomPx" | "leftPx" | "rightPx", number>>;
  if (sa.topPx === undefined) return null;
  const m = Math.min(w, h) / 1080, px = (v?: number) => (v ?? 0) * m;
  const line = { position: "absolute" as const, background: "rgba(255,0,180,0.85)" };
  return (
    <AbsoluteFill>
      <div style={{ ...line, left: 0, right: 0, top: px(sa.topPx), height: 3 }} />
      <div style={{ ...line, left: 0, right: 0, top: h - px(sa.bottomPx), height: 3 }} />
      <div style={{ ...line, top: 0, bottom: 0, left: px(sa.leftPx), width: 3 }} />
      <div style={{ ...line, top: 0, bottom: 0, left: w - px(sa.rightPx), width: 3 }} />
    </AbsoluteFill>
  );
};

export const MotorVideo: React.FC<MotorVideoProps> = ({ story, style, build, overlay: Overlay }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const tl = useMemo(() => buildTimeline(story, fps), [story, fps]);
  const ready = useGate("Schriften", () => [fontsReady()]);
  const active = activeAt(tl.shots, frame);
  const flash = flashAt(tl.shots, frame);
  const { guides, qa } = getInputProps() as { guides?: boolean; qa?: string };
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {ready && active.map(({ shot, local, opacity }) => (
        <AbsoluteFill key={shot.index} style={{ opacity }}>
          <ThreeCanvas width={width} height={height} gl={{ antialias: false, stencil: false, preserveDrawingBuffer: true }} camera={{ fov: 40, near: 0.1, far: 1200 }}>
            <Stage shot={shot} local={local} fps={fps} style={style} build={build} />
          </ThreeCanvas>
        </AbsoluteFill>
      ))}
      {flash > 0 && qa !== "karten" && <AbsoluteFill style={{ backgroundColor: "#fff", opacity: flash }} />}
      {ready && Overlay && <Overlay frame={frame} />}
      {guides && <Guides w={width} h={height} />}
    </AbsoluteFill>
  );
};

/** Registriert ein oder mehrere Videos als Remotion-Compositions (Name = id, Format aus der Story). */
export const motorCompositions = (videos: (MotorVideoProps & { id?: string })[]) => {
  // je Video eine eigene Komponente (Funktionen wie `build` dürfen nicht als Remotion-Props übergeben werden)
  const entries = videos.map((v) => {
    const fmt = FORMATS[v.story.format];
    const total = buildTimeline(v.story, fmt.fps).total;
    const Comp: React.FC = () => <MotorVideo {...v} />;
    // Zeitplan als Daten (für die Prüf-Werkzeuge: Schnitte, Überblendungen, Blitze) – qa/zeitplan.mjs liest ihn aus
    const tl = buildTimeline(v.story, fmt.fps);
    const zeitplan = { id: v.id ?? v.story.id, fps: fmt.fps, frames: total, format: v.story.format, stil: v.style.name,   // stil: Farb-Schwellen je Stil in pruefung.py
      shots: tl.shots.map((s) => ({ id: s.id, start: s.start, end: s.end, fadeIn: s.fadeIn ?? 0, flash: s.flash ?? 0,
        cuts: s.camera.filter((k) => k.cut).map((k) => s.start + Math.round(k.at * fmt.fps)),
        kicks: (s.kicks ?? []).map((k) => [s.start + Math.round(k.at * fmt.fps), k.frames ?? 7]) })),
      kapitel: kapitelVon(tl.shots, total) };   // Langform: Kapitel mit Art (leer, wenn kein Shot `kapitel` hat)
    return { id: v.id ?? v.story.id, Comp, fmt, total, zeitplan };
  });
  const Root: React.FC = () => (
    <>
      {entries.map((e) => (
        <Composition key={e.id} id={e.id} component={e.Comp} durationInFrames={e.total} fps={e.fmt.fps} width={e.fmt.width} height={e.fmt.height} defaultProps={{ zeitplan: e.zeitplan }} />
      ))}
    </>
  );
  return Root;
};
