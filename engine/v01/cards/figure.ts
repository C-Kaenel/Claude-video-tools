// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Karten-Figur: bohnenförmiger Rumpf, grosser runder Kopf mit schmalerem Kinn, Strich-Arme und -Beine, Hände als
// Tusche-Punkte, kleine Schuhe. Kleidung, Haare, Hüte, Bart, Schal, Gürtel/Schärpe sind Angaben im `FigureSpec`.
// Nord-Teile (um 900): Helme ohne Hörner, Zöpfe, Bart mit Zöpfen, Borte, Mantel mit Fibel, Kettenhemd, Trägerkleid,
// Rundschild (linke Hand) und ein Ding in der rechten Hand (Speer, Axt, Ruder, Hammer, Schwert, Leier, Waage).
// Römer-Teile: Galea (Helm, mit Quer-Busch für den Centurio), Petasus (Reisehut), Schienenpanzer, Toga mit Purpursaum,
// Scutum (Langschild), Pilum, Dolabra (Pionieraxt), Messlatte und Groma (Vermessungsgerät mit vier Loten).
// Zeichenfläche 600 × 1250 Design-Einheiten (oben 250 Platz für hohe Hüte), Füsse unten Mitte (300, 1235).
// Gezeichnet wird in Körper-Einheiten (Füsse bei y 985) und um TOP nach unten verschoben.
import * as THREE from "three";
import { Pen, darker, type Pt } from "./draw";
import { drawFace, type Expression, type FaceColors } from "./face";
import { poseAt, type Limb, type Pose } from "./pose";
import { Card, contactShadow } from "./card";

export type HatKind = "top" | "cap" | "flatcap" | "bonnet" | "shako" | "helmet" | "gat" | "headband" | "gugel" | "schleier" | "krempe" | "eisenhut"
  | "spangenhelm" | "nasalhelm" | "lederkappe" | "hoernerhelm" | "fluegelhelm" | "galea" | "petasus";
export type HairStyle = "cap" | "side" | "bob" | "long" | "bald" | "topknot" | "bun" | "zoepfe";
export type HandDing = "speer" | "axt" | "ruder" | "hammer" | "schwert" | "leier" | "waage" | "taktstock" | "skizze" | "pilum" | "dolabra" | "messlatte" | "groma"
  | "krug" | "schaufel" | "spitzhacke" | "rolle" | "schwammstab" | "eimer" | "oellampe" | "brot" | "muenzen";
/** Epoche/Welt einer Figur: "stadt" (um 1900, Industriezeit), "hanse" (um 1400), "korea" (Joseon und früher), "nord" (Wikinger um 900), "roemer" (Rom, Republik bis frühe Kaiserzeit). */
export type Zeit = "stadt" | "hanse" | "korea" | "nord" | "roemer";
export type FigureSpec = {
  name?: string;
  zeit?: Zeit;                     // Epoche (für die Prüfung: passt die Figur in die Welt?)
  build?: "adult" | "child" | "stout";
  height?: number;                 // Körpergrösse in m (Standard 1,75; Kind 1,2)
  skin: string;
  coat: string;
  garment?: "coat" | "dress";
  pants?: string; shoes?: string;
  hair?: { style: HairStyle; color: string };
  hat?: { kind: HatKind; color: string; band?: string };
  moustache?: string | null;
  scarf?: string | null;
  belt?: string | null;
  sash?: string | null;
  buttons?: boolean;
  maske?: { color: string; haube?: string; glas?: string } | null;   // Schnabelmaske (Pestarzt, 17. Jh.): dunkle Haube, helle Maske mit Glasaugen, langer Schnabel
  stab?: string | null;            // Stock in der rechten Hand (Farbe), liegt in der Richtung des Unterarms
  umhang?: string | null;          // Schulterumhang (Pelerine) über Schultern und Brust
  handschuhe?: string | null;      // Handschuhe: Hände grösser, in dieser Farbe
  saum?: string | null;            // Saum-Band unten am Mantel/Kleid
  schnalle?: string | null;        // Gürtelschnalle (nur mit `belt`)
  bart?: { color: string; art?: "voll" | "zopf" | "zwei" } | null;   // Vollbart um den Mund, optional mit einem oder zwei geflochtenen Zöpfen (Ringperle)
  borte?: string | null;           // gemusterte Borte am Saum und am Halsausschnitt
  mantel?: { color: string; fibel?: string } | null;   // Mantel hinten bis zu den Knien, vorne über die linke Seite, rechts mit Ringfibel geschlossen
  kette?: string | null;           // Kettenhemd über dem Rock (Ringe, bis über die Hüfte)
  schuerze?: { color: string; fibeln?: string; perlen?: string[] } | null;   // Trägerkleid/Schürze vorne; mit `fibeln` zwei ovale Fibeln und Perlenkette (Nord-Frauen), ohne = Arbeitsschürze
  schild?: { color: string; muster?: string; art?: "kreuz" | "halb" | "wirbel" | "ring" | "scutum" } | null;   // Rundschild in der linken Hand (bemalt, Buckel); "scutum" = römischer Langschild (rechteckig, Rand, Blitze, Buckel)
  ding?: { art: HandDing; color?: string } | null;   // Ding in der rechten Hand; color = Holz/Metall nach Art
  frack?: { hemd: string; schleife: string } | null;   // Frack/Gehrock (1876): weisse Hemdbrust als Keil, Schleife am Hals, Revers
  lorica?: string | null;          // Schienenpanzer (Rom): Metallbänder um die Brust, Schulterplatten, Mittelschliessung (Farbe = Metall)
  toga?: { color: string; streifen?: string } | null;   // Toga (Rom): Tuch über die linke Schulter, quer über den Körper, Falten; streifen = Purpursaum
};
export type FigureState = {
  pose: Pose; phase: number; time: number; expr: Expression;
  look: number; side: number; blink: boolean;
  headTilt?: number; lean?: number; skin?: string;
  mirror?: boolean;   // Haltung gespiegelt (z. B. linker statt rechter Arm hebt sich)
};
export type CardColors = FaceColors & { paper: string };

const TOP = 250;
export const FIGURE_DESIGN: [number, number] = [600, 1000 + TOP];
const DESIGN = FIGURE_DESIGN;
const FOOT_Y = 985, CX = 300;

/** Masse je Bauweise (Design-Einheiten). */
const measures = (build: FigureSpec["build"]) => {
  const child = build === "child", stout = build === "stout";
  const s = child ? 0.66 : 1, hs = child ? 1.22 : 1;
  const legLen = 262 * s, hipY = FOOT_Y - legLen;
  const bodyBot = hipY + 42 * s, bodyH = 440 * s, bodyTop = bodyBot - bodyH;
  const bodyW = 250 * s * (stout ? 1.32 : 1) * (child ? 1.12 : 1);
  const R = 148 * s * hs, headY = bodyTop - R * 0.82;
  return { s, legLen, hipY, bodyBot, bodyTop, bodyH, bodyW, R, headY, arm: 122 * s, leg: legLen / 2, shoulderY: bodyTop + 80 * s, shoulderDX: bodyW * 0.4, line: 15 * Math.max(0.8, s) };
};

/** Körperhöhe in Design-Einheiten (Fuss bis Scheitel) → Kartengrösse in m. */
export const figureCardSize = (spec: FigureSpec): [number, number] => {
  const m = measures(spec.build);
  const units = FOOT_Y - (m.headY - m.R);
  const h = (spec.height ?? (spec.build === "child" ? 1.2 : 1.75)) * (DESIGN[1] / units);
  return [h * (DESIGN[0] / DESIGN[1]), h];
};

const limb = (start: Pt, [a1, a2]: Limb, len: number): [Pt, Pt] => {
  const r1 = (a1 * Math.PI) / 180, r2 = ((a1 + a2) * Math.PI) / 180;
  const mid: Pt = [start[0] + Math.sin(r1) * len, start[1] + Math.cos(r1) * len];
  return [mid, [mid[0] + Math.sin(r2) * len, mid[1] + Math.cos(r2) * len]];
};

/** Handzeichnung: weiche, feste Unregelmässigkeit je Figur (keine perfekten Kurven). k = Stärke, ph = Phase je Figur. */
const wobble = (a: number, ph: number, k: number) => 1 + k * (0.55 * Math.sin(2 * a + ph) + 0.3 * Math.sin(3 * a + ph * 1.7) + 0.15 * Math.sin(5 * a + ph * 2.3));
const phaseOf = (name = "") => { let h = 7; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 1000; return (h / 1000) * Math.PI * 2; };

/** Halbe Breite der Bohne auf Höhe y (y −1 oben … 1 unten). */
const beanHalf = (w: number, y: number) => Math.sin(Math.acos(Math.max(-1, Math.min(1, -y)))) * (w / 2) * (0.84 + 0.16 * (y + 1) / 2);

/** Bohne: oben etwas schmaler, unten voll gerundet, leicht unregelmässig. */
const beanShape = (cx: number, top: number, bot: number, w: number, ph = 0) => {
  const h = bot - top, pts: Pt[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const y = Math.cos(a) * -1;                          // −1 oben … 1 unten
    const width = (w / 2) * (0.84 + 0.16 * (y + 1) / 2) * wobble(a, ph, 0.025);
    pts.push([cx + Math.sin(a) * width, top + h / 2 + (y * h) / 2 * wobble(a, ph + 1, 0.012)]);
  }
  return Pen.poly(pts, true);
};

/** Kopf: fast rund, Kinn etwas schmaler, leicht unregelmässig. */
const headShape = (cx: number, cy: number, R: number, ph = 0) => {
  const pts: Pt[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2, down = Math.max(0, Math.cos(a)), r = R * wobble(a, ph + 2, 0.022);
    pts.push([cx + Math.sin(a) * r * (1 - 0.07 * down * down), cy + Math.cos(a) * r * 1.02]);
  }
  return Pen.poly(pts, true);
};

export const drawFigure = (pen: Pen, spec: FigureSpec, st: FigureState, c: CardColors) => pen.shift(0, TOP, () => drawBody(pen, spec, st, c));

