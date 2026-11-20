// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Gesichter: jeder Ausdruck ist eine Kombination aus Augen-, Brauen- und Mundform (plus kleine Extras wie
// Schweisstropfen). Masse relativ zum Kopf-Radius R, Mittelpunkt (hx, hy). Blinzeln schliesst offene Augen.
import { Pen, type Pt } from "./draw";

export const EXPRESSIONS = [
  "neutral", "stern", "grin", "laugh", "whistle", "nervous", "shock", "relief", "relief_open",
  "dazed", "pained", "smile", "smile_closed", "lick", "shout", "sad", "angry",
] as const;
export type Expression = (typeof EXPRESSIONS)[number];

type Eyes = "dot" | "happy" | "squeeze" | "wide" | "half" | "glare";
type Brows = "none" | "angry" | "worried" | "raised" | "flat" | "furious";
type Mouth = "line" | "smile" | "grin" | "laugh" | "o" | "wavy" | "shock" | "smallSmile" | "openSmile" | "crooked"
  | "grit" | "closedSmile" | "lick" | "shout" | "frown" | "snarl";

const RECIPE: Record<Expression, { eyes: Eyes; brows: Brows; mouth: Mouth; sweat?: boolean; zorn?: boolean }> = {
  neutral: { eyes: "dot", brows: "none", mouth: "line" },
  stern: { eyes: "dot", brows: "angry", mouth: "line" },
  grin: { eyes: "happy", brows: "none", mouth: "grin" },
  laugh: { eyes: "squeeze", brows: "none", mouth: "laugh" },
  whistle: { eyes: "dot", brows: "raised", mouth: "o" },
  nervous: { eyes: "dot", brows: "worried", mouth: "wavy", sweat: true },
  shock: { eyes: "wide", brows: "raised", mouth: "shock" },
  relief: { eyes: "happy", brows: "flat", mouth: "smallSmile" },
  relief_open: { eyes: "happy", brows: "flat", mouth: "openSmile" },
  dazed: { eyes: "half", brows: "none", mouth: "crooked" },
  pained: { eyes: "squeeze", brows: "worried", mouth: "grit" },
  smile: { eyes: "dot", brows: "none", mouth: "smile" },
  smile_closed: { eyes: "happy", brows: "none", mouth: "closedSmile" },
  lick: { eyes: "happy", brows: "none", mouth: "lick" },
  shout: { eyes: "squeeze", brows: "none", mouth: "shout" },
  sad: { eyes: "dot", brows: "worried", mouth: "frown" },
  angry: { eyes: "glare", brows: "furious", mouth: "snarl", zorn: true },   // wütend: Blick unter tiefen Brauen, gefletschte Zähne, Zornesader
};

export type FaceColors = { ink: string; mouth: string; tongue: string; teeth: string; sweat: string; zorn?: string };   // zorn: Zornesader (Standard: Mundfarbe)
export type FaceState = { expr: Expression; look: number; side: number; blink: boolean };

