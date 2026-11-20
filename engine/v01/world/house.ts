// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Häuser aus Bausteinen: Körper (Putz oder Backstein), Sockel, Gurtgesims, Kranzgesims, Fenster mit Rahmen, Sprossen,
// Bank, Sturz und Läden, Rundbogentür mit Rahmen und Stufe, Sattel- oder Flachdach, Kamin, Ladenschild-Halter.
// Ursprung: Mitte der Fassade am Boden; die Fassade zeigt nach +z, das Haus reicht nach −z.
import * as THREE from "three";
import { Kit, archFrame, archShape, extrude } from "./kit";
import type { V3 } from "../camera/rig";
import { blocks, brick, glass, kacheln, louvre, planks, plaster, shade, tiles } from "./paint";
import type { WorldPalette } from "./palette";

export type HouseSpec = {
  width: number;                  // m
  floors: 2 | 3 | 4;              // Höhe 7 / 8,4 / 9,8 m
  depth?: number;                 // m (Standard 8)
  versatz?: number;               // m: Gesims und Dach so viel nach vorn/oben (Nachbarhäuser abwechselnd, gegen Flackern)
  wall: "plaster" | "brick" | "tiles";   // tiles = Wandkacheln (Labor)
  color: string;                  // Wandfarbe
  shutters?: string | null;       // Ladenfarbe, null = keine Läden
  door?: { column: number; color: string } | null; // Tür in Spalte n des Erdgeschosses
  roof?: "gable" | "flat";
  roofColor?: string;
  chimney?: boolean;
  signHolder?: boolean;           // Halter für ein Ladenschild neben der Tür
};

export const houseHeight = (floors: number) => 4.2 + 1.4 * floors;
const PLINTH = 0.9;

export const columnsFor = (width: number) => Math.max(1, Math.floor((width - 0.6) / 2.3));

/** Ein Fenster (Mitte cx/cy auf der Fassade). */
const windowAt = (b: ReturnType<Kit["batch"]>, pal: WorldPalette, cx: number, cy: number, w: number, h: number, shutters: string | null | undefined) => {
  const f = 0.09, d = 0.1;
  b.teil("fenster", [w + 2 * f, h + 2 * f, d], [cx, cy, d / 2]);
  b.box([w, h, 0.02], [cx, cy, 0.01], "#ffffff", glass(pal.glass));
  b.box([w + 2 * f, f, d], [cx, cy + h / 2 + f / 2, d / 2], pal.trim);
  b.box([w + 2 * f, f, d], [cx, cy - h / 2 - f / 2, d / 2], pal.trim);
  b.box([f, h, d], [cx - w / 2 - f / 2, cy, d / 2], pal.trim);
  b.box([f, h, d], [cx + w / 2 + f / 2, cy, d / 2], pal.trim);
  b.box([0.06, h, 0.06], [cx, cy, 0.05], pal.trim);                    // senkrechte Sprosse
  b.box([w, 0.06, 0.06], [cx, cy + h * 0.12, 0.05], pal.trim);         // waagrechte Sprosse
  b.box([w + 0.42, 0.1, 0.3], [cx, cy - h / 2 - f - 0.05, 0.15], pal.stone); // Fensterbank
  b.box([w + 0.3, 0.16, 0.14], [cx, cy + h / 2 + f + 0.1, 0.07], pal.stone); // Sturz
  if (shutters) {
    const sw = w * 0.5, sx = w / 2 + f + sw / 2 + 0.04;
    for (const side of [-1, 1]) {
      b.box([sw, h + 0.12, 0.05], [cx + side * sx, cy, 0.05], "#ffffff", louvre(shutters));
      b.box([sw + 0.04, 0.06, 0.07], [cx + side * sx, cy + h / 2 + 0.06, 0.06], shade(shutters, 0.7));
      b.box([sw + 0.04, 0.06, 0.07], [cx + side * sx, cy - h / 2 - 0.06, 0.06], shade(shutters, 0.7));
    }
  }
};

/** Rundbogentür mit Rahmen, Knauf und Stufe. */
const doorAt = (b: ReturnType<Kit["batch"]>, pal: WorldPalette, cx: number, color: string, maxTop: number) => {
  const w = 1.3, step = 0.24, h = Math.min(2.55, maxTop - step - 0.2);
  b.teil("tuer", [w + 0.32, h + 0.16, 0.16], [cx, step + h / 2, 0.08]);
  b.add(extrude(archShape(w, h), 0.06), [cx, step, 0.02], "#ffffff", planks(color, true));
  b.add(extrude(archFrame(w, h, 0.16), 0.16), [cx, step, 0], pal.stone);
  b.add(new THREE.SphereGeometry(0.05, 12, 8), [cx + w * 0.32, step + 1.15, 0.12], "#d8b25a");
  b.box([w + 0.9, step, 0.7], [cx, step / 2, 0.35], pal.stone, blocks(pal.stone, shade(pal.stone, 0.6)));
};