const drawBody = (pen: Pen, spec: FigureSpec, st: FigureState, c: CardColors) => {
  const m = measures(spec.build);
  const p0 = poseAt(st.pose, st.phase, st.time);
  const p = st.mirror ? { ...p0, armL: [-p0.armR[0], -p0.armR[1]] as Limb, armR: [-p0.armL[0], -p0.armL[1]] as Limb, legL: [-p0.legR[0], -p0.legR[1]] as Limb, legR: [-p0.legL[0], -p0.legL[1]] as Limb, lean: -p0.lean, headTilt: -p0.headTilt } : p0;
  const ink = c.ink, lw = m.line;
  const skin = st.skin ?? spec.skin;
  const ph = phaseOf(spec.name);
  const lean = (st.lean ?? 0) + p.lean, tilt = (st.headTilt ?? 0) + p.headTilt;
  const drop = p.sit * m.legLen * 0.48, lift = p.bob * m.bodyH;
  const hipY = m.hipY + drop - lift;
  const dress = spec.garment === "dress";

  pen.turn(CX, FOOT_Y, p.fall, () => {
    // Haare hinten (Bob, lang)
    const headY = m.headY + drop - lift;
    const hair = spec.hair;
    const drawBackHair = () => {
      if (hair?.style === "bob") pen.ellipse(CX, headY + m.R * 0.08, m.R * 1.13, m.R * 1.02, { fill: hair.color, ink, width: lw });
      if (hair?.style === "bun") pen.ellipse(CX + m.R * 0.62, headY + m.R * 0.2, m.R * 0.42, m.R * 0.36, { fill: hair.color, ink, width: lw });   // Knoten im Nacken (seitlich sichtbar)
      if (hair?.style === "long") pen.shape(Pen.poly([[CX - m.R * 1.08, headY - m.R * 0.2], [CX - m.R * 1.0, headY + m.R * 1.45], [CX + m.R * 1.0, headY + m.R * 1.45], [CX + m.R * 1.08, headY - m.R * 0.2], [CX, headY - m.R * 1.12]], true), { fill: hair.color, ink, width: lw });
    };
    pen.turn(CX, hipY, lean, drawBackHair);
    if (spec.mantel) pen.turn(CX, hipY, lean, () => {   // Mantel hinten: von den Schultern bis zu den Knien
      const top = m.bodyTop + drop - lift, bw = dress ? m.bodyW * 1.1 : m.bodyW, low = hipY + m.leg * 0.92;
      const back = Pen.poly([[CX - bw * 0.4, top + 30 * m.s], [CX + bw * 0.4, top + 30 * m.s], [CX + bw * 0.64, top + m.bodyH * 0.5], [CX + bw * 0.62, low], [CX, low + 10 * m.s], [CX - bw * 0.62, low], [CX - bw * 0.64, top + m.bodyH * 0.5]], true);
      pen.shape(back, { fill: darker(spec.mantel!.color, 0.8), ink, width: lw });
    });

    // Beine + Schuhe
    for (const [side, l] of [[-1, p.legL], [1, p.legR]] as const) {
      const hip: Pt = [CX + side * m.bodyW * 0.16, hipY];
      const [knee, foot] = limb(hip, l, m.leg - (p.sit ? 0 : 0));
      const footPt: Pt = p.sit ? foot : [foot[0], Math.min(foot[1], FOOT_Y - 8)];
      pen.line([hip, [knee[0] + side * 3 * m.s, knee[1]], footPt], lw * 1.05, ink, true);
      pen.ellipse(footPt[0] + side * 12 * m.s, footPt[1] + 2, 27 * m.s, 12 * m.s, { fill: spec.shoes ?? ink, ink, width: lw * 0.6 });
    }

    pen.turn(CX, hipY, lean, () => {
      const top = m.bodyTop + drop - lift, bot = dress ? FOOT_Y - 70 * m.s : m.bodyBot + drop - lift;
      const bw = dress ? m.bodyW * 1.1 : m.bodyW;
      const body = beanShape(CX, top, bot, bw, ph);
      pen.shape(body, { fill: spec.coat });
      pen.shadeSide(body, darker(spec.coat, 0.78), -m.bodyW * 0.1, -m.bodyH * 0.02, 0.9);
      if (spec.belt) pen.clip(body, () => pen.rrect(CX - m.bodyW, top + (bot - top) * 0.62, m.bodyW * 2, 22 * m.s, 0, { fill: spec.belt! }));
      if (spec.belt && spec.schnalle) pen.rrect(CX - 20 * m.s, top + (bot - top) * 0.62 - 6 * m.s, 40 * m.s, 34 * m.s, 6 * m.s, { fill: spec.schnalle, ink, width: lw * 0.4 });
      if (spec.saum) pen.clip(body, () => pen.rrect(CX - m.bodyW, bot - 34 * m.s, m.bodyW * 2, 40 * m.s, 0, { fill: spec.saum! }));
      if (spec.sash) pen.clip(body, () => pen.line([[CX - m.bodyW * 0.6, top + 20], [CX + m.bodyW * 0.6, top + (bot - top) * 0.7]], 34 * m.s, spec.sash!));
      if (spec.kette) drawKette(pen, body, spec.kette, CX, top, bot, bw, m.s, ink, lw);
      if (spec.lorica) drawLorica(pen, body, spec.lorica, CX, top, bot, bw, m.s);
      if (spec.toga) drawToga(pen, body, spec.toga, CX, top, bot, bw, m.s, ink, lw);
      if ((spec.kette || spec.lorica) && spec.belt) pen.clip(body, () => pen.rrect(CX - m.bodyW, top + (bot - top) * 0.62, m.bodyW * 2, 22 * m.s, 0, { fill: spec.belt! }));
      if ((spec.kette || spec.lorica) && spec.belt && spec.schnalle) pen.rrect(CX - 20 * m.s, top + (bot - top) * 0.62 - 6 * m.s, 40 * m.s, 34 * m.s, 6 * m.s, { fill: spec.schnalle, ink, width: lw * 0.4 });
      if (spec.borte) drawBorte(pen, body, spec.borte, CX, top, bot, bw, m.s);
      if (spec.buttons ?? (!dress && !spec.kette && !spec.schuerze && !spec.frack && !spec.lorica && !spec.toga)) for (let i = 0; i < 5; i++) pen.dot(CX, top + (bot - top) * (0.2 + i * 0.15), 7 * m.s, darker(spec.coat, 0.5));
      pen.shape(body, { ink, width: lw });
      if (spec.frack) drawFrack(pen, spec.frack, spec.coat, CX, top, bot, bw, m.s, ink, lw);
      if (spec.schuerze) drawSchuerze(pen, spec.schuerze, CX, top, bot, bw, m.s, ink, lw);
      if (spec.mantel) drawMantelVorn(pen, spec.mantel, CX, top, bot, bw, m.s, ink, lw);
      if (spec.scarf) {
        const sy = top + 16 * m.s;
        pen.shape(Pen.poly([[CX - m.bodyW * 0.5, sy - 30 * m.s], [CX + m.bodyW * 0.5, sy - 30 * m.s], [CX + m.bodyW * 0.46, sy + 50 * m.s], [CX - m.bodyW * 0.46, sy + 50 * m.s]], true), { fill: spec.scarf, ink, width: lw * 0.8 });
        pen.shape(Pen.poly([[CX + m.bodyW * 0.08, sy + 20 * m.s], [CX + m.bodyW * 0.3, sy + 20 * m.s], [CX + m.bodyW * 0.24, sy + 120 * m.s], [CX + m.bodyW * 0.06, sy + 112 * m.s]], true), { fill: spec.scarf, ink, width: lw * 0.8 });
      }
      if (spec.umhang) {   // Schulterumhang: rund über die Schultern, vorne bis etwa ein Drittel des Körpers
        const cy = top + 6 * m.s, ch = (bot - top) * 0.36, cw = bw * 0.62;
        const cape = Pen.poly([[CX - cw * 0.55, cy - 14 * m.s], [CX + cw * 0.55, cy - 14 * m.s], [CX + cw * 1.02, cy + ch * 0.55], [CX + cw * 0.9, cy + ch], [CX, cy + ch * 1.08], [CX - cw * 0.9, cy + ch], [CX - cw * 1.02, cy + ch * 0.55]], true);
        pen.shape(cape, { fill: spec.umhang });
        pen.shadeSide(cape, darker(spec.umhang, 0.75), -cw * 0.12, -ch * 0.05, 0.9);
        pen.shape(cape, { ink, width: lw * 0.9 });
      }
      // Arme + Hände
      for (const [side, l] of [[-1, p.armL], [1, p.armR]] as const) {
        // Schulter liegt auf dem Körperrand (etwas nach innen), damit der Arm am Körper hängt
        const sy = m.shoulderY + drop - lift, yRel = ((sy - top) / (bot - top)) * 2 - 1;
        const sh: Pt = [CX + side * (beanHalf(bw, yRel) - lw * 0.7), sy];
        const [elbow, hand] = limb(sh, l, m.arm);
        const bend: Pt = [elbow[0] + side * 4 * m.s, elbow[1]];                       // leicht gebogen statt gerade
        pen.line([sh, bend, hand], lw * 0.95, ink, true);
        if (spec.handschuhe) pen.ellipse(hand[0], hand[1], 21 * m.s, 21 * m.s, { fill: spec.handschuhe, ink, width: lw * 0.45 });
        else pen.dot(hand[0], hand[1], 15 * m.s, ink);
        if (spec.ding && side === 1) drawDing(pen, spec.ding, hand, elbow, m.s, ink, lw, spec.handschuhe);
        if (spec.schild && side === -1) drawSchild(pen, spec.schild, hand, m.s, ink, lw);
        if (spec.stab && side === 1) {   // Stock in Richtung des Unterarms, Spitze nie unter dem Boden
          const dx = hand[0] - elbow[0], dy = hand[1] - elbow[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
          const reach = uy > 0.05 ? Math.min(330 * m.s, (FOOT_Y - 6 - hand[1]) / uy) : 330 * m.s;
          pen.line([[hand[0] - ux * 50 * m.s, hand[1] - uy * 50 * m.s], [hand[0] + ux * reach, hand[1] + uy * reach]], lw * 0.75, spec.stab, true);
          pen.line([[hand[0] - ux * 50 * m.s, hand[1] - uy * 50 * m.s], [hand[0] + ux * reach, hand[1] + uy * reach]], lw * 0.25, darker(spec.stab, 0.7), true);
          if (spec.handschuhe) pen.ellipse(hand[0], hand[1], 21 * m.s, 21 * m.s, { fill: spec.handschuhe, ink, width: lw * 0.45 });
          else pen.dot(hand[0], hand[1], 16 * m.s, ink);
        }
      }
      // Kopf
      const hy = headY;
      pen.turn(CX, hy + m.R * 0.9, tilt, () => {
        const head = headShape(CX, hy, m.R, ph);
        if (spec.maske) {   // Schnabelmaske statt Gesicht und Haar
          drawMaske(pen, head, spec.maske, CX, hy, m.R, st, ink, lw);
          if (spec.hat) drawHat(pen, spec.hat, CX, hy, m.R, ink, lw);
          return;
        }
        pen.shape(head, { fill: skin });
        pen.shadeSide(head, darker(skin, 0.86), -m.R * 0.12, -m.R * 0.1, 0.8);
        const faceShift = m.R * (0.16 * st.look + 0.34 * st.side), squash = 1 - 0.28 * Math.abs(st.side);
        if (spec.bart) { pen.shape(head, { ink, width: lw }); drawBart(pen, spec.bart, CX, hy, m.R, faceShift, st.look, skin, ink, lw); }
        drawFace(pen, CX, hy, m.R, { expr: st.expr, look: st.look, side: st.side, blink: st.blink }, c);
        if (spec.moustache) {
          const mx = CX + m.R * (0.04 * st.look + 0.34 * st.side), my = hy + m.R * 0.3;
          for (const d of [-1, 1]) pen.ellipse(mx + d * m.R * 0.13, my, m.R * 0.15, m.R * 0.06, { fill: spec.moustache, ink, width: lw * 0.5 }, d * 0.25);
        }
        if (hair && (hair.style === "topknot" || hair.style === "bun")) {   // glatt gescheitelt; Knoten oben (Männer) bzw. hinten (Frauen)
          const capShape = Pen.ellipse(CX, hy - m.R * 1.0, m.R * 1.2, m.R * 0.62);
          pen.clip(head, () => { pen.shape(capShape, { fill: hair.color }); pen.shape(capShape, { ink, width: lw * 0.9 }); });
          pen.line([[CX, hy - m.R * 0.98], [CX, hy - m.R * 0.5]], lw * 0.5, darker(hair.color, 0.55), true);
          if (hair.style === "topknot" && !spec.hat) pen.ellipse(CX, hy - m.R * 1.1, m.R * 0.24, m.R * 0.22, { fill: hair.color, ink, width: lw * 0.8 });
        }
        if (hair && (hair.style === "cap" || hair.style === "side" || hair.style === "bob" || hair.style === "long" || hair.style === "zoepfe")) {
          const low = hair.style === "side" ? 0.12 : 0;
          // Kappe endet an der Stirn (über den Augen); "side" hängt auf einer Seite tiefer
          // Kappe endet über den Brauen (Unterkante bei −0,40 R)
          const capShape = Pen.ellipse(CX + (hair.style === "side" ? -m.R * 0.18 : 0), hy - m.R * (1.04 - low), m.R * 1.22, m.R * 0.64, hair.style === "side" ? -0.12 : 0);
          pen.clip(head, () => { pen.shape(capShape, { fill: hair.color }); pen.shape(capShape, { ink, width: lw * 0.9 }); });
          pen.line([[CX - m.R * 0.08, hy - m.R * 0.98], [CX + m.R * 0.06, hy - m.R * 0.66], [CX + m.R * 0.0, hy - m.R * 0.5]], lw * 0.6, darker(hair.color, 0.55), true);
        }
        if (spec.bart) pen.clip(Pen.rrect(0, hy - m.R * 3, DESIGN[0], m.R * 3.1, 0), () => pen.shape(head, { ink, width: lw }));   // Kinn liegt im Bart
        else pen.shape(head, { ink, width: lw });
        if (hair?.style === "zoepfe") for (const d of [-1, 1]) drawZopf(pen, CX + d * m.R * 0.9, hy + m.R * 0.05, CX + d * m.R * 0.98, hy + m.R * 1.75, m.R * 0.17, hair.color, darker(hair.color, 0.5), ink, lw * 0.6);
        if (spec.hat) drawHat(pen, spec.hat, CX, hy, m.R, ink, lw, { shift: faceShift, squash });
      });
    });
  });
};

/** Schnabelmaske: dunkle Lederhaube über Kopf und Hals, Ledermaske über dem Gesicht mit zwei runden Glasaugen (Messingrand,
 *  Pupillen folgen `look`) und ein langer, kegelförmiger Schnabel, der zwischen den Augen ansetzt und leicht nach unten zur Seite
 *  zeigt – mit Mittelnaht, zwei Lederbändern und Luftlöchern; Dreiviertelansicht nach rechts (mit `side` < 0 nach links). */
const drawMaske = (pen: Pen, head: ReturnType<typeof Pen.poly>, mk: NonNullable<FigureSpec["maske"]>, cx: number, hy: number, R: number, st: FigureState, ink: string, lw: number) => {
  const col = mk.color, haube = mk.haube ?? "#2e2836", glas = mk.glas ?? "#bfe6f2", d = st.side < 0 ? -1 : 1, brass = "#d6a640";
  const X = (k: number) => cx + d * R * k;
  const Q = (k: number) => X(k * 0.82);   // Schnabel: so lang, dass die Spitze noch auf der Karte liegt (Rand bei 2,03 R)
  pen.shape(Pen.poly([[cx - R * 0.8, hy + R * 0.6], [cx + R * 0.8, hy + R * 0.6], [cx + R * 0.98, hy + R * 1.18], [cx - R * 0.98, hy + R * 1.18]], true), { fill: haube, ink, width: lw });   // Kragen der Haube (schmal, liegt im Umhang)
  pen.shape(head, { fill: haube });
  pen.shadeSide(head, darker(haube, 0.75), -d * R * 0.12, -R * 0.08, 0.8);
  pen.shape(head, { ink, width: lw });
  // Ledermaske: Gesichtsfeld mit Naht am Rand
  const plate = Pen.poly([[X(-0.62), hy - R * 0.55], [X(0.0), hy - R * 0.66], [X(0.66), hy - R * 0.5], [X(0.74), hy + R * 0.08], [X(0.5), hy + R * 0.62], [X(0.0), hy + R * 0.74], [X(-0.5), hy + R * 0.6], [X(-0.72), hy + R * 0.05]], true);
  pen.shape(plate, { fill: col });
  pen.shadeSide(plate, darker(col, 0.8), -d * R * 0.1, -R * 0.08, 0.85);
  pen.shape(plate, { ink, width: lw * 0.7 });
  // Glasaugen (oben in der Maske)
  const ey = hy - R * 0.2;
  for (const k of [-1, 1]) {
    const x = X(0.06 + k * 0.36), r = R * (k === 1 ? 0.22 : 0.25);
    pen.ellipse(x, ey, r * 1.24, r * 1.24, { fill: brass, ink, width: lw * 0.7 });
    pen.ellipse(x, ey, r, r, { fill: glas, ink, width: lw * 0.4 });
    pen.dot(x + st.look * r * 0.35, ey + r * 0.1, r * 0.34, "#2a2030");
    pen.ellipse(x - r * 0.38, ey - r * 0.38, r * 0.3, r * 0.2, { fill: "rgba(255,255,255,0.85)" }, -0.6);
  }
  // Schnabel: Kegel ab der Nasenwurzel zwischen den Augen, Spitze schräg nach unten zur Seite
  const beak: [number, number][] = [[Q(-0.02), ey + R * 0.04], [Q(0.6), ey + R * 0.08], [Q(1.3), hy + R * 0.22], [Q(1.95), hy + R * 0.58], [Q(2.32), hy + R * 0.86],
    [Q(1.9), hy + R * 0.82], [Q(1.25), hy + R * 0.7], [Q(0.6), hy + R * 0.6], [Q(0.0), hy + R * 0.5], [Q(-0.22), hy + R * 0.28]];
  const bs = Pen.poly(beak, true);
  pen.shape(bs, { fill: col });
  pen.shadeSide(bs, darker(col, 0.74), 0, -R * 0.12, 0.9);
  pen.shape(bs, { ink, width: lw });
  pen.line([[Q(0.0), hy + R * 0.12], [Q(0.8), hy + R * 0.3], [Q(1.6), hy + R * 0.6], [Q(2.22), hy + R * 0.84]], lw * 0.32, darker(col, 0.55), true);   // Mittelnaht
  for (const k of [0.15, 0.4, 0.65, 0.9, 1.15, 1.4, 1.65, 1.9]) {   // Stiche entlang der Naht
    const t = k / 2.22, x = Q(k), y = hy + R * (0.12 + t * 0.72);
    pen.line([[x - d * R * 0.03, y - R * 0.05], [x + d * R * 0.03, y + R * 0.05]], lw * 0.25, darker(col, 0.5));
  }
  for (const [k, w] of [[0.55, 0.5], [1.15, 0.42]] as const) {   // Lederbänder um den Schnabel
    const t = k / 2.22, y0 = ey + R * (0.06 + t * 0.95), y1 = hy + R * (0.54 + t * 0.32);
    pen.line([[Q(k), y0], [Q(k + 0.06), (y0 + y1) / 2], [Q(k), y1]], lw * w * 0.9, darker(col, 0.62), true);
  }
  for (const k of [-1, 1]) pen.dot(X(0.1 + k * 0.07), ey + R * 0.2, R * 0.035, darker(col, 0.4));   // Luftlöcher
};

const drawHat = (pen: Pen, hat: NonNullable<FigureSpec["hat"]>, cx: number, hy: number, R: number, ink: string, lw: number, face = { shift: 0, squash: 1 }) => {
  const band = hat.band ?? darker(hat.color, 0.6);
  switch (hat.kind) {
    case "spangenhelm": {   // Spangenhelm (Nord um 900, nach dem Fund von Gjermundbu): runde Glocke aus Platten mit Spangen, Stirnreif,
      const by = hy - R * 0.36, met = hat.color, dk = darker(met, 0.62);   // Brillen-Visier um die Augen, Kettenbehang an den Seiten
      for (const d of [-1, 1]) {   // Kettenbehang (Brünne) seitlich bis zum Hals
        const mail = Pen.poly([[cx + d * R * 1.04, by - R * 0.02], [cx + d * R * 1.08, hy + R * 0.5], [cx + d * R * 0.98, hy + R * 0.86], [cx + d * R * 0.78, hy + R * 0.8], [cx + d * R * 0.8, hy + R * 0.2], [cx + d * R * 0.84, by + R * 0.06]], true);
        pen.shape(mail, { fill: band });
        pen.clip(mail, () => { for (let y = by; y < hy + R; y += R * 0.12) for (let x = -1.15; x < -0.7; x += 0.12) pen.ellipse(cx + d * R * (-x), y + (Math.round(x * 8) % 2) * R * 0.05, R * 0.05, R * 0.04, { ink: darker(band, 0.6), width: lw * 0.25 }); });
        pen.shape(mail, { ink, width: lw * 0.8 });
      }
      const dome = Pen.poly([[cx - R * 1.06, by + R * 0.04], [cx - R * 1.0, by - R * 0.58], [cx - R * 0.58, by - R * 0.98], [cx, by - R * 1.1], [cx + R * 0.58, by - R * 0.98], [cx + R * 1.0, by - R * 0.58], [cx + R * 1.06, by + R * 0.04]], false);
      pen.shape(dome, { fill: met });
      pen.shadeSide(dome, darker(met, 0.8), -R * 0.12, -R * 0.06, 0.9);
      pen.clip(dome, () => {
        for (const k of [-0.62, 0, 0.62]) pen.line([[cx + R * k * 1.0, by], [cx + R * k * 0.55, by - R * 0.7], [cx, by - R * 1.1]], lw * 1.1, dk, true);   // Spangen
        for (const k of [-0.62, 0, 0.62]) for (const t of [0.25, 0.6]) pen.dot(cx + R * k * (1 - t * 0.6), by - R * t * 0.95, R * 0.035, darker(met, 0.4));   // Nieten
      });
      pen.shape(dome, { ink, width: lw });
      pen.ellipse(cx + R * 0.42, by - R * 0.62, R * 0.12, R * 0.24, { fill: "rgba(255,255,255,0.35)" }, 0.5);
      pen.ellipse(cx, by - R * 1.12, R * 0.09, R * 0.09, { fill: dk, ink, width: lw * 0.5 });   // kleiner Knauf oben
      pen.rrect(cx - R * 1.08, by - R * 0.1, R * 2.16, R * 0.2, R * 0.05, { fill: dk, ink, width: lw * 0.7 });   // Stirnreif
      // Brillen-Visier: zwei Bögen um die Augen und ein Nasenschutz in der Mitte
      const ex = R * 0.35 * face.squash, ey = hy - R * 0.02, fx = cx + face.shift;
      for (const d of [-1, 1]) {
        const x = fx + d * ex, pts: [number, number][] = [[x - R * 0.22, by + R * 0.08], [x - R * 0.24, ey + R * 0.1], [x, ey + R * 0.22], [x + R * 0.24, ey + R * 0.1], [x + R * 0.22, by + R * 0.08]];
        pen.line(pts, lw * 1.25, ink, true); pen.line(pts, lw * 0.6, met, true);
      }
      pen.line([[fx, by + R * 0.06], [fx, ey + R * 0.26]], lw * 1.5, ink); pen.line([[fx, by + R * 0.08], [fx, ey + R * 0.24]], lw * 0.8, met);
      break;
    }
    case "nasalhelm": {   // Nasalhelm: kegelige Glocke mit Grat, Stirnreif und Nasenschutz
      const by = hy - R * 0.36, met = hat.color;
      const cone = Pen.poly([[cx - R * 1.04, by + R * 0.04], [cx - R * 0.9, by - R * 0.58], [cx - R * 0.42, by - R * 1.08], [cx, by - R * 1.3], [cx + R * 0.42, by - R * 1.08], [cx + R * 0.9, by - R * 0.58], [cx + R * 1.04, by + R * 0.04]], false);
      pen.shape(cone, { fill: met });
      pen.shadeSide(cone, darker(met, 0.78), -R * 0.12, -R * 0.06, 0.9);
      pen.line([[cx, by - R * 1.26], [cx, by - R * 0.05]], lw * 0.5, darker(met, 0.6), true);
      pen.shape(cone, { ink, width: lw });
      pen.ellipse(cx + R * 0.4, by - R * 0.6, R * 0.11, R * 0.24, { fill: "rgba(255,255,255,0.35)" }, 0.45);
      pen.rrect(cx - R * 1.07, by - R * 0.1, R * 2.14, R * 0.2, R * 0.05, { fill: band, ink, width: lw * 0.7 });
      const fx = cx + face.shift;
      pen.rrect(fx - R * 0.075, by + R * 0.04, R * 0.15, hy + R * 0.26 - by, R * 0.05, { fill: met, ink, width: lw * 0.6 });
      break;
    }
    case "hoernerhelm": case "fluegelhelm": {   // Opern-Helm (Bayreuth 1876, nicht Wikinger): runde Glocke mit Reif, dazu Hörner bzw. Flügel
      const by = hy - R * 0.4, met = hat.color, extra = hat.band ?? (hat.kind === "hoernerhelm" ? "#f3e4c0" : "#ffffff");
      for (const d of [-1, 1]) {
        if (hat.kind === "hoernerhelm") {   // Horn: aus der Seite nach aussen, dann nach oben gebogen, spitz
          const horn = Pen.poly([[cx + d * R * 0.82, by - R * 0.18], [cx + d * R * 1.3, by - R * 0.36], [cx + d * R * 1.62, by - R * 0.82], [cx + d * R * 1.66, by - R * 1.42],
            [cx + d * R * 1.5, by - R * 0.98], [cx + d * R * 1.2, by - R * 0.66], [cx + d * R * 0.86, by - R * 0.56]], true);
          pen.shape(horn, { fill: extra }); pen.shadeSide(horn, darker(extra, 0.8), d * R * 0.08, 0, 0.9); pen.shape(horn, { ink, width: lw * 0.9 });
          for (const k of [0.3, 0.55]) pen.line([[cx + d * R * (1.1 + k * 0.6), by - R * (0.3 + k * 0.6)], [cx + d * R * (1.3 + k * 0.6), by - R * (0.55 + k * 0.6)]], lw * 0.35, darker(extra, 0.6));
        } else {   // Flügel: drei Federreihen, nach oben aussen
          const fl = Pen.poly([[cx + d * R * 0.8, by - R * 0.2], [cx + d * R * 1.2, by - R * 0.5], [cx + d * R * 1.7, by - R * 1.5], [cx + d * R * 1.38, by - R * 1.32],
            [cx + d * R * 1.5, by - R * 1.08], [cx + d * R * 1.18, by - R * 0.98], [cx + d * R * 1.26, by - R * 0.76], [cx + d * R * 0.9, by - R * 0.66]], false);
          pen.shape(fl, { fill: extra }); pen.shadeSide(fl, darker(extra, 0.85), d * R * 0.08, 0, 0.9); pen.shape(fl, { ink, width: lw * 0.8 });
          pen.line([[cx + d * R * 0.9, by - R * 0.4], [cx + d * R * 1.5, by - R * 1.3]], lw * 0.3, darker(extra, 0.7));
        }
      }
      const dome = Pen.poly([[cx - R * 1.04, by + R * 0.04], [cx - R * 0.98, by - R * 0.58], [cx - R * 0.56, by - R * 0.98], [cx, by - R * 1.08], [cx + R * 0.56, by - R * 0.98], [cx + R * 0.98, by - R * 0.58], [cx + R * 1.04, by + R * 0.04]], false);
      pen.shape(dome, { fill: met }); pen.shadeSide(dome, darker(met, 0.8), -R * 0.12, -R * 0.06, 0.9); pen.shape(dome, { ink, width: lw });
      pen.ellipse(cx + R * 0.42, by - R * 0.62, R * 0.12, R * 0.24, { fill: "rgba(255,255,255,0.4)" }, 0.5);
      pen.rrect(cx - R * 1.08, by - R * 0.12, R * 2.16, R * 0.22, R * 0.06, { fill: darker(met, 0.7), ink, width: lw * 0.7 });
      for (const k of [-0.7, -0.35, 0, 0.35, 0.7]) pen.dot(cx + R * k, by - R * 0.01, R * 0.04, "#fff3c0");
      break;
    }
    case "galea": {   // Galea (römischer Legionärshelm): runde Glocke, Stirnschiene, Wangenklappen, breiter Nackenschutz; mit `band`
      // = Quer-Helmbusch des Centurio (von Ohr zu Ohr), sonst ein kleiner Knauf oben
      const by = hy - R * 0.4, met = hat.color, fx = cx + face.shift;
      for (const d of [-1, 1]) {   // Nackenschutz: hinten, ragt seitlich unter der Glocke heraus
        const nk = Pen.poly([[cx + d * R * 0.9, by - R * 0.1], [cx + d * R * 1.32, by + R * 0.12], [cx + d * R * 1.26, by + R * 0.3], [cx + d * R * 0.9, by + R * 0.22]], true);
        pen.shape(nk, { fill: darker(met, 0.82), ink, width: lw * 0.7 });
      }
      if (hat.band) {   // Quer-Busch: Fächer aus Federn über der Glocke
        const crest = Pen.poly([[cx - R * 1.02, by - R * 0.62], [cx - R * 0.92, by - R * 1.2], [cx - R * 0.5, by - R * 1.56], [cx, by - R * 1.68], [cx + R * 0.5, by - R * 1.56], [cx + R * 0.92, by - R * 1.2], [cx + R * 1.02, by - R * 0.62]], true);
        pen.shape(crest, { fill: hat.band });
        pen.shadeSide(crest, darker(hat.band, 0.78), 0, R * 0.08, 0.9);
        for (let k = -4; k <= 4; k++) pen.line([[cx + R * k * 0.12, by - R * 0.9], [cx + R * k * 0.24, by - R * (1.6 - Math.abs(k) * 0.07)]], lw * 0.28, darker(hat.band, 0.6), true);
        pen.shape(crest, { ink, width: lw * 0.9 });
      }
      const dome = Pen.poly([[cx - R * 1.04, by + R * 0.04], [cx - R * 0.98, by - R * 0.56], [cx - R * 0.56, by - R * 0.96], [cx, by - R * 1.06], [cx + R * 0.56, by - R * 0.96], [cx + R * 0.98, by - R * 0.56], [cx + R * 1.04, by + R * 0.04]], false);
      pen.shape(dome, { fill: met }); pen.shadeSide(dome, darker(met, 0.78), -R * 0.12, -R * 0.06, 0.9); pen.shape(dome, { ink, width: lw });
      pen.ellipse(cx + R * 0.42, by - R * 0.6, R * 0.12, R * 0.24, { fill: "rgba(255,255,255,0.4)" }, 0.5);
      for (const k of [-0.5, 0.5]) pen.line([[cx + R * k * 1.2, by - R * 0.5], [cx + R * k * 0.4, by - R * 0.92]], lw * 0.4, BRONZE, true);   // Zierbleche
      pen.rrect(cx - R * 1.08, by - R * 0.12, R * 2.16, R * 0.2, R * 0.06, { fill: BRONZE, ink, width: lw * 0.7 });   // Stirnschiene
      if (!hat.band) { pen.rrect(cx - R * 0.08, by - R * 1.2, R * 0.16, R * 0.18, R * 0.04, { fill: BRONZE, ink, width: lw * 0.5 }); pen.ellipse(cx, by - R * 1.24, R * 0.13, R * 0.08, { fill: BRONZE, ink, width: lw * 0.5 }); }
      for (const d of [-1, 1]) {   // Wangenklappen: an den Seiten bis zum Kinn, Gesicht bleibt frei
        const x0 = fx + d * R * 0.68, x1 = cx + d * R * 1.02;
        const wk = Pen.poly([[x1, by + R * 0.04], [x0 + d * R * 0.02, by + R * 0.06], [x0 - d * R * 0.04, hy + R * 0.3], [x0 + d * R * 0.08, hy + R * 0.66], [x1 - d * R * 0.08, hy + R * 0.5]], true);
        pen.shape(wk, { fill: met }); pen.shadeSide(wk, darker(met, 0.8), -d * R * 0.05, 0, 0.9); pen.shape(wk, { ink, width: lw * 0.75 });
        pen.dot((x0 + x1) / 2, hy + R * 0.12, R * 0.05, BRONZE);
      }
      break;
    }
    case "petasus": {   // Petasus (Reisehut aus Filz oder Stroh): breite, flache Krempe, niedrige runde Krone, Band
      const by = hy - R * 0.5;
      const brim = Pen.ellipse(cx, by, R * 1.75, R * 0.3);
      pen.shape(brim, { fill: hat.color }); pen.shadeSide(brim, darker(hat.color, 0.78), 0, R * 0.08, 0.9); pen.shape(brim, { ink, width: lw });
      const crown = Pen.poly([[cx - R * 0.78, by], [cx - R * 0.72, by - R * 0.46], [cx - R * 0.36, by - R * 0.7], [cx + R * 0.36, by - R * 0.7], [cx + R * 0.72, by - R * 0.46], [cx + R * 0.78, by]], false);
      pen.shape(crown, { fill: hat.color }); pen.shadeSide(crown, darker(hat.color, 0.8), -R * 0.1, -R * 0.04, 0.9); pen.shape(crown, { ink, width: lw });
      pen.rrect(cx - R * 0.78, by - R * 0.18, R * 1.56, R * 0.16, R * 0.04, { fill: band, ink, width: lw * 0.5 });
      break;
    }
    case "lederkappe": {   // Lederkappe: runde, niedrige Kappe aus Bahnen mit Nähten und gerolltem Rand
      const by = hy - R * 0.44;
      const cap = Pen.poly([[cx - R * 1.02, by + R * 0.06], [cx - R * 0.94, by - R * 0.46], [cx - R * 0.52, by - R * 0.8], [cx, by - R * 0.88], [cx + R * 0.52, by - R * 0.8], [cx + R * 0.94, by - R * 0.46], [cx + R * 1.02, by + R * 0.06]], true);
      pen.shape(cap, { fill: hat.color });
      pen.shadeSide(cap, darker(hat.color, 0.8), -R * 0.1, -R * 0.05, 0.9);
      for (const k of [-0.5, 0, 0.5]) pen.line([[cx + R * k * 1.6, by], [cx + R * k * 0.9, by - R * 0.5], [cx, by - R * 0.86]], lw * 0.35, darker(hat.color, 0.6), true);
      pen.shape(cap, { ink, width: lw });
      pen.rrect(cx - R * 1.06, by - R * 0.08, R * 2.12, R * 0.22, R * 0.1, { fill: band, ink, width: lw * 0.7 });
      break;
    }
    case "top": {
      const by = hy - R * 0.72;   // Zylinder: hohe Krone (≈ 1,75 R), oben leicht breiter
      pen.poly([[cx - R * 0.52, by], [cx - R * 0.58, by - R * 1.75], [cx + R * 0.58, by - R * 1.75], [cx + R * 0.52, by]], { fill: hat.color, ink, width: lw });
      pen.rrect(cx - R * 0.53, by - R * 0.3, R * 1.06, R * 0.22, 0, { fill: band, ink, width: lw * 0.6 });
      pen.ellipse(cx, by, R * 0.86, R * 0.13, { fill: hat.color, ink, width: lw });
      break;
    }
    case "cap": {     // Schirmmütze
      const by = hy - R * 0.58;
      pen.ellipse(cx + R * 0.32, by + R * 0.08, R * 0.62, R * 0.13, { fill: darker(hat.color, 0.55), ink, width: lw * 0.8 });
      pen.shape(Pen.poly([[cx - R * 0.95, by + R * 0.05], [cx - R * 0.7, by - R * 0.45], [cx, by - R * 0.6], [cx + R * 0.7, by - R * 0.45], [cx + R * 0.95, by + R * 0.05]], true), { fill: hat.color, ink, width: lw });
      pen.rrect(cx - R * 0.93, by - R * 0.06, R * 1.86, R * 0.14, R * 0.05, { fill: band, ink, width: lw * 0.6 });
      break;
    }
    case "flatcap": {
      const by = hy - R * 0.62;
      pen.shape(Pen.poly([[cx - R * 1.02, by + R * 0.08], [cx - R * 0.8, by - R * 0.32], [cx + R * 0.2, by - R * 0.42], [cx + R * 1.05, by - R * 0.12], [cx + R * 1.0, by + R * 0.1]], true), { fill: hat.color, ink, width: lw });
      pen.ellipse(cx + R * 0.55, by + R * 0.12, R * 0.5, R * 0.09, { fill: darker(hat.color, 0.7), ink, width: lw * 0.7 });
      break;
    }
    case "bonnet": {  // Haube
      pen.shape(Pen.poly([[cx - R * 1.12, hy + R * 0.35], [cx - R * 1.05, hy - R * 0.7], [cx, hy - R * 1.18], [cx + R * 1.05, hy - R * 0.7], [cx + R * 1.12, hy + R * 0.35], [cx + R * 0.86, hy + R * 0.3], [cx + R * 0.8, hy - R * 0.55], [cx, hy - R * 0.86], [cx - R * 0.8, hy - R * 0.55], [cx - R * 0.86, hy + R * 0.3]], true), { fill: hat.color, ink, width: lw });
      pen.line([[cx - R * 0.9, hy + R * 0.38], [cx - R * 0.3, hy + R * 0.95]], lw * 0.7, band);
      break;
    }
    case "helmet": {  // Eisenhelm (Drei Reiche bis Joseon): runde Glocke, Stirnreif, Spitze mit Quaste
      const by = hy - R * 0.38;
      pen.shape(Pen.poly([[cx - R * 1.06, by + R * 0.06], [cx - R * 0.98, by - R * 0.62], [cx - R * 0.5, by - R * 1.0], [cx, by - R * 1.08], [cx + R * 0.5, by - R * 1.0], [cx + R * 0.98, by - R * 0.62], [cx + R * 1.06, by + R * 0.06]], true), { fill: hat.color, ink, width: lw });
      pen.rrect(cx - R * 1.08, by - R * 0.12, R * 2.16, R * 0.2, R * 0.06, { fill: band, ink, width: lw * 0.7 });
      for (const k of [-0.6, 0, 0.6]) pen.line([[cx + R * k, by - R * 0.15], [cx + R * k * 0.8, by - R * 0.92]], lw * 0.4, darker(hat.color, 0.7), true);
      pen.line([[cx, by - R * 1.06], [cx, by - R * 1.42]], lw * 0.7, ink, true);
      pen.ellipse(cx, by - R * 1.5, R * 0.14, R * 0.16, { fill: band, ink, width: lw * 0.6 });
      break;
    }
    case "gat": {     // Gat: breite, flache Krempe und hoher, schmaler Kopf aus durchscheinendem Rosshaar (Joseon)
      const by = hy - R * 0.62;
      pen.ellipse(cx, by, R * 1.55, R * 0.2, { fill: hat.color, ink, width: lw });
      pen.poly([[cx - R * 0.42, by - R * 0.02], [cx - R * 0.38, by - R * 0.9], [cx + R * 0.38, by - R * 0.9], [cx + R * 0.42, by - R * 0.02]], { fill: hat.color, ink, width: lw });
      pen.ellipse(cx, by - R * 0.9, R * 0.38, R * 0.07, { fill: darker(hat.color, 0.8), ink, width: lw * 0.6 });
      pen.line([[cx - R * 0.9, by + R * 0.05], [cx - R * 0.7, hy + R * 0.95]], lw * 0.35, band, true);   // Kinnband
      break;
    }
    case "headband": { // Stirnband der Arbeiter, Knoten an der Seite
      const by = hy - R * 0.5;
      pen.rrect(cx - R * 1.03, by - R * 0.12, R * 2.06, R * 0.26, R * 0.08, { fill: hat.color, ink, width: lw * 0.7 });
      pen.poly([[cx + R * 0.9, by], [cx + R * 1.35, by - R * 0.25], [cx + R * 1.3, by + R * 0.05]], { fill: hat.color, ink, width: lw * 0.6 });
      pen.poly([[cx + R * 0.9, by + R * 0.04], [cx + R * 1.28, by + R * 0.38], [cx + R * 1.1, by + R * 0.42]], { fill: hat.color, ink, width: lw * 0.6 });
      break;
    }
    case "gugel": {   // Gugel (Mittelalter): Kapuze um das Gesicht, Schulterkragen und Zipfel nach hinten
      pen.shape(Pen.poly([[cx - R * 0.8, hy + R * 0.82], [cx + R * 0.8, hy + R * 0.82], [cx + R * 1.38, hy + R * 1.42], [cx - R * 1.38, hy + R * 1.42]], true), { fill: hat.color, ink, width: lw });
      pen.shape(Pen.poly([[cx + R * 0.62, hy - R * 1.02], [cx + R * 1.45, hy - R * 0.55], [cx + R * 1.68, hy + R * 0.5], [cx + R * 1.46, hy + R * 0.56], [cx + R * 1.24, hy - R * 0.28], [cx + R * 0.8, hy - R * 0.66]], true), { fill: darker(hat.color, 0.85), ink, width: lw * 0.8 });
      pen.shape(Pen.poly([[cx - R * 1.2, hy + R * 0.9], [cx - R * 1.27, hy - R * 0.3], [cx - R * 0.82, hy - R * 1.06], [cx, hy - R * 1.26], [cx + R * 0.82, hy - R * 1.06], [cx + R * 1.27, hy - R * 0.3], [cx + R * 1.2, hy + R * 0.9],
        [cx + R * 0.9, hy + R * 0.78], [cx + R * 0.96, hy - R * 0.22], [cx + R * 0.6, hy - R * 0.82], [cx, hy - R * 0.96], [cx - R * 0.6, hy - R * 0.82], [cx - R * 0.96, hy - R * 0.22], [cx - R * 0.9, hy + R * 0.78]], true), { fill: hat.color, ink, width: lw });
      break;
    }
    case "schleier": {   // Schleier mit Kinntuch (Mittelalter, verheiratete Frauen): weisses Tuch um Kopf, Kinn und Schultern
      pen.shape(Pen.poly([[cx - R * 1.3, hy + R * 1.38], [cx - R * 1.22, hy - R * 0.35], [cx - R * 0.8, hy - R * 1.1], [cx, hy - R * 1.24], [cx + R * 0.8, hy - R * 1.1], [cx + R * 1.22, hy - R * 0.35], [cx + R * 1.3, hy + R * 1.38],
        [cx + R * 0.82, hy + R * 1.3], [cx + R * 0.92, hy - R * 0.18], [cx + R * 0.58, hy - R * 0.8], [cx, hy - R * 0.93], [cx - R * 0.58, hy - R * 0.8], [cx - R * 0.92, hy - R * 0.18], [cx - R * 0.82, hy + R * 1.3]], true), { fill: hat.color, ink, width: lw });
      pen.shape(Pen.poly([[cx - R * 0.86, hy + R * 0.7], [cx, hy + R * 1.08], [cx + R * 0.86, hy + R * 0.7], [cx + R * 0.84, hy + R * 1.32], [cx - R * 0.84, hy + R * 1.32]], true), { fill: band, ink, width: lw * 0.8 });   // Kinntuch
      pen.line([[cx - R * 0.6, hy - R * 0.86], [cx + R * 0.6, hy - R * 0.86]], lw * 0.5, darker(hat.color, 0.8), true);
      break;
    }
    case "krempe": {   // breitkrempiger Hut (Pestarzt, 17. Jh.): flache, weite Krempe, runde Krone mit Band
      const by = hy - R * 0.84;
      pen.ellipse(cx, by + R * 0.02, R * 1.7, R * 0.26, { fill: hat.color, ink, width: lw });
      pen.shape(Pen.poly([[cx - R * 0.7, by], [cx - R * 0.66, by - R * 0.78], [cx - R * 0.4, by - R * 0.95], [cx + R * 0.4, by - R * 0.95], [cx + R * 0.66, by - R * 0.78], [cx + R * 0.7, by]], true), { fill: hat.color, ink, width: lw });
      pen.rrect(cx - R * 0.69, by - R * 0.26, R * 1.38, R * 0.2, R * 0.04, { fill: band, ink, width: lw * 0.6 });
      pen.ellipse(cx + R * 0.5, by - R * 0.55, R * 0.12, R * 0.22, { fill: "rgba(255,255,255,0.22)" }, 0.3);
      break;
    }
    case "eisenhut": {   // Eisenhut (Stadtwache um 1400): runde Glocke mit Grat, breite, nach unten geneigte Krempe, Nieten
      const by = hy - R * 0.62;
      pen.shape(Pen.poly([[cx - R * 1.5, by + R * 0.36], [cx - R * 0.9, by - R * 0.06], [cx + R * 0.9, by - R * 0.06], [cx + R * 1.5, by + R * 0.36], [cx + R * 1.2, by + R * 0.44], [cx, by + R * 0.16], [cx - R * 1.2, by + R * 0.44]], true), { fill: darker(hat.color, 0.82), ink, width: lw });
      pen.shape(Pen.poly([[cx - R * 0.92, by], [cx - R * 0.86, by - R * 0.5], [cx - R * 0.5, by - R * 0.86], [cx, by - R * 0.98], [cx + R * 0.5, by - R * 0.86], [cx + R * 0.86, by - R * 0.5], [cx + R * 0.92, by]], true), { fill: hat.color, ink, width: lw });
      pen.line([[cx, by - R * 0.96], [cx, by - R * 0.04]], lw * 0.45, darker(hat.color, 0.65), true);   // Grat
      pen.rrect(cx - R * 0.92, by - R * 0.16, R * 1.84, R * 0.16, R * 0.04, { fill: band, ink, width: lw * 0.6 });
      for (const k of [-0.62, -0.3, 0.3, 0.62]) pen.dot(cx + R * k, by - R * 0.08, R * 0.035, darker(band, 0.5));   // Nieten
      pen.ellipse(cx + R * 0.42, by - R * 0.58, R * 0.12, R * 0.22, { fill: "rgba(255,255,255,0.3)" }, 0.4);
      break;
    }
    case "shako": {
      const by = hy - R * 0.68;
      pen.shape(Pen.poly([[cx - R * 0.66, by], [cx - R * 0.58, by - R * 1.0], [cx + R * 0.58, by - R * 1.0], [cx + R * 0.66, by]]), { fill: hat.color, ink, width: lw });
      pen.rrect(cx - R * 0.64, by - R * 0.22, R * 1.28, R * 0.18, 0, { fill: band, ink, width: lw * 0.6 });
      pen.ellipse(cx, by + R * 0.04, R * 0.7, R * 0.1, { fill: ink });
      pen.ellipse(cx, by - R * 1.12, R * 0.12, R * 0.18, { fill: band, ink, width: lw * 0.6 });
      break;
    }
  }
};

/** Figur als Karte in der Welt (mit Kontaktschatten). */
export class Figure {
  readonly card: Card;
  readonly root = new THREE.Group();
  readonly shadow: THREE.Mesh;
  constructor(readonly spec: FigureSpec, colors: CardColors, tint = "#ffffff") {
    const size = figureCardSize(spec);
    this.card = new Card({ design: DESIGN, size, anchor: [CX, FOOT_Y + TOP], tint, resolution: 1.6 },
      (pen, st) => drawFigure(pen, spec, st as FigureState, colors));
    this.shadow = contactShadow(size[0] * 0.55, size[0] * 0.22);
    this.root.add(this.card.group, this.shadow);
    this.root.name = `figur-${spec.name ?? "ohne-name"}`;
    this.root.userData.protect = true;
    this.root.userData.figure = true;   // Prüf-Ebene "karten" lässt Figuren weg (Beine dürfen in den unteren Rand)
  }
  update(st: FigureState, camera: THREE.Camera) {
    this.card.draw(st);
    this.card.face(camera);
  }
}

// ---------------- Nord-Teile (um 900) ----------------
const METALL = "#b9c3cf", HOLZ = "#b07a45", BRONZE = "#d9a441";

/** Geflochtener Zopf von (x0, y0) nach (x1, y1): Glieder schräg im Wechsel, Band und Quaste am Ende. */
const drawZopf = (pen: Pen, x0: number, y0: number, x1: number, y1: number, w: number, col: string, band: string, ink: string, lw: number) => {
  const n = Math.max(3, Math.round(Math.hypot(x1 - x0, y1 - y0) / (w * 1.5)));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t, k = 1 - t * 0.25;
    pen.ellipse(x, y, w * k, w * 0.95 * k, { fill: col, ink, width: lw }, i % 2 ? 0.5 : -0.5);
  }
  pen.rrect(x1 - w * 0.6, y1, w * 1.2, w * 0.4, w * 0.15, { fill: band, ink, width: lw * 0.8 });
  pen.poly([[x1 - w * 0.5, y1 + w * 0.4], [x1 + w * 0.5, y1 + w * 0.4], [x1 + w * 0.3, y1 + w * 1.3], [x1, y1 + w * 1.1], [x1 - w * 0.3, y1 + w * 1.3]], { fill: col, ink, width: lw * 0.8 }, true);
};