/** Zeichnet ein Gesicht. look: Blick −1…1 (links/rechts), side: Seitenansicht −1 (links), 0 (vorn), 1 (rechts). */
export const drawFace = (pen: Pen, hx: number, hy: number, R: number, s: FaceState, c: FaceColors) => {
  const r = RECIPE[s.expr];
  const shift = R * (0.16 * s.look + 0.34 * s.side);
  const squash = 1 - 0.28 * Math.abs(s.side);              // Augenabstand in der Seitenansicht kleiner
  const ex = R * 0.35 * squash, ey = hy - R * 0.02, cx = hx + shift;
  const lw = R * 0.088;
  const eyes = s.blink && (r.eyes === "dot" || r.eyes === "wide" || r.eyes === "half") ? "blink" : r.eyes;

  for (const side of [-1, 1]) {
    const x = cx + side * ex;
    switch (eyes) {
      case "dot": pen.ellipse(x + s.look * R * 0.025, ey, R * 0.095, R * 0.135, { fill: c.ink }); break;
      case "wide":
        pen.ellipse(x, ey - R * 0.02, R * 0.17, R * 0.19, { fill: "#ffffff", ink: c.ink, width: lw * 0.8 });
        pen.dot(x + s.look * R * 0.05, ey, R * 0.06, c.ink); break;
      case "half":
        pen.ellipse(x, ey + R * 0.02, R * 0.09, R * 0.07, { fill: c.ink });
        pen.line([[x - R * 0.14, ey - R * 0.03], [x + R * 0.14, ey - R * 0.03]], lw, c.ink); break;
      case "happy": pen.line([[x - R * 0.12, ey + R * 0.03], [x, ey - R * 0.08], [x + R * 0.12, ey + R * 0.03]], lw, c.ink, true); break;
      case "squeeze": {
        const d = -side; // ">" links, "<" rechts: zusammengekniffen ><
        pen.line([[x - d * R * 0.12, ey - R * 0.09], [x + d * R * 0.07, ey], [x - d * R * 0.12, ey + R * 0.09]], lw, c.ink); break;
      }
      case "glare": pen.ellipse(x + s.look * R * 0.025, ey + R * 0.02, R * 0.09, R * 0.11, { fill: c.ink }); break;   // wütender Blick: kleinere Pupille, etwas tiefer
      case "blink": pen.line([[x - R * 0.1, ey + R * 0.01], [x + R * 0.1, ey + R * 0.01]], lw, c.ink); break;
    }
    const by = ey - R * 0.21;   // unter der Haarkappe
    const inn = -side;          // Richtung zur Nase
    if (eyes === "squeeze" && (r.brows === "angry" || r.brows === "worried")) {
      // zugekniffene Augen: kurze Braue mit gleichem Abstand (0,15 R) über dem oberen Strich des >< bzw. gegenläufig (besorgt)
      if (r.brows === "angry") pen.line([[x - inn * R * 0.16, ey - R * 0.24], [x + inn * R * 0.08, ey - R * 0.15]], lw, c.ink);
      else pen.line([[x - inn * R * 0.1, ey - R * 0.24], [x + inn * R * 0.06, ey - R * 0.31]], lw, c.ink);   // besorgt: kürzer, mehr Abstand
    } else switch (r.brows) {
      case "angry": pen.line([[x - inn * R * 0.15, by - R * 0.05], [x + inn * R * 0.12, by + R * 0.05]], lw, c.ink); break;     // innen tiefer
      case "worried": pen.line([[x - inn * R * 0.14, by + R * 0.05], [x + inn * R * 0.12, by - R * 0.05]], lw, c.ink); break;   // innen höher
      case "raised": { const yb = eyes === "wide" ? ey - R * 0.33 : by;   // grosse Augen: Brauen deutlich darüber (erstaunt, nicht wütend)
        pen.line([[x - R * 0.12, yb - R * 0.02], [x, yb - R * 0.08], [x + R * 0.12, yb - R * 0.02]], lw * 0.9, c.ink, true); break; }
      case "flat": pen.line([[x - R * 0.12, by], [x + R * 0.12, by]], lw * 0.9, c.ink); break;
      case "furious": pen.line([[x - inn * R * 0.17, by - R * 0.09], [x + inn * R * 0.13, by + R * 0.08]], lw * 1.35, c.ink); break;   // steil, dick, innen tief
      case "none": break;
    }
  }

  const mx = cx + s.look * R * 0.04, my = hy + R * 0.45, w = R * 0.3;
  const open = (pts: Pt[], tongue = true, teeth = false) => {
    pen.poly(pts, { fill: c.mouth, ink: c.ink, width: lw * 0.85 }, true);
    if (teeth || tongue) pen.clip(Pen.poly(pts, true), () => {
      const ys = pts.map((p) => p[1]), top = Math.min(...ys), bot = Math.max(...ys);
      if (teeth) pen.rrect(mx - w * 1.5, top - R * 0.05, w * 3, (bot - top) * 0.32 + R * 0.05, 0, { fill: c.teeth });
      if (tongue) pen.ellipse(mx + w * 0.15, bot, w * 0.75, (bot - top) * 0.45, { fill: c.tongue });
    });
  };
  switch (r.mouth) {
    case "line": pen.line([[mx - w * 0.55, my], [mx + w * 0.55, my]], lw, c.ink); break;
    case "smile": pen.line([[mx - w, my - R * 0.04], [mx, my + R * 0.08], [mx + w, my - R * 0.04]], lw, c.ink, true); break;
    case "closedSmile": pen.line([[mx - w * 1.1, my - R * 0.06], [mx, my + R * 0.1], [mx + w * 1.1, my - R * 0.06]], lw, c.ink, true); break;
    case "smallSmile": pen.line([[mx - w * 0.6, my - R * 0.02], [mx, my + R * 0.05], [mx + w * 0.6, my - R * 0.02]], lw, c.ink, true); break;
    case "frown": pen.line([[mx - w * 0.8, my + R * 0.07], [mx, my - R * 0.04], [mx + w * 0.8, my + R * 0.07]], lw, c.ink, true); break;
    case "crooked": pen.line([[mx - w * 0.7, my + R * 0.02], [mx - w * 0.1, my - R * 0.02], [mx + w * 0.7, my + R * 0.05]], lw, c.ink, true); break;
    case "wavy": pen.line([[mx - w * 0.8, my], [mx - w * 0.4, my - R * 0.04], [mx, my], [mx + w * 0.4, my - R * 0.04], [mx + w * 0.8, my]], lw * 0.9, c.ink, true); break;
    case "o": pen.ellipse(mx, my, R * 0.07, R * 0.08, { fill: c.mouth, ink: c.ink, width: lw * 0.85 }); break;
    case "shock": pen.ellipse(mx, my + R * 0.04, R * 0.13, R * 0.2, { fill: c.mouth, ink: c.ink, width: lw * 0.85 }); break;
    case "shout": open([[mx - w * 0.75, my - R * 0.08], [mx, my - R * 0.12], [mx + w * 0.75, my - R * 0.08], [mx + w * 0.55, my + R * 0.22], [mx, my + R * 0.28], [mx - w * 0.55, my + R * 0.22]]); break;
    case "laugh": open([[mx - w * 1.1, my - R * 0.08], [mx + w * 1.1, my - R * 0.08], [mx + w * 0.7, my + R * 0.16], [mx, my + R * 0.26], [mx - w * 0.7, my + R * 0.16]]); break;
    case "openSmile": open([[mx - w * 0.9, my - R * 0.05], [mx + w * 0.9, my - R * 0.05], [mx + w * 0.5, my + R * 0.12], [mx, my + R * 0.17], [mx - w * 0.5, my + R * 0.12]]); break;
    case "grin": open([[mx - w * 1.15, my - R * 0.07], [mx + w * 1.15, my - R * 0.07], [mx + w * 0.75, my + R * 0.13], [mx, my + R * 0.19], [mx - w * 0.75, my + R * 0.13]], false, true); break;
    case "grit": {
      pen.rrect(mx - w * 0.9, my - R * 0.07, w * 1.8, R * 0.15, R * 0.04, { fill: c.teeth, ink: c.ink, width: lw * 0.8 });
      for (const t of [-0.45, 0, 0.45]) pen.line([[mx + t * w, my - R * 0.06], [mx + t * w, my + R * 0.07]], lw * 0.45, c.ink);
      pen.line([[mx - w * 0.88, my], [mx + w * 0.88, my]], lw * 0.45, c.ink);
      break;
    }
    case "snarl": {   // gefletschte Zähne in einer nach unten gebogenen Mundform
      const pts: Pt[] = [[mx - w * 1.1, my + R * 0.12], [mx - w * 0.5, my - R * 0.04], [mx, my - R * 0.07], [mx + w * 0.5, my - R * 0.04], [mx + w * 1.1, my + R * 0.12],
        [mx + w * 0.7, my + R * 0.2], [mx, my + R * 0.13], [mx - w * 0.7, my + R * 0.2]];
      pen.poly(pts, { fill: c.teeth, ink: c.ink, width: lw * 0.85 }, true);
      for (const t of [-0.5, 0, 0.5]) pen.line([[mx + t * w, my - R * 0.06 + Math.abs(t) * R * 0.05], [mx + t * w, my + R * 0.13 + Math.abs(t) * R * 0.04]], lw * 0.35, c.ink);
      pen.line([[mx - w * 0.95, my + R * 0.1], [mx, my + R * 0.03], [mx + w * 0.95, my + R * 0.1]], lw * 0.35, c.ink, true);
      break;
    }
    case "lick": {
      pen.line([[mx - w, my - R * 0.04], [mx, my + R * 0.08], [mx + w, my - R * 0.04]], lw, c.ink, true);
      pen.ellipse(mx + w * 0.45, my + R * 0.1, w * 0.32, w * 0.3, { fill: c.tongue, ink: c.ink, width: lw * 0.7 });
      break;
    }
  }
  if (r.zorn) {   // Zornesader: vier gebogene Striche als Kreuz an der Schläfe (unter Haar und Hut), gegenüber der Blickrichtung
    const zx = hx + R * 0.66 * (s.side > 0 ? -1 : 1), zy = hy - R * 0.12, k = R * 0.12, col = c.zorn ?? c.mouth;
    for (const [dx, dy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]] as const)
      pen.line([[zx + dx * k * 0.35, zy + dy * k * 1.1], [zx + dx * k * 0.6, zy + dy * k * 0.6], [zx + dx * k * 1.1, zy + dy * k * 0.35]], lw * 0.8, col, true);
  }
  if (r.sweat) {
    const x = hx + R * 0.72 * (s.side >= 0 ? 1 : -1), y = hy - R * 0.38;
    pen.poly([[x, y - R * 0.13], [x + R * 0.07, y], [x, y + R * 0.07], [x - R * 0.07, y]], { fill: c.sweat, ink: c.ink, width: lw * 0.5 }, true);
  }
};
