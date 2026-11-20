// Herkunft: eigen (V-Video), geschrieben 2026-11-18, ohne Vorlage.
// Effekt-Karten der Römer-Wasser-Welt (B0165–B0174, Auftrag V0013): Gefälle, Siphon, Bleirohr mit Kalk, Verteiler im Wasserschloss,
// Wasserkarte von Rom, Balkenvergleich, Becken-Uhr, Stempel, Bohrkern, Becher-Rangliste. Werden in EFFECTS (effects.ts) eingefügt.
// Zahlen-Angaben (fortschritt, fuellung, zeit …) dürfen in einer Spur gleiten; Texte wechseln hart. Beschriftung englisch (Videos).
import { Pen, darker, mixHex, type Pt } from "./draw";
import type { EffectColors } from "./effects";

type P = Record<string, unknown>;
type KarteDef = { design: [number, number]; anchor?: [number, number]; defaults: P; draw: (pen: Pen, p: P, c: EffectColors) => void };
const num = (p: P, k: string) => Number(p[k] ?? 0);
const str = (p: P, k: string) => String(p[k] ?? "");
const k01 = (v: number) => Math.max(0, Math.min(1, v));
const LW = 14;
const star = (cx: number, cy: number, r1: number, r2: number, n: number): Pt[] =>
  Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, r = i % 2 ? r2 : r1; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as Pt; });
const WASSER = "#3cb8e6", WASSER_HELL = "#a8eaff", STEIN = "#e2cf9e", STEIN_DK = "#b49c68", BLEI = "#97a1b0", KALK = "#f3ead2", PAPIER = "#f1e3c4";

/** Pergament-Rahmen mit Titel oben. */
const rahmen = (pen: Pen, w: number, h: number, c: EffectColors, titel: string, fuell = PAPIER) => {
  pen.rrect(20, 20, w - 40, h - 40, 40, { fill: fuell, ink: c.ink, width: LW });
  if (titel) pen.text(titel, w / 2, 86, { font: c.fonts.display, size: 56, color: c.ink, maxWidth: w - 160 });
};
/** Pfeil von a nach b (Spitze bei b). */
const pfeil = (pen: Pen, a: Pt, b: Pt, w: number, farbe: string, ink: string) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, s = w * 2.2;
  const m: Pt = [b[0] - ux * s, b[1] - uy * s];
  pen.line([a, m], w + 10, ink); pen.line([a, m], w, farbe);
  pen.poly([[b[0], b[1]], [m[0] - uy * s * 0.7, m[1] + ux * s * 0.7], [m[0] + uy * s * 0.7, m[1] - ux * s * 0.7]], { fill: farbe, ink, width: 8 });
};
/** Wasser-Tropfen-Punkte entlang einer Linie, laufen mit der Zeit. */
const fliessen = (pen: Pen, pts: Pt[], t: number, n: number, r: number, farbe: string) => {
  const seg: number[] = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  for (let j = 0; j < n; j++) {
    let d = (((j / n + t * 0.25) % 1) + 1) % 1 * L;
    for (let i = 1; i < pts.length; i++) {
      if (d <= seg[i - 1]) { const k = d / seg[i - 1]; pen.dot(pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * k, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * k, r, farbe); break; }
      d -= seg[i - 1];
    }
  }
};

/** Daten der Wasserkarte: die elf Leitungen Roms (Name, Jahr, Richtung in Grad, Länge auf der Karte, Knick). */
const LEITUNGEN: [string, string, number, number, number][] = [
  ["AQUA APPIA", "312 BC", 120, 0.45, 10], ["ANIO VETUS", "272 BC", 75, 0.95, -12], ["AQUA MARCIA", "144 BC", 62, 1.0, 14], ["AQUA TEPULA", "125 BC", 98, 0.7, -6],
  ["AQUA JULIA", "33 BC", 104, 0.74, 8], ["AQUA VIRGO", "19 BC", 35, 0.6, -18], ["AQUA ALSIETINA", "2 BC", 250, 0.65, 10], ["AQUA CLAUDIA", "52 AD", 82, 0.98, 6],
  ["ANIO NOVUS", "52 AD", 70, 1.0, -8], ["AQUA TRAIANA", "109 AD", 235, 0.85, -12], ["AQUA ALEXANDRINA", "226 AD", 88, 0.55, 16],
];