/** Vollbart um Kinn und Wangen mit Fenster für den Mund und Schnurrbart; optional Zöpfe mit Ringperle. */
const drawBart = (pen: Pen, bart: NonNullable<FigureSpec["bart"]>, cx: number, hy: number, R: number, shift: number, look: number, skin: string, ink: string, lw: number) => {
  const col = bart.color, dk = darker(col, 0.6), bx = cx + shift * 0.7, art = bart.art ?? "voll";
  const lang = art === "voll" ? 1.42 : 1.3;
  const outer = Pen.poly([[cx - R * 0.98, hy + R * 0.0], [cx - R * 0.94, hy + R * 0.58], [bx - R * 0.6, hy + R * 1.12], [bx, hy + R * lang], [bx + R * 0.6, hy + R * 1.12], [cx + R * 0.94, hy + R * 0.58], [cx + R * 0.98, hy + R * 0.0],
    [cx + R * 0.82, hy + R * 0.14], [bx + R * 0.42, hy + R * 0.3], [bx, hy + R * 0.24], [bx - R * 0.42, hy + R * 0.3], [cx - R * 0.82, hy + R * 0.14]], true);
  if (art !== "voll") {   // Zöpfe zuerst (hängen unter dem Bart)
    const xs = art === "zopf" ? [0] : [-0.32, 0.32];
    for (const k of xs) drawZopf(pen, bx + R * k, hy + R * 1.18, bx + R * k * 1.15, hy + R * 1.95, R * 0.15, col, BRONZE, ink, lw * 0.55);
  }
  pen.shape(outer, { fill: col });
  pen.shadeSide(outer, darker(col, 0.8), -R * 0.1, -R * 0.06, 0.9);
  pen.clip(outer, () => { for (const [x, y] of [[-0.6, 0.55], [-0.3, 0.95], [0.3, 0.95], [0.6, 0.55], [0, 1.15], [-0.75, 0.25], [0.75, 0.25]] as const) pen.line([[bx + R * x, hy + R * y], [bx + R * x * 0.9, hy + R * (y + 0.16)]], lw * 0.35, dk, true); });
  pen.shape(outer, { ink, width: lw * 0.9 });
  const mx = cx + shift + look * R * 0.04, my = hy + R * 0.47;
  pen.ellipse(mx, my + R * 0.04, R * 0.34, R * 0.16, { fill: darker(skin, 0.9) });   // Fenster für den Mund
  for (const d of [-1, 1]) pen.ellipse(mx + d * R * 0.18, hy + R * 0.33, R * 0.23, R * 0.08, { fill: col, ink, width: lw * 0.5 }, d * 0.28);   // Schnurrbart
};