export const house = (kit: Kit, pal: WorldPalette, spec: HouseSpec) => {
  const W = spec.width, D = spec.depth ?? 8, H = houseHeight(spec.floors), v = spec.versatz ?? 0;
  const b = kit.batch();
  const wallPaint = spec.wall === "brick" ? brick(spec.color, pal.mortar) : spec.wall === "tiles" ? kacheln(spec.color, shade(spec.color, 0.72)) : plaster(spec.color);
  b.box([W, H, D], [0, H / 2, -D / 2], "#ffffff", wallPaint);
  const floorH = (H - PLINTH - 0.7) / spec.floors;
  const cols = columnsFor(W), gap = W / cols;
  // Sockel – bei der Tür unterbrochen
  const plinthPaint = blocks(pal.plinth, shade(pal.plinth, 0.6));
  const doorX = spec.door ? -W / 2 + gap * (spec.door.column + 0.5) : null;
  const spans: [number, number][] = doorX === null ? [[-W / 2 - 0.02, W / 2 + 0.02]] : [[-W / 2 - 0.02, doorX - 0.81], [doorX + 0.81, W / 2 + 0.02]];
  for (const [a, e] of spans) if (e - a > 0.05) b.box([e - a, PLINTH + v, 0.12 + v], [(a + e) / 2, (PLINTH + v) / 2, 0.06 + v / 2], "#ffffff", plinthPaint);   // Nachbar-Sockel überlappen 2 cm → Versatz
  const ww = Math.min(1.2, gap * 0.42), wh = Math.min(1.6, floorH * 0.6);
  for (let fl = 0; fl < spec.floors; fl++) {
    const cy = PLINTH + floorH * (fl + 0.52);
    for (let c = 0; c < cols; c++) {
      const cx = -W / 2 + gap * (c + 0.5);
      if (fl === 0 && spec.door && spec.door.column === c) continue;
      windowAt(b, pal, cx, cy, ww, wh, spec.shutters);
    }
    if (fl === 0) b.box([W + 0.06, 0.16 + v, 0.12 + v], [0, PLINTH + floorH, 0.06 + v / 2], pal.stone); // Gurtgesims
  }
  if (spec.door && doorX !== null) doorAt(b, pal, doorX, spec.door.color, PLINTH + floorH - 0.1);
  // Kranzgesims und Gesims darunter: mit Versatz ganz um v höher (Oberkante wie bisher H + v) – sonst liegen die Unterseiten der Nachbarn deckungsgleich (Flackern)
  b.box([W + 0.3, 0.32, 0.42 + v], [0, H - 0.16 + v, 0.06 + v / 2], pal.stone);  // Kranzgesims
  b.box([W + 0.16, 0.12, 0.3 + v], [0, H - 0.4 + v, 0.02 + v / 2], pal.stone);

  const roofColor = spec.roofColor ?? pal.roofs[0];
  if ((spec.roof ?? "gable") === "gable") {
    const rh = Math.min(3.2, D * 0.32), o = 0.35;
    const tri = new THREE.Shape([new THREE.Vector2(-D / 2 - o, 0), new THREE.Vector2(D / 2 + o, 0), new THREE.Vector2(0, rh)]);
    b.add(extrude(tri, W + 0.3), [-(W + 0.3) / 2, H + v, -D / 2], "#ffffff", tiles(roofColor), [0, 90, 0]);
    if (spec.chimney) b.box([0.62, rh + 0.8, 0.62], [W * 0.28, H + rh * 0.5, -D * 0.38], "#ffffff", brick(shade(roofColor, 0.95), pal.mortar));
  } else {
    b.box([W, 0.55, 0.28], [0, H + 0.27, -0.14], "#ffffff", wallPaint); // Brüstung
    if (spec.chimney) b.box([0.62, 1.4, 0.62], [W * 0.28, H + 0.7, -D * 0.45], "#ffffff", brick(shade(roofColor, 0.95), pal.mortar));
  }

  const g = b.build("haus");
  const signAnchor: V3 = [0, 0, 0];
  if (spec.signHolder && spec.door) {
    const dx = -W / 2 + gap * (spec.door.column + 0.5) + 1.05;
    const s = kit.batch();
    s.box([0.05, 0.05, 0.9], [dx, PLINTH + floorH * 0.92, 0.45], pal.metal);
    s.box([0.04, 0.3, 0.04], [dx, PLINTH + floorH * 0.92 - 0.15, 0.85], pal.metal);
    g.add(s.build("schildhalter"));
    signAnchor[0] = dx; signAnchor[1] = PLINTH + floorH * 0.92 - 0.3; signAnchor[2] = 0.85;
  }
  g.userData.occluder = true;
  g.userData.house = { width: W, height: H, depth: D, signAnchor };
  return g;
};