export const AQUA_KARTEN = {
  /** Gefälle (B0165): Längsschnitt einer Leitung (links Hügel mit Quelle, rechts die Stadt), Gefälle stark überhöht; `fortschritt`
   *  0…1 zeichnet die Rinne von der Quelle her, `zeit` lässt Wasser fliessen. `neigung` 0…2: 1 = richtig (fliesst, grüner Haken),
   *  0 = flach (Wasser steht, rotes X), 2 = steil (schäumt, rotes X); gleitet als Regler. `beule` 0…1 = falscher Buckel in der Mitte
   *  (Wasser staut und spritzt über, rotes X). `zeichen` "auto" / "x" / "haken" / "". Schild mit `wert` und `pro` (leer = kein Schild).
   *  `fluss` true = Fluss unten im Tal; `pfeil` 0…1 = Pfeil vom Fluss will den Hügel hinauf und fällt zurück (rotes X). */
  gefaelle: { design: [1600, 800], defaults: { fortschritt: 1, zeit: 0, neigung: 1, beule: 0, zeichen: "auto", wert: "34 CM", pro: "PER KM", km: 90, titel: "ALWAYS A LITTLE DOWNHILL", fluss: false, pfeil: 0 }, draw: (pen, p, c) => {
    rahmen(pen, 1600, 800, c, str(p, "titel"), "#d9f1fb");
    const f = k01(num(p, "fortschritt")), t = num(p, "zeit"), ng = Math.max(0, Math.min(2, num(p, "neigung"))), bu = k01(num(p, "beule"));
    const x0 = 140, x1 = 1460, ym = 400, steig = ng <= 1 ? ng * 155 : 155 + (ng - 1) * 260;
    const yA = (x: number) => { const u = (x - x0) / (x1 - x0); return ym - steig + u * 2 * steig - bu * 120 * Math.exp(-((u - 0.5) ** 2) / 0.012); };
    const huegel = Pen.poly([[20, 780], [20, 330], [120, 230], [260, 270], [420, 360], [700, 470], [1000, 520], [1300, 560], [1580, 580], [1580, 780]], true);
    pen.clip(Pen.rrect(20, 20, 1560, 760, 40), () => {
      pen.shape(huegel, { fill: "#8cc43a", ink: c.ink, width: 10 });
      if (p.fluss) { pen.line([[20, 740], [500, 720], [900, 745], [1580, 725]], 46, c.ink, true); pen.line([[20, 740], [500, 720], [900, 745], [1580, 725]], 32, WASSER, true); }
      for (let i = 0; i < 6; i++) {
        const hx = 1240 + i * 52, hh = 50 + ((i * 29) % 50);
        pen.rrect(hx, 600 - hh, 44, hh, 4, { fill: ["#f6d38a", "#f2b07a", "#e9e0c8"][i % 3], ink: c.ink, width: 6 });
        pen.poly([[hx - 4, 600 - hh], [hx + 22, 580 - hh], [hx + 48, 600 - hh]], { fill: "#cf6a3e", ink: c.ink, width: 5 });
      }
    });
    const pts: Pt[] = []; for (let i = 0; i <= 60; i++) { const x = x0 + (x1 - x0) * (i / 60); pts.push([x, yA(x)]); }
    for (let x = x0 + 70; x < x1 - 60; x += 120) { const y = yA(x); pen.rrect(x - 13, y + 16, 26, Math.max(10, 760 - y - 30), 6, { fill: STEIN, ink: c.ink, width: 6 }); }
    const unten = pts.map(([x, y]) => [x, y + 16] as Pt);
    pen.line(unten, 30, c.ink, true); pen.line(unten, 18, STEIN, true);
    const nf = Math.max(1, Math.round(60 * f)), voll = pts.slice(0, nf + 1);
    if (f > 0) {
      if (bu > 0.05) {   // Stau vor dem Buckel, Spritzer
        const bis = voll.filter(([x]) => x < x0 + (x1 - x0) * 0.45);
        if (bis.length > 1) { pen.line(bis, 20 + 26 * bu, WASSER, true); fliessen(pen, bis, t * 0.4, 10, 5, WASSER_HELL); }
        const sx = x0 + (x1 - x0) * 0.44, sy = yA(sx);
        for (let i = 0; i < 7; i++) { const a = -Math.PI / 2 + (i - 3) * 0.32, r = (40 + 30 * Math.abs(Math.sin(t * 6 + i))) * bu; pen.dot(sx + Math.cos(a) * r, sy - 20 + Math.sin(a) * r, 9, WASSER); }
      } else if (ng < 0.25) pen.line(voll, 20, mixHex(WASSER, "#6a8a5a", 0.35), true);
      else { pen.line(voll, 20, WASSER, true); fliessen(pen, voll, t * (0.4 + ng * 0.8), 22, 5, WASSER_HELL); }
      if (ng > 1.4 && bu < 0.05) for (let i = 0; i < 14; i++) {
        const [sx, sy] = voll[Math.floor((i * 7 + t * 20) % voll.length)];
        pen.dot(sx + ((i * 13) % 20) - 10, sy - 16 - ((i * 11) % 18), 8 + (i % 3) * 3, "#ffffff");
      }
    }
    pen.poly([[x0 - 50, yA(x0) - 70], [x0 + 50, yA(x0) - 70], [x0 + 40, yA(x0) + 30], [x0 - 40, yA(x0) + 30]], { fill: STEIN, ink: c.ink, width: 8 });
    pen.text("SPRING", x0, yA(x0) - 100, { font: c.fonts.display, size: 34, color: c.ink, rand: { color: c.paper, width: 8 } });
    pen.text("ROME", 1400, 470, { font: c.fonts.display, size: 40, color: c.ink, rand: { color: c.paper, width: 8 } });
    if (str(p, "wert")) {
      pen.rrect(560, 620, 480, 130, 30, { fill: c.paper, ink: c.ink, width: 10 });
      pen.text(str(p, "wert"), 800, 670, { font: c.fonts.display, size: 64, color: c.red, maxWidth: 440 });
      pen.text(num(p, "km") > 0 ? `${str(p, "pro")} · ${Math.round(num(p, "km"))} KM` : str(p, "pro"), 800, 726, { font: c.fonts.serif, size: 34, color: c.ink, weight: "bold", maxWidth: 440 });
    }
    const pf = k01(num(p, "pfeil"));
    if (pf > 0) {   // Pfeil vom Fluss hinauf: steigt, fällt zurück
      const hoch = pf < 0.6 ? pf / 0.6 : 1 - ((pf - 0.6) / 0.4) * 0.9, a: Pt = [360, 720], b: Pt = [360 - 120 * hoch, 720 - 360 * hoch];
      if (hoch > 0.05) pfeil(pen, a, b, 14, WASSER, c.ink);
      if (pf > 0.7) { pen.line([[200, 400], [300, 500]], 26, c.red); pen.line([[300, 400], [200, 500]], 26, c.red); }
    }
    const z = str(p, "zeichen"), zeig = z === "auto" ? (bu > 0.3 || Math.abs(ng - 1) > 0.5 ? "x" : f >= 1 && Math.abs(ng - 1) < 0.15 && bu < 0.05 ? "haken" : "") : z;
    if (zeig === "x") { pen.ellipse(1440, 170, 80, 80, { fill: c.paper, ink: c.ink, width: 10 }); pen.line([[1395, 125], [1485, 215]], 26, c.red); pen.line([[1485, 125], [1395, 215]], 26, c.red); }
    if (zeig === "haken") { pen.ellipse(1440, 170, 80, 80, { fill: c.paper, ink: c.ink, width: 10 }); pen.line([[1395, 170], [1430, 210], [1490, 120]], 28, c.green); }
  } },
  /** Siphon (B0166): umgekehrter Heber – Kopfbecken links hoch, Rohr durchs Tal (über die Rohrbrücke), Empfangsbecken rechts etwas
   *  tiefer; `fuellung` 0…1 füllt das Rohr von links, `zeit` lässt Punkte fliessen; gestrichelte Linie zeigt die Höhe. */
  siphon: { design: [1600, 900], defaults: { fuellung: 1, zeit: 0, titel: "THE INVERTED SIPHON", links: "HEADER TANK", rechts: "RECEIVING TANK" }, draw: (pen, p, c) => {
    rahmen(pen, 1600, 900, c, str(p, "titel"), "#d9f1fb");
    const f = k01(num(p, "fuellung")), t = num(p, "zeit");
    const tal = Pen.poly([[20, 300], [300, 330], [520, 640], [700, 740], [900, 740], [1080, 640], [1300, 360], [1580, 350], [1580, 880], [20, 880]], true);
    pen.clip(Pen.rrect(20, 20, 1560, 860, 40), () => { pen.shape(tal, { fill: "#8cc43a", ink: c.ink, width: 10 }); pen.line([[640, 770], [960, 770]], 26, WASSER); });
    const rohr: Pt[] = [[250, 300], [320, 340], [520, 640], [700, 700], [900, 700], [1080, 640], [1300, 380], [1360, 345]];
    for (let x = 700; x <= 900; x += 50) pen.rrect(x - 14, 706, 28, 34, 4, { fill: STEIN, ink: c.ink, width: 5 });
    pen.line(rohr, 40, c.ink, true); pen.line(rohr, 26, BLEI, true);
    const seg: number[] = []; let L = 0; for (let i = 1; i < rohr.length; i++) { const l = Math.hypot(rohr[i][0] - rohr[i - 1][0], rohr[i][1] - rohr[i - 1][1]); seg.push(l); L += l; }
    let rest = L * f; const voll: Pt[] = [rohr[0]];
    for (let i = 1; i < rohr.length && rest > 0; i++) { const k = Math.min(1, rest / seg[i - 1]); voll.push([rohr[i - 1][0] + (rohr[i][0] - rohr[i - 1][0]) * k, rohr[i - 1][1] + (rohr[i][1] - rohr[i - 1][1]) * k]); rest -= seg[i - 1]; }
    if (f > 0) { pen.line(voll, 14, WASSER); fliessen(pen, voll, t, 26, 4, WASSER_HELL); }
    for (const [x, y, w, txt, lvl] of [[190, 300, 170, str(p, "links"), 1], [1420, 345, 170, str(p, "rechts"), f > 0.97 ? 0.8 : 0.15]] as const) {
      pen.rrect(x - w / 2, y - 130, w, 150, 10, { fill: STEIN, ink: c.ink, width: 10 });
      pen.rrect(x - w / 2 + 18, y - 112 + 112 * (1 - lvl), w - 36, 112 * lvl, 4, { fill: WASSER });
      pen.text(txt, x, y - 165, { font: c.fonts.display, size: 30, color: c.ink, maxWidth: 300, rand: { color: c.paper, width: 8 } });
    }
    for (let x = 300; x < 1340; x += 40) pen.line([[x, 190], [x + 20, 190 + 0.04 * 20]], 5, "rgba(26,16,32,0.55)");
    pen.text("WATER FINDS ITS OWN LEVEL", 800, 172, { font: c.fonts.serif, size: 30, color: c.ink, weight: "bold" });
    pfeil(pen, [800, 560], [800, 660], 10, c.red, c.ink);
    pen.text("PRESSURE", 800, 530, { font: c.fonts.display, size: 34, color: c.red, rand: { color: c.paper, width: 8 } });
  } },
  /** Bleirohr (B0167): Rohr im Schnitt (Ring aus Blei) mit Kalkschicht innen, die mit `kalk` 0…1 wächst; Wasser in der Mitte;
   *  Stempel auf dem Rohr (`stempel`), Zeichen Pb; `schild` unten. */
  bleirohr: { design: [1400, 900], defaults: { kalk: 1, zeit: 0, stempel: "AQUA CLAUDIA", schild: "LIMESCALE PROTECTED THE WATER", warnung: 0, schnitt: true, titel: "LEAD PIPE" }, draw: (pen, p, c) => {
    rahmen(pen, 1400, 900, c, str(p, "titel"));
    const kk = k01(num(p, "kalk")), t = num(p, "zeit"), cx = 420, cy = 470, R = 250, wa = k01(num(p, "warnung"));
    if (p.schnitt !== false) {
    pen.ellipse(cx, cy, R, R, { fill: BLEI, ink: c.ink, width: LW });
    pen.ellipse(cx - 60, cy - 90, 60, 120, { fill: "rgba(255,255,255,0.25)" }, -0.5);
    const ri = 170, rk = ri - 70 * kk;
    pen.ellipse(cx, cy, ri, ri, { fill: KALK, ink: c.ink, width: 8 });
    for (let i = 0; i < 4 * kk; i++) pen.ellipse(cx, cy, rk + (ri - rk) * (i / 4), rk + (ri - rk) * (i / 4), { ink: "rgba(170,150,110,0.6)", width: 4 });
    pen.ellipse(cx, cy, rk, rk, { fill: WASSER, ink: c.ink, width: 6 });
    for (let i = 0; i < 6; i++) { const a = t * 1.5 + i; pen.dot(cx + Math.cos(a) * rk * 0.55, cy + Math.sin(a * 1.3) * rk * 0.55, 10, WASSER_HELL); }
    pen.text("Pb", cx + 190, cy - 200, { font: c.fonts.display, size: 70, color: c.ink, rand: { color: c.paper, width: 12 } });
    pfeil(pen, [cx + 120, cy - 40], [cx + 40, cy - 10], 8, c.red, c.ink);
    pen.text("CALCIUM", 640, 600, { font: c.fonts.display, size: 34, color: c.ink, rand: { color: c.paper, width: 8 } });
    }
    const rx = 760, ry = 380;   // Rohr von der Seite mit Stempel
    pen.rrect(rx, ry, 560, 150, 75, { fill: BLEI, ink: c.ink, width: LW });
    pen.line([[rx + 40, ry + 40], [rx + 520, ry + 40]], 16, "rgba(255,255,255,0.35)");
    pen.rrect(rx + 80, ry + 52, 400, 66, 10, { fill: darker(BLEI, 0.85), ink: c.ink, width: 6 });
    pen.text(str(p, "stempel"), rx + 280, ry + 86, { font: c.fonts.serif, size: 38, color: "#2b2f3a", weight: "bold", maxWidth: 380 });
    if (wa > 0) {   // Warnung: Totenkopf mit Funkeln über dem Rohr
      const sx = 1040, sy = 230, k = 0.6 + 0.4 * wa, fu = 0.5 + 0.5 * Math.sin(t * 8);
      pen.ellipse(sx, sy, 90 * k, 80 * k, { fill: "#f4f2ec", ink: c.ink, width: 10 });
      pen.rrect(sx - 50 * k, sy + 50 * k, 100 * k, 50 * k, 12, { fill: "#f4f2ec", ink: c.ink, width: 10 });
      for (const d of [-1, 1]) pen.ellipse(sx + d * 34 * k, sy, 22 * k, 26 * k, { fill: c.ink });
      pen.poly([[sx, sy + 22 * k], [sx - 12 * k, sy + 44 * k], [sx + 12 * k, sy + 44 * k]], { fill: c.ink });
      for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + t; pen.poly(star(sx + Math.cos(a) * 140 * k, sy + Math.sin(a) * 120 * k, 26 * fu * wa + 6, 8, 4), { fill: c.gold, ink: c.ink, width: 4 }); }
    }
    pen.rrect(160, 760, 1080, 90, 26, { fill: c.paper, ink: c.ink, width: 8 });
    pen.text(str(p, "schild"), 700, 806, { font: c.fonts.display, size: 40, color: c.ink, maxWidth: 1020 });
  } },
  /** Verteiler (B0168): Wasserschloss von oben – Zulauf links in ein Becken, drei Ausgänge nach rechts mit Namen und kleinem Bild
   *  (Brunnen, Bad, Haus); `fortschritt` 0…1 füllt nacheinander die Ausgänge; `pegel` 0…1 = Wasserstand im Becken: unter 2/3 stoppt
   *  der dritte Ausgang, unter 1/3 der zweite, der erste läuft immer; `nummern` zeigt die Rangfolge. */
  verteiler: { design: [1600, 900], defaults: { fortschritt: 1, pegel: 1, zeit: 0, ausgaenge: "FOUNTAINS|BATHS|HOMES", nummern: true, titel: "THE CASTELLUM" }, draw: (pen, p, c) => {
    rahmen(pen, 1600, 900, c, str(p, "titel"));
    const f = k01(num(p, "fortschritt")), pg = k01(num(p, "pegel")), t = num(p, "zeit"), namen = str(p, "ausgaenge").split("|");
    pen.line([[60, 470], [420, 470]], 70, c.ink); pen.line([[60, 470], [420, 470]], 52, STEIN); pen.line([[60, 470], [420, 470]], 10 + 20 * pg, WASSER);
    fliessen(pen, [[60, 470], [420, 470]], t, 8, 6, WASSER_HELL);
    pen.ellipse(560, 470, 190, 190, { fill: STEIN, ink: c.ink, width: LW });
    pen.ellipse(560, 470, 150, 150, { fill: mixHex(STEIN, WASSER, 0.2 + 0.8 * pg), ink: c.ink, width: 8 });
    for (let i = 0; i < 3; i++) { const r = 40 + ((t * 40 + i * 40) % 120); pen.ellipse(560, 470, r, r, { ink: `rgba(255,255,255,${(0.5 * pg).toFixed(2)})`, width: 5 }); }
    namen.forEach((n, i) => {
      const y = 230 + i * 240, offen = pg > i / 3 - 0.001, u = offen ? k01((f - i / namen.length) * namen.length) : 0, a: Pt = [700, 470 + (i - 1) * 80], b: Pt = [1050, y];
      pen.line([a, b], 40, c.ink); pen.line([a, b], 26, BLEI);
      if (u > 0) { const m: Pt = [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; pen.line([a, m], 14, WASSER); fliessen(pen, [a, m], t, 6, 4, WASSER_HELL); }
      pen.rrect(1060, y - 60, 470, 120, 30, { fill: u >= 1 ? c.paper : mixHex(c.paper, "#9a9aa0", 0.4), ink: c.ink, width: 8 });
      pen.text(n, 1330, y + 2, { font: c.fonts.display, size: 38, color: c.ink, maxWidth: 330 });
      const ix = 1130, iy = y;   // kleines Bild
      if (i === 0) {
        pen.rrect(ix - 34, iy + 4, 68, 30, 8, { fill: STEIN, ink: c.ink, width: 5 }); pen.line([[ix, iy + 4], [ix, iy - 30]], 8, c.ink);
        if (u >= 1) pen.line([[ix, iy - 30], [ix + 18, iy - 40], [ix + 28, iy - 10]], 7, WASSER, true);
      } else if (i === 1) {
        pen.rrect(ix - 38, iy - 4, 76, 36, 10, { fill: WASSER, ink: c.ink, width: 5 });
        if (u >= 1) for (const d of [-16, 0, 16]) pen.line([[ix + d, iy - 10], [ix + d + 6, iy - 26], [ix + d, iy - 42]], 5, "#9aa4b8", true);
      } else {
        pen.rrect(ix - 30, iy - 14, 60, 46, 4, { fill: "#f6d38a", ink: c.ink, width: 5 });
        pen.poly([[ix - 38, iy - 14], [ix, iy - 44], [ix + 38, iy - 14]], { fill: "#cf6a3e", ink: c.ink, width: 5 });
      }
      if (!offen && f > 0) { pen.line([[1470, y - 30], [1515, y + 30]], 14, c.red); pen.line([[1515, y - 30], [1470, y + 30]], 14, c.red); }
      if (p.nummern !== false) { pen.ellipse(1060, y - 60, 34, 34, { fill: c.gold, ink: c.ink, width: 6 }); pen.text(String(i + 1), 1060, y - 58, { font: c.fonts.display, size: 38, color: c.ink }); }
    });
  } },
  /** Wasserkarte (B0169): Rom in der Mitte (goldener Kreis), die elf Leitungen laufen mit `fortschritt` 0…1 nacheinander von den
   *  Bergen in die Stadt; `namen` zeigt Name und Jahr; `zahl` zählt die fertigen Leitungen. */
  wasserkarte: { design: [1600, 1000], defaults: { fortschritt: 1, zeit: 0, namen: true, titel: "11 AQUEDUCTS INTO ROME" }, draw: (pen, p, c) => {
    rahmen(pen, 1600, 1000, c, str(p, "titel"));
    const f = k01(num(p, "fortschritt")), t = num(p, "zeit"), cx = 760, cy = 560;
    for (let i = 0; i < 7; i++) { const a = (-40 + i * 22) * Math.PI / 180, d = 380 + (i % 2) * 40; pen.poly([[cx + Math.cos(a) * d - 60, cy - Math.sin(a) * d + 30], [cx + Math.cos(a) * d, cy - Math.sin(a) * d - 60], [cx + Math.cos(a) * d + 60, cy - Math.sin(a) * d + 30]], { fill: "#a8b07a", ink: c.ink, width: 6 }); }
    pen.line([[180, 980], [420, 760], [cx - 30, cy + 20], [cx + 10, cy + 120], [700, 980]], 30, "#7fc6e6", true);
    let fertig = 0;
    LEITUNGEN.forEach(([name, jahr, grad, len, knick], i) => {
      const u = k01(((f - i / LEITUNGEN.length) * LEITUNGEN.length) / 0.9); if (u <= 0) return;
      const a = grad * Math.PI / 180, d = 420 * len, ak = (grad + knick) * Math.PI / 180;
      const pts: Pt[] = [[cx + Math.cos(a) * d, cy - Math.sin(a) * d], [cx + Math.cos(ak) * d * 0.5, cy - Math.sin(ak) * d * 0.5], [cx + Math.cos(a) * 40, cy - Math.sin(a) * 40]];
      const zug: Pt[] = [pts[0]], l1 = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]), l2 = Math.hypot(pts[2][0] - pts[1][0], pts[2][1] - pts[1][1]), r = (l1 + l2) * u;
      if (r <= l1) zug.push([pts[0][0] + (pts[1][0] - pts[0][0]) * r / l1, pts[0][1] + (pts[1][1] - pts[0][1]) * r / l1]);
      else { zug.push(pts[1], [pts[1][0] + (pts[2][0] - pts[1][0]) * (r - l1) / l2, pts[1][1] + (pts[2][1] - pts[1][1]) * (r - l1) / l2]); }
      pen.line(zug, 18, c.ink); pen.line(zug, 9, WASSER);
      if (u >= 1) { fertig++; fliessen(pen, pts, t + i * 0.3, 4, 4, "#ffffff"); }
      pen.dot(pts[0][0], pts[0][1], 12, WASSER);
      if (p.namen !== false) pen.text(`${name} · ${jahr}`, pts[0][0], pts[0][1] - 30, { font: c.fonts.serif, size: 22, color: c.ink, weight: "bold", maxWidth: 300, rand: { color: c.paper, width: 7 } });
    });
    pen.ellipse(cx, cy, 70, 70, { fill: c.gold, ink: c.ink, width: 10 });
    pen.text("ROMA", cx, cy + 4, { font: c.fonts.display, size: 38, color: c.ink });
    pen.rrect(80, 820, 280, 120, 30, { fill: c.paper, ink: c.ink, width: 8 });
    pen.text(String(fertig), 220, 884, { font: c.fonts.display, size: 80, color: c.red });
  } },
  /** Balkenvergleich (B0170): waagrechte Balken mit Namen und Wert (`werte` "NAME:Zahl|…"), wachsen mit `fortschritt` 0…1;
   *  `einheit` hinter der Zahl, `hervor` = Index des roten Balkens. */
  balkenvergleich: { design: [1500, 900], defaults: { fortschritt: 1, werte: "ANCIENT ROME:1000|LONDON TODAY:140|NEW YORK TODAY:380", einheit: "LITRES / PERSON / DAY", hervor: 0, titel: "WATER PER PERSON" }, draw: (pen, p, c) => {
    rahmen(pen, 1500, 900, c, str(p, "titel"));
    const f = k01(num(p, "fortschritt")), liste = str(p, "werte").split("|").map((s) => { const [n, v] = s.split(":"); return [n, Number(v) || 0] as const; });
    const max = Math.max(1, ...liste.map((l) => l[1])), n = liste.length, h = Math.min(130, 600 / n - 30), hv = num(p, "hervor");
    liste.forEach(([name, v], i) => {
      const y = 170 + i * (600 / n) + 20, w = 900 * (v / max) * f;
      pen.text(name, 320, y + h / 2, { font: c.fonts.display, size: 34, color: c.ink, maxWidth: 260, align: "right" });
      pen.rrect(350, y, Math.max(24, w), h, 18, { fill: i === hv ? c.red : WASSER, ink: c.ink, width: 8 });
      pen.text(String(Math.round(v * f)), 350 + Math.max(24, w) + 90, y + h / 2, { font: c.fonts.display, size: 46, color: c.ink, maxWidth: 170 });
    });
    pen.text(str(p, "einheit"), 750, 830, { font: c.fonts.serif, size: 34, color: c.ink, weight: "bold" });
  } },
  /** Becken-Uhr (B0171): Uhr mit laufendem Zeiger (`zeit`) neben einem Schwimmbecken, das sich mit `fuellung` 0…1 füllt;
   *  `zahl` gross (z. B. "1 POOL"), `text` darunter (z. B. "EVERY 2 MINUTES"). */
  "pool-uhr": { design: [1500, 900], defaults: { fuellung: 0.6, zeit: 0, zahl: "1 OLYMPIC POOL", text: "EVERY 3 MINUTES" }, draw: (pen, p, c) => {
    rahmen(pen, 1500, 900, c, "");
    const f = k01(num(p, "fuellung")), t = num(p, "zeit"), cx = 330, cy = 420;
    pen.ellipse(cx, cy, 220, 220, { fill: c.paper, ink: c.ink, width: LW });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; pen.line([[cx + Math.sin(a) * 180, cy - Math.cos(a) * 180], [cx + Math.sin(a) * 205, cy - Math.cos(a) * 205]], 10, c.ink); }
    const a = t * Math.PI * 2 / 6, b = t * Math.PI * 2 / 72;
    pen.line([[cx, cy], [cx + Math.sin(b) * 110, cy - Math.cos(b) * 110]], 18, c.ink);
    pen.line([[cx, cy], [cx + Math.sin(a) * 170, cy - Math.cos(a) * 170]], 10, c.red);
    pen.dot(cx, cy, 16, c.ink);
    const px = 640, py = 230, pw = 760, ph = 380;
    pen.rrect(px, py, pw, ph, 20, { fill: "#e9f0f2", ink: c.ink, width: LW });
    pen.clip(Pen.rrect(px + 20, py + 20, pw - 40, ph - 40, 10), () => {
      const top = py + 20 + (ph - 40) * (1 - f);
      pen.rrect(px + 20, top, pw - 40, ph, 0, { fill: WASSER });
      pen.line(Array.from({ length: 30 }, (_, i) => [px + 20 + i * (pw - 40) / 29, top + 8 * Math.sin(i * 0.8 + t * 4)] as Pt), 10, WASSER_HELL, true);
      for (let i = 1; i < 8; i++) pen.line([[px + 20 + i * (pw - 40) / 8, top + 30], [px + 20 + i * (pw - 40) / 8, py + ph]], 6, "rgba(255,255,255,0.45)");
    });
    pen.text(str(p, "zahl"), 1020, 700, { font: c.fonts.display, size: 70, color: c.ink, maxWidth: 820 });
    pen.text(str(p, "text"), 1020, 790, { font: c.fonts.display, size: 52, color: c.red, maxWidth: 820 });
  } },
  /** Amtsstempel (B0172): Stempel (Holzgriff) kommt mit `druck` 0…1 von oben und hinterlässt einen schrägen Abdruck mit `text`
   *  (und kleiner Zeile `zeile`); `farbe` "rot" / "blau". */
  amtsstempel: { design: [1200, 1000], defaults: { druck: 1, text: "STOLEN WATER", zeile: "CURATOR AQUARUM", farbe: "rot" }, draw: (pen, p, c) => {
    const d = k01(num(p, "druck")), farbe = str(p, "farbe") === "blau" ? "#2f6fd0" : c.red, lift = (1 - Math.min(1, d * 1.6)) * 420 + Math.max(0, d - 0.75) * 4 * 240;
    if (d > 0.62) pen.turn(600, 640, -8, () => {
      pen.rrect(160, 500, 880, 280, 30, { ink: farbe, width: 22 });
      pen.rrect(190, 530, 820, 220, 20, { ink: farbe, width: 8 });
      pen.text(str(p, "text"), 600, 630, { font: c.fonts.display, size: 96, color: farbe, maxWidth: 780 });
      pen.text(str(p, "zeile"), 600, 712, { font: c.fonts.serif, size: 40, color: farbe, weight: "bold", maxWidth: 700 });
    });
    if (d < 0.99) pen.shift(0, -lift, () => {
      pen.rrect(300, 380, 600, 120, 20, { fill: "#8a5a32", ink: c.ink, width: LW });
      pen.rrect(330, 480, 540, 40, 8, { fill: farbe, ink: c.ink, width: 8 });
      pen.rrect(540, 170, 120, 220, 30, { fill: "#a8743f", ink: c.ink, width: LW });
      pen.ellipse(600, 160, 120, 70, { fill: "#a8743f", ink: c.ink, width: LW });
    });
  } },
  /** Bohrkern (B0173): Kern aus dem Seegrund im Schnitt (Schichten), daneben eine Kurve (Blei im Wasser) über die Jahre; `fortschritt`
   *  0…1 zeichnet die Kurve von unten (alt) nach oben (neu); `spitze` markiert die Römerzeit. */
  bohrkern: { design: [1300, 1100], defaults: { fortschritt: 1, spitze: "ROMAN EMPIRE", titel: "WHAT THE LAKE REMEMBERS" }, draw: (pen, p, c) => {
    rahmen(pen, 1300, 1100, c, str(p, "titel"));
    const f = k01(num(p, "fortschritt")), x = 160, w = 220, y0 = 160, y1 = 1020, farben = ["#b9a07a", "#8f7a5c", "#d8c8a0", "#6e6a62", "#a68a64", "#cdb890"];
    pen.rrect(x - 16, y0 - 10, w + 32, y1 - y0 + 20, 24, { fill: "#d6dbe2", ink: c.ink, width: LW });
    let y = y0; for (let i = 0; y < y1; i++) { const h = 30 + ((i * 37) % 70); pen.rrect(x, y, w, Math.min(h, y1 - y), 0, { fill: farben[i % farben.length] }); y += h; }
    pen.rrect(x, y0, w, y1 - y0, 10, { ink: c.ink, width: 8 });
    pen.text("TODAY", x + w + 90, y0 + 20, { font: c.fonts.display, size: 30, color: c.ink });
    pen.text("OLDER", x + w + 90, y1 - 20, { font: c.fonts.display, size: 30, color: c.ink });
    const gx = 600, gw = 560, kurve = (u: number) => { const yy = y1 - u * (y1 - y0); const rom = Math.exp(-((u - 0.55) ** 2) / 0.004); const neu = Math.exp(-((u - 0.93) ** 2) / 0.002); return [gx + 30 + gw * (0.08 + 0.55 * rom + 0.75 * neu), yy] as Pt; };
    pen.line([[gx, y0], [gx, y1]], 8, c.ink); pen.text("LEAD", gx + gw / 2, y1 + 40 > 1060 ? y0 - 20 : y1 + 40, { font: c.fonts.display, size: 30, color: c.ink });
    const pts: Pt[] = []; for (let i = 0; i <= 120 * f; i++) pts.push(kurve(i / 120));
    if (pts.length > 1) pen.line(pts, 12, c.red, true);
    if (f > 0.6) { const [sx, sy] = kurve(0.55); pen.ellipse(sx, sy, 34, 34, { ink: c.ink, width: 8 }); pen.rrect(sx - 250, sy - 130, 340, 80, 20, { fill: c.paper, ink: c.ink, width: 8 }); pen.text(str(p, "spitze"), sx - 80, sy - 88, { font: c.fonts.display, size: 32, color: c.red, maxWidth: 310 }); }
    for (const u of [0.55, 0.93]) pen.line([[x + w, kurve(u)[1]], [gx, kurve(u)[1]]], 4, "rgba(26,16,32,0.4)");
  } },
  /** Becher-Rangliste (B0174): Becher nebeneinander auf Stufen (1. Platz in der Mitte), jeder mit Name und Klarheit des Wassers;
   *  `zeigen` 0…n deckt die Plätze nacheinander auf; `namen` "NAME|NAME|NAME". */
  "becher-rangliste": { design: [1500, 1000], defaults: { zeigen: 3, namen: "AQUA MARCIA|AQUA VIRGO|ANIO NOVUS", titel: "FRONTINUS' RANKING" }, draw: (pen, p, c) => {
    rahmen(pen, 1500, 1000, c, str(p, "titel"));
    const z = num(p, "zeigen"), namen = str(p, "namen").split("|");
    const PL: [number, number, string, string][] = [[750, 620, "1", c.gold], [430, 700, "2", "#c9ccd4"], [1070, 760, "3", "#d08a4a"]];
    const klar = [WASSER_HELL, "#8ed6ee", "#b8b07a"];
    PL.forEach(([x, top, nr, med], i) => {
      pen.rrect(x - 150, top, 300, 940 - top, 10, { fill: STEIN, ink: c.ink, width: 10 });
      pen.text(nr, x, top + 70, { font: c.fonts.display, size: 80, color: darker(STEIN, 0.6) });
      const u = k01(z - (2 - i)); if (u <= 0) return;
      const by = top - 20;
      pen.shift(0, (1 - u) * 60, () => {
        pen.poly([[x - 80, by - 260], [x + 80, by - 260], [x + 55, by - 70], [x - 55, by - 70]], { fill: "rgba(230,245,255,0.6)", ink: c.ink, width: 10 });
        pen.poly([[x - 72, by - 210], [x + 72, by - 210], [x + 56, by - 78], [x - 56, by - 78]], { fill: klar[i] });
        pen.rrect(x - 14, by - 72, 28, 50, 4, { fill: "rgba(230,245,255,0.8)", ink: c.ink, width: 6 });
        pen.ellipse(x, by - 18, 70, 16, { fill: "rgba(230,245,255,0.8)", ink: c.ink, width: 6 });
        pen.ellipse(x - 40, by - 180, 10, 40, { fill: "rgba(255,255,255,0.7)" });
        pen.ellipse(x + 110, by - 240, 34, 34, { fill: med, ink: c.ink, width: 6 });
        pen.text(namen[i] ?? "", x, by - 300, { font: c.fonts.display, size: 34, color: c.ink, maxWidth: 330, rand: { color: c.paper, width: 8 } });
      });
    });
  } },
} satisfies Record<string, KarteDef>;