/** Kettenhemd: Ringe in versetzten Reihen, unten mit gezackter Kante. */
const drawKette = (pen: Pen, body: ReturnType<typeof Pen.poly>, col: string, cx: number, top: number, bot: number, bw: number, s: number, ink: string, lw: number) => {
  const low = top + (bot - top) * 0.86, dk = darker(col, 0.6);
  const area = Pen.poly([[cx - bw, top - 60], [cx + bw, top - 60], [cx + bw, low], ...Array.from({ length: 13 }, (_, i) => [cx + bw * (0.9 - i * 0.15), low + (i % 2 ? 16 : 0) * s] as [number, number]), [cx - bw, low]]);
  pen.clip(body, () => {
    pen.shape(area, { fill: col });
    pen.clip(area, () => {
      for (let r = 0, y = top; y < low + 20; y += 17 * s, r++) for (let x = cx - bw * 0.6 + (r % 2) * 10 * s; x < cx + bw * 0.6; x += 20 * s) pen.ellipse(x, y, 8 * s, 6 * s, { ink: dk, width: 2.6 * s });
      pen.shadeSide(body, darker(col, 0.78), -bw * 0.1, 0, 0.9);
    });
    pen.shape(area, { ink, width: lw * 0.6 });
  });
};

/** Borte: gemustertes Band am Saum und am Halsausschnitt (Rauten). */
const drawBorte = (pen: Pen, body: ReturnType<typeof Pen.poly>, col: string, cx: number, top: number, bot: number, bw: number, s: number) => {
  const dk = darker(col, 0.55);
  pen.clip(body, () => {
    pen.rrect(cx - bw, bot - 40 * s, bw * 2, 30 * s, 0, { fill: col });
    for (let x = cx - bw * 0.6; x < cx + bw * 0.6; x += 26 * s) pen.poly([[x, bot - 25 * s - 9 * s], [x + 8 * s, bot - 25 * s], [x, bot - 25 * s + 9 * s], [x - 8 * s, bot - 25 * s]], { fill: dk });
    pen.line([[cx - bw * 0.34, top + 24 * s], [cx, top + 66 * s], [cx + bw * 0.34, top + 24 * s]], 22 * s, col, true);
    for (const k of [-0.18, 0, 0.18]) pen.dot(cx + bw * k, top + (k === 0 ? 66 : 50) * s, 5 * s, dk);
  });
};

