// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Effekt-Karten (Spezifikation 7.4): je Art eine Zeichen-Funktion mit Angaben (`params`). Alle Formen mit dunkler Kontur.
// Zahlen-Angaben (z. B. Füllstand, Fortschritt) dürfen sich in einer Spur gleitend ändern; Texte wechseln hart.
import { Pen, darker, mixHex, type Pt } from "./draw";
import { AQUA_KARTEN } from "./aqua-karten";

export type EffectColors = {
  ink: string; paper: string; red: string; green: string; virus: string; blood: string; cell: string; gold: string;
  wood: string; metal: string; glow: string; heart: string; bone: string; leaf: string; petal: string; water: string; ink2: string;
  fonts: { display: string; serif: string; script: string };
};
type P = Record<string, unknown>;
type Def = { design: [number, number]; anchor?: [number, number]; defaults: P; draw: (pen: Pen, p: P, c: EffectColors) => void };

const num = (p: P, k: string) => Number(p[k] ?? 0);
const str = (p: P, k: string) => String(p[k] ?? "");
const LW = 14;

const star = (cx: number, cy: number, r1: number, r2: number, n: number, jitter = 0): Pt[] =>
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 : r1 * (1 + (i % 4 === 0 ? jitter : -jitter));
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  });

/** Opern-Helm von vorn (Bayreuth 1876): Glocke, Reif, Hörner (`art` "horn") oder Flügel ("fluegel"). Mitte unten (cx, cy). */
const helmOper = (pen: Pen, cx: number, cy: number, k: number, c: EffectColors, art: "horn" | "fluegel") => {
  const stahl = "#c3ccd6", horn = "#f1e2bd";
  for (const d of [-1, 1]) {
    const X = (x: number) => cx + d * x * k, Y = (y: number) => cy - y * k;
    if (art === "horn") pen.poly([[X(100), Y(60)], [X(160), Y(80)], [X(205), Y(150)], [X(210), Y(240)], [X(185), Y(160)], [X(150), Y(115)], [X(100), Y(105)]], { fill: horn, ink: c.ink, width: 10 }, true);
    else pen.poly([[X(100), Y(70)], [X(160), Y(110)], [X(230), Y(250)], [X(190), Y(230)], [X(200), Y(195)], [X(160), Y(190)], [X(170), Y(150)], [X(110), Y(120)]], { fill: "#ffffff", ink: c.ink, width: 10 });
  }
  const dome = Pen.poly([[cx - 130 * k, cy], [cx - 124 * k, cy - 90 * k], [cx - 70 * k, cy - 145 * k], [cx, cy - 158 * k], [cx + 70 * k, cy - 145 * k], [cx + 124 * k, cy - 90 * k], [cx + 130 * k, cy]], false);
  pen.shape(dome, { fill: stahl }); pen.shadeSide(dome, darker(stahl, 0.8), -16 * k, -6 * k, 0.9); pen.shape(dome, { ink: c.ink, width: 12 });
  pen.ellipse(cx + 50 * k, cy - 95 * k, 14 * k, 30 * k, { fill: "rgba(255,255,255,0.5)" }, 0.5);
  pen.rrect(cx - 136 * k, cy - 14 * k, 272 * k, 30 * k, 8 * k, { fill: darker(stahl, 0.7), ink: c.ink, width: 10 });
  for (const t of [-0.7, -0.35, 0, 0.35, 0.7]) pen.dot(cx + t * 130 * k, cy + 1 * k, 6 * k, "#fff3c0");
};
/** Echter Helm um 900 (Spangenhelm wie Gjermundbu): runde Glocke mit Spangen, Reif, Brillen-Visier – keine Hörner. */
const helmEcht = (pen: Pen, cx: number, cy: number, k: number, c: EffectColors) => {
  const stahl = "#aab4c0", dk = darker(stahl, 0.6);
  const dome = Pen.poly([[cx - 130 * k, cy], [cx - 124 * k, cy - 90 * k], [cx - 70 * k, cy - 145 * k], [cx, cy - 158 * k], [cx + 70 * k, cy - 145 * k], [cx + 124 * k, cy - 90 * k], [cx + 130 * k, cy]], false);
  pen.shape(dome, { fill: stahl }); pen.shadeSide(dome, darker(stahl, 0.8), -16 * k, -6 * k, 0.9);
  pen.clip(dome, () => { for (const t of [-0.6, 0, 0.6]) pen.line([[cx + t * 130 * k, cy], [cx + t * 70 * k, cy - 110 * k], [cx, cy - 158 * k]], 14 * k, dk, true); });
  pen.shape(dome, { ink: c.ink, width: 12 });
  pen.rrect(cx - 136 * k, cy - 14 * k, 272 * k, 30 * k, 8 * k, { fill: dk, ink: c.ink, width: 10 });
  for (const d of [-1, 1]) pen.line([[cx + d * 20 * k, cy + 14 * k], [cx + d * 20 * k, cy + 60 * k], [cx + d * 70 * k, cy + 70 * k], [cx + d * 105 * k, cy + 40 * k], [cx + d * 100 * k, cy + 14 * k]], 14 * k, dk, true);
  pen.line([[cx, cy + 14 * k], [cx, cy + 80 * k]], 16 * k, dk);
};
/** Runen (jüngeres Futhark) als Striche [x1, y1, x2, y2] in einer Zelle (Breite 0,6, Höhe 1); Stab bei x 0,3. */
const STAB = [0.3, 0, 0.3, 1];
const RUNE: Record<string, number[][]> = {
  f: [STAB, [0.3, 0.15, 0.6, 0], [0.3, 0.38, 0.6, 0.2]], u: [[0.1, 1, 0.1, 0], [0.1, 0, 0.5, 0.35], [0.5, 0.35, 0.5, 1]],
  th: [STAB, [0.3, 0.25, 0.55, 0.45], [0.55, 0.45, 0.3, 0.65]], a: [STAB, [0.05, 0.55, 0.55, 0.3]],
  r: [STAB, [0.3, 0, 0.55, 0.2], [0.55, 0.2, 0.3, 0.42], [0.3, 0.42, 0.58, 1]], k: [STAB, [0.3, 0.35, 0.58, 0.08]],
  h: [STAB, [0.05, 0.3, 0.55, 0.7], [0.55, 0.3, 0.05, 0.7]], n: [STAB, [0.05, 0.62, 0.55, 0.35]], i: [STAB],
  s: [[0.1, 0.1, 0.5, 0.4], [0.5, 0.4, 0.1, 0.6], [0.1, 0.6, 0.5, 0.9]], t: [STAB, [0.3, 0, 0.05, 0.25], [0.3, 0, 0.55, 0.25]],
  b: [STAB, [0.3, 0, 0.55, 0.25], [0.55, 0.25, 0.3, 0.5], [0.3, 0.5, 0.55, 0.75], [0.55, 0.75, 0.3, 1]],
  m: [STAB, [0.3, 0.25, 0.05, 0], [0.3, 0.25, 0.55, 0]], l: [STAB, [0.3, 0, 0.58, 0.28]], R: [STAB, [0.3, 0.75, 0.05, 1], [0.3, 0.75, 0.55, 1]],
};
const RUNE_VON: Record<string, string> = { a: "a", æ: "a", b: "b", p: "b", c: "k", k: "k", g: "k", q: "k", d: "t", t: "t", e: "i", i: "i", j: "i", y: "u",
  f: "f", v: "f", w: "u", h: "h", l: "l", m: "m", n: "n", o: "u", ø: "u", å: "u", u: "u", r: "r", s: "s", z: "R", x: "s", þ: "th" };

/** Römische Zahl (1 … 3999). */
const roemisch = (n: number) => {
  let v = Math.max(0, Math.min(3999, Math.round(n))), s = "";
  for (const [w, z] of [[1000, "M"], [900, "CM"], [500, "D"], [400, "CD"], [100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]] as const)
    while (v >= w) { s += z; v -= w; }
  return s || "–";
};
/** Gestrichelte Linie von a nach b, nur das Stück bis `u` (0…1). */
const strichel = (pen: Pen, a: Pt, b: Pt, u: number, width: number, color: string, lang = 40, luecke = 26) => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]), dx = (b[0] - a[0]) / L, dy = (b[1] - a[1]) / L, bis = L * Math.max(0, Math.min(1, u));
  for (let s = 0; s < bis; s += lang + luecke) { const e = Math.min(bis, s + lang); pen.line([[a[0] + dx * s, a[1] + dy * s], [a[0] + dx * e, a[1] + dy * e]], width, color); }
};
/** Strassennetz (Karte strassennetz): Städte in Längen-/Breitengraden, Strassen als Ketten von Städten; Rom in der Mitte. */
const NETZ_STADT: Record<string, [number, number]> = {
  ROMA: [12.5, 41.9], MEDIOLANUM: [9.2, 45.5], LUTETIA: [2.35, 48.85], LONDINIUM: [-0.1, 51.5], COLONIA: [6.96, 50.9], AQUILEIA: [13.4, 45.8],
  VINDOBONA: [16.4, 48.2], NAISSUS: [21.9, 43.3], BYZANTIUM: [29, 41], ANTIOCHIA: [36.2, 36.2], ARELATE: [4.6, 43.7], TARRACO: [1.25, 41.1],
  HISPALIS: [-6, 37.4], BRUNDISIUM: [17.9, 40.6], ATHENAE: [23.7, 38], RHEGIUM: [15.65, 38.1], CARTHAGO: [10.3, 36.85], ALEXANDRIA: [29.9, 31.2],
  CYRENE: [21.9, 32.8], LEPTIS: [14.3, 32.6],
};
const NETZ_STRASSEN: [number, string[]][] = [   // [Start 0…1, Städte] – Hauptstrassen aus Rom zuerst, dann die Verzweigungen
  [0, ["ROMA", "MEDIOLANUM", "ARELATE", "TARRACO", "HISPALIS"]], [0, ["ROMA", "BRUNDISIUM"]], [0, ["ROMA", "AQUILEIA", "NAISSUS", "BYZANTIUM", "ANTIOCHIA"]],
  [0, ["ROMA", "RHEGIUM"]], [0.25, ["MEDIOLANUM", "LUTETIA", "LONDINIUM"]], [0.3, ["MEDIOLANUM", "COLONIA"]], [0.3, ["AQUILEIA", "VINDOBONA"]],
  [0.35, ["NAISSUS", "ATHENAE"]], [0.4, ["CARTHAGO", "LEPTIS", "CYRENE", "ALEXANDRIA"]], [0.45, ["ANTIOCHIA", "ALEXANDRIA"]],
];
const NETZ_NAME: Record<string, [number, number]> = {   // Versatz der Namen, wo sie sonst auf Strassen oder Nachbarn liegen (Standard: darüber)
  MEDIOLANUM: [-115, -8], ARELATE: [-30, 34], AQUILEIA: [60, -34], LUTETIA: [-80, 0], BRUNDISIUM: [70, 26], RHEGIUM: [60, 30], ATHENAE: [0, 36], LEPTIS: [0, 36],
  ALEXANDRIA: [0, 38], ANTIOCHIA: [0, 38], BYZANTIUM: [40, -34], NAISSUS: [40, -34], HISPALIS: [0, 36], TARRACO: [-70, 10], CARTHAGO: [-40, -34],
};
const netzPunkt = (n: string): Pt => { const [lon, lat] = NETZ_STADT[n]; return [80 + (lon + 9) * 27, 960 - (lat - 29) * 36]; };