/** Schürze/Trägerkleid vorne; mit Fibeln zwei ovale Schalenfibeln und eine Perlenkette dazwischen. */
const drawSchuerze = (pen: Pen, sch: NonNullable<FigureSpec["schuerze"]>, cx: number, top: number, bot: number, bw: number, s: number, ink: string, lw: number) => {
  const y0 = top + (bot - top) * 0.17, fy = top + (bot - top) * 0.12;
  const panel = Pen.poly([[cx - bw * 0.3, y0], [cx + bw * 0.3, y0], [cx + bw * 0.36, bot - 12 * s], [cx - bw * 0.36, bot - 12 * s]]);
  for (const d of [-1, 1]) pen.line([[cx + d * bw * 0.24, y0 + 6], [cx + d * bw * 0.25, top + 6 * s]], 20 * s, sch.color);
  pen.shape(panel, { fill: sch.color });
  pen.shadeSide(panel, darker(sch.color, 0.8), -bw * 0.06, 0, 0.9);
  pen.shape(panel, { ink, width: lw * 0.7 });
  if (!sch.fibeln) return;
  const perlen = sch.perlen ?? ["#2f6fd0", "#e2b52f", "#f2e6c8", "#c8402e"];
  for (let i = 0; i <= 8; i++) {   // Perlenkette: Bogen zwischen den Fibeln
    const t = i / 8, x = cx + bw * 0.24 * (2 * t - 1), y = fy + 6 * s + Math.sin(t * Math.PI) * 70 * s;
    pen.ellipse(x, y, 9 * s, 9 * s, { fill: perlen[i % perlen.length], ink, width: lw * 0.3 });
  }
  for (const d of [-1, 1]) {   // ovale Schalenfibeln
    const x = cx + d * bw * 0.24;
    pen.ellipse(x, fy, 26 * s, 34 * s, { fill: sch.fibeln, ink, width: lw * 0.6 });
    pen.ellipse(x, fy, 15 * s, 21 * s, { fill: darker(sch.fibeln, 0.8), ink: darker(sch.fibeln, 0.5), width: lw * 0.3 });
    pen.ellipse(x - 7 * s, fy - 12 * s, 6 * s, 9 * s, { fill: "rgba(255,255,255,0.45)" });
  }
};

/** Mantel vorne: über die linke Körperseite (im Bild), an der rechten Schulter mit einer Ringfibel geschlossen. */
const drawMantelVorn = (pen: Pen, mt: NonNullable<FigureSpec["mantel"]>, cx: number, top: number, bot: number, bw: number, s: number, ink: string, lw: number) => {
  const h = bot - top, B: [number, number] = [cx + bw * 0.24, top + h * 0.14];
  const flap = Pen.poly([B, [cx - bw * 0.1, top - 6 * s], [cx - bw * 0.44, top + h * 0.05], [cx - bw * 0.56, top + h * 0.4], [cx - bw * 0.56, bot + 26 * s], [cx - bw * 0.2, bot + 18 * s], [cx - bw * 0.06, top + h * 0.5]], true);
  pen.shape(flap, { fill: mt.color });
  pen.shadeSide(flap, darker(mt.color, 0.76), -bw * 0.08, 0, 0.9);
  pen.line([[cx - bw * 0.3, top + h * 0.3], [cx - bw * 0.34, bot]], lw * 0.4, darker(mt.color, 0.62), true);   // Falte
  pen.shape(flap, { ink, width: lw * 0.85 });
  const f = mt.fibel ?? BRONZE;   // Ringfibel mit Nadel
  pen.line([[B[0] - 34 * s, B[1] + 26 * s], [B[0] + 30 * s, B[1] - 22 * s]], lw * 0.5, darker(f, 0.6));
  pen.ellipse(B[0], B[1], 26 * s, 26 * s, { ink, width: lw * 1.1 });
  pen.ellipse(B[0], B[1], 26 * s, 26 * s, { ink: f, width: lw * 0.6 });
  pen.dot(B[0] - 26 * s, B[1], 7 * s, f); pen.dot(B[0] + 26 * s, B[1], 7 * s, f);
};

/** Rundschild in der linken Hand: bemalte Bretter, Muster, Eisenbuckel, Rand. */
const drawSchild = (pen: Pen, sc: NonNullable<FigureSpec["schild"]>, hand: Pt, s: number, ink: string, lw: number) => {
  if (sc.art === "scutum") { drawScutum(pen, sc, hand, s, ink, lw); return; }
  const r = 150 * s, x = Math.max(r + 8, hand[0]), y = hand[1] - 10 * s, disc = Pen.ellipse(x, y, r, r);
  const mu = sc.muster ?? "#f2e6c8";
  pen.shape(disc, { fill: sc.color });
  pen.clip(disc, () => {
    switch (sc.art ?? "kreuz") {
      case "kreuz": pen.rrect(x - r * 0.16, y - r, r * 0.32, r * 2, 0, { fill: mu }); pen.rrect(x - r, y - r * 0.16, r * 2, r * 0.32, 0, { fill: mu }); break;
      case "halb": pen.rrect(x, y - r, r, r * 2, 0, { fill: mu }); break;
      case "ring": pen.ellipse(x, y, r * 0.72, r * 0.72, { ink: mu, width: r * 0.2 }); break;
      case "wirbel": for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2; pen.poly([[x, y], [x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2], [x + Math.cos(a + 0.9) * r * 1.2, y + Math.sin(a + 0.9) * r * 1.2]], { fill: mu }, true); } break;
    }
    for (const k of [-0.6, -0.2, 0.2, 0.6]) pen.line([[x + r * k, y - r], [x + r * k, y + r]], lw * 0.18, darker(sc.color, 0.75));   // Bretter
    pen.shadeSide(disc, "rgba(30,20,40,0.18)", -r * 0.14, -r * 0.08, 0.9);
  });
  pen.shape(disc, { ink, width: lw });
  pen.ellipse(x, y, r * 0.96, r * 0.96, { ink: darker(sc.color, 0.6), width: lw * 0.35 });
  pen.ellipse(x, y, r * 0.24, r * 0.24, { fill: METALL, ink, width: lw * 0.7 });   // Buckel
  pen.ellipse(x - r * 0.07, y - r * 0.08, r * 0.07, r * 0.06, { fill: "rgba(255,255,255,0.7)" });
};

/** Scutum (römischer Langschild) in der linken Hand: hohes, leicht gewölbtes Rechteck, Blitze und Flügel um den Buckel
 *  (Farbe `muster`), Zierlinie am Rand, Metallbuckel in der Mitte. */
const drawScutum = (pen: Pen, sc: NonNullable<FigureSpec["schild"]>, hand: Pt, s: number, ink: string, lw: number) => {
  const w = 120 * s, h = 230 * s, x = Math.max(w + 8, hand[0]), y = hand[1] - 20 * s, mu = sc.muster ?? "#f2c84a";
  const plate = Pen.poly([[x - w, y - h], [x, y - h - 12 * s], [x + w, y - h], [x + w, y + h], [x, y + h + 12 * s], [x - w, y + h]], true);
  pen.shape(plate, { fill: sc.color });
  pen.clip(plate, () => {
    for (const d of [-1, 1]) {   // Blitze nach oben und unten, Flügel zur Seite
      pen.poly([[x - 10 * s, y + d * 40 * s], [x + 14 * s, y + d * 100 * s], [x - 4 * s, y + d * 104 * s], [x + 12 * s, y + d * 176 * s], [x - 18 * s, y + d * 96 * s], [x + 2 * s, y + d * 92 * s]], { fill: mu }, true);
      pen.poly([[x + d * 40 * s, y - 8 * s], [x + d * 100 * s, y - 50 * s], [x + d * 92 * s, y - 20 * s], [x + d * 104 * s, y + 2 * s], [x + d * 40 * s, y + 14 * s]], { fill: mu }, true);
    }
    pen.shadeSide(plate, "rgba(30,20,40,0.2)", -w * 0.16, 0, 0.9);
  });
  pen.shape(plate, { ink, width: lw });
  pen.rrect(x - w * 0.88, y - h * 0.94, w * 1.76, h * 1.88, 8 * s, { ink: mu, width: lw * 0.4 });   // Zierlinie
  pen.ellipse(x, y, 34 * s, 40 * s, { fill: METALL, ink, width: lw * 0.7 });   // Buckel
  pen.ellipse(x - 9 * s, y - 12 * s, 9 * s, 7 * s, { fill: "rgba(255,255,255,0.7)" });
};