export const EFFECTS = {
  /** Sprechblase: art "rede" (rund) oder "ruf" (Zacken); Schwanz links/rechts; Text passt sich an. */
  sprechblase: { design: [800, 520], anchor: [400, 520], defaults: { text: "HELLO!", art: "ruf", schwanz: "links" }, draw: (pen, p, c) => {
    const left = str(p, "schwanz") !== "rechts", tx = left ? 300 : 500;
    const tail: Pt[] = [[tx - 50, 380], [tx + (left ? -90 : 90), 505], [tx + 50, 380]];
    if (str(p, "art") === "ruf") {
      const pts = Array.from({ length: 36 }, (_, i): Pt => { const a = (i / 36) * Math.PI * 2, r = i % 2 ? 1 : 1.17; return [400 + Math.cos(a) * 330 * r, 220 + Math.sin(a) * 175 * r]; });
      pen.poly(tail, { fill: c.paper, ink: c.ink, width: LW });
      pen.poly(pts, { fill: c.paper, ink: c.ink, width: LW });
      pen.poly([[tx - 44, 370], [tx + 44, 370], [tx, 330]], { fill: c.paper });
    } else {
      pen.poly(tail, { fill: c.paper, ink: c.ink, width: LW });
      pen.ellipse(400, 220, 360, 190, { fill: c.paper, ink: c.ink, width: LW });
      pen.poly([[tx - 44, 372], [tx + 44, 372], [tx, 330]], { fill: c.paper });
    }
    pen.text(str(p, "text"), 400, 225, { font: c.fonts.display, size: 120, color: c.ink, maxWidth: 520 });
  } },
  /** Ladenschild mit Buchstabenwechsel: `von` → `zu`, `fortschritt` 0…1 tauscht Buchstabe um Buchstabe (gelb hervorgehoben). */
  ladenschild: { design: [900, 700], anchor: [450, 700], defaults: { von: "HOLLA", zu: "HALLO", fortschritt: 0 }, draw: (pen, p, c) => {
    for (const x of [170, 730]) pen.rrect(x - 22, 240, 44, 460, 8, { fill: c.wood, ink: c.ink, width: LW });
    pen.rrect(40, 60, 820, 260, 18, { fill: darker(c.wood, 0.8), ink: c.ink, width: LW });
    pen.rrect(70, 88, 760, 204, 8, { fill: c.paper, ink: c.ink, width: LW * 0.7 });
    const a = str(p, "von"), b = str(p, "zu"), n = Math.max(a.length, b.length), f = num(p, "fortschritt");
    const w = 720 / n;
    for (let i = 0; i < n; i++) {
      const swapped = f * n > i + 0.5, ch = (swapped ? b[i] : a[i]) ?? "", changed = a[i] !== b[i];
      const x = 90 + w * i;
      if (swapped && changed) pen.rrect(x + 6, 104, w - 12, 172, 6, { fill: c.gold });
      pen.text(ch, x + w / 2, 194, { font: c.fonts.display, size: 150, color: c.ink, maxWidth: w - 16 });
    }
  } },
  /** Zeitung: Kopf, Datum, Schlagzeile (optional rot eingekreist), Spalten. */
  zeitung: { design: [600, 760], defaults: { kopf: "NORWICH COURIER", datum: "October 1826", schlagzeile: "“Hello!”", kreis: true }, draw: (pen, p, c) => {
    pen.poly([[20, 30], [580, 14], [588, 740], [14, 750]], { fill: c.paper, ink: c.ink, width: LW * 0.7 });
    pen.text(str(p, "kopf"), 300, 90, { font: c.fonts.serif, size: 52, color: c.ink, maxWidth: 520 });
    pen.line([[50, 130], [550, 126]], 4, c.ink);
    pen.text(str(p, "datum"), 300, 160, { font: c.fonts.serif, size: 30, color: darker(c.ink, 1), maxWidth: 400 });
    pen.line([[50, 190], [550, 186]], 4, c.ink);
    pen.text(str(p, "schlagzeile"), 300, 330, { font: c.fonts.serif, size: 86, color: c.ink, maxWidth: 440 });
    if (p.kreis) pen.ellipse(300, 330, 230, 70, { ink: c.red, width: 9 }, -0.04);
    for (let r = 0; r < 7; r++) for (const x of [60, 320]) pen.line([[x, 450 + r * 38], [x + 220 - (r % 3) * 20, 450 + r * 38]], 6, mixHex(c.paper, c.ink, 0.35));
  } },
  /** Brief mit Handschrift (Schrift Caveat), Datum oben rechts, Unterschrift. */
  brief: { design: [600, 760], defaults: { datum: "Aug. 15, 1877", text: "Hello!" }, draw: (pen, p, c) => {
    pen.poly([[30, 20], [585, 34], [570, 745], [18, 735]], { fill: c.paper, ink: c.ink, width: LW * 0.7 });
    pen.text(str(p, "datum"), 430, 90, { font: c.fonts.serif, size: 36, color: c.ink, maxWidth: 260 });
    for (let r = 0; r < 9; r++) pen.line([[60, 180 + r * 58], [540, 182 + r * 58]], 3, mixHex(c.paper, c.ink, 0.22));
    pen.text(str(p, "text"), 300, 360, { font: c.fonts.script, size: 150, color: c.ink2, maxWidth: 480 });
    pen.line([[360, 650], [400, 630], [430, 660], [470, 628], [520, 650]], 5, c.ink2, true);
  } },
  /** Kerzenständer-Telefon mit Hörer am Haken. */
  telefon: { design: [400, 700], defaults: {}, draw: (pen, _p, c) => {
    pen.ellipse(170, 660, 120, 30, { fill: c.metal, ink: c.ink, width: LW });
    pen.rrect(150, 200, 40, 460, 14, { fill: c.metal, ink: c.ink, width: LW });
    pen.poly([[110, 120], [230, 120], [210, 210], [130, 210]], { fill: c.metal, ink: c.ink, width: LW });
    pen.ellipse(170, 115, 70, 28, { fill: darker(c.metal, 0.7), ink: c.ink, width: LW });
    pen.line([[190, 300], [270, 300]], 12, c.ink);
    pen.rrect(270, 250, 60, 190, 20, { fill: c.metal, ink: c.ink, width: LW });
    pen.line([[300, 440], [300, 560], [220, 620]], 7, c.ink, true);
  } },
  /** Glühbirne: an (leuchtet, Strahlen) oder aus. */
  gluehbirne: { design: [500, 600], defaults: { an: 1 }, draw: (pen, p, c) => {
    const on = num(p, "an");
    if (on > 0) for (let i = 0; i < 9; i++) {
      const a = Math.PI * (1.05 + (i / 8) * 0.9), r1 = 205, r2 = 245 + 15 * on;
      pen.line([[250 + Math.cos(a) * r1, 230 + Math.sin(a) * r1], [250 + Math.cos(a) * r2, 230 + Math.sin(a) * r2]], 14, c.gold);
    }
    pen.ellipse(250, 230, 160, 165, { fill: mixHex("#f2f0e6", c.glow, on), ink: c.ink, width: LW });
    pen.line([[205, 300], [230, 220], [250, 280], [270, 220], [295, 300]], 8, on > 0 ? darker(c.gold, 0.8) : "#9a9aa0");
    pen.rrect(185, 380, 130, 110, 14, { fill: c.metal, ink: c.ink, width: LW });
    for (const y of [415, 450]) pen.line([[190, y], [310, y]], 6, darker(c.metal, 0.5));
    pen.ellipse(250, 505, 40, 22, { fill: c.ink });
  } },
  /** Schallbögen (Ton geht weg): `fortschritt` 0…1 lässt die Bögen nacheinander erscheinen; Richtung rechts/links. */
  schallboegen: { design: [400, 400], anchor: [0, 200], defaults: { fortschritt: 1, richtung: "rechts" }, draw: (pen, p, c) => {
    const f = num(p, "fortschritt"), right = str(p, "richtung") !== "links";
    pen.turn(200, 200, 0, () => {
      for (let i = 0; i < 3; i++) {
        if (f * 3 < i + 0.2) continue;
        const r = 90 + i * 90, a0 = -0.6, a1 = 0.6;
        const pts: Pt[] = Array.from({ length: 9 }, (_, k): Pt => { const a = a0 + (a1 - a0) * (k / 8); return [Math.cos(a) * r, 200 + Math.sin(a) * r]; });
        pen.line(pts, 18, c.ink, true);
      }
    }, right ? 1 : -1, 1);
  } },
  /** Ruderboot (flache Karte). */
  boot: { design: [800, 360], defaults: {}, draw: (pen, _p, c) => {
    pen.poly([[30, 120], [770, 120], [650, 320], [150, 320]], { fill: c.wood, ink: c.ink, width: LW });
    pen.line([[60, 170], [740, 170]], 8, darker(c.wood, 0.7));
    pen.line([[100, 230], [700, 230]], 8, darker(c.wood, 0.7));
    pen.rrect(330, 70, 140, 40, 6, { fill: darker(c.wood, 0.8), ink: c.ink, width: LW * 0.7 });
  } },
  /** Anker. */
  anker: { design: [500, 600], defaults: {}, draw: (pen, _p, c) => {
    pen.ellipse(250, 70, 46, 46, { ink: c.ink, width: 26 });
    pen.ellipse(250, 70, 46, 46, { ink: c.metal, width: 14 });
    pen.rrect(225, 110, 50, 400, 14, { fill: c.metal, ink: c.ink, width: LW });
    pen.rrect(130, 170, 240, 40, 14, { fill: c.metal, ink: c.ink, width: LW });
    pen.line([[70, 380], [110, 500], [250, 560], [390, 500], [430, 380]], 46, c.ink, true);
    pen.line([[70, 380], [110, 500], [250, 560], [390, 500], [430, 380]], 26, c.metal, true);
    for (const x of [70, 430]) pen.poly([[x - 40, 400], [x, 330], [x + 40, 400]], { fill: c.metal, ink: c.ink, width: LW });
  } },
  /** Abreisskalender: Monat, Tag; `abriss` 0…1 klappt das oberste Blatt weg. */
  abreisskalender: { design: [500, 600], defaults: { monat: "APRIL", tag: "17", abriss: 0 }, draw: (pen, p, c) => {
    pen.rrect(30, 40, 440, 540, 20, { fill: c.paper, ink: c.ink, width: LW });
    pen.rrect(30, 40, 440, 130, 20, { fill: c.red, ink: c.ink, width: LW });
    for (const x of [130, 370]) pen.rrect(x - 14, 20, 28, 60, 10, { fill: c.metal, ink: c.ink, width: LW * 0.6 });
    pen.text(str(p, "monat"), 250, 110, { font: c.fonts.display, size: 76, color: c.paper, maxWidth: 380 });
    pen.text(str(p, "tag"), 250, 380, { font: c.fonts.display, size: 250, color: c.ink, maxWidth: 380 });
    const a = num(p, "abriss");
    if (a > 0) pen.turn(470, 175, -100 * a, () => pen.rrect(30, 175, 440, 400, 10, { fill: mixHex(c.paper, "#d8d0c0", 0.4), ink: c.ink, width: LW }));
  } },
  /** Herz: `schlag` = Schläge pro Sekunde (0 = steht still), `zeit` in s. */
  herz: { design: [500, 460], defaults: { schlag: 1.2, zeit: 0 }, draw: (pen, p, c) => {
    const b = num(p, "schlag"), t = num(p, "zeit"), k = b > 0 ? 1 + 0.1 * Math.pow(Math.max(0, Math.sin(t * b * Math.PI * 2)), 4) : 1;
    pen.turn(250, 230, 0, () => {
      pen.shape((g) => { g.beginPath(); g.moveTo(250, 420); g.bezierCurveTo(40, 280, 20, 60, 140, 50); g.bezierCurveTo(210, 44, 245, 100, 250, 130); g.bezierCurveTo(255, 100, 290, 44, 360, 50); g.bezierCurveTo(480, 60, 460, 280, 250, 420); g.closePath(); }, { fill: b > 0 ? c.heart : darker(c.heart, 0.6), ink: c.ink, width: LW });
      pen.ellipse(165, 140, 40, 24, { fill: "rgba(255,255,255,0.45)" }, -0.6);
    }, k, k);
  } },
  /** Fliege mit schlagenden Flügeln (`zeit` in s). */
  fliege: { design: [300, 240], defaults: { zeit: 0 }, draw: (pen, p, c) => {
    const flap = Math.sin(num(p, "zeit") * 40) * 0.35;
    for (const d of [-1, 1]) pen.ellipse(150 + d * 62, 80, 62, 40, { fill: "rgba(235,240,255,0.85)", ink: c.ink, width: 8 }, d * (0.5 + flap));
    pen.ellipse(150, 140, 52, 62, { fill: "#2c2c34", ink: c.ink, width: 8 });
    for (const d of [-1, 1]) pen.dot(150 + d * 22, 112, 14, "#b0303a");
  } },
  /** Parkbank (flache Karte). */
  parkbank: { design: [800, 460], defaults: {}, draw: (pen, _p, c) => {
    for (const y of [40, 110]) pen.rrect(40, y, 720, 52, 8, { fill: c.wood, ink: c.ink, width: LW });
    pen.rrect(20, 220, 760, 60, 8, { fill: c.wood, ink: c.ink, width: LW });
    for (const x of [110, 690]) { pen.rrect(x - 18, 160, 36, 70, 4, { fill: darker(c.wood, 0.7), ink: c.ink, width: LW * 0.6 }); pen.rrect(x - 18, 280, 36, 170, 4, { fill: darker(c.wood, 0.7), ink: c.ink, width: LW * 0.6 }); }
  } },
  /** Hand (offen oder greifend), Hautfarbe als Angabe. */
  hand: { design: [500, 500], defaults: { haut: "#a9cf86", greift: 0 }, draw: (pen, p, c) => {
    const skin = str(p, "haut"), g = num(p, "greift");
    pen.rrect(140, 300, 220, 200, 40, { fill: skin, ink: c.ink, width: LW });
    for (let i = 0; i < 4; i++) {
      const x = 165 + i * 57, len = 210 - Math.abs(i - 1.5) * 30 - g * 120;
      pen.rrect(x - 26, 320 - len, 52, len + 30, 26, { fill: skin, ink: c.ink, width: LW });
    }
    pen.turn(150, 380, -40 + g * 30, () => pen.rrect(30, 350, 150, 52, 26, { fill: skin, ink: c.ink, width: LW }));
    pen.rrect(146, 300, 208, 60, 20, { fill: skin });
  } },
  /** Einfaches Skelett (Karte). */
  skelett: { design: [600, 1000], defaults: {}, draw: (pen, _p, c) => {
    const bone = c.bone;
    const bl = (pts: Pt[], w: number, smooth = false) => { pen.line(pts, w + 14, c.ink, smooth); pen.line(pts, w, bone, smooth); };
    pen.ellipse(300, 160, 120, 130, { fill: bone, ink: c.ink, width: LW });
    for (const d of [-1, 1]) pen.ellipse(300 + d * 45, 150, 30, 36, { fill: c.ink });
    pen.poly([[290, 200], [310, 200], [300, 225]], { fill: c.ink });
    bl([[300, 290], [300, 640]], 26);
    for (let i = 0; i < 5; i++) bl([[200, 350 + i * 50], [300, 330 + i * 50], [400, 350 + i * 50]], 16, true);
    for (const d of [-1, 1]) {
      bl([[300 + d * 90, 330], [300 + d * 140, 480], [300 + d * 150, 610]], 16);
      bl([[300 + d * 50, 650], [300 + d * 70, 800], [300 + d * 80, 960]], 18);
    }
    pen.ellipse(300, 650, 110, 40, { fill: bone, ink: c.ink, width: LW * 0.7 });
  } },
  /** Blume im Topf oder frei. */
  blume: { design: [400, 600], defaults: { farbe: "" }, draw: (pen, p, c) => {
    const petal = str(p, "farbe") || c.petal;
    pen.line([[200, 580], [205, 420], [200, 260]], 16, c.leaf, true);
    pen.ellipse(150, 450, 60, 24, { fill: c.leaf, ink: c.ink, width: 8 }, -0.5);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; pen.ellipse(200 + Math.cos(a) * 70, 200 + Math.sin(a) * 70, 52, 42, { fill: petal, ink: c.ink, width: 10 }, a); }
    pen.dot(200, 200, 48, c.gold);
    pen.ellipse(200, 200, 48, 48, { ink: c.ink, width: 10 });
  } },
  /** Laborschild: drei Ringe + Schrift. */
  laborschild: { design: [700, 360], defaults: { text: "LAB" }, draw: (pen, p, c) => {
    pen.rrect(20, 20, 660, 320, 14, { fill: c.gold, ink: c.ink, width: LW });
    for (const [x, y] of [[150, 145], [205, 145], [178, 195]] as const) pen.ellipse(x, y, 48, 48, { ink: c.ink, width: 12 });
    pen.text(str(p, "text"), 450, 180, { font: c.fonts.display, size: 150, color: c.ink, maxWidth: 360 });
  } },
  /** Warnlicht: an/aus mit Strahlen (`an` 0…1). */
  warnlicht: { design: [400, 400], anchor: [200, 400], defaults: { an: 1, blinken: 0 }, draw: (pen, p, c) => {
    const bl = num(p, "blinken");   // Blinken in Hz (0 = dauernd an/aus nach `an`)
    const on = bl > 0 ? (Math.floor(num(p, "zeit") * bl * 2) % 2 ? 0.2 : 1) : num(p, "an");
    if (on > 0) for (let i = 0; i < 5; i++) { const a = Math.PI * (1.15 + i * 0.175); pen.line([[200 + Math.cos(a) * 150, 250 + Math.sin(a) * 150], [200 + Math.cos(a) * 200, 250 + Math.sin(a) * 200]], 14, c.red); }
    pen.shape((g) => { g.beginPath(); g.moveTo(90, 330); g.lineTo(90, 250); g.arc(200, 250, 110, Math.PI, 0); g.lineTo(310, 330); g.closePath(); }, { fill: mixHex(darker(c.red, 0.6), c.red, on), ink: c.ink, width: LW });
    pen.ellipse(160, 220, 26, 40, { fill: "rgba(255,255,255,0.5)" });
    pen.rrect(60, 330, 280, 60, 10, { fill: c.metal, ink: c.ink, width: LW });
  } },
  /** Mikroskop-Ansicht: Kreis mit roten Blutkörperchen und grünen Viren; `menge` 0…1 = Anteil Viren, `zeit` bewegt sie; `art` "bakterie" zeigt Stäbchen statt Viren. */
  mikroskop: { design: [800, 800], anchor: [400, 400], defaults: { menge: 0.3, zeit: 0, seed: 3, abwehr: 0, art: "virus" }, draw: (pen, p, c) => {
    const m = num(p, "menge"), t = num(p, "zeit"), ab = num(p, "abwehr");
    const circle = Pen.ellipse(400, 400, 370, 370);
    pen.shape(circle, { fill: c.cell });
    pen.clip(circle, () => {
      let s = Math.round(num(p, "seed")) * 7919;
      const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
      for (let i = 0; i < 14; i++) {
        const x = 100 + rnd() * 600, y = 100 + rnd() * 600, ok = rnd() > m * 0.8;
        pen.ellipse(x, y, 52, 46, { fill: ok ? c.blood : mixHex(c.blood, "#f4f0f0", 0.75), ink: darker(c.blood, 0.6), width: 6 });
        pen.ellipse(x, y, 24, 20, { fill: darker(ok ? c.blood : "#f4f0f0", 0.85) });
      }
      const nv = Math.round(m * 70);
      for (let i = 0; i < nv; i++) {
        const x = 60 + rnd() * 680 + Math.sin(t * 2 + i) * 8, y = 60 + rnd() * 680 + Math.cos(t * 1.7 + i) * 8;
        if (str(p, "art") === "bakterie") pen.turn(x, y, (i * 47) % 180, () => pen.rrect(x - 30, y - 12, 60, 24, 12, { fill: "#8fbf3a", ink: darker("#8fbf3a", 0.5), width: 5 }));   // Stäbchen-Bakterien
        else pen.poly(star(x, y, 22, 14, 7), { fill: c.virus, ink: darker(c.virus, 0.55), width: 5 });
      }
      // Abwehrzellen (weiss): kommen mit `abwehr` 0…1 dazu und werden zum Ende hin von Viren umringt
      for (let i = 0; i < Math.round(ab * 9); i++) {
        const x = 130 + rnd() * 540, y = 130 + rnd() * 540;
        pen.ellipse(x, y, 46, 42, { fill: "#f7f7f2", ink: "#8a8f9a", width: 6 });
        pen.dot(x + 8, y - 6, 12, "#c9cdd6");
        if (ab > 0.6) for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + i; pen.poly(star(x + Math.cos(a) * 52, y + Math.sin(a) * 48, 16, 10, 7), { fill: c.virus, ink: darker(c.virus, 0.55), width: 4 }); }
      }
    });
    pen.shape(circle, { ink: c.ink, width: 26 });
  } },
  /** Thermometer: `stand` 0…1, Rot steigt. */
  thermometer: { design: [260, 800], defaults: { stand: 0.5 }, draw: (pen, p, c) => {
    const f = Math.min(1, Math.max(0, num(p, "stand")));
    pen.rrect(80, 40, 100, 620, 50, { fill: "#ffffff", ink: c.ink, width: LW });
    pen.ellipse(130, 690, 85, 85, { fill: c.red, ink: c.ink, width: LW });
    const top = 640 - f * 560;
    pen.rrect(108, top, 44, 700 - top, 22, { fill: c.red });
    for (let i = 0; i < 8; i++) pen.line([[150, 120 + i * 65], [175, 120 + i * 65]], 6, c.ink);
  } },
  /** Schweisstropfen. */
  schweisstropfen: { design: [200, 300], defaults: {}, draw: (pen, _p, c) => {
    pen.shape((g) => { g.beginPath(); g.moveTo(100, 20); g.bezierCurveTo(140, 120, 180, 170, 180, 210); g.arc(100, 210, 80, 0, Math.PI); g.bezierCurveTo(20, 170, 60, 120, 100, 20); g.closePath(); }, { fill: c.water, ink: c.ink, width: 10 });
    pen.ellipse(75, 205, 18, 30, { fill: "rgba(255,255,255,0.6)" }, 0.3);
  } },
  /** Pop-/Aufprall-Stern mit optionalem Text. */
  popstern: { design: [600, 600], anchor: [300, 300], defaults: { text: "POP!", farbe: "" }, draw: (pen, p, c) => {
    const f = str(p, "farbe") || c.gold;
    pen.poly(star(300, 300, 280, 170, 11, 0.08), { fill: f, ink: c.ink, width: LW });
    pen.poly(star(300, 300, 190, 120, 11), { fill: mixHex(f, "#ffffff", 0.5) });
    if (str(p, "text")) pen.text(str(p, "text"), 300, 305, { font: c.fonts.display, size: 120, color: c.ink, maxWidth: 300 });
  } },
  /** Steinblock am Seil (Lastkran): Quader unten (unterste 200 von 2400 Einheiten), darüber das Seil. `seil` = Seillänge als
   *  Anteil der Kartenhöhe – so wählen, dass das Seil oben genau an der Rolle des Krans endet (gleitet mit der Lage). */
  steinblock: { design: [400, 2400], anchor: [200, 2400], defaults: { farbe: "", seil: 0.5 }, draw: (pen, p, c) => {
    const f = str(p, "farbe") || "#d9d2c3", top = 2200 - 80 - Math.max(0, Math.min(1, num(p, "seil"))) * 2400;
    pen.line([[200, Math.max(0, top)], [200, 2120]], 10, "#d8cfb4");
    pen.line([[200, 2120], [110, 2200]], 9, "#d8cfb4"); pen.line([[200, 2120], [290, 2200]], 9, "#d8cfb4");
    pen.rrect(60, 2200, 280, 196, 10, { fill: f, ink: c.ink, width: LW });
    pen.line([[60, 2290], [340, 2290]], 6, darker(f, 0.75));
    pen.line([[180, 2200], [180, 2290]], 6, darker(f, 0.75)); pen.line([[250, 2290], [250, 2392]], 6, darker(f, 0.75));
    pen.ellipse(200, 2120, 16, 16, { fill: c.metal, ink: c.ink, width: 6 });
  } },
  /** Lohnbeutel mit Münzen (Hwaseong: Arbeiter bekamen Lohn). */
  lohnbeutel: { design: [500, 520], defaults: {}, draw: (pen, _p, c) => {
    pen.poly([[150, 170], [110, 260], [80, 380], [120, 470], [380, 470], [420, 380], [390, 260], [350, 170]], { fill: "#c9a66b", ink: c.ink, width: LW }, true);
    pen.poly([[160, 120], [340, 120], [350, 175], [150, 175]], { fill: "#b08c55", ink: c.ink, width: LW * 0.8 });
    pen.line([[150, 172], [350, 172]], 10, c.red);
    for (const [x, y] of [[300, 440], [360, 470], [250, 480]] as const) {
      pen.ellipse(x, y, 52, 22, { fill: c.gold, ink: c.ink, width: 8 });
      pen.rrect(x - 12, y - 8, 24, 16, 2, { fill: darker(c.gold, 0.6) });   // Münze mit eckigem Loch
    }
  } },
  /** Baubuch (Bericht der Bauarbeiten): aufgeschlagenes Buch mit Zeichnung eines Krans und Schriftzeilen. */
  buch: { design: [800, 560], defaults: {}, draw: (pen, _p, c) => {
    const ink2 = c.ink2;
    pen.poly([[40, 120], [400, 150], [760, 120], [760, 520], [400, 545], [40, 520]], { fill: "#7a4a2a", ink: c.ink, width: LW });
    pen.poly([[60, 100], [395, 130], [395, 520], [60, 495]], { fill: c.paper, ink: c.ink, width: LW * 0.7 });
    pen.poly([[405, 130], [740, 100], [740, 495], [405, 520]], { fill: c.paper, ink: c.ink, width: LW * 0.7 });
    // links: Zeichnung des Krans
    pen.line([[120, 450], [210, 210], [300, 450]], 8, ink2); pen.line([[150, 450], [230, 230], [330, 450]], 6, ink2);
    pen.line([[180, 215], [270, 215]], 8, ink2);
    pen.line([[225, 220], [225, 360]], 4, ink2); pen.rrect(195, 360, 60, 42, 4, { ink: ink2, width: 6 });
    pen.ellipse(170, 430, 34, 34, { ink: ink2, width: 5 }); pen.ellipse(280, 430, 34, 34, { ink: ink2, width: 5 });
    // rechts: senkrechte Schriftzeilen (wie Pinselschrift, nur Striche)
    for (let k = 0; k < 7; k++) for (let j = 0; j < 6; j++) {
      const x = 700 - k * 42, y = 160 + j * 52;
      pen.line([[x - 10, y], [x + 10, y + 4]], 5, ink2); pen.line([[x, y - 8], [x - 2, y + 26]], 5, ink2);
    }
  } },
  /** Funkeln: vierzackiger Stern, der pulsierend aufblitzt (`zeit` in s, `tempo` in Hz), mit kleinem Nebenstern. */
  funkeln: { design: [400, 400], anchor: [200, 200], defaults: { zeit: 0, tempo: 1.4, farbe: "" }, draw: (pen, p, c) => {
    const f = str(p, "farbe") || c.gold, t = num(p, "zeit") * num(p, "tempo") * Math.PI * 2;
    const k = 0.35 + 0.65 * Math.pow(Math.abs(Math.sin(t)), 3), k2 = 0.3 + 0.7 * Math.pow(Math.abs(Math.sin(t + 1.6)), 3);
    pen.poly(star(170, 210, 160 * k, 34 * k, 4), { fill: mixHex(f, "#ffffff", 0.35), ink: c.ink, width: 8 });
    pen.poly(star(170, 210, 80 * k, 18 * k, 4), { fill: "#ffffff" });
    pen.poly(star(320, 90, 70 * k2, 16 * k2, 4), { fill: mixHex(f, "#ffffff", 0.55), ink: c.ink, width: 6 });
  } },
  /** Heringsfass (Hanse): Holzfass mit Eisenreifen und eingebranntem Kaufmannszeichen (`marke` true/false); `offen` 0…1 klappt
   *  den Deckel zur Seite, dann steigen drei Heringe ganz aus dem Fass. Oben 120 Einheiten Platz für die Fische. Anker unten Mitte. */
  heringsfass: { design: [520, 760], defaults: { offen: 0, marke: true }, draw: (pen, p, c) => {
    const o = Math.max(0, Math.min(1, num(p, "offen"))), wood = c.wood, dark = darker(wood, 0.7), Y = 120, rim = 150 + Y;
    const body = Pen.poly([[110, rim], [80, 390 + Y], [110, 630 + Y], [410, 630 + Y], [440, 390 + Y], [410, rim]], true);
    pen.shape(body, { fill: wood, ink: c.ink, width: LW });
    for (const x of [175, 260, 345]) pen.line([[x, rim + 10], [x + (x - 260) * 0.12, 390 + Y], [x, 622 + Y]], 5, dark, true);
    for (const y of [205, 575]) pen.line([[96, y + Y], [424, y + Y]], 18, c.metal);
    if (p.marke !== false) {   // Kaufmannszeichen: Schaft mit Querbalken und Wimpel (wie eine Hausmarke), eingebrannt
      const m = "#2a1a12";
      pen.line([[260, 300 + Y], [260, 500 + Y]], 14, m); pen.line([[215, 350 + Y], [305, 350 + Y]], 14, m);
      pen.line([[260, 300 + Y], [310, 330 + Y], [260, 360 + Y]], 12, m); pen.line([[220, 500 + Y], [260, 455 + Y], [300, 500 + Y]], 12, m);
    }
    pen.ellipse(260, rim, 150, 30, { fill: darker(wood, 0.55), ink: c.ink, width: LW * 0.8 });   // offene Öffnung (dunkles Inneres)
    if (o > 0.05) pen.clip(Pen.rrect(0, 0, 520, rim + 4, 0), () => { for (const [x, r, k] of [[205, -14, 0.9], [262, 3, 1.0], [318, 16, 0.85]] as const) {   // Heringe steigen aus der Öffnung
      const up = 150 * o * k, by = rim + 10 - up;
      pen.turn(x, by, r, () => {
        pen.poly([[x - 26, by], [x - 30, by - 70], [x, by - 118], [x + 30, by - 70], [x + 26, by]], { fill: "#b9c6cf", ink: c.ink, width: 8 }, true);
        pen.poly([[x - 22, by + 4], [x, by - 22], [x + 22, by + 4], [x + 30, by + 30], [x - 30, by + 30]], { fill: "#9fb0bb", ink: c.ink, width: 7 });   // Schwanzflosse
        pen.dot(x - 6, by - 90, 7, c.ink);
      });
    } });
    pen.turn(110, rim, -100 * o, () => { pen.ellipse(260, rim, 160, 34, { fill: darker(wood, 0.88), ink: c.ink, width: LW }); });
  } },
  /** Kontobuch (Handelsbuch der Hanse): aufgeschlagen, links Zeilen mit Namen und Strichen, rechts Summen in römischen Zahlen.
   *  `fortschritt` 0…1 schreibt Zeile um Zeile; die letzte Zeile wird rot unterstrichen. */
  kontobuch: { design: [800, 560], defaults: { fortschritt: 1 }, draw: (pen, p, c) => {
    const f = Math.max(0, Math.min(1, num(p, "fortschritt"))), ink2 = c.ink2, N = 6;
    pen.poly([[40, 120], [400, 150], [760, 120], [760, 520], [400, 545], [40, 520]], { fill: "#6a3a22", ink: c.ink, width: LW });
    pen.poly([[60, 100], [395, 130], [395, 520], [60, 495]], { fill: c.paper, ink: c.ink, width: LW * 0.7 });
    pen.poly([[405, 130], [740, 100], [740, 495], [405, 520]], { fill: c.paper, ink: c.ink, width: LW * 0.7 });
    pen.line([[620, 112], [620, 505]], 3, mixHex(c.paper, c.ink, 0.3));
    const sums = ["xij", "vij", "xx", "iiij", "xv", "lx"];
    for (let k = 0; k < N; k++) {
      const vis = Math.max(0, Math.min(1, f * N - k)); if (vis <= 0) continue;
      const yl = 170 + k * 54, yr = 160 + k * 54;
      // links: „Name“ als Wellenlinie, dann Striche (Menge)
      pen.line(Array.from({ length: 6 }, (_, i): Pt => [90 + i * 30 * vis, yl + 6 * Math.sin(i * 1.7 + k)]), 5, ink2, true);
      for (let s = 0; s < 3 + (k % 3); s++) if (vis > 0.6) pen.line([[270 + s * 16, yl - 14], [266 + s * 16, yl + 12]], 5, ink2);
      // rechts: Ware als Wellenlinie, Summe in römischen Zahlen
      pen.line(Array.from({ length: 5 }, (_, i): Pt => [430 + i * 34 * vis, yr + 6 * Math.sin(i * 1.3 + k * 2)]), 5, ink2, true);
      if (vis > 0.8) pen.text(sums[k], 680, yr + 4, { font: c.fonts.script, size: 46, color: ink2, maxWidth: 110 });
    }
    if (f >= 0.98) pen.line([[640, 158 + N * 54 - 18], [725, 152 + N * 54 - 20]], 7, c.red);
  } },
  /** Erdhügel (Belagerungsrampe aus gestampfter Erde): Lagen in verschiedenen Brauntönen, Holzgerüst mit Leiter, Körbe,
   *  Steine und Grasbüschel am Fuss. `hoehe` 0…1 lässt ihn wachsen, `einsturz` 0…1 sackt er zusammen (Risse, flacher und
   *  breiter, Erdbrocken fliegen). Anker unten Mitte; volle Höhe = ganze Karte. */
  erdhuegel: { design: [1400, 900], anchor: [700, 900], defaults: { hoehe: 1, einsturz: 0 }, draw: (pen, p, c) => {
    const h = Math.max(0, Math.min(1, num(p, "hoehe"))), e = Math.max(0, Math.min(1, num(p, "einsturz")));
    if (h <= 0.01) return;
    const H = 760 * h * (1 - 0.5 * e), top = 880 - H, half = (360 + 140 * h) * (1 + 0.3 * e);
    const earth = "#c08a52", light = "#d9a868", dark = "#94643a", deep = "#7a5230";
    // Umriss: breiter Fuss, abgeflachte Krone (Rampe), leicht schief zur Mauer hin
    const crownL = 700 - half * 0.28, crownR = 700 + half * 0.22;
    const hill: Pt[] = [[700 - half - 90, 892], [700 - half * 0.75, 880 - H * 0.42], [700 - half * 0.5, 880 - H * 0.82], [crownL, top + 6],
      [crownR, top], [700 + half * 0.48, 880 - H * 0.78], [700 + half * 0.78, 880 - H * 0.38], [700 + half + 90, 892]];
    pen.poly(hill, { fill: earth, ink: c.ink, width: LW }, true);
    pen.clip(Pen.poly(hill, true), () => {
      // Licht links, Schatten rechts
      pen.poly([[700 - half - 100, 900], [700 - half * 0.5, 880 - H * 0.82], [crownL, top], [700 - half * 0.15, 900]], { fill: light });
      pen.poly([[700 + half * 0.3, 900], [crownR, top], [700 + half + 100, 900]], { fill: dark });
      // gestampfte Lagen (wellige Bänder)
      for (let k = 1; k < 7; k++) {
        const y = 880 - H * (k / 7), w = half * 1.2;
        pen.line(Array.from({ length: 9 }, (_, i): Pt => [700 - w + (i * 2 * w) / 8, y + 7 * Math.sin(i * 1.3 + k)]), 9, k % 2 ? deep : "#b07a46", true);
      }
      // Steine in der Erde
      for (let i = 0; i < 16; i++) {
        const x = 700 + Math.sin(i * 7.3) * half * 0.9, y = 880 - H * ((i * 0.37) % 0.9) - 20;
        pen.ellipse(x, y, 16 + (i % 3) * 6, 11 + (i % 2) * 4, { fill: i % 2 ? "#a8a29a" : "#8f8a84", ink: c.ink, width: 4 });
      }
    });
    // Holzgerüst mit Leiter an der linken Flanke
    const wood = c.wood, wd = darker(wood, 0.8), gs = 1 - e * 0.85;
    if (gs > 0.2) {
      const gx = 700 - half * 0.55, gy = 880 - H * 0.55 * gs;
      for (const dx of [-60, 60]) pen.line([[gx + dx, 885], [gx + dx * 0.8, gy]], 16, wd);
      for (let k = 0; k < 4; k++) { const y = 885 - (885 - gy) * ((k + 0.5) / 4); pen.line([[gx - 66, y], [gx + 66, y]], 10, wood); }
      const lx = 700 + half * 0.15;   // Leiter zur Krone
      pen.line([[lx - 30, 880 - H * 0.2], [lx - 18, top + 30]], 10, wd); pen.line([[lx + 30, 880 - H * 0.2], [lx + 42, top + 30]], 10, wd);
      for (let k = 1; k < 6; k++) { const u = k / 6, y = 880 - H * 0.2 - (880 - H * 0.2 - top - 30) * u; pen.line([[lx - 30 + 12 * u, y], [lx + 30 + 12 * u, y]], 7, wood); }
    }
    // Körbe mit Erde
    for (const [x, k] of [[-0.66, 0.06], [0.58, 0.1], [-0.2, 0.92]] as const) {
      if (k > 0.5 && e > 0.3) continue;
      const bx = 700 + half * x, by = 880 - H * k;
      pen.poly([[bx - 44, by - 54], [bx + 44, by - 54], [bx + 30, by], [bx - 30, by]], { fill: "#d6b56f", ink: c.ink, width: 7 });
      for (const yy of [-38, -20]) pen.line([[bx - 38, by + yy], [bx + 38, by + yy]], 4, darker("#d6b56f", 0.7));
      pen.ellipse(bx, by - 56, 40, 16, { fill: dark, ink: c.ink, width: 5 });
    }
    // Grasbüschel am Fuss
    for (let i = 0; i < 9; i++) {
      const x = 700 - half - 60 + (i * (2 * half + 120)) / 8, y = 892;
      for (const a of [-0.5, 0, 0.5]) pen.line([[x, y], [x + a * 30, y - 40 - (i % 3) * 10]], 8, i % 2 ? "#5d9a3a" : "#7bb84a");
    }
    if (e > 0.02) {   // Risse und fliegende Brocken
      pen.line([[700 - half * 0.1, top + 20], [700 - half * 0.04, top + 140 * e + 40], [700 + half * 0.08, top + 260 * e + 60]], 10, c.ink);
      pen.line([[700 + half * 0.26, top + 60], [700 + half * 0.32, top + 200 * e + 80]], 9, c.ink);
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * (0.12 + i * 0.085), r = 120 + e * 340 * (0.6 + 0.07 * i), s = 24 + (i % 3) * 10;
        pen.ellipse(700 + Math.cos(a) * r * 1.4, Math.min(870, top + 60 + Math.sin(a) * r * 0.55 + e * e * 280), s, s * 0.8, { fill: i % 2 ? earth : deep, ink: c.ink, width: 6 }, i);
      }
    }
  } },
  /** Reiter im Galopp (Seitenansicht, Blick nach rechts; `richtung` "links" spiegelt): Pferd (`farbe`) mit Mähne, Schweif,
   *  Sattel­decke und Zaumzeug, Beine mit Gelenken und Hufen laufen mit `zeit` (`tempo` Sprünge/s); Reiter mit Mantel
   *  (`mantel`), Helm (`helm`) mit Busch und Lanze mit Wimpel. Alles liegt mit Rand in der Karte. Anker unten Mitte. */
  reiter: { design: [1000, 900], anchor: [500, 900], defaults: { zeit: 0, tempo: 2.2, farbe: "#8a5a34", mantel: "#3f6fb5", helm: "#5a5a64", richtung: "rechts" }, draw: (pen, p, c) => {
    const t = num(p, "zeit") * num(p, "tempo") * Math.PI * 2, horse = str(p, "farbe"), coat = str(p, "mantel"), helm = str(p, "helm");
    const dir = str(p, "richtung") === "links" ? -1 : 1, hdark = darker(horse, 0.72), mane = darker(horse, 0.42), hoof = "#2c2420", skin = "#f0c9a0";
    const bob = Math.sin(t * 2) * 12, tilt = Math.sin(t) * 2.5;
    pen.turn(500, 450, 0, () => pen.turn(500, 560, tilt, () => {
      const Y = bob;
      // Bein: Schulter/Hüfte → Knie → Fessel → Huf; Schwung mit Phase
      const leg = (hx: number, hy: number, ph: number, front: boolean, col: string) => {
        const s = Math.sin(t + ph), up = Math.max(0, Math.sin(t + ph + 1.3));
        const a1 = (front ? 0.15 : -0.1) + s * 0.55, a2 = a1 + (front ? -1 : 1) * (0.25 + up * 0.9);
        const kx = hx + Math.sin(a1) * 150, ky = hy + Y + Math.cos(a1) * 150;
        const fx = kx + Math.sin(a2) * 140, fy = ky + Math.cos(a2) * 140;
        pen.line([[hx, hy + Y], [kx, ky], [fx, fy]], 46, c.ink);
        pen.line([[hx, hy + Y], [kx, ky], [fx, fy]], 30, col);
        pen.ellipse(fx + (front ? 8 : -4), fy + 10, 22, 14, { fill: hoof, ink: c.ink, width: 6 });
      };
      leg(640, 560, 0.5, true, hdark); leg(340, 560, Math.PI + 0.5, false, hdark);   // hintere (ferne) Beine dunkler
      // Schweif
      pen.shape((g) => { g.beginPath(); g.moveTo(250, 450 + Y); g.bezierCurveTo(170, 470 + Y, 150 + Math.sin(t) * 20, 560 + Y, 120 + Math.sin(t) * 30, 660 + Y);
        g.bezierCurveTo(190, 600 + Y, 230, 540 + Y, 270, 490 + Y); g.closePath(); }, { fill: mane, ink: c.ink, width: 10 });
      // Rumpf: Hinterteil, Bauch, Brust
      pen.shape((g) => { g.beginPath(); g.moveTo(255, 470 + Y); g.bezierCurveTo(250, 380 + Y, 330, 360 + Y, 430, 375 + Y); g.lineTo(600, 372 + Y);
        g.bezierCurveTo(700, 360 + Y, 760, 430 + Y, 735, 520 + Y); g.bezierCurveTo(720, 590 + Y, 640, 600 + Y, 560, 590 + Y); g.lineTo(380, 592 + Y);
        g.bezierCurveTo(300, 600 + Y, 255, 560 + Y, 255, 470 + Y); g.closePath(); }, { fill: horse, ink: c.ink, width: LW });
      pen.ellipse(330, 440 + Y, 50, 26, { fill: "rgba(255,255,255,0.18)" }, -0.3);
      // Hals und Kopf
      pen.shape((g) => { g.beginPath(); g.moveTo(640, 395 + Y); g.bezierCurveTo(660, 300 + Y, 700, 220 + Y, 770, 190 + Y); g.lineTo(820, 215 + Y);
        g.bezierCurveTo(790, 280 + Y, 760, 360 + Y, 735, 470 + Y); g.closePath(); }, { fill: horse, ink: c.ink, width: LW });
      pen.shape((g) => { g.beginPath(); g.moveTo(760, 180 + Y); g.bezierCurveTo(800, 160 + Y, 840, 175 + Y, 905, 255 + Y); g.bezierCurveTo(918, 280 + Y, 900, 300 + Y, 878, 296 + Y);
        g.bezierCurveTo(840, 290 + Y, 800, 260 + Y, 770, 240 + Y); g.closePath(); }, { fill: horse, ink: c.ink, width: LW });
      pen.poly([[772, 182 + Y], [786, 130 + Y], [806, 178 + Y]], { fill: horse, ink: c.ink, width: 8 });   // Ohr
      pen.dot(812, 212 + Y, 9, c.ink); pen.dot(888, 274 + Y, 5, c.ink);                                      // Auge, Nüster
      for (let k = 0; k < 6; k++) pen.line([[700 + k * 14, 205 + k * 30 + Y], [668 + k * 12, 240 + k * 30 + Y]], 18, mane);   // Mähne
      pen.line([[800, 250 + Y], [880, 285 + Y]], 6, c.red); pen.line([[805, 252 + Y], [620, 330 + Y]], 5, "#3a2a20");    // Zaumzeug, Zügel
      // vordere (nahe) Beine
      leg(600, 560, 0, true, horse); leg(370, 560, Math.PI, false, horse);
      // Satteldecke und Sattel
      pen.poly([[400, 380 + Y], [560, 378 + Y], [570, 500 + Y], [395, 505 + Y]], { fill: c.red, ink: c.ink, width: 9 });
      pen.line([[400, 492 + Y], [568, 488 + Y]], 8, c.gold);
      pen.rrect(415, 350 + Y, 140, 40, 14, { fill: "#6b3f22", ink: c.ink, width: 8 });
      // Reiter: Bein, Körper, Arm, Kopf, Helm
      pen.line([[470, 360 + Y], [540, 440 + Y], [520, 520 + Y]], 34, c.ink); pen.line([[470, 360 + Y], [540, 440 + Y], [520, 520 + Y]], 20, darker(coat, 0.7));
      pen.ellipse(530, 528 + Y, 26, 14, { fill: hoof, ink: c.ink, width: 5 });
      pen.shape((g) => { g.beginPath(); g.moveTo(420, 370 + Y); g.bezierCurveTo(415, 290 + Y, 430, 210 + Y, 475, 195 + Y); g.bezierCurveTo(525, 195 + Y, 540, 290 + Y, 545, 370 + Y); g.closePath(); },
        { fill: coat, ink: c.ink, width: LW });
      pen.line([[430, 330 + Y], [545, 325 + Y]], 12, c.gold);                                                 // Gürtel
      pen.line([[520, 240 + Y], [590, 300 + Y], [640, 318 + Y]], 26, c.ink); pen.line([[520, 240 + Y], [590, 300 + Y], [640, 318 + Y]], 14, coat);   // Arm zum Zügel
      pen.dot(645, 320 + Y, 13, skin);
      pen.ellipse(480, 150 + Y, 54, 56, { fill: skin, ink: c.ink, width: LW });
      pen.dot(508, 148 + Y, 7, c.ink); pen.line([[500, 178 + Y], [518, 176 + Y]], 4, c.ink);
      pen.shape((g) => { g.beginPath(); g.arc(480, 140 + Y, 60, Math.PI, 0); g.lineTo(546, 150 + Y); g.lineTo(414, 150 + Y); g.closePath(); }, { fill: helm, ink: c.ink, width: LW });
      pen.line([[414, 148 + Y], [546, 148 + Y]], 10, c.red);
      pen.line([[480, 82 + Y], [480, 58 + Y]], 8, c.ink); pen.ellipse(470, 48 + Y, 26, 14, { fill: c.red, ink: c.ink, width: 5 }, -0.4);   // Helmbusch
      // Lanze mit Wimpel (schräg nach vorn, innerhalb der Karte)
      pen.line([[420, 300 + Y], [880, 90 + Y]], 10, c.wood);
      pen.poly([[880, 90 + Y], [925, 66 + Y], [895, 106 + Y]], { fill: c.metal, ink: c.ink, width: 5 });
      pen.poly([[835, 112 + Y], [800, 80 + Y + Math.sin(t * 2) * 8], [860, 92 + Y]], { fill: c.red, ink: c.ink, width: 4 });
    }), dir, 1);
  } },
  /** Kanone auf Holzlafette: `schuss` 0…1 – Mündungsblitz (bis 0,35), dann wächst die Rauchwolke; `richtung` "links"/"rechts". Anker unten Mitte. */
  kanone: { design: [1000, 600], anchor: [500, 600], defaults: { schuss: 0, richtung: "rechts" }, draw: (pen, p, c) => {
    const s = Math.max(0, Math.min(1, num(p, "schuss"))), dir = str(p, "richtung") === "links" ? -1 : 1, recoil = s > 0 && s < 0.4 ? -30 * Math.sin((s / 0.4) * Math.PI) : 0;
    pen.turn(500, 300, 0, () => {
      if (s > 0.15) for (let i = 0; i < 6; i++) {   // Rauch
        const k = Math.min(1, (s - 0.15) / 0.85), r = (40 + i * 14) * (0.4 + k), x = 790 + i * 30 * k + (i % 2) * 20, y = 300 - i * 18 * k - (i % 3) * 20;
        pen.ellipse(x, y, r, r * 0.85, { fill: mixHex("#f2f0ea", "#b8b4ac", i / 8), ink: c.ink, width: 6 });
      }
      if (s > 0 && s < 0.35) pen.poly(star(770, 300, 150 * (1 - s / 0.35 * 0.5), 70, 9, 0.1), { fill: c.gold, ink: c.ink, width: 10 });
      pen.shift(recoil, 0, () => {
        pen.poly([[230, 230], [720, 270], [740, 260], [760, 270], [760, 335], [740, 345], [720, 335], [230, 370]], { fill: "#b8862f", ink: c.ink, width: LW });   // Rohr (Bronze)
        for (const x of [330, 480, 620]) pen.line([[x, 232 + (x - 230) * 0.08], [x, 368 - (x - 230) * 0.07]], 12, darker("#b8862f", 0.7));
        pen.ellipse(220, 300, 40, 70, { fill: darker("#b8862f", 0.8), ink: c.ink, width: 10 });
        pen.ellipse(762, 302, 12, 34, { fill: c.ink });
      });
      pen.poly([[180, 380], [620, 360], [640, 470], [160, 470]], { fill: c.wood, ink: c.ink, width: LW });   // Lafette
      for (const x of [260, 540]) { pen.ellipse(x, 500, 92, 92, { fill: darker(c.wood, 0.85), ink: c.ink, width: LW }); for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI; pen.line([[x + Math.cos(a) * 80, 500 + Math.sin(a) * 80], [x - Math.cos(a) * 80, 500 - Math.sin(a) * 80]], 9, c.ink); } pen.dot(x, 500, 18, c.metal); }
    }, dir, 1);
  } },
  /** Miasma (Pest-Glaube „schlechte Luft“): grün-gelbe, wirbelnde Gestankwolke mit Spiralen und Gestanklinien.
   *  `staerke` 0…1 (Grösse/Dichte, 0 = verschwunden), `zeit` läuft von selbst (Wabern). Anker unten Mitte. */
  miasma: { design: [900, 640], defaults: { staerke: 1, zeit: 0 }, draw: (pen, p, c) => {
    const k = Math.max(0, Math.min(1, num(p, "staerke"))), t = num(p, "zeit");
    if (k < 0.02) return;
    const blobs: [number, number, number][] = [[260, 400, 150], [450, 330, 190], [650, 400, 150], [360, 470, 130], [560, 480, 140], [450, 200, 120]];
    const cols = ["#9ccc3c", "#b9d94a", "#7fb83a", "#c9e05a", "#8fc43f", "#a9d24a"];
    pen.turn(450, 400, 0, () => {
      blobs.forEach(([x, y, r], i) => {
        const w = 1 + 0.06 * Math.sin(t * 2.2 + i * 1.3);
        pen.ellipse(x + 10 * Math.sin(t * 1.4 + i), y + 8 * Math.cos(t * 1.1 + i), r * w, r * 0.82 * w, { fill: cols[i], ink: c.ink, width: LW, alpha: 0.92 });
      });
      for (const [x, y, r, ph] of [[330, 380, 70, 0], [520, 300, 80, 1.5], [600, 430, 60, 3]] as const) {   // Wirbel
        const pts: Pt[] = Array.from({ length: 24 }, (_, i) => { const a = i * 0.45 + t * 2 + ph, rr = r * (i / 24); return [x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8]; });
        pen.line(pts, 9, "#4f7a1f", true);
      }
      for (let i = 0; i < 4; i++) {   // Gestanklinien steigen auf
        const x = 260 + i * 130, u = ((t * 0.6 + i * 0.27) % 1);
        pen.line(Array.from({ length: 6 }, (_, j): Pt => [x + 18 * Math.sin(j * 1.6 + t * 3 + i), 150 - u * 90 - j * 22]), 8, "#5e8f22", true);
      }
      for (const [x, y] of [[400, 360], [520, 380]] as const) {   // böse Äuglein
        pen.ellipse(x, y, 26, 18, { fill: "#f4f7d8", ink: c.ink, width: 6 }); pen.dot(x + 4, y + 2, 9, c.ink);
      }
      pen.line([[380, 330], [420, 342]], 8, c.ink); pen.line([[540, 350], [500, 362]], 8, c.ink);
    }, k, k);
  } },
  /** Schnabelmaske im Schnitt (Erklär-Karte): Lederhaube mit Glasauge und langem Schnabel nach rechts; ein Fenster im Schnabel
   *  zeigt die Füllung. `fuellung` 0…1 füllt Kräuter (grün), Nelken (braun) und Rosenblätter (rosa) nacheinander ein;
   *  `leer` 0…1 lässt sie wieder herausfallen; `hintergrund` (Farbe) legt eine Tafel hinter die Zeichnung. Anker unten Mitte. */
  schnabelmaske: { design: [1000, 620], defaults: { fuellung: 0, leer: 0, hintergrund: "" }, draw: (pen, p, c) => {
    const f = Math.max(0, Math.min(1, num(p, "fuellung"))), e = Math.max(0, Math.min(1, num(p, "leer")));
    if (str(p, "hintergrund")) {   // Tafel hinter der Zeichnung (ganze Karte), heller Rand
      pen.rrect(8, 8, 984, 604, 40, { fill: str(p, "hintergrund"), ink: c.ink, width: LW });
      pen.rrect(30, 30, 940, 560, 28, { ink: "rgba(255,255,255,0.55)", width: 6 });
    }
    const k = str(p, "hintergrund") ? 0.8 : 1;   // auf der Tafel etwas kleiner, damit Hut und Haube innen bleiben
    pen.turn(520, 330, 0, () => {
      const leder = "#e9dcc0", dunkel = darker(leder, 0.75);
      pen.ellipse(250, 330, 210, 230, { fill: "#2a2430", ink: c.ink, width: LW });   // Haube (dunkel)
      pen.poly([[120, 470], [380, 470], [420, 600], [80, 600]], { fill: "#2a2430", ink: c.ink, width: LW });
      const beak = Pen.poly([[300, 230], [520, 250], [760, 330], [960, 470], [930, 500], [740, 470], [520, 450], [300, 440]], true);
      pen.shape(beak, { fill: leder }); pen.shadeSide(beak, dunkel, 0, -30, 0.9); pen.shape(beak, { ink: c.ink, width: LW });
      const fenster = Pen.poly([[420, 290], [700, 330], [860, 430], [700, 430], [420, 410]], true);
      pen.shape(fenster, { fill: "#5a3a26", ink: c.ink, width: 8 });   // Schnitt: Inneres
      const items: [number, number, string, "blatt" | "nelke" | "bluete"][] = [
        [470, 380, "#5fae3a", "blatt"], [540, 360, "#7cc24a", "blatt"], [620, 395, "#5fae3a", "blatt"], [700, 405, "#7cc24a", "blatt"],
        [500, 340, "#7a4a2a", "nelke"], [580, 400, "#7a4a2a", "nelke"], [660, 370, "#7a4a2a", "nelke"], [760, 415, "#7a4a2a", "nelke"],
        [450, 400, "#f08fb0", "bluete"], [610, 350, "#f5a6c0", "bluete"], [690, 380, "#f08fb0", "bluete"], [800, 425, "#f5a6c0", "bluete"]];
      pen.clip(fenster, () => items.forEach(([x, y, col, art], i) => {
        const vis = Math.max(0, Math.min(1, f * items.length - (i % 4) * 3 - Math.floor(i / 4)));
        if (vis <= 0) return;
        const drop = e * (180 + (i % 5) * 40), yy = y - (1 - vis) * 60 + drop;
        if (art === "blatt") pen.ellipse(x, yy, 30, 14, { fill: col, ink: c.ink, width: 4 }, -0.4 + i * 0.3);
        else if (art === "nelke") { pen.line([[x - 18, yy + 10], [x + 14, yy - 6]], 8, col); pen.ellipse(x + 18, yy - 8, 12, 12, { fill: darker(col, 0.8), ink: c.ink, width: 3 }); }
        else for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; pen.ellipse(x + Math.cos(a) * 12, yy + Math.sin(a) * 12, 12, 9, { fill: col, ink: c.ink, width: 3 }, a); }
      }));
      pen.shape(fenster, { ink: c.ink, width: 8 });
      for (const x of [350, 600, 840]) pen.line([[x, 255 + (x - 300) * 0.18], [x + 10, 445 + (x - 300) * 0.05]], 5, dunkel);   // Nähte
      pen.ellipse(230, 300, 92, 92, { fill: "#c99a3a", ink: c.ink, width: LW * 0.8 });   // Glasauge
      pen.ellipse(230, 300, 70, 70, { fill: "#bfe6f2", ink: c.ink, width: 6 });
      pen.ellipse(205, 275, 24, 15, { fill: "rgba(255,255,255,0.9)" }, -0.6);
      pen.ellipse(250, 120, 300, 46, { fill: "#2a2430", ink: c.ink, width: LW });   // Krempe
      pen.poly([[140, 120], [160, 20], [340, 20], [360, 120]], { fill: "#2a2430", ink: c.ink, width: LW });
      pen.rrect(150, 80, 200, 26, 6, { fill: "#8c3b4a", ink: c.ink, width: 6 });
    }, k, k);
  } },
  /** Ratte (grau, Profil nach rechts oder links) mit Flöhen, die um sie herum hüpfen. `floehe` 0…1 (Anzahl), `zeit` läuft von
   *  selbst (Sprünge), `richtung` "rechts"/"links". Anker unten Mitte. */
  ratte: { design: [800, 520], defaults: { floehe: 1, zeit: 0, richtung: "rechts" }, draw: (pen, p, c) => {
    const n = Math.round(Math.max(0, Math.min(1, num(p, "floehe"))) * 7), t = num(p, "zeit"), dir = str(p, "richtung") === "links" ? -1 : 1;
    pen.turn(400, 260, 0, () => {
      pen.line([[200, 420], [120, 440], [60, 400], [40, 330]], 14, "#e7a3a6", true);   // Schwanz
      pen.ellipse(360, 370, 190, 120, { fill: "#8f949e", ink: c.ink, width: LW });   // Körper
      pen.ellipse(330, 410, 140, 60, { fill: "#a9aeb7" });
      pen.ellipse(560, 340, 110, 80, { fill: "#8f949e", ink: c.ink, width: LW }, 0.2);   // Kopf
      pen.poly([[630, 320], [700, 350], [640, 380]], { fill: "#8f949e", ink: c.ink, width: 10 });   // Schnauze
      pen.dot(700, 352, 14, "#e07a86");
      pen.ellipse(520, 270, 46, 52, { fill: "#d98f98", ink: c.ink, width: 10 });   // Ohr
      pen.dot(590, 325, 13, c.ink); pen.dot(594, 320, 4, "#ffffff");
      for (const k of [-1, 1]) pen.line([[690, 355], [760, 340 + k * 22]], 4, c.ink);   // Schnurrhaare
      for (const x of [260, 330, 450, 520]) pen.line([[x, 470], [x + 6, 505]], 12, "#e7a3a6");   // Pfoten
    }, dir, 1);
    for (let i = 0; i < n; i++) {   // Flöhe: kleine dunkle Körper mit Beinen, springen in Bögen
      const ph = (t * 1.8 + i * 0.37) % 1, hop = Math.sin(ph * Math.PI);
      const x = 400 + dir * (-200 + ((i * 97) % 420)) , y = 300 - hop * 170 - (i % 3) * 30;
      pen.ellipse(x, y, 13, 10, { fill: "#4a2a1a", ink: c.ink, width: 3 });
      pen.line([[x - 8, y + 6], [x - 16, y + 18]], 3, c.ink); pen.line([[x + 8, y + 6], [x + 16, y + 18]], 3, c.ink);
    }
  } },
  // ---------------- Kapitel-Karten (Langformat, 2026-11-14) ----------------
  /** Titelkarte eines Kapitels: Papier mit farbigem Band, oben klein `nummer` (z. B. "CHAPTER 2"), gross `titel`, unten
   *  `frage` (kleine neue Frage des Kapitels, optional). `farbe` = Band. Anker Mitte. */
  titelkarte: { design: [1400, 560], anchor: [700, 280], defaults: { nummer: "CHAPTER 1", titel: "THE BEGINNING", frage: "", farbe: "" }, draw: (pen, p, c) => {
    const f = str(p, "farbe") || c.red, frage = str(p, "frage");
    pen.rrect(30, 40, 1340, 480, 36, { fill: c.paper, ink: c.ink, width: LW });
    pen.rrect(30, 40, 1340, 110, 36, { fill: f, ink: c.ink, width: LW });
    pen.rrect(44, 120, 1312, 30, 0, { fill: f });   // Band unten gerade
    pen.text(str(p, "nummer"), 700, 98, { font: c.fonts.display, size: 64, color: "#ffffff", maxWidth: 1200 });
    pen.text(str(p, "titel"), 700, frage ? 285 : 330, { font: c.fonts.display, size: 150, color: c.ink, maxWidth: 1220 });
    if (frage) pen.text(frage, 700, 430, { font: c.fonts.serif, size: 72, color: darker(c.ink, 0.9), maxWidth: 1200, weight: "italic" });
    for (const x of [90, 1310]) pen.dot(x, 470, 16, f);
  } },
  /** Stempel MYTH / FACT: schräger Doppelrahmen mit Text. `farbe` leer = rot bei "MYTH", grün sonst. Anker Mitte. */
  stempel: { design: [760, 440], anchor: [380, 220], defaults: { text: "MYTH", farbe: "" }, draw: (pen, p, c) => {
    const t = str(p, "text"), f = str(p, "farbe") || (t.toUpperCase().startsWith("MYTH") ? c.red : c.green);
    pen.turn(380, 220, -8, () => {
      pen.rrect(40, 70, 680, 300, 30, { fill: mixHex(f, "#ffffff", 0.85), ink: f, width: 22 });
      pen.rrect(70, 100, 620, 240, 18, { ink: f, width: 10 });
      pen.text(t, 380, 225, { font: c.fonts.display, size: 170, color: f, maxWidth: 560 });
    });
  } },
  /** Zahl, die wächst: grosse Zahl (`wert`, gleitet), darunter ein Balken bis `ziel`, oben `titel`, hinter der Zahl `einheit`.
   *  Anker unten Mitte. */
  zahl: { design: [1000, 760], defaults: { wert: 0, ziel: 100, einheit: "", titel: "", farbe: "" }, draw: (pen, p, c) => {
    const w = num(p, "wert"), z = Math.max(1e-6, num(p, "ziel")), f = str(p, "farbe") || c.gold, u = Math.max(0, Math.min(1, w / z));
    const zahl = Math.round(w).toLocaleString("en-US") + (str(p, "einheit") ? ` ${str(p, "einheit")}` : "");
    pen.rrect(20, 20, 960, 720, 40, { fill: c.paper, ink: c.ink, width: LW });
    if (str(p, "titel")) pen.text(str(p, "titel"), 500, 120, { font: c.fonts.display, size: 70, color: c.ink, maxWidth: 860 });
    pen.text(zahl, 500, 360, { font: c.fonts.display, size: 220, color: darker(f, 0.75), maxWidth: 880 });
    pen.rrect(90, 540, 820, 110, 30, { fill: mixHex(f, "#ffffff", 0.7), ink: c.ink, width: 10 });
    if (u > 0.01) pen.rrect(100, 550, 800 * u, 90, 24, { fill: f });
  } },
  /** Geteilte Karte für Vergleiche: links `links`, rechts `rechts` (Texte) auf zwei Farben, in der Mitte ein VS-Kreis.
   *  `farbeLinks`/`farbeRechts` leer = blau/orange. Anker unten Mitte. */
  geteilt: { design: [1400, 700], defaults: { links: "THEN", rechts: "NOW", farbeLinks: "", farbeRechts: "", mitte: "VS" }, draw: (pen, p, c) => {
    const fl = str(p, "farbeLinks") || "#3f7fd0", fr = str(p, "farbeRechts") || "#e8862a";
    pen.rrect(20, 20, 680, 660, 40, { fill: fl, ink: c.ink, width: LW });
    pen.rrect(700, 20, 680, 660, 40, { fill: fr, ink: c.ink, width: LW });
    pen.text(str(p, "links"), 360, 350, { font: c.fonts.display, size: 130, color: "#ffffff", maxWidth: 560 });
    pen.text(str(p, "rechts"), 1040, 350, { font: c.fonts.display, size: 130, color: "#ffffff", maxWidth: 560 });
    pen.ellipse(700, 350, 110, 110, { fill: c.paper, ink: c.ink, width: LW });
    pen.text(str(p, "mitte"), 700, 355, { font: c.fonts.display, size: 90, color: c.ink, maxWidth: 180 });
  } },
  /** Aufruf-Leiste (Kapitel aufruf, B0099): weisse Leiste mit Daumen (nur Umriss), SUBSCRIBE-Knopf und Glocke (Umriss); ein
   *  Maus-Zeiger klickt sie nacheinander an. `like`/`abo`/`glocke` ≥ 0,5 = eingeschaltet (Daumen blau gefüllt, „SUBSCRIBED“, Glocke
   *  gold und schwingt), `hand` 0…1 = Zeiger da (kommt von rechts unten), `hx` = x der Zeigerspitze (Daumen 330, Knopf 800,
   *  Glocke 1290), `druck` 0…1 drückt das Teil unter dem Zeiger, `funken` 0…1 = Strahlen um dieses Teil. `zeit` läuft von selbst;
   *  die Glocke schwingt ab `glockeAb` (Sekunden ab Aufploppen) 2 s lang aus. Anker Mitte der Leiste. */
  aufruf: { design: [1600, 760], anchor: [800, 300], defaults: { hand: 0, hx: 1500, druck: 0, like: 0, abo: 0, glocke: 0, funken: 0, zeit: 0, glockeAb: 0 }, draw: (pen, p, c) => {
    const ein = (k: string) => num(p, k) >= 0.5, k01 = (k: string) => Math.max(0, Math.min(1, num(p, k)));
    const hand = k01("hand"), hx = num(p, "hx"), dr = k01("druck"), fu = k01("funken"), t = num(p, "zeit");
    const blau = "#2f7fe0", rot = "#e8322a", X = { like: 330, abo: 800, glocke: 1290 };
    const ziel = (Object.entries(X).sort((a, b) => Math.abs(a[1] - hx) - Math.abs(b[1] - hx))[0] ?? ["", 0])[0];
    const sq = (k: string) => (ziel === k ? 1 - dr * 0.1 : 1);   // gedrücktes Teil wird kleiner
    if (fu > 0.01) {   // Strahlen um das Teil unter dem Finger
      const cx = X[ziel as keyof typeof X], rx = ziel === "abo" ? 380 : 130;
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2, r0 = 1.05 + fu * 0.15, r1 = r0 + 0.25 + fu * 0.35;
        pen.line([[cx + Math.cos(a) * rx * r0, 300 + Math.sin(a) * 130 * r0], [cx + Math.cos(a) * rx * r1, 300 + Math.sin(a) * 130 * r1]], 16, i % 2 ? c.gold : ziel === "abo" ? rot : blau);
      }
    }
    pen.rrect(60, 198, 1480, 230, 115, { fill: "#c9cdd6", ink: c.ink, width: LW });   // Schatten (Tiefe)
    pen.rrect(60, 180, 1480, 230, 115, { fill: c.paper, ink: c.ink, width: LW });
    pen.rrect(120, 198, 1360, 30, 15, { fill: "rgba(255,255,255,0.6)" });   // Glanz
    // Daumen hoch: eine Umriss-Linie (Manschette + Hand mit Daumen), eingeschaltet blau gefüllt
    const dk = ein("like") ? 1.08 : 1;
    pen.turn(X.like, 300, 0, () => {
      const ix = X.like, iy = 310, f = ein("like") ? blau : c.paper;
      pen.rrect(ix - 98, iy - 22, 38, 108, 12, { fill: f, ink: c.ink, width: 12 });
      pen.shape((g) => {
        g.beginPath();
        g.moveTo(ix - 46, iy - 22);
        g.lineTo(ix - 12, iy - 72);
        g.quadraticCurveTo(ix + 4, iy - 104, ix + 26, iy - 90);
        g.quadraticCurveTo(ix + 42, iy - 78, ix + 32, iy - 50);
        g.lineTo(ix + 24, iy - 24);
        g.lineTo(ix + 70, iy - 24);
        g.quadraticCurveTo(ix + 96, iy - 22, ix + 88, iy + 6);
        g.lineTo(ix + 72, iy + 70);
        g.quadraticCurveTo(ix + 66, iy + 86, ix + 46, iy + 86);
        g.lineTo(ix - 46, iy + 86);
        g.closePath();
      }, { fill: f, ink: c.ink, width: 12 });
    }, sq("like") * dk, sq("like") * dk);
    // SUBSCRIBE-Knopf
    pen.turn(X.abo, 300, 0, () => {
      const abo = ein("abo");
      pen.rrect(470, 222, 660, 156, 78, { fill: abo ? "#e3e6ec" : rot, ink: c.ink, width: 11 });
      pen.text(abo ? "SUBSCRIBED" : "SUBSCRIBE!", X.abo, 304, { font: c.fonts.display, size: 96, color: abo ? "#4a5060" : "#ffffff", maxWidth: 560 });
    }, sq("abo"), sq("abo"));
    // Glocke (schwingt, wenn eingeschaltet)
    const gl = ein("glocke"), tg = Math.max(0, t - num(p, "glockeAb")), swing = gl ? Math.sin(tg * Math.PI * 2 * 3) * 14 * Math.max(0, 1 - tg / 2) : 0;
    pen.turn(X.glocke, 230, swing, () => {
      const ix = X.glocke, iy = 300, f = gl ? c.gold : c.paper;
      pen.poly([[ix - 62, iy + 38], [ix - 46, iy + 8], [ix - 42, iy - 30], [ix, iy - 62], [ix + 42, iy - 30], [ix + 46, iy + 8], [ix + 62, iy + 38]], { fill: f, ink: c.ink, width: 12 }, true);
      pen.rrect(ix - 70, iy + 30, 140, 22, 11, { fill: f, ink: c.ink, width: 12 });
      pen.ellipse(ix, iy + 66, 15, 13, { fill: f, ink: c.ink, width: 8 });
      pen.ellipse(ix, iy - 68, 11, 11, { fill: f, ink: c.ink, width: 7 });
    }, sq("glocke"), sq("glocke"));
    if (gl) for (const s of [-1, 1]) {   // Klang-Striche neben der Glocke
      pen.line([[X.glocke + s * 92, 250], [X.glocke + s * 118, 236]], 9, c.ink);
      pen.line([[X.glocke + s * 98, 296], [X.glocke + s * 128, 296]], 9, c.ink);
    }
    if (hand > 0.01) {   // Maus-Zeiger: Spitze bei hx auf der Leiste, kommt von rechts unten, wird beim Klick kleiner
      const tx = hx + (1 - hand) * 380, ty = 300 + (1 - hand) * 420, k = 1.15 * (1 - dr * 0.15);
      const pfeil: Pt[] = [[0, 0], [0, 150], [36, 116], [62, 172], [90, 160], [64, 104], [112, 104]];
      pen.poly(pfeil.map(([x, y]): Pt => [tx + x * k + 8, ty + y * k + 8]), { fill: "rgba(0,0,0,0.25)" });   // Schatten
      pen.poly(pfeil.map(([x, y]): Pt => [tx + x * k, ty + y * k]), { fill: "#ffffff", ink: c.ink, width: 12 });
    }
  } },
  // ---------------- Wikinger-Short (2026-11-16) ----------------
  /** Hörnerhelm durchgestrichen (B0112): Opern-Hörnerhelm in einem roten Verbotskreis, der Strich wird gezogen (`strich` 0…1). */
  hoernerhelm: { design: [700, 700], anchor: [350, 350], defaults: { strich: 1 }, draw: (pen, p, c) => {
    pen.ellipse(350, 350, 320, 320, { fill: c.paper, ink: c.ink, width: LW });
    helmOper(pen, 350, 410, 1.15, c, "horn");
    pen.ellipse(350, 350, 286, 286, { ink: c.red, width: 46 });
    const u = Math.max(0, Math.min(1, num(p, "strich")));
    if (u > 0.01) { const a: Pt = [148, 148], b: Pt = [148 + 404 * u, 148 + 404 * u]; pen.line([a, b], 52, c.ink); pen.line([a, b], 40, c.red); }
  } },
  /** Helm-Vergleich (B0113): links der echte Helm um 900 (Spangenhelm, grün „REAL“), rechts der Opernhelm von 1876 (rot „OPERA“);
   *  `haken` 0…1 setzt Haken links und Kreuz rechts. Texte `links`, `rechts`, Jahre `jahrLinks`, `jahrRechts`. */
  helmvergleich: { design: [1400, 760], defaults: { links: "REAL", rechts: "OPERA", jahrLinks: "c. 900", jahrRechts: "1876", haken: 1 }, draw: (pen, p, c) => {
    for (const [x, f, t, j] of [[20, c.green, str(p, "links"), str(p, "jahrLinks")], [710, c.red, str(p, "rechts"), str(p, "jahrRechts")]] as const) {
      pen.rrect(x, 20, 670, 720, 40, { fill: c.paper, ink: c.ink, width: LW });
      pen.rrect(x, 20, 670, 120, 40, { fill: f, ink: c.ink, width: LW }); pen.rrect(x + 14, 110, 642, 30, 0, { fill: f });
      pen.text(t, x + 335, 84, { font: c.fonts.display, size: 80, color: "#ffffff", maxWidth: 600 });
      pen.text(j, x + 335, 680, { font: c.fonts.display, size: 70, color: c.ink, maxWidth: 600 });
    }
    helmEcht(pen, 355, 470, 1.25, c);
    helmOper(pen, 1045, 470, 1.25, c, "horn");
    const u = Math.max(0, Math.min(1, num(p, "haken")));
    if (u > 0.01) {
      const hk: Pt[] = [[510, 560], [560, 610], [650, 500]], n = Math.max(2, Math.ceil(u * 3));
      pen.line(hk.slice(0, n), 40, c.ink, false); pen.line(hk.slice(0, n), 26, c.green, false);
      const k = Math.min(1, u * 1.2);
      pen.line([[1200, 500], [1200 + 110 * k, 610 * k + 500 * (1 - k)]], 40, c.ink); pen.line([[1200, 500], [1200 + 110 * k, 610 * k + 500 * (1 - k)]], 26, c.red);
      if (u > 0.5) { const v = (u - 0.5) * 2; pen.line([[1310, 500], [1310 - 110 * v, 500 + 110 * v]], 40, c.ink); pen.line([[1310, 500], [1310 - 110 * v, 500 + 110 * v]], 26, c.red); }
    }
  } },
  /** Fundstück 1943 (B0114): rostiger Spangenhelm in Bruchstücken (Brillen-Visier) auf einem Museumssockel, Schild mit `titel`
   *  und `ort`. */
  fundstueck: { design: [800, 900], defaults: { titel: "FOUND 1943", ort: "NORWAY" }, draw: (pen, p, c) => {
    pen.rrect(20, 20, 760, 860, 36, { fill: "#e9e2d2", ink: c.ink, width: LW });
    pen.poly([[150, 600], [650, 600], [700, 700], [100, 700]], { fill: "#7a5a46", ink: c.ink, width: LW });   // Sockel
    pen.rrect(100, 690, 600, 40, 6, { fill: "#5e4434", ink: c.ink, width: 10 });
    const rost = "#a8653a", dk = darker(rost, 0.6);
    // Glocke in zwei Bruchstücken mit gezackter Bruchkante, unten der Reif
    pen.shape(Pen.poly([[225, 560], [230, 450], [270, 370], [330, 320], [392, 305], [380, 350], [400, 395], [372, 440], [395, 500], [375, 560]], false), { fill: rost, ink: c.ink, width: LW });
    pen.shape(Pen.poly([[420, 560], [440, 500], [415, 445], [445, 395], [425, 350], [440, 305], [500, 318], [555, 365], [585, 450], [580, 560]], false), { fill: darker(rost, 0.88), ink: c.ink, width: LW });
    pen.rrect(220, 548, 365, 28, 6, { fill: darker(rost, 0.7), ink: c.ink, width: 10 });
    for (const [x0, y0, x1, y1] of [[300, 360, 330, 470], [500, 360, 470, 450], [360, 520, 340, 580]]) pen.line([[x0, y0], [x1, y1]], 6, dk);
    for (const x of [250, 310, 370, 440, 500, 550]) pen.dot(x, 575, 9, dk);
    for (const d of [-1, 1]) pen.line([[400 + d * 40, 560], [400 + d * 120, 560], [400 + d * 120, 620], [400 + d * 40, 600]], 16, darker(rost, 0.75), true);   // Brillen-Visier
    pen.rrect(160, 745, 480, 120, 14, { fill: c.paper, ink: c.ink, width: 10 });
    pen.text(str(p, "titel"), 400, 790, { font: c.fonts.display, size: 52, color: c.ink, maxWidth: 440 });
    pen.text(str(p, "ort"), 400, 840, { font: c.fonts.serif, size: 38, color: darker(c.ink, 0.9), maxWidth: 440 });
    pen.text("GJERMUNDBU", 400, 120, { font: c.fonts.display, size: 64, color: darker(rost, 0.7), maxWidth: 640 });
  } },
  /** Bronzehelm von Veksø (B0115, Bronzezeit um 900 v. Chr.): Bronzeglocke mit Kamm, zwei grosse geschwungene Hörner, Augen und
   *  Schnabel vorn; Schild mit `text`. */
  veksoe: { design: [900, 900], defaults: { text: "VEKSØ · c. 900 BC" }, draw: (pen, p, c) => {
    const br = "#d39a3a", dk = darker(br, 0.65);
    pen.rrect(20, 20, 860, 860, 36, { fill: "#f2ead8", ink: c.ink, width: LW });
    for (const d of [-1, 1]) {   // Hörner: aus der Seite nach aussen, oben nach innen gebogen
      const X = (x: number) => 450 + d * x;
      pen.shape(Pen.poly([[X(150), 470], [X(300), 430], [X(360), 300], [X(330), 170], [X(260), 120], [X(290), 175], [X(310), 290], [X(270), 390], [X(160), 420]], true), { fill: br, ink: c.ink, width: LW });
      pen.line([[X(200), 440], [X(300), 360], [X(320), 240]], 8, dk, true);
    }
    const dome = Pen.poly([[250, 600], [255, 420], [320, 320], [450, 285], [580, 320], [645, 420], [650, 600]], true);
    pen.shape(dome, { fill: br }); pen.shadeSide(dome, darker(br, 0.8), -30, -10, 0.9); pen.shape(dome, { ink: c.ink, width: LW });
    pen.poly([[440, 290], [450, 200], [470, 290]], { fill: br, ink: c.ink, width: 10 });   // Kamm
    pen.rrect(244, 585, 412, 34, 10, { fill: dk, ink: c.ink, width: 10 });
    for (const d of [-1, 1]) { pen.ellipse(450 + d * 80, 470, 44, 44, { fill: darker(br, 0.85), ink: c.ink, width: 10 }); pen.dot(450 + d * 80, 470, 14, c.ink); }   // Augen
    pen.poly([[450, 490], [480, 560], [450, 590], [420, 560]], { fill: darker(br, 0.85), ink: c.ink, width: 10 });   // Schnabel
    for (const k of [0.3, 0.5, 0.7]) pen.dot(300 + k * 300, 535, 8, dk);
    pen.rrect(170, 700, 560, 110, 14, { fill: c.paper, ink: c.ink, width: 10 });
    pen.text(str(p, "text"), 450, 758, { font: c.fonts.display, size: 56, color: c.ink, maxWidth: 520 });
  } },
  /** Runen (B0116): Steintafel, in die die Runen des `text` (lateinische Buchstaben → jüngeres Futhark) nacheinander eingeritzt
   *  werden (`fortschritt` 0…1); darunter der Text in Grossbuchstaben (`lesbar`). */
  runen: { design: [1000, 620], defaults: { text: "VIKING", fortschritt: 1, lesbar: true }, draw: (pen, p, c) => {
    const stein = "#9aa0ab";
    const tafel = Pen.poly([[60, 70], [500, 40], [950, 60], [980, 330], [955, 570], [480, 595], [40, 575], [20, 320]], false);
    pen.shape(tafel, { fill: stein }); pen.shadeSide(tafel, darker(stein, 0.85), -30, -10, 0.9); pen.shape(tafel, { ink: c.ink, width: LW });
    const t = str(p, "text").toLowerCase().replace(/[^a-zøæåþ]/g, ""), n = t.length, u = Math.max(0, Math.min(1, num(p, "fortschritt")));
    const w = Math.min(130, 820 / Math.max(1, n)), x0 = 500 - (w * n) / 2, h = 260, y0 = 110;
    for (let i = 0; i < n; i++) {
      const k = Math.max(0, Math.min(1, u * n - i));
      if (k <= 0) break;
      const segs = RUNE[RUNE_VON[t[i]] ?? "i"] ?? RUNE.i;
      segs.forEach(([a, b, cc, d], j) => {
        if (j / segs.length > k) return;
        const cx0 = x0 + i * w + w * 0.2, P1: Pt = [cx0 + a * w, y0 + b * h], P2: Pt = [cx0 + cc * w, y0 + d * h];
        pen.line([P1, P2], 26, "#3a3f4a"); pen.line([P1, P2], 12, c.red);
      });
      if (i === Math.floor(u * n) && u < 1) pen.dot(x0 + i * w + w * 0.5, y0 + h + 20, 10, c.gold);
    }
    if (p.lesbar !== false && u >= 0.999) pen.text(str(p, "text").toUpperCase(), 500, 500, { font: c.fonts.display, size: 70, color: "#ffffff", maxWidth: 820 });
  } },
  /** Skizzenblock (B0117): Block mit Spiralbindung, auf dem eine Kostüm-Skizze entsteht (Figur mit Hörnerhelm, Mantel, Speer;
   *  `fortschritt` 0…1), Bleistift an der Strichspitze, unten `notiz`. */
  skizzenblock: { design: [760, 960], defaults: { fortschritt: 1, notiz: "COSTUME 1876" }, draw: (pen, p, c) => {
    pen.rrect(30, 50, 700, 880, 20, { fill: "#fbf6e8", ink: c.ink, width: LW });
    for (let x = 80; x <= 690; x += 44) pen.ellipse(x, 52, 14, 26, { ink: "#55606e", width: 7 });
    const blei = "#4a5468", striche: Pt[][] = [
      [[380, 330], [330, 360], [300, 460], [320, 620], [440, 620], [460, 460], [430, 360], [380, 330]],   // Körper
      [[380, 230], [330, 250], [320, 300], [350, 335], [410, 335], [440, 300], [430, 250], [380, 230]],   // Kopf
      [[320, 245], [350, 205], [410, 205], [440, 245]],                                                    // Helm
      [[330, 225], [270, 210], [240, 150], [255, 110]], [[430, 225], [490, 210], [520, 150], [505, 110]],  // Hörner
      [[310, 380], [230, 470], [250, 700], [520, 700], [540, 470], [450, 380]],                            // Mantel
      [[560, 160], [560, 760]], [[548, 160], [560, 120], [572, 160]],                                       // Speer
      [[340, 620], [340, 760]], [[420, 620], [420, 760]],                                                   // Beine
    ];
    const u = Math.max(0, Math.min(1, num(p, "fortschritt"))), n = striche.length;
    let spitze: Pt | null = null;
    striche.forEach((s, i) => {
      const k = Math.max(0, Math.min(1, u * n - i)); if (k <= 0) return;
      const m = Math.max(2, Math.ceil(s.length * k)), teil = s.slice(0, m);
      pen.line(teil, 7, blei, true); spitze = teil[teil.length - 1];
    });
    if (spitze && u < 1) {   // Bleistift
      const [x, y] = spitze as Pt;
      pen.poly([[x, y], [x + 20, y - 34], [x + 150, y - 150], [x + 130, y - 170], [x - 4, y - 50]], { fill: "#f2c443", ink: c.ink, width: 6 });
      pen.poly([[x, y], [x + 20, y - 34], [x - 4, y - 50]], { fill: "#e9c9a0", ink: c.ink, width: 4 });
    }
    pen.text(str(p, "notiz"), 380, 860, { font: c.fonts.script, size: 64, color: blei, maxWidth: 600 });
  } },
  /** Notenblatt (B0118): Blatt mit fünf Notensystemen, eigene Noten (keine echte Melodie), Titel `titel`; Noten steigen als
   *  Zeichen aus dem Blatt auf (`zeit` läuft von selbst). */
  notenblatt: { design: [760, 980], anchor: [380, 980], defaults: { titel: "1876", zeit: 0, seed: 5 }, draw: (pen, p, c) => {
    pen.rrect(30, 200, 700, 760, 18, { fill: "#fbf6e8", ink: c.ink, width: LW });
    pen.text(str(p, "titel"), 380, 270, { font: c.fonts.display, size: 60, color: c.ink, maxWidth: 600 });
    let r = Math.round(num(p, "seed")) * 9301 + 49297;
    const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
    for (let k = 0; k < 5; k++) {
      const y0 = 330 + k * 120;
      for (let l = 0; l < 5; l++) pen.line([[70, y0 + l * 14], [690, y0 + l * 14]], 3, "#55606e");
      pen.line([[70, y0], [70, y0 + 56]], 5, c.ink);
      for (let x = 130; x < 680; x += 52) {
        const y = y0 + Math.round(rnd() * 8) * 7, voll = rnd() < 0.75;
        pen.ellipse(x, y, 13, 10, voll ? { fill: c.ink } : { ink: c.ink, width: 4 }, -0.35);
        pen.line([[x + 11, y], [x + 11, y - 46]], 4, c.ink);
      }
    }
    const z = num(p, "zeit");
    for (let i = 0; i < 4; i++) {   // aufsteigende Notenzeichen
      const u = (z * 0.45 + i / 4) % 1, x = 160 + i * 150 + Math.sin(u * 6 + i) * 30, y = 230 - u * 210;
      const a = Math.min(1, u * 5, (1 - u) * 4), f = [c.red, c.ink2, c.green, c.gold][i];
      pen.ellipse(x, y, 20 * a, 15 * a, { fill: f, ink: c.ink, width: 4 }, -0.35);
      if (a > 0.3) { pen.line([[x + 17, y], [x + 17, y - 60]], 6, c.ink); pen.line([[x + 17, y - 60], [x + 42, y - 44]], 6, c.ink); }
    }
  } },
  /** Fliegender Rabe (B0119): schwarzer Rabe mit schlagenden Flügeln (`zeit` läuft von selbst, `tempo` Schläge/s), Blick nach
   *  `richtung` ("rechts"/"links"). Ohne Rahmen – fliegt frei durchs Bild. */
  rabe: { design: [800, 600], anchor: [400, 300], defaults: { zeit: 0, tempo: 2.4, richtung: "rechts", farbe: "" }, draw: (pen, p, c) => {
    const f = str(p, "farbe") || "#1e1f2a", hl = mixHex(f, "#5a6ab0", 0.35), s = Math.sin(num(p, "zeit") * num(p, "tempo") * Math.PI * 2);
    const sx = str(p, "richtung") === "links" ? -1 : 1;
    pen.turn(400, 300, 0, () => {
      const flug = (oben: boolean) => {   // Flügel: Spitze schwingt von oben nach unten
        const y = 300 - s * 190, k = oben ? 1 : 0.8;
        pen.poly([[360, 290], [430, 280], [300 + 40 * (1 - k), y - 20], [180, y + 30 * s], [250, y + 60], [200, y + 90 + 20 * s], [300, 330]], { fill: oben ? f : hl, ink: c.ink, width: 10 }, true);
      };
      flug(false);
      pen.poly([[300, 300], [180, 270], [170, 330], [300, 330]], { fill: f, ink: c.ink, width: 10 });   // Schwanz
      pen.ellipse(400, 310, 130, 58, { fill: f, ink: c.ink, width: 10 });
      pen.ellipse(530, 280, 58, 50, { fill: f, ink: c.ink, width: 10 });
      pen.poly([[575, 268], [660, 292], [578, 304]], { fill: "#3a3a44", ink: c.ink, width: 8 });   // Schnabel
      pen.dot(545, 270, 10, "#ffffff"); pen.dot(548, 271, 5, c.ink);
      flug(true);
    }, sx, 1);
  } },
  /** Groma (B0135): Vermessungsgerät der Römer – Stange, waagrechtes Kreuz (schräg gesehen), vier Lote an Schnüren, die leicht
   *  pendeln (`zeit`). Vom vorderen Lot läuft eine gestrichelte Sichtlinie (`sicht` 0…1) zu einer rot-weissen Messlatte rechts in der
   *  Ferne; ist sie ganz da, leuchtet ein Haken über der Latte. Frei, ohne Rahmen; Anker unten Mitte. */
  groma: { design: [1200, 1000], anchor: [600, 1000], defaults: { sicht: 1, zeit: 0, farbe: "" }, draw: (pen, p, c) => {
    const holz = c.wood, t = num(p, "zeit"), u = Math.max(0, Math.min(1, num(p, "sicht"))), rot = str(p, "farbe") || c.red;
    const X = 300, top = 220, boden = 980;
    pen.ellipse(X, boden - 6, 90, 16, { fill: "rgba(30,20,40,0.18)" });
    pen.line([[X, boden], [X, top]], 34, c.ink); pen.line([[X, boden - 4], [X, top + 4]], 20, holz);   // Stange
    pen.line([[X, top + 40], [X + 70, top + 10]], 28, c.ink); pen.line([[X, top + 40], [X + 70, top + 10]], 16, holz);   // Ausleger
    const m: Pt = [X + 70, top], arme: Pt[] = [[m[0] - 230, m[1] + 40], [m[0] + 230, m[1] - 40], [m[0] - 90, m[1] - 50], [m[0] + 90, m[1] + 50]];
    for (const [a, b] of [[0, 1], [2, 3]]) { pen.line([arme[a], arme[b]], 28, c.ink); pen.line([arme[a], arme[b]], 16, holz); }
    pen.ellipse(m[0], m[1], 22, 14, { fill: c.gold, ink: c.ink, width: 8 });
    const lote = arme.map(([ax, ay], i) => {
      const sw = Math.sin(t * 2.2 + i * 1.3) * 10, ly = ay + 330, lx = ax + sw;
      pen.line([[ax, ay], [lx, ly]], 5, c.ink);
      pen.poly([[lx - 20, ly], [lx + 20, ly], [lx, ly + 44]], { fill: c.metal, ink: c.ink, width: 7 });
      return [lx, ly + 20] as Pt;
    });
    // Messlatte in der Ferne (klein), Sichtlinie vom vorderen Lot (rechter Arm) über die Latte hinaus
    const LX = 1060, Lt = 560, Lb = 900, seg = (Lb - Lt) / 8;
    pen.ellipse(LX, Lb, 36, 8, { fill: "rgba(30,20,40,0.18)" });
    pen.line([[LX, Lb], [LX, Lt]], 22, c.ink);
    for (let i = 0; i < 8; i++) pen.line([[LX, Lt + i * seg + 2], [LX, Lt + (i + 1) * seg - 2]], 12, i % 2 ? "#ffffff" : rot);
    const von = lote[3], ziel: Pt = [LX, Lt + 40];
    strichel(pen, von, [von[0] + (ziel[0] - von[0]) * 1.08, von[1] + (ziel[1] - von[1]) * 1.08], u, 12, c.gold, 36, 22);
    pen.ellipse(von[0], von[1] - 20, 16, 16, { ink: c.gold, width: 8 });
    if (u >= 0.999) { pen.ellipse(LX, Lt - 80, 52, 52, { fill: c.green, ink: c.ink, width: 10 }); pen.line([[LX - 24, Lt - 80], [LX - 6, Lt - 60], [LX + 26, Lt - 102]], 14, "#ffffff"); }
  } },
  /** Strassenschichten (B0136): Schnitt durch eine Römerstrasse im Boden. `fortschritt` 0…4 baut die Schichten nacheinander auf
   *  (jede fällt von oben in den Graben): grosse Steine, Kies mit Kalk, feiner Mörtel, gewölbtes Pflaster mit Randsteinen.
   *  `namen` = vier Beschriftungen mit „|“ getrennt (rechts, erscheinen mit ihrer Schicht), leer = keine. */
  strassenschichten: { design: [1500, 900], defaults: { fortschritt: 4, namen: "BIG STONES|GRAVEL & LIME|FINE CONCRETE|PAVING STONES" }, draw: (pen, p, c) => {
    const f = Math.max(0, Math.min(4, num(p, "fortschritt"))), namen = str(p, "namen").split("|").filter(Boolean);
    const erde = "#9a6b45", x0 = 140, x1 = 1000, cx = (x0 + x1) / 2;
    pen.rrect(20, 20, 1460, 860, 40, { fill: "#cfe7f5", ink: c.ink, width: LW });   // Himmel
    const boden = Pen.rrect(20, 300, 1460, 580, 0);
    pen.clip(Pen.rrect(20, 20, 1460, 860, 40), () => {
      pen.shape(boden, { fill: erde });
      for (let i = 0; i < 40; i++) pen.dot(40 + ((i * 263) % 1420), 380 + ((i * 131) % 480), 6 + (i % 4) * 3, darker(erde, 0.8));
      pen.line([[20, 300], [1480, 300]], 26, c.leaf);   // Gras
      pen.rrect(x0, 300, x1 - x0, 420, 0, { fill: darker(erde, 0.62) });   // ausgehobener Graben
    });
    const lagen = [[620, 720], [520, 620], [450, 520], [370, 450]] as const;   // y oben, y unten je Schicht
    const fall = (i: number) => { const k = Math.max(0, Math.min(1, f - i)); return { k, dy: (1 - k) * (1 - k) * -420 }; };
    // 1 grosse Steine
    let s = fall(0);
    if (s.k > 0) pen.shift(0, s.dy, () => {
      pen.rrect(x0, lagen[0][0], x1 - x0, 100, 0, { fill: "#8a8478" });
      for (let i = 0; i < 12; i++) pen.ellipse(x0 + 40 + i * 72, 668 + (i % 2) * 10, 38, 30, { fill: i % 3 ? "#a39c8e" : "#b8b0a0", ink: c.ink, width: 6 }, i * 0.4);
    });
    // 2 Kies mit Kalk
    s = fall(1);
    if (s.k > 0) pen.shift(0, s.dy, () => {
      pen.rrect(x0, lagen[1][0], x1 - x0, 100, 0, { fill: "#c9b89a" });
      for (let i = 0; i < 70; i++) pen.dot(x0 + 14 + ((i * 97) % (x1 - x0 - 28)), 535 + ((i * 53) % 74), 7 + (i % 3) * 2, i % 2 ? "#8f8070" : "#e9e1cf");
    });
    // 3 feiner Mörtel
    s = fall(2);
    if (s.k > 0) pen.shift(0, s.dy, () => {
      pen.rrect(x0, lagen[2][0], x1 - x0, 70, 0, { fill: "#eee6d4" });
      for (let i = 0; i < 40; i++) pen.dot(x0 + 10 + ((i * 89) % (x1 - x0 - 20)), 462 + ((i * 37) % 48), 3, "#b9ab90");
    });
    // 4 Pflaster: gewölbt, Polygon-Steine, Randsteine
    s = fall(3);
    if (s.k > 0) pen.shift(0, s.dy, () => {
      const oben = (x: number) => 370 - 46 * (1 - ((x - cx) / ((x1 - x0) / 2 - 60)) ** 2);
      const pts: Pt[] = [[x0 + 60, 450]]; for (let i = 0; i <= 20; i++) { const x = x0 + 60 + (i / 20) * (x1 - x0 - 120); pts.push([x, oben(x)]); } pts.push([x1 - 60, 450]);
      const pfl = Pen.poly(pts, false);
      pen.shape(pfl, { fill: "#7d8496" });
      pen.clip(pfl, () => { for (let i = 0; i < 11; i++) { const x = x0 + 60 + i * 72; pen.line([[x, 460], [x + 18, 300]], 7, "#4c5262"); } pen.line([[x0, 410], [x1, 410]], 6, "#4c5262"); });
      pen.shape(pfl, { ink: c.ink, width: 10 });
      for (const x of [x0, x1 - 60]) pen.rrect(x, 330, 60, 120, 6, { fill: "#a7a091", ink: c.ink, width: 10 });
    });
    for (const [a, b] of lagen) pen.line([[x0, b], [x1, b]], 4, "rgba(30,20,40,0.25)");
    pen.rrect(x0, 300, x1 - x0, 420, 0, { ink: c.ink, width: 10 });
    namen.slice(0, 4).forEach((n, i) => {   // Beschriftung rechts mit Pfeil
      const k = Math.max(0, Math.min(1, f - i)); if (k < 0.6) return;
      const y = (lagen[i][0] + lagen[i][1]) / 2 + (i === 3 ? -20 : 0);
      pen.line([[x1 + 20, y], [x1 + 80, y]], 10, c.ink);
      pen.rrect(x1 + 90, y - 42, 360, 84, 20, { fill: c.paper, ink: c.ink, width: 8 });
      pen.text(n, x1 + 270, y + 2, { font: c.fonts.display, size: 40, color: c.ink, maxWidth: 330 });
    });
  } },
  /** Meilenstein (B0137): runde Säule auf Sockel mit Inschrift; oben `via` (Name der Strasse), darunter „MP“ und die Meilenzahl in
   *  römischen Ziffern, die mit `wert` hochzählt (gleitend in einer Spur), darunter dieselbe Zahl klein in unseren Ziffern (`arabisch`).
   *  Anker unten Mitte. */
  meilenstein: { design: [700, 1100], anchor: [350, 1100], defaults: { wert: 12, via: "VIA APPIA", arabisch: true }, draw: (pen, p, c) => {
    const stein = "#e6dcc6", dk = darker(stein, 0.78), w = num(p, "wert");
    pen.ellipse(350, 1080, 260, 22, { fill: "rgba(30,20,40,0.18)" });
    pen.rrect(110, 960, 480, 120, 14, { fill: dk, ink: c.ink, width: LW });   // Sockel
    const saeule = Pen.poly([[160, 970], [150, 200], [190, 120], [350, 92], [510, 120], [550, 200], [540, 970]], false);
    pen.shape(saeule, { fill: stein }); pen.shadeSide(saeule, dk, -60, 0, 0.9);
    pen.line([[450, 140], [460, 950]], 18, "rgba(255,255,255,0.45)");
    pen.shape(saeule, { ink: c.ink, width: LW });
    const gravur = "#8a2e2a";
    pen.text(str(p, "via"), 350, 240, { font: c.fonts.serif, size: 54, color: gravur, maxWidth: 340, weight: "bold" });
    pen.line([[200, 300], [500, 300]], 6, dk);
    pen.text("MP", 350, 400, { font: c.fonts.serif, size: 110, color: gravur, maxWidth: 340, weight: "bold" });
    pen.text(roemisch(w), 350, 580, { font: c.fonts.serif, size: 150, color: gravur, maxWidth: 360, weight: "bold" });
    if (p.arabisch !== false) {
      pen.rrect(220, 720, 260, 120, 30, { fill: c.gold, ink: c.ink, width: 10 });
      pen.text(String(Math.max(0, Math.round(w))), 350, 782, { font: c.fonts.display, size: 90, color: c.ink, maxWidth: 230 });
    }
  } },
  /** Strassennetz (B0138): Karte mit den Hauptstrassen des Römischen Reichs, die von ROMA (goldener Stern, pulsiert mit `zeit`)
   *  ausgehen; `fortschritt` 0…1 zeichnet erst die Strassen aus Rom, dann die Verzweigungen, Städte erscheinen als Punkte, wenn die
   *  Strasse sie erreicht (Namen mit `namen`). Schematisch, Lage der Städte nach Längen- und Breitengrad. */
  strassennetz: { design: [1600, 1000], defaults: { fortschritt: 1, zeit: 0, namen: true, titel: "ALL ROADS LEAD TO ROME" }, draw: (pen, p, c) => {
    const f = Math.max(0, Math.min(1, num(p, "fortschritt"))), t = num(p, "zeit");
    pen.rrect(20, 20, 1560, 960, 40, { fill: "#f1e3c4", ink: c.ink, width: LW });
    pen.clip(Pen.rrect(20, 20, 1560, 960, 40), () => { for (let i = 0; i < 18; i++) pen.dot(60 + ((i * 331) % 1500), 60 + ((i * 197) % 880), 40 + (i % 5) * 16, "rgba(160,120,60,0.08)"); });
    if (str(p, "titel")) pen.text(str(p, "titel"), 800, 82, { font: c.fonts.display, size: 58, color: c.ink, maxWidth: 1300 });
    const erreicht = new Set<string>(["ROMA"]);
    for (const [start, kette] of NETZ_STRASSEN) {
      const u = Math.max(0, Math.min(1, (f - start) / 0.5)); if (u <= 0) continue;
      const pts = kette.map(netzPunkt), seg: number[] = []; let L = 0;
      for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
      let rest = L * u; const zug: Pt[] = [pts[0]];
      for (let i = 1; i < pts.length && rest > 0; i++) {
        const k = Math.min(1, rest / seg[i - 1]); zug.push([pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k]);
        if (k >= 1) erreicht.add(kette[i]); rest -= seg[i - 1];
      }
      if (start === 0 || kette[0] !== "ROMA") erreicht.add(kette[0]);
      pen.line(zug, 22, c.ink); pen.line(zug, 11, c.red);
    }
    for (const n of Object.keys(NETZ_STADT)) {
      if (n === "ROMA" || !erreicht.has(n)) continue;
      const [x, y] = netzPunkt(n);
      pen.ellipse(x, y, 16, 16, { fill: c.paper, ink: c.ink, width: 7 });
      const [nx, ny] = NETZ_NAME[n] ?? [0, -34];
      if (p.namen !== false) pen.text(n, x + nx, y + ny, { font: c.fonts.serif, size: 26, color: c.ink, maxWidth: 240, weight: "bold", rand: { color: c.paper, width: 9 } });
    }
    const [rx, ry] = netzPunkt("ROMA"), puls = 1 + 0.08 * Math.sin(t * 4);
    pen.poly(star(rx, ry, 60 * puls, 26 * puls, 5), { fill: c.gold, ink: c.ink, width: 9 });
    pen.text("ROMA", rx - 135, ry + 14, { font: c.fonts.display, size: 48, color: c.ink, maxWidth: 260, rand: { color: c.paper, width: 12 } });
  } },
  /** Alt und heute (B0139): links eine Römerstrasse (Pflaster, Meilenstein, Pinie), rechts dieselbe Linie als Strasse von heute
   *  (Asphalt, Mittelstreifen, Leitpfosten); `wisch` 0…1 schiebt die Trennlinie von rechts nach links (1 = alles heute).
   *  Beschriftungen `links`/`rechts`. */
  "heute-alt-neu": { design: [1400, 800], defaults: { wisch: 0.5, links: "THEN", rechts: "TODAY" }, draw: (pen, p, c) => {
    const w = Math.max(0, Math.min(1, num(p, "wisch"))), sx = 1380 - w * 1360, rahmen = Pen.rrect(20, 20, 1360, 760, 40);
    const bild = (heute: boolean) => {
      pen.rrect(0, 0, 1400, 420, 0, { fill: "#bfe3f5" });
      pen.rrect(0, 400, 1400, 400, 0, { fill: heute ? "#79b84a" : "#8cc43a" });
      pen.ellipse(260, 170, 110, 40, { fill: "#ffffff" }); pen.ellipse(1080, 130, 140, 46, { fill: "#ffffff" });
      const strasse = Pen.poly([[560, 400], [840, 400], [1240, 800], [160, 800]], false);
      pen.shape(strasse, { fill: heute ? "#4a4e58" : "#7d8496" });
      pen.clip(strasse, () => {
        if (heute) for (let i = 0; i < 6; i++) { const y0 = 410 + i * 70, y1 = y0 + 36; pen.poly([[697, y0], [703, y0], [705 + (y1 - 400) * 0.02, y1], [695 - (y1 - 400) * 0.02, y1]], { fill: "#ffffff" }); }
        else for (let i = 0; i < 9; i++) { const y = 420 + i * i * 6; pen.line([[0, y], [1400, y]], 4 + i, "#4c5262"); }
        if (!heute) for (let i = -6; i <= 6; i++) pen.line([[700 + i * 30, 400], [700 + i * 100, 800]], 5, "#4c5262");
      });
      pen.shape(strasse, { ink: c.ink, width: 10 });
      if (heute) for (const d of [-1, 1]) for (let i = 0; i < 4; i++) { const y = 430 + i * i * 28 + i * 20, x = 700 + d * (150 + (y - 400) * 1.35); pen.rrect(x - 6, y - 40 - i * 10, 12 + i * 2, 40 + i * 10, 4, { fill: "#ffffff", ink: c.ink, width: 4 }); }
      else {
        pen.rrect(1000, 470, 70, 150, 16, { fill: "#e6dcc6", ink: c.ink, width: 8 });   // Meilenstein
        pen.text("XII", 1035, 530, { font: c.fonts.serif, size: 36, color: "#8a2e2a", weight: "bold" });
        pen.line([[300, 520], [290, 260]], 22, "#8a5a34");   // Pinie
        pen.ellipse(290, 240, 170, 60, { fill: c.leaf, ink: c.ink, width: 8 });
      }
    };
    pen.clip(rahmen, () => {
      pen.clip(Pen.rrect(0, 0, sx, 800, 0), () => bild(false));
      pen.clip(Pen.rrect(sx, 0, 1400 - sx, 800, 0), () => bild(true));
      pen.line([[sx, 0], [sx, 800]], 14, c.paper);
    });
    pen.shape(rahmen, { ink: c.ink, width: LW });
    if (sx > 260) { pen.rrect(50, 50, 300, 100, 26, { fill: c.paper, ink: c.ink, width: 8 }); pen.text(str(p, "links"), 200, 102, { font: c.fonts.display, size: 56, color: c.ink, maxWidth: 270 }); }
    if (sx < 1140) { pen.rrect(1050, 50, 300, 100, 26, { fill: c.paper, ink: c.ink, width: 8 }); pen.text(str(p, "rechts"), 1200, 102, { font: c.fonts.display, size: 56, color: c.ink, maxWidth: 270 }); }
  } },
  /** Römer-Wasser-Welt (B0165–B0174): gefaelle, siphon, bleirohr, verteiler, wasserkarte, balkenvergleich, pool-uhr, stempel, bohrkern,
   *  becher-rangliste – in aqua-karten.ts. */
  ...AQUA_KARTEN,
} satisfies Record<string, Def>;

export type EffectKind = keyof typeof EFFECTS;
export const EFFECT_KINDS = Object.keys(EFFECTS) as EffectKind[];

/** Zeichnet eine Effekt-Karte (Angaben werden mit den Standardwerten ergänzt). */
export const drawEffect = (pen: Pen, kind: EffectKind, params: P, c: EffectColors) => {
  const d = EFFECTS[kind] as Def;
  d.draw(pen, { ...d.defaults, ...params }, c);
};