/** Schienenpanzer (Lorica): Metallbänder quer über den Oberkörper bis zum Gürtel, Schulterplatten, Mittelschliessung mit Haken. */
const drawLorica = (pen: Pen, body: ReturnType<typeof Pen.poly>, col: string, cx: number, top: number, bot: number, bw: number, s: number) => {
  const low = top + (bot - top) * 0.64, dk = darker(col, 0.6);
  pen.clip(body, () => {
    pen.rrect(cx - bw, top - 60, bw * 2, low - top + 60, 0, { fill: col });
    for (let y = low - 30 * s; y > top + (bot - top) * 0.24; y -= 30 * s) {   // Bänder um den Bauch
      pen.line([[cx - bw, y], [cx + bw, y]], 5 * s, dk);
      pen.line([[cx - bw, y - 7 * s], [cx + bw, y - 7 * s]], 3 * s, "rgba(255,255,255,0.45)");
    }
    for (const d of [-1, 1]) for (let k = 0; k < 3; k++) {   // Schulterplatten: gebogene Bänder über die Schultern
      const r = bw * (0.42 + k * 0.12);
      pen.line(Array.from({ length: 9 }, (_, i) => { const a = (i / 8) * Math.PI * 0.5; return [cx + d * (bw * 0.2 + Math.sin(a) * r), top + 6 * s + (1 - Math.cos(a)) * r * 0.55] as Pt; }), 5 * s, dk, true);
    }
    pen.line([[cx, top + (bot - top) * 0.2], [cx, low]], 6 * s, dk);   // Mittelschliessung
    for (let y = top + (bot - top) * 0.3; y < low; y += 30 * s) pen.dot(cx, y, 6 * s, BRONZE);
    pen.shadeSide(body, darker(col, 0.72), -bw * 0.1, 0, 0.9);
  });
};

/** Toga: Wolltuch über der Tunika – fällt über die linke Schulter (im Bild rechts), läuft quer über die Brust nach unten
 *  links und hängt in Falten; `streifen` = Purpursaum an der oberen Kante. Die rechte Schulter (im Bild links) bleibt frei. */
const drawToga = (pen: Pen, body: ReturnType<typeof Pen.poly>, tg: NonNullable<FigureSpec["toga"]>, cx: number, top: number, bot: number, bw: number, s: number, ink: string, lw: number) => {
  const h = bot - top, col = tg.color, dk = darker(col, 0.72);
  const edge: Pt[] = [[cx + bw * 0.3, top - 20 * s], [cx - bw * 0.1, top + h * 0.3], [cx - bw * 0.7, top + h * 0.56], [cx - bw * 1.1, top + h * 0.62]];
  const drape = Pen.poly([...edge, [cx - bw * 1.1, bot + 40 * s], [cx + bw * 1.1, bot + 40 * s], [cx + bw * 1.1, top - 20 * s]], true);
  pen.clip(body, () => {
    pen.shape(drape, { fill: col });
    pen.clip(drape, () => {
      for (const k of [0.15, 0.4, 0.65]) pen.line([[cx + bw * (0.6 - k * 0.6), top + h * (0.1 + k * 0.4)], [cx - bw * (0.2 + k * 0.5), bot + 10 * s]], lw * 0.4, dk, true);   // Falten
      pen.line([[cx + bw * 0.55, top + h * 0.2], [cx + bw * 0.5, bot]], lw * 0.35, dk, true);
      pen.shadeSide(body, darker(col, 0.82), -bw * 0.1, 0, 0.9);
    });
    if (tg.streifen) pen.line(edge, 24 * s, tg.streifen, true);
    pen.line(edge, lw * 0.6, ink, true);
  });
};

/** Ding in der rechten Hand: Speer und Ruder stehen senkrecht neben der Figur, Axt, Hammer und Schwert liegen in der Richtung
 *  des Unterarms (Spitze nie unter dem Boden), Leier und Waage hängen an der Hand. Danach die Hand obendrauf. */
const drawDing = (pen: Pen, d: NonNullable<FigureSpec["ding"]>, hand: Pt, elbow: Pt, s: number, ink: string, lw: number, handschuhe?: string | null) => {
  const [hx, hy] = hand, bottom = FOOT_Y - 6;
  const dx = hx - elbow[0], dy = hy - elbow[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
  let nx = -uy, ny = ux; if (nx < 0) { nx = -nx; ny = -ny; }   // quer zum Griff, nach aussen
  const stiel = (a: Pt, b: Pt, col: string) => { pen.line([a, b], lw * 1.05, ink); pen.line([a, b], lw * 0.62, col); };
  const reach = (L: number) => (uy > 0.05 ? Math.min(L * s, (bottom - hy) / uy) : L * s);
  switch (d.art) {
    case "speer": {
      const topY = Math.max(-TOP + 30, bottom - 1150 * s);
      stiel([hx, bottom], [hx, topY + 60 * s], d.color ?? HOLZ);
      pen.poly([[hx, topY], [hx + 20 * s, topY + 50 * s], [hx + 9 * s, topY + 90 * s], [hx - 9 * s, topY + 90 * s], [hx - 20 * s, topY + 50 * s]], { fill: METALL, ink, width: lw * 0.6 }, true);
      break;
    }
    case "pilum": case "messlatte": case "groma": {   // stehen senkrecht neben der Figur
      const topY = Math.max(-TOP + 30, bottom - 1150 * s);
      if (d.art === "pilum") {   // Pilum: Holzschaft, Bleigewicht, langer dünner Eisenschaft, kleine Spitze
        const joint = topY + 420 * s;
        stiel([hx, bottom], [hx, joint], d.color ?? HOLZ);
        pen.line([[hx, joint], [hx, topY + 40 * s]], lw * 0.55, ink); pen.line([[hx, joint], [hx, topY + 40 * s]], lw * 0.28, METALL);
        pen.ellipse(hx, joint + 10 * s, 15 * s, 26 * s, { fill: "#6f7884", ink, width: lw * 0.5 });
        pen.poly([[hx, topY], [hx + 12 * s, topY + 30 * s], [hx, topY + 50 * s], [hx - 12 * s, topY + 30 * s]], { fill: METALL, ink, width: lw * 0.5 }, true);
      } else if (d.art === "messlatte") {   // Messlatte: Stange mit roten und weissen Feldern
        const n = 10, seg = (bottom - topY) / n;
        stiel([hx, bottom], [hx, topY], "#f6f1e4");
        for (let i = 0; i < n; i += 2) pen.line([[hx, bottom - i * seg], [hx, bottom - (i + 1) * seg]], lw * 0.62, d.color ?? "#d83a2e");
      } else {   // Groma: Stange, oben ein waagrechtes Kreuz (schräg gesehen) mit vier Loten an Schnüren
        const cy = topY + 120 * s, col = d.color ?? HOLZ;
        stiel([hx, bottom], [hx, cy], col);
        const arms: Pt[] = [[hx - 150 * s, cy + 22 * s], [hx + 150 * s, cy - 22 * s], [hx - 60 * s, cy - 34 * s], [hx + 60 * s, cy + 34 * s]];
        stiel(arms[0], arms[1], col); stiel(arms[2], arms[3], col);
        for (const [ax, ay] of arms) { pen.line([[ax, ay], [ax, ay + 230 * s]], lw * 0.16, ink); pen.poly([[ax - 9 * s, ay + 230 * s], [ax + 9 * s, ay + 230 * s], [ax, ay + 262 * s]], { fill: "#6f7884", ink, width: lw * 0.35 }, true); }
        pen.dot(hx, cy, 10 * s, BRONZE);
      }
      break;
    }
    case "dolabra": {   // Dolabra (Pionieraxt der Legion): Stiel in der Richtung des Unterarms, Kopf mit Beilklinge und Spitzhacke
      const R = reach(260), a: Pt = [hx - ux * 40 * s, hy - uy * 40 * s], e: Pt = [hx + ux * R, hy + uy * R];
      stiel(a, e, d.color ?? HOLZ);
      const p = (u: number, n: number): Pt => [e[0] + ux * u * s + nx * n * s, e[1] + uy * u * s + ny * n * s];
      pen.poly([p(14, 4), p(20, 70), p(-28, 76), p(-14, 4)], { fill: METALL, ink, width: lw * 0.6 }, true);   // Beil
      pen.poly([p(10, -4), p(2, -90), p(-8, -4)], { fill: METALL, ink, width: lw * 0.6 }, true);   // Hacke
      pen.line([p(16, 66), p(-24, 72)], lw * 0.3, "rgba(255,255,255,0.75)");
      break;
    }
    case "ruder": {
      const topY = Math.max(-TOP + 20, bottom - 1100 * s), col = d.color ?? HOLZ;
      stiel([hx, bottom], [hx, topY + 200 * s], col);
      pen.poly([[hx - 8 * s, topY + 230 * s], [hx - 34 * s, topY + 150 * s], [hx - 30 * s, topY + 8 * s], [hx + 30 * s, topY + 8 * s], [hx + 34 * s, topY + 150 * s], [hx + 8 * s, topY + 230 * s]], { fill: col, ink, width: lw * 0.7 }, true);
      pen.line([[hx, topY + 30 * s], [hx, topY + 200 * s]], lw * 0.3, darker(col, 0.65));
      break;
    }
    case "axt": case "hammer": case "schwert": {
      const L = d.art === "schwert" ? 320 : d.art === "axt" ? 270 : 210, R = reach(L);
      const a: Pt = [hx - ux * 40 * s, hy - uy * 40 * s], e: Pt = [hx + ux * R, hy + uy * R];
      if (d.art === "schwert") {
        const g0: Pt = [hx + ux * 30 * s, hy + uy * 30 * s];
        pen.poly([[g0[0] + nx * 12 * s, g0[1] + ny * 12 * s], [e[0] - ux * 30 * s + nx * 9 * s, e[1] - uy * 30 * s + ny * 9 * s], e, [e[0] - ux * 30 * s - nx * 9 * s, e[1] - uy * 30 * s - ny * 9 * s], [g0[0] - nx * 12 * s, g0[1] - ny * 12 * s]], { fill: d.color ?? METALL, ink, width: lw * 0.6 });
        pen.line([g0, [e[0] - ux * 40 * s, e[1] - uy * 40 * s]], lw * 0.22, darker(d.color ?? METALL, 0.6));   // Hohlkehle
        stiel([g0[0] - nx * 38 * s, g0[1] - ny * 38 * s], [g0[0] + nx * 38 * s, g0[1] + ny * 38 * s], BRONZE);   // Parierstange
        stiel(a, g0, "#5a3a24");
        pen.ellipse(a[0], a[1], 15 * s, 15 * s, { fill: BRONZE, ink, width: lw * 0.5 });
        break;
      }
      stiel(a, e, d.color ?? HOLZ);
      if (d.art === "axt") {   // Bartaxt: Klinge nach aussen, unten weit heruntergezogen
        const p = (u: number, n: number): Pt => [e[0] + ux * u * s + nx * n * s, e[1] + uy * u * s + ny * n * s];
        pen.poly([p(8, 6), p(16, 40), p(30, 82), p(-62, 92), p(-40, 40), p(-28, 6)], { fill: METALL, ink, width: lw * 0.6 }, true);
        pen.line([p(26, 78), p(-54, 88)], lw * 0.35, "rgba(255,255,255,0.75)");
      } else {
        const p = (u: number, n: number): Pt => [e[0] + ux * u * s + nx * n * s, e[1] + uy * u * s + ny * n * s];
        pen.poly([p(22, -44), p(22, 44), p(-22, 44), p(-22, -44)], { fill: "#7d8794", ink, width: lw * 0.6 });
      }
      break;
    }
    case "leier": {   // Leier: Holzrahmen mit Schallkasten unten, Joch oben, Saiten
      const col = d.color ?? HOLZ, x = hx + 10 * s, b = hy + 30 * s, t = hy - 170 * s, w = 62 * s;
      const frame = Pen.poly([[x - w, b], [x - w * 1.05, t + 40 * s], [x - w * 0.7, t], [x + w * 0.7, t], [x + w * 1.05, t + 40 * s], [x + w, b]], true);
      pen.shape(frame, { fill: col, ink, width: lw * 0.7 });
      pen.rrect(x - w * 0.62, t + 34 * s, w * 1.24, (b - t) * 0.42, 6 * s, { fill: "#f2e6c8", ink, width: lw * 0.4 });
      for (let i = 0; i < 5; i++) { const k = -0.4 + i * 0.2; pen.line([[x + w * k, t + 30 * s], [x + w * k, b - 18 * s]], lw * 0.18, ink); }
      break;
    }
    case "taktstock": {   // Taktstock: dünner heller Stab in der Richtung des Unterarms
      const e: Pt = [hx + ux * 150 * s, hy + uy * 150 * s];
      pen.line([[hx - ux * 14 * s, hy - uy * 14 * s], e], lw * 0.55, ink); pen.line([[hx - ux * 12 * s, hy - uy * 12 * s], [e[0] - ux * 2, e[1] - uy * 2]], lw * 0.28, d.color ?? "#f6f1e4");
      break;
    }
    case "skizze": {   // Skizzenblock mit Stift (Kostümbildner): helles Blatt mit Strichen einer Figur, Bindung oben
      const x = hx + 18 * s, y = hy - 30 * s, w = 120 * s, h = 150 * s;
      pen.rrect(x - w / 2, y - h / 2, w, h, 6 * s, { fill: d.color ?? "#f6f0de", ink, width: lw * 0.6 });
      pen.line([[x - w * 0.4, y - h * 0.44], [x + w * 0.4, y - h * 0.44]], lw * 0.4, "#8a6440");
      pen.ellipse(x, y - h * 0.18, w * 0.12, w * 0.12, { ink: "#5a6a8a", width: lw * 0.25 });
      pen.line([[x, y - h * 0.06], [x, y + h * 0.22], [x - w * 0.14, y + h * 0.4]], lw * 0.25, "#5a6a8a");
      pen.line([[x, y + h * 0.22], [x + w * 0.14, y + h * 0.4]], lw * 0.25, "#5a6a8a");
      pen.line([[x - w * 0.2, y + h * 0.02], [x + w * 0.2, y + h * 0.02]], lw * 0.25, "#5a6a8a");
      pen.line([[x - w * 0.16, y - h * 0.28], [x - w * 0.28, y - h * 0.42]], lw * 0.25, "#5a6a8a"); pen.line([[x + w * 0.16, y - h * 0.28], [x + w * 0.28, y - h * 0.42]], lw * 0.25, "#5a6a8a");   // Hörner an der Skizze
      break;
    }
    case "krug": case "eimer": {   // Krug (Ton, zwei Henkel) bzw. Holzeimer mit Eisenreif: hängt an der Hand
      const col = d.color ?? (d.art === "krug" ? "#d07a48" : HOLZ), x = hx + 6 * s, y = hy + 20 * s;
      if (d.art === "krug") {
        pen.poly([[x - 26 * s, y], [x + 26 * s, y], [x + 18 * s, y + 24 * s], [x + 56 * s, y + 92 * s], [x + 40 * s, y + 150 * s], [x - 40 * s, y + 150 * s], [x - 56 * s, y + 92 * s], [x - 18 * s, y + 24 * s]], { fill: col, ink, width: lw * 0.6 }, true);
        pen.line([[x - 20 * s, y + 8 * s], [x - 46 * s, y + 30 * s], [x - 40 * s, y + 66 * s]], lw * 0.35, ink, true);
        pen.line([[x - 44 * s, y + 104 * s], [x + 44 * s, y + 104 * s]], lw * 0.25, darker(col, 0.7));
      } else {
        pen.line([[hx, hy], [x - 50 * s, y + 40 * s]], lw * 0.25, ink); pen.line([[hx, hy], [x + 50 * s, y + 40 * s]], lw * 0.25, ink);
        pen.poly([[x - 54 * s, y + 40 * s], [x + 54 * s, y + 40 * s], [x + 44 * s, y + 140 * s], [x - 44 * s, y + 140 * s]], { fill: col, ink, width: lw * 0.6 });
        for (const k of [62, 120]) pen.line([[x - 52 * s + (k - 40) * 0.1 * s, y + k * s], [x + 52 * s - (k - 40) * 0.1 * s, y + k * s]], lw * 0.3, "#6f7884");
        pen.ellipse(x, y + 42 * s, 50 * s, 10 * s, { fill: "#5fc8ec", ink, width: lw * 0.3 });
      }
      break;
    }
    case "schaufel": case "spitzhacke": {   // Schaufel (Holzstiel, Eisenblatt) bzw. Spitzhacke: in der Richtung des Unterarms
      const R = reach(d.art === "schaufel" ? 300 : 250), a: Pt = [hx - ux * 40 * s, hy - uy * 40 * s], e: Pt = [hx + ux * R, hy + uy * R];
      stiel(a, e, d.color ?? HOLZ);
      const p = (u: number, n: number): Pt => [e[0] + ux * u * s + nx * n * s, e[1] + uy * u * s + ny * n * s];
      if (d.art === "schaufel") pen.poly([p(-10, -30), p(-10, 30), p(60, 36), p(80, 0), p(60, -36)], { fill: METALL, ink, width: lw * 0.6 }, true);
      else pen.poly([p(6, -100), p(14, 0), p(6, 100), p(-6, 0)], { fill: METALL, ink, width: lw * 0.6 }, true);
      break;
    }
    case "rolle": {   // Schriftrolle (offen): zwei Holzstäbe, dazwischen das helle Blatt mit Zeilen
      const x = hx + 20 * s, y = hy - 40 * s, w = 150 * s, h = 110 * s, col = d.color ?? "#f1e3c0";
      pen.rrect(x - w / 2, y - h / 2, w, h, 3 * s, { fill: col, ink, width: lw * 0.5 });
      for (const k of [-1, 1]) pen.rrect(x + k * w / 2 - 9 * s, y - h / 2 - 14 * s, 18 * s, h + 28 * s, 8 * s, { fill: "#b8935a", ink, width: lw * 0.5 });
      for (let i = 0; i < 5; i++) pen.line([[x - w * 0.36, y - h * 0.32 + i * h * 0.16], [x + w * (0.36 - (i % 2) * 0.14), y - h * 0.32 + i * h * 0.16]], lw * 0.18, "#5a4a3a");
      break;
    }
    case "schwammstab": {   // Schwamm am Stiel (Latrine): Holzstab, oben ein gelber Schwamm
      const e: Pt = [hx + ux * 220 * s, hy + uy * 220 * s - 60 * s];
      stiel([hx - ux * 20 * s, hy - uy * 20 * s], e, d.color ?? HOLZ);
      pen.ellipse(e[0], e[1], 30 * s, 24 * s, { fill: "#f2c94c", ink, width: lw * 0.5 });
      for (const [ox, oy] of [[-10, -6], [8, 4], [0, 10]] as const) pen.dot(e[0] + ox * s, e[1] + oy * s, 4 * s, "#c99a2a");
      break;
    }
    case "oellampe": {   // Öllampe aus Ton auf der flachen Hand, kleine Flamme
      const x = hx + 10 * s, y = hy - 16 * s, col = d.color ?? "#c08c5a";
      pen.ellipse(x, y, 46 * s, 20 * s, { fill: col, ink, width: lw * 0.5 });
      pen.poly([[x + 30 * s, y - 10 * s], [x + 66 * s, y - 6 * s], [x + 62 * s, y + 6 * s], [x + 30 * s, y + 10 * s]], { fill: col, ink, width: lw * 0.45 });
      pen.poly([[x + 64 * s, y - 8 * s], [x + 56 * s, y - 36 * s], [x + 64 * s, y - 62 * s], [x + 74 * s, y - 34 * s]], { fill: "#ffc93a", ink, width: lw * 0.35 }, true);
      break;
    }
    case "brot": {   // rundes Brot mit acht Kerben (panis quadratus)
      const x = hx + 14 * s, y = hy - 20 * s, r = 52 * s, col = d.color ?? "#d99a4e";
      pen.ellipse(x, y, r, r * 0.8, { fill: col, ink, width: lw * 0.55 });
      for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 4; pen.line([[x - Math.cos(a) * r * 0.8, y - Math.sin(a) * r * 0.64], [x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.64]], lw * 0.22, darker(col, 0.65)); }
      break;
    }
    case "muenzen": {   // Hand voll Münzen: drei goldene Scheiben, eine fällt
      const col = d.color ?? "#f6c636";
      for (const [ox, oy] of [[-14, -18], [12, -24], [0, -36], [26, 30]] as const) { pen.ellipse(hx + ox * s, hy + oy * s, 17 * s, 12 * s, { fill: col, ink, width: lw * 0.4 }); pen.dot(hx + ox * s - 4 * s, hy + oy * s - 3 * s, 4 * s, "#fff6c0"); }
      break;
    }
    case "waage": {   // Klappwaage der Händler: Balken mit zwei Schalen an Ketten
      const col = d.color ?? BRONZE, y = hy + 26 * s, w = 90 * s;
      pen.line([[hx, hy], [hx, y]], lw * 0.3, ink);
      pen.line([[hx - w, y], [hx + w, y]], lw * 0.55, col);
      for (const k of [-1, 1]) {
        const x = hx + k * w;
        pen.line([[x, y], [x - 22 * s, y + 90 * s]], lw * 0.2, ink); pen.line([[x, y], [x + 22 * s, y + 90 * s]], lw * 0.2, ink);
        pen.shape(Pen.poly([[x - 34 * s, y + 90 * s], [x + 34 * s, y + 90 * s], [x + 20 * s, y + 108 * s], [x - 20 * s, y + 108 * s]], true), { fill: col, ink, width: lw * 0.45 });
      }
      break;
    }
  }
  if (handschuhe) pen.ellipse(hx, hy, 21 * s, 21 * s, { fill: handschuhe, ink, width: lw * 0.45 });
  else pen.dot(hx, hy, 16 * s, ink);
};

/** Frack/Gehrock (1876): weisse Hemdbrust als Keil unter dem Kinn, dunkle Revers links und rechts, Schleife am Hals. */
const drawFrack = (pen: Pen, fr: NonNullable<FigureSpec["frack"]>, coat: string, cx: number, top: number, bot: number, bw: number, s: number, ink: string, lw: number) => {
  const h = bot - top;
  pen.shape(Pen.poly([[cx - bw * 0.2, top + 10 * s], [cx + bw * 0.2, top + 10 * s], [cx + bw * 0.06, top + h * 0.55], [cx - bw * 0.06, top + h * 0.55]]), { fill: fr.hemd, ink, width: lw * 0.5 });
  for (const d of [-1, 1]) pen.shape(Pen.poly([[cx + d * bw * 0.2, top + 10 * s], [cx + d * bw * 0.3, top + h * 0.12], [cx + d * bw * 0.08, top + h * 0.5], [cx + d * bw * 0.06, top + h * 0.55]]), { fill: darker(coat, 0.7), ink, width: lw * 0.5 });
  for (const k of [0.25, 0.37]) pen.dot(cx, top + h * k, 5 * s, darker(fr.hemd, 0.6));
  const y = top + 28 * s;
  pen.poly([[cx, y], [cx - 30 * s, y - 14 * s], [cx - 30 * s, y + 14 * s]], { fill: fr.schleife, ink, width: lw * 0.4 });
  pen.poly([[cx, y], [cx + 30 * s, y - 14 * s], [cx + 30 * s, y + 14 * s]], { fill: fr.schleife, ink, width: lw * 0.4 });
  pen.dot(cx, y, 8 * s, fr.schleife);
};
