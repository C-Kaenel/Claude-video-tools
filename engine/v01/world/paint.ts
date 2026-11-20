// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Gemalte Texturen: im Code auf eine Leinwand (Canvas) gemalt, mit festem Startwert – gleiche Eingabe = gleiches Bild.
// Jede Textur kennt ihre Kachelgrösse in Metern (`meters`); die Geometrie-Helfer in kit.ts rechnen die Wiederholung aus.
// Fugen sind dunkel getönt (nie reines Schwarz), Steine leicht unregelmässig – wie von Hand gemalt.
import * as THREE from "three";
import { Rng } from "../core/random";

export type Painted = { tex: THREE.CanvasTexture; meters: number };
type Ctx = CanvasRenderingContext2D;

const cache = new Map<string, Painted>();
const SIZE = 512;

/** Farbe als Hex aufhellen/abdunkeln (f > 1 heller, f < 1 dunkler) und leicht verschieben. */
export const shade = (hex: string, f: number, warm = 0) => {
  const c = new THREE.Color(hex); // lineare Werte
  const r = Math.min(1, c.r * f * (1 + warm)), g = Math.min(1, c.g * f), b = Math.min(1, c.b * f * (1 - warm));
  return "#" + new THREE.Color(r, g, b).getHexString();
};

const make = (key: string, meters: number, paint: (g: Ctx, rng: Rng, s: number) => void): Painted => {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) | 0;
  paint(g, new Rng(seed), SIZE);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  const p = { tex, meters };
  cache.set(key, p);
  return p;
};

/** Gerundetes Rechteck, an den Kanten der Kachel umbrechend (damit die Textur nahtlos wiederholt). */
const wrapRect = (g: Ctx, s: number, x: number, y: number, w: number, h: number, r: number) => {
  for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) {
    if (x + dx > s || x + dx + w < 0 || y + dy > s || y + dy + h < 0) continue;
    g.beginPath(); g.roundRect(x + dx, y + dy, w, h, r); g.fill();
  }
};
const speckle = (g: Ctx, rng: Rng, s: number, n: number, color: string, alpha: number, size = 2) => {
  g.fillStyle = color; g.globalAlpha = alpha;
  for (let i = 0; i < n; i++) g.fillRect(rng.range(0, s), rng.range(0, s), rng.range(1, size), rng.range(1, size));
  g.globalAlpha = 1;
};

/** Kopfsteinpflaster: gerundete Steine in versetzten Reihen. Kachel 2,6 m. */
export const cobble = (base: string, joint: string) => make(`cobble|${base}|${joint}`, 2.6, (g, rng, s) => {
  g.fillStyle = joint; g.fillRect(0, 0, s, s);
  const rows = 12, rh = s / rows;
  for (let r = 0; r < rows; r++) {
    const cols = 9, cw = s / cols, off = (r % 2) * cw * 0.5;
    for (let k = 0; k < cols; k++) {
      const w = cw * rng.range(0.8, 0.92), h = rh * rng.range(0.74, 0.88);
      g.fillStyle = shade(base, rng.range(0.82, 1.12), rng.range(-0.03, 0.03));
      wrapRect(g, s, off + k * cw + (cw - w) / 2 + rng.range(-2, 2), r * rh + (rh - h) / 2, w, h, Math.min(w, h) * 0.42);
      g.fillStyle = "rgba(255,255,255,0.10)"; // heller Rand oben = gemalte Wölbung
      wrapRect(g, s, off + k * cw + (cw - w) / 2 + w * 0.18, r * rh + (rh - h) / 2 + h * 0.12, w * 0.5, h * 0.22, h * 0.1);
    }
  }
});

/** Helle Pflasterplatten (Gehweg, Platz). Kachel 2 m. */
export const slabs = (base: string, joint: string) => make(`slabs|${base}|${joint}`, 2, (g, rng, s) => {
  g.fillStyle = joint; g.fillRect(0, 0, s, s);
  const rows = 4, rh = s / rows;
  for (let r = 0; r < rows; r++) {
    let x = (r % 2) * rh * 0.6;
    while (x < s + rh) {
      const w = rh * rng.pick([1, 1.5, 1.25]);
      g.fillStyle = shade(base, rng.range(0.92, 1.05));
      wrapRect(g, s, x + 2, r * rh + 2, w - 4, rh - 4, 3);
      x += w;
    }
  }
  speckle(g, rng, s, 500, "#000", 0.06, 3);
  g.strokeStyle = "rgba(60,50,40,0.22)"; g.lineWidth = 1.5; // feine Risse
  for (let i = 0; i < 6; i++) {
    let x = rng.range(0, s), y = rng.range(0, s);
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += rng.range(-18, 18); y += rng.range(-18, 18); g.lineTo(x, y); }
    g.stroke();
  }
});

/** Backstein: Läufer-Verband mit heller Fuge. Kachel 1,5 m. */
export const brick = (base: string, mortar: string) => make(`brick|${base}|${mortar}`, 1.5, (g, rng, s) => {
  g.fillStyle = mortar; g.fillRect(0, 0, s, s);
  const rows = 20, rh = s / rows, cols = 7, cw = s / cols;
  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * cw * 0.5;
    for (let k = -1; k < cols; k++) {
      g.fillStyle = shade(base, rng.range(0.8, 1.14), rng.range(-0.05, 0.05));
      wrapRect(g, s, off + k * cw + 2, r * rh + 2, cw - 4, rh - 4, 2);
    }
  }
  speckle(g, rng, s, 400, "#000", 0.07, 3);
});

/** Putz: fast glatt, mit weichen Flecken. Kachel 4 m. */
export const plaster = (base: string) => make(`plaster|${base}`, 4, (g, rng, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 40; i++) {
    const x = rng.range(0, s), y = rng.range(0, s), r = rng.range(20, 70);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    const tone = rng.next() < 0.5 ? "0,0,0" : "255,255,255";
    grad.addColorStop(0, `rgba(${tone},${rng.range(0.03, 0.06).toFixed(3)})`); grad.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = grad;
    for (const dx of [-s, 0, s]) for (const dy of [-s, 0, s]) g.fillRect(x - r + dx, y - r + dy, 2 * r, 2 * r);
  }
  speckle(g, rng, s, 300, "#000", 0.05, 2);
});

/** Wandkacheln (Laborfassade): kleine helle Fliesen mit grauer Fuge, leicht unterschiedlich. Kachel 1 m. */
export const kacheln = (base: string, joint: string) => make(`kacheln|${base}|${joint}`, 1, (g, rng, s) => {
  g.fillStyle = joint; g.fillRect(0, 0, s, s);
  const n = 6, w = s / n;
  for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) {
    g.fillStyle = shade(base, rng.range(0.95, 1.03));
    g.fillRect(k * w + 2, r * w + 2, w - 4, w - 4);
    g.fillStyle = "rgba(255,255,255,0.25)"; g.fillRect(k * w + 4, r * w + 4, w * 0.4, 3);
  }
});

/** Quadersteine (Sockel, Kai, Brückentürme). Kachel 3 m. */
export const blocks = (base: string, joint: string) => make(`blocks|${base}|${joint}`, 3, (g, rng, s) => {
  g.fillStyle = joint; g.fillRect(0, 0, s, s);
  const rows = 6, rh = s / rows;
  for (let r = 0; r < rows; r++) {
    let x = (r % 2) * rh;
    while (x < s + rh) {
      const w = rh * rng.range(1.4, 2.4);
      g.fillStyle = shade(base, rng.range(0.9, 1.07));
      wrapRect(g, s, x + 3, r * rh + 3, w - 6, rh - 6, 4);
      x += w;
    }
  }
  speckle(g, rng, s, 600, "#000", 0.06, 3);
  g.strokeStyle = "rgba(40,40,50,0.25)"; g.lineWidth = 1.5; // Kratzer
  for (let i = 0; i < 10; i++) {
    const x = rng.range(0, s), y = rng.range(0, s);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + rng.range(-14, 14), y + rng.range(-10, 10)); g.stroke();
  }
});

/** Holzbretter (Deck, Bank, Tür): Längsbretter mit Maserung. Kachel 2 m, Bretter laufen in u-Richtung. */
export const planks = (base: string, vertical = false) => make(`planks|${base}|${vertical}`, 2, (g, rng, s) => {
  if (vertical) { g.translate(s, 0); g.rotate(Math.PI / 2); } // Bretter senkrecht (Tür)
  const rows = 8, rh = s / rows;
  for (let r = 0; r < rows; r++) {
    g.fillStyle = shade(base, rng.range(0.86, 1.1));
    g.fillRect(0, r * rh, s, rh);
    g.strokeStyle = shade(base, 0.7); g.globalAlpha = 0.45; g.lineWidth = 1.5;
    for (let k = 0; k < 4; k++) {
      const y = r * rh + rng.range(4, rh - 4);
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= s; x += 32) g.lineTo(x, y + Math.sin(x * 0.02 + k) * 2);
      g.stroke();
    }
    g.globalAlpha = 1;
    g.fillStyle = shade(base, 0.42); g.fillRect(0, r * rh, s, 3); // Fuge
    const cut = rng.range(0, s); g.fillRect(cut, r * rh, 3, rh);  // Stoss
  }
});

/** Dachziegel: Reihen mit runder Unterkante. Kachel 2 m. */
export const tiles = (base: string) => make(`tiles|${base}`, 2, (g, rng, s) => {
  g.fillStyle = shade(base, 0.55); g.fillRect(0, 0, s, s);
  const rows = 14, rh = s / rows, cols = 10, cw = s / cols;
  for (let r = 0; r < rows; r++) for (let k = -1; k < cols; k++) {
    const x = k * cw + (r % 2) * cw * 0.5;
    g.fillStyle = shade(base, rng.range(0.85, 1.12));
    g.beginPath();
    g.moveTo(x + 2, r * rh); g.lineTo(x + cw - 2, r * rh); g.lineTo(x + cw - 2, r * rh + rh * 0.6);
    g.quadraticCurveTo(x + cw / 2, r * rh + rh * 1.15, x + 2, r * rh + rh * 0.6); g.closePath(); g.fill();
  }
});

/** Gras: Grundton mit hellen und dunklen Halm-Strichen. Kachel 3 m. */
export const grass = (base: string) => make(`grass|${base}`, 3, (g, rng, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 1800; i++) {
    const x = rng.range(0, s), y = rng.range(0, s), l = rng.range(4, 10);
    g.strokeStyle = shade(base, rng.range(0.75, 1.25)); g.globalAlpha = 0.5; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + rng.range(-2, 2), y - l); g.stroke();
  }
  g.globalAlpha = 1;
});

/** Glas: kräftiges Blau mit hellen schrägen Spiegel-Streifen (gemalter Glanz). Eine Kachel = eine Scheibe. */
export const glass = (base: string) => make(`glass|${base}`, 1, (g, rng, s) => {
  const grad = g.createLinearGradient(0, 0, s, s);
  grad.addColorStop(0, shade(base, 1.25)); grad.addColorStop(1, shade(base, 0.8));
  g.fillStyle = grad; g.fillRect(0, 0, s, s);
  g.strokeStyle = "rgba(255,255,255,0.55)";
  for (const [x, w] of [[0.25, 26], [0.42, 10], [0.7, 18]] as const) {
    g.lineWidth = w + rng.range(-3, 3);
    g.beginPath(); g.moveTo(x * s - s * 0.3, s * 1.05); g.lineTo(x * s + s * 0.35, -s * 0.05); g.stroke();
  }
});

/** Fensterladen-Lamellen: waagrechte Schlitze. Kachel 0,4 m (der Rahmen des Ladens ist Geometrie). */
export const louvre = (base: string) => make(`louvre|${base}`, 0.4, (g, _rng, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  g.fillStyle = shade(base, 0.6);
  for (let y = 0; y < s; y += s / 6) g.fillRect(0, y, s, s / 6 * 0.3);
});

/** Wasser-Striche: kurze helle Glanzstriche und dunkle Wellenbögen auf transparentem Grund. Kachel 8 m. */
export const waves = (light: string, dark: string) => make(`waves|${light}|${dark}`, 8, (g, rng, s) => {
  g.clearRect(0, 0, s, s);
  g.lineCap = "round";
  for (let i = 0; i < 60; i++) {
    const x = rng.range(0, s), y = rng.range(0, s), l = rng.range(10, 34);
    g.strokeStyle = light; g.globalAlpha = rng.range(0.35, 0.7); g.lineWidth = rng.range(1.5, 3);
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + rng.range(-1.5, 1.5)); g.stroke();
  }
  for (let i = 0; i < 26; i++) {
    const x = rng.range(0, s), y = rng.range(0, s), r = rng.range(8, 16);
    g.strokeStyle = dark; g.globalAlpha = rng.range(0.3, 0.55); g.lineWidth = 2.5;
    g.beginPath(); g.arc(x, y, r, Math.PI * 1.15, Math.PI * 1.85); g.stroke();
  }
  g.globalAlpha = 1;
});

/** Streifen (Markise, Stand). Kachel 1 m, Streifen in u-Richtung. */
export const stripes = (a: string, b: string) => make(`stripes|${a}|${b}`, 1, (g, _rng, s) => {
  const n = 6, w = s / n;
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * w, 0, w, s); }
});

// ---- Korea (V0004, 2026-11-08): Festungsmauern, Dächer und Boden ----

/** Bruchstein (frühe Bergfestungen, erste Stadtmauer): runde, ungleich grosse Steine in dunkler Fuge. Kachel 1,7 m. */
export const rubble = (base: string, joint: string) => make(`rubble|${base}|${joint}`, 1.7, (g, rng, s) => {
  g.fillStyle = joint; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 70; i++) {
    const w = rng.range(44, 92), h = w * rng.range(0.55, 0.85), x = rng.range(0, s), y = rng.range(0, s);
    g.fillStyle = shade(base, rng.range(0.78, 1.12), rng.range(-0.04, 0.04));
    wrapRect(g, s, x - w / 2, y - h / 2, w, h, h * 0.45);
    g.fillStyle = "rgba(255,255,255,0.10)";
    wrapRect(g, s, x - w * 0.28, y - h * 0.38, w * 0.45, h * 0.2, h * 0.1);
  }
  speckle(g, rng, s, 500, "#000", 0.07, 3);
});

/** Stampflehm (Erdabschnitte der ersten Stadtmauer): waagrechte Schichten, Kiesel. Kachel 3 m. */
export const earth = (base: string) => make(`earth|${base}`, 3, (g, rng, s) => {
  const rows = 9, rh = s / rows;
  for (let r = 0; r < rows; r++) { g.fillStyle = shade(base, rng.range(0.9, 1.08)); g.fillRect(0, r * rh, s, rh); }
  g.strokeStyle = shade(base, 0.72); g.lineWidth = 2; g.globalAlpha = 0.6;
  for (let r = 1; r < rows; r++) { g.beginPath(); g.moveTo(0, r * rh); for (let x = 0; x <= s; x += 32) g.lineTo(x, r * rh + rng.range(-2, 2)); g.stroke(); }
  g.globalAlpha = 1;
  speckle(g, rng, s, 900, shade(base, 0.6), 0.35, 4);
  speckle(g, rng, s, 300, "#ffffff", 0.12, 3);
});

/** Koreanische Dachziegel (giwa): Reihen runder Deckziegel, die vom First zur Traufe laufen (v-Richtung). Kachel 1,5 m. */
export const giwa = (base: string) => make(`giwa|${base}`, 1.5, (g, rng, s) => {
  g.fillStyle = shade(base, 0.55); g.fillRect(0, 0, s, s);
  const cols = 12, cw = s / cols;
  for (let k = 0; k < cols; k++) {
    const grad = g.createLinearGradient(k * cw, 0, k * cw + cw, 0);
    const c = shade(base, rng.range(0.92, 1.08));
    grad.addColorStop(0, shade(c, 0.7)); grad.addColorStop(0.45, shade(c, 1.25)); grad.addColorStop(1, shade(c, 0.6));
    g.fillStyle = grad; g.fillRect(k * cw + 3, 0, cw - 6, s);
    g.fillStyle = shade(base, 0.45);
    for (let y = 0; y < s; y += cw * 1.1) g.fillRect(k * cw + 3, y, cw - 6, 3);   // Stösse der Ziegel
  }
});

/** Strohdach: dichte, leicht schräge Halme in Goldbraun. Kachel 1,5 m. */
export const thatch = (base: string) => make(`thatch|${base}`, 1.5, (g, rng, s) => {
  g.fillStyle = shade(base, 0.8); g.fillRect(0, 0, s, s);
  g.lineWidth = 2;
  for (let i = 0; i < 1400; i++) {
    const x = rng.range(0, s), y = rng.range(0, s), l = rng.range(18, 40);
    g.strokeStyle = shade(base, rng.range(0.7, 1.25));
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + rng.range(-4, 4), y + l); g.stroke();
  }
  g.fillStyle = "rgba(60,40,10,0.18)";
  for (let r = 1; r < 6; r++) g.fillRect(0, (r * s) / 6, s, 4);                  // Bindeseile
});

/** Fels / Bergkuppe: grauer Stein mit Rissen und Flechten. Kachel 4 m. */
export const rock = (base: string) => make(`rock|${base}`, 4, (g, rng, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 60; i++) {
    const x = rng.range(0, s), y = rng.range(0, s), r = rng.range(20, 60);
    g.fillStyle = shade(base, rng.range(0.85, 1.12)); g.globalAlpha = 0.5;
    g.beginPath(); g.ellipse(x, y, r, r * 0.6, rng.range(0, 3), 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  g.strokeStyle = shade(base, 0.6); g.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    let x = rng.range(0, s), y = rng.range(0, s);
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += rng.range(-22, 22); y += rng.range(-10, 22); g.lineTo(x, y); }
    g.stroke();
  }
  speckle(g, rng, s, 200, "#7d8a4a", 0.35, 5);                                   // Flechten
});

/** Kies (Strand im Norden): viele kleine gerundete Steine in drei Tönen auf dunkler Fuge. Kachel 1,5 m. */
export const kies = (base: string, joint: string) => make(`kies|${base}|${joint}`, 1.5, (g, rng, s) => {
  g.fillStyle = joint; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 1400; i++) {
    const r = rng.range(5, 13), f = rng.range(0.82, 1.22);
    g.fillStyle = shade(base, f, rng.range(-0.04, 0.04));
    wrapRect(g, s, rng.range(0, s), rng.range(0, s), r * rng.range(1.2, 1.9), r, r * 0.8);
  }
  speckle(g, rng, s, 600, "#ffffff", 0.25, 3);
});

/** Schnee: fast weiss mit weichen bläulichen Mulden und Glitzerpunkten. Kachel 6 m. */
export const schnee = (base: string, mulde: string) => make(`schnee|${base}|${mulde}`, 14, (g, rng, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  g.globalAlpha = 0.16;
  for (let i = 0; i < 12; i++) {
    g.fillStyle = mulde;
    const x = rng.range(0, s), y = rng.range(0, s), r = rng.range(60, 140);
    g.beginPath(); g.ellipse(x, y, r * 1.6, r * 0.6, rng.range(-0.3, 0.3), 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  speckle(g, rng, s, 120, "#ffffff", 0.8, 2);
});

/** Birkenrinde: fast weiss mit kurzen waagrechten schwarzen Strichen und Flecken. Kachel 1 m. */
export const birkenrinde = (base: string, mal: string) => make(`birke|${base}|${mal}`, 1, (g, rng, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  g.fillStyle = mal;
  for (let i = 0; i < 70; i++) {
    const x = rng.range(0, s), y = rng.range(0, s), w = rng.range(14, 60), h = rng.range(3, 9);
    g.globalAlpha = rng.range(0.6, 1);
    g.beginPath(); g.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
  speckle(g, rng, s, 120, mal, 0.5, 4);
});

/** Felswand (Fjord, Berge): waagrechte Gesteinsbänder in Blaugrau-Tönen, senkrechte Risse und grüne Moos-Streifen. Kachel 24 m. */
export const felswand = (base: string, dunkel: string, moos: string) => make(`felswand|${base}|${dunkel}|${moos}`, 24, (g, rng, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let y = 0; y < s; y += rng.range(18, 46)) {   // Gesteinsbänder
    g.fillStyle = shade(rng.next() < 0.4 ? dunkel : base, rng.range(0.88, 1.12)); g.globalAlpha = 0.8;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= s; x += 32) g.lineTo(x, y + rng.range(-5, 5));
    const h = rng.range(8, 22);
    for (let x = s; x >= 0; x -= 32) g.lineTo(x, y + h + rng.range(-5, 5));
    g.closePath(); g.fill();
  }
  g.globalAlpha = 1;
  g.strokeStyle = shade(dunkel, 0.7); g.lineWidth = 3;
  for (let i = 0; i < 26; i++) {   // Risse
    let x = rng.range(0, s), y = rng.range(0, s);
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 4; k++) { x += rng.range(-10, 10); y += rng.range(15, 40); g.lineTo(x, y); }
    g.stroke();
  }
  g.globalAlpha = 0.55; g.fillStyle = moos;
  for (let i = 0; i < 18; i++) wrapRect(g, s, rng.range(0, s), rng.range(0, s), rng.range(30, 90), rng.range(6, 14), 6);   // Moos
  g.globalAlpha = 1;
});

/** Flechtwerk (Zaun, Wand): waagrechte Ruten, abwechselnd vor und hinter senkrechten Staken geflochten. Kachel 1 m. */
export const flecht = (base: string) => make(`flecht|${base}`, 1, (g, rng, s) => {
  g.fillStyle = shade(base, 0.55); g.fillRect(0, 0, s, s);
  const rows = 12, rh = s / rows, cols = 4, cw = s / cols;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const vorn = (r + c) % 2 === 0;
    g.fillStyle = shade(base, vorn ? rng.range(1.0, 1.15) : rng.range(0.75, 0.88));
    g.beginPath(); g.ellipse(c * cw + cw / 2, r * rh + rh / 2, cw / 2 + 2, rh / 2 - 2, 0, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = shade(base, 0.45);
  for (let c = 0; c < cols; c++) g.fillRect(c * cw - 4, 0, 8, s);   // Staken
});

/** Rabenfahne: Tuch in Grundfarbe mit schwarzem Raben (Flügel gespreizt) in der Mitte und hellem Saum. Eine Kachel = ein Tuch. */
export const rabenfahne = (base: string, rabe: string) => make(`rabenfahne|${base}|${rabe}`, 1, (g, _rng, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  g.fillStyle = shade(base, 1.35); g.fillRect(0, 0, s, s * 0.06); g.fillRect(0, s * 0.94, s, s * 0.06);
  g.fillStyle = rabe; g.strokeStyle = rabe; g.lineJoin = "round";
  const cx = s * 0.5, cy = s * 0.52;
  g.beginPath(); g.ellipse(cx, cy, s * 0.1, s * 0.16, 0, 0, Math.PI * 2); g.fill();                 // Körper
  g.beginPath(); g.arc(cx, cy - s * 0.2, s * 0.07, 0, Math.PI * 2); g.fill();                         // Kopf
  g.beginPath(); g.moveTo(cx + s * 0.05, cy - s * 0.22); g.lineTo(cx + s * 0.16, cy - s * 0.19); g.lineTo(cx + s * 0.05, cy - s * 0.16); g.fill();   // Schnabel
  for (const k of [-1, 1]) {   // Flügel gespreizt, gefiedert
    g.beginPath(); g.moveTo(cx + k * s * 0.06, cy - s * 0.08);
    g.quadraticCurveTo(cx + k * s * 0.25, cy - s * 0.34, cx + k * s * 0.42, cy - s * 0.3);
    for (let f = 0; f < 4; f++) g.lineTo(cx + k * s * (0.4 - f * 0.07), cy - s * (0.18 - f * 0.05));
    g.lineTo(cx + k * s * 0.08, cy + s * 0.06); g.closePath(); g.fill();
  }
  g.beginPath(); g.moveTo(cx - s * 0.06, cy + s * 0.12); g.lineTo(cx, cy + s * 0.32); g.lineTo(cx + s * 0.06, cy + s * 0.12); g.fill();   // Schwanz
  g.fillStyle = "#ffffff"; g.beginPath(); g.arc(cx + s * 0.025, cy - s * 0.215, s * 0.014, 0, Math.PI * 2); g.fill();   // Auge
});

/** Runenstein: grauer Stein mit bemaltem Schlangenband (rot, schwarz umrandet) und eingeritzten Zeichen darin. Kachel 2 m. */
export const runenstein = (base: string, band: string) => make(`runenstein|${base}|${band}`, 2, (g, rng, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 40; i++) { g.fillStyle = shade(base, rng.range(0.88, 1.1)); g.globalAlpha = 0.5; g.beginPath(); g.ellipse(rng.range(0, s), rng.range(0, s), rng.range(10, 40), rng.range(6, 20), rng.range(0, 3), 0, Math.PI * 2); g.fill(); }
  g.globalAlpha = 1;
  // Band um u = 0 (Kachelkante): der Stein (1,2 m breit, Kachel 2 m) zeigt u −0,3…0,3 – das Band liegt mitten auf der Vorderseite
  const pfad = (dx: number) => { g.beginPath(); for (let y = 0; y <= s; y += 8) { const x = dx + Math.sin((y / s) * Math.PI * 2) * s * 0.12; if (y === 0) g.moveTo(x, y); else g.lineTo(x, y); } g.stroke(); };
  g.lineCap = "round";
  for (const dx of [0, s]) { g.strokeStyle = "#1c1a22"; g.lineWidth = 64; pfad(dx); g.strokeStyle = band; g.lineWidth = 52; pfad(dx); }
  g.strokeStyle = "#1c1a22"; g.lineWidth = 3;
  for (let y = 24; y < s - 10; y += 34) {   // Zeichen: Stab mit Zweigen (eigene Formen, keine echte Inschrift)
    const x0 = Math.sin((y / s) * Math.PI * 2) * s * 0.12, k = Math.floor(rng.next() * 4), x = x0 < 0 ? x0 + s : x0;
    g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x, y + 12);
    if (k === 0) { g.moveTo(x, y - 6); g.lineTo(x + 8, y - 12); }
    if (k === 1) { g.moveTo(x, y); g.lineTo(x - 8, y - 8); g.moveTo(x, y); g.lineTo(x + 8, y - 8); }
    if (k === 2) { g.moveTo(x, y - 12); g.lineTo(x + 8, y - 4); g.lineTo(x, y + 4); }
    if (k === 3) { g.moveTo(x - 7, y - 4); g.lineTo(x + 7, y + 4); }
    g.stroke();
  }
});

/** Fischernetz: helle Schnur-Maschen (Rauten) auf dunklem Grund. Kachel 1 m. */
export const netz = (base: string) => make(`netz|${base}`, 1, (g, _rng, s) => {
  g.fillStyle = shade(base, 0.45); g.fillRect(0, 0, s, s);
  g.strokeStyle = shade(base, 1.3); g.lineWidth = 5;
  const n = 8, d = s / n;
  for (let i = -n; i <= 2 * n; i++) { g.beginPath(); g.moveTo(i * d, 0); g.lineTo(i * d + s, s); g.stroke(); g.beginPath(); g.moveTo(i * d, 0); g.lineTo(i * d - s, s); g.stroke(); }
  g.fillStyle = shade(base, 1.4);
  for (let i = 0; i <= n; i++) for (let k = 0; k <= n; k++) { g.beginPath(); g.arc(i * d, k * d, 4, 0, Math.PI * 2); g.fill(); }
});

/** Webstoff: bunte Querstreifen mit feinem Fadenmuster (Webstuhl, Decken). Kachel 1 m. */
export const webstoff = (farben: string[]) => make(`webstoff|${farben.join(",")}`, 1, (g, rng, s) => {
  let y = 0, i = 0;
  while (y < s) { const h = rng.range(18, 60); g.fillStyle = farben[i++ % farben.length]; g.fillRect(0, y, s, h); y += h; }
  g.globalAlpha = 0.18; g.fillStyle = "#000000";
  for (let x = 0; x < s; x += 6) g.fillRect(x, 0, 2, s);
  g.globalAlpha = 1;
});

// ---- Bayreuth 1876: Bühnenbild, Tapete, Segeltuch-Decke ----

/** Bühnenbild (gemalter Prospekt, ein Bild für die ganze Fläche): Himmel mit Abendlicht, Wolken, Bergketten, Tannen am Rand.
 *  farben = [Himmel oben, Himmel unten, ferne Berge, nahe Berge, Tannen]. */
export const buehnenbild = (farben: string[]) => make(`buehnenbild|${farben.join(",")}`, 27, (g, rng, s) => {
  const [oben, unten, fern, nah, tanne] = farben;
  const sky = g.createLinearGradient(0, 0, 0, s * 0.7); sky.addColorStop(0, oben); sky.addColorStop(1, unten);
  g.fillStyle = sky; g.fillRect(0, 0, s, s);
  g.fillStyle = "rgba(255,255,255,0.85)";
  for (const [x, y, r] of [[0.2, 0.18, 0.06], [0.27, 0.16, 0.05], [0.33, 0.19, 0.045], [0.66, 0.12, 0.05], [0.72, 0.1, 0.06], [0.79, 0.13, 0.045]] as const) {
    g.beginPath(); g.ellipse(x * s, y * s, r * s * 1.4, r * s * 0.7, 0, 0, Math.PI * 2); g.fill();
  }
  const kette = (y0: number, amp: number, col: string, n: number) => {
    g.fillStyle = col; g.beginPath(); g.moveTo(0, s);
    for (let i = 0; i <= n; i++) { const x = (i / n) * s; g.lineTo(x, (y0 - (i % 2 ? amp * rng.range(0.6, 1) : rng.range(0, amp * 0.3))) * s); }
    g.lineTo(s, s); g.closePath(); g.fill();
  };
  kette(0.55, 0.25, fern, 9);
  g.fillStyle = "rgba(255,255,255,0.9)";   // Schnee auf den fernen Gipfeln
  kette(0.68, 0.2, nah, 7);
  for (let i = 0; i < 26; i++) {   // Tannen an beiden Rändern
    const x = (i < 13 ? rng.range(0, 0.22) : rng.range(0.78, 1)) * s, y = rng.range(0.72, 0.98) * s, h = rng.range(0.12, 0.22) * s;
    g.fillStyle = shade(tanne, rng.range(0.85, 1.15));
    g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.28, y); g.lineTo(x - h * 0.28, y); g.closePath(); g.fill();
  }
  g.strokeStyle = "rgba(40,30,50,0.35)"; g.lineWidth = 3;
  for (let i = 0; i < 40; i++) { const x = rng.range(0, s), y = rng.range(s * 0.5, s); g.beginPath(); g.moveTo(x, y); g.lineTo(x + rng.range(-12, 12), y + rng.range(6, 18)); g.stroke(); }
});

/** Tapete: senkrechte Streifen (zwei Farben) mit kleinen Rauten-Blüten in der dritten Farbe. Kachel 1 m. */
export const tapete = (a: string, b: string, c: string) => make(`tapete|${a}|${b}|${c}`, 1, (g, _rng, s) => {
  const n = 4, w = s / n;
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * w, 0, w, s); }
  g.fillStyle = c;
  for (let i = 0; i < n; i++) for (let k = 0; k < 4; k++) {
    const x = i * w + w / 2, y = k * (s / 4) + (i % 2) * (s / 8) + s / 16;
    g.beginPath(); g.moveTo(x, y - 12); g.lineTo(x + 8, y); g.lineTo(x, y + 12); g.lineTo(x - 8, y); g.closePath(); g.fill();
  }
});

/** Segeltuch-Decke (gemalt wie ein Velum): breite helle und himmelblaue Bahnen mit Nähten und Seilen. Kachel 8 m. */
export const velum = (a: string, b: string) => make(`velum|${a}|${b}`, 8, (g, _rng, s) => {
  const n = 8, w = s / n;
  for (let i = 0; i < n; i++) { g.fillStyle = i % 2 ? b : a; g.fillRect(i * w, 0, w, s); }
  g.strokeStyle = shade(b, 0.7); g.lineWidth = 3;
  for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * w, 0); g.lineTo(i * w, s); g.stroke(); }
  g.strokeStyle = "#c9a24a"; g.lineWidth = 6;
  g.beginPath(); g.moveTo(0, s / 2); g.lineTo(s, s / 2); g.stroke();
});

// ---- Römer-Welt (2026-11-18): Polygon-Pflaster, Marmor, Getreidefeld, Kalkmörtel, Inschrift ----

/** Römisches Polygon-Pflaster (Basalt): unregelmässige Vielecke (Voronoi, nahtlos), helle Kanten, dunkle Fugen. Kachel 2,4 m. */
export const pflasterRoem = (base: string, joint: string) => make(`pflasterRoem|${base}|${joint}`, 2.4, (g, rng, s) => {
  const n = 34, pts: [number, number, string][] = [];
  for (let i = 0; i < n; i++) pts.push([rng.range(0, s), rng.range(0, s), shade(base, rng.range(0.82, 1.16), rng.range(-0.04, 0.04))]);
  const img = g.createImageData(s, s), col = pts.map(([, , c]) => new THREE.Color(c)), jc = new THREE.Color(joint);
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    let d1 = 1e9, d2 = 1e9, k = 0;
    for (let i = 0; i < n; i++) {
      let dx = Math.abs(x - pts[i][0]), dy = Math.abs(y - pts[i][1]); dx = Math.min(dx, s - dx); dy = Math.min(dy, s - dy);
      const d = dx * dx + dy * dy;
      if (d < d1) { d2 = d1; d1 = d; k = i; } else if (d < d2) d2 = d;
    }
    const kante = Math.sqrt(d2) - Math.sqrt(d1), c = kante < 4 ? jc : col[k], hell = kante >= 4 && kante < 9 ? 1.12 : 1, o = (y * s + x) * 4;
    img.data[o] = Math.min(255, Math.round(Math.pow(c.r, 1 / 2.2) * 255 * hell)); img.data[o + 1] = Math.min(255, Math.round(Math.pow(c.g, 1 / 2.2) * 255 * hell));
    img.data[o + 2] = Math.min(255, Math.round(Math.pow(c.b, 1 / 2.2) * 255 * hell)); img.data[o + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  speckle(g, rng, s, 600, "#ffffff", 0.08, 3);
});

/** Marmor: heller Grund mit feinen, weich geschwungenen Adern. Kachel 3 m. */
export const marmor = (base: string, ader: string) => make(`marmor|${base}|${ader}`, 3, (g, rng, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  g.strokeStyle = ader; g.lineCap = "round";
  for (let i = 0; i < 9; i++) {
    g.globalAlpha = rng.range(0.25, 0.5); g.lineWidth = rng.range(1, 3);
    let x = rng.range(0, s), y = rng.range(0, s);
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 8; k++) { x += rng.range(10, 40); y += rng.range(-25, 25); g.lineTo(x % s, y); }
    g.stroke();
  }
  g.globalAlpha = 1;
  speckle(g, rng, s, 400, ader, 0.12, 2);
});

/** Getreidefeld: Reihen goldener Ähren-Striche (v-Richtung = Furchen). Kachel 4 m. */
export const acker = (farben: string[]) => make(`acker|${farben.join(",")}`, 4, (g, rng, s) => {
  g.fillStyle = farben[0]; g.fillRect(0, 0, s, s);
  const rows = 16, rw = s / rows;
  for (let r = 0; r < rows; r++) { g.fillStyle = shade(farben[r % farben.length], rng.range(0.92, 1.06)); g.fillRect(r * rw, 0, rw * 0.8, s); }
  for (let i = 0; i < 2400; i++) {
    const x = rng.range(0, s), y = rng.range(0, s);
    g.strokeStyle = shade(rng.pick(farben), rng.range(0.7, 1.3)); g.globalAlpha = 0.6; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + rng.range(-1.5, 1.5), y - rng.range(5, 11)); g.stroke();
  }
  g.globalAlpha = 1;
});

/** Kalkmörtel (Kern der Römerstrasse): heller, rauer Grund mit Kieseln und Bruchstücken. Kachel 1,5 m. */
export const moertel = (base: string, kiesel: string) => make(`moertel|${base}|${kiesel}`, 1.5, (g, rng, s) => {
  g.fillStyle = base; g.fillRect(0, 0, s, s);
  for (let i = 0; i < 260; i++) {
    const w = rng.range(6, 22), h = w * rng.range(0.6, 0.9);
    g.fillStyle = shade(kiesel, rng.range(0.75, 1.2));
    wrapRect(g, s, rng.range(0, s), rng.range(0, s), w, h, h * 0.45);
  }
  speckle(g, rng, s, 1600, shade(base, 0.7), 0.35, 3);
});

/** Inschrift in römischen Grossbuchstaben (Meilenstein, Tempel-Fries): Zeilen dunkel/rot auf Stein. Kachel 1 (für eigene UV). */
export const inschrift = (zeilen: string[], stein: string, farbe: string) => make(`inschrift|${zeilen.join("/")}|${stein}|${farbe}`, 1, (g, rng, s) => {
  g.fillStyle = stein; g.fillRect(0, 0, s, s);
  speckle(g, rng, s, 900, shade(stein, 0.8), 0.3, 3);
  g.fillStyle = farbe; g.textAlign = "center"; g.textBaseline = "middle";
  const n = zeilen.length, h = s / (n + 1);
  zeilen.forEach((z, i) => { g.font = `bold ${Math.round(h * 0.62)}px serif`; g.fillText(z, s / 2, h * (i + 1), s * 0.92); });
});

/** Mosaik-Boden (Thermen, Atrium): helle Steinchen, dunkles Flechtband-Muster am Rand jeder Kachel, farbige Mitte (Raute/Kreis). Kachel 2 m. */
export const mosaik = (farben: string[]) => make(`mosaik|${farben.join(",")}`, 2, (g, rng, s) => {
  const [hell, dunkel, ...bunt] = farben, n = 64, c = s / n;
  const zelle = (x: number, y: number, f: string) => { g.fillStyle = shade(f, rng.range(0.9, 1.08)); g.fillRect(x * c + 0.6, y * c + 0.6, c - 1.2, c - 1.2); };
  g.fillStyle = shade(hell, 0.7); g.fillRect(0, 0, s, s);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const rx = Math.min(x, n - 1 - x), ry = Math.min(y, n - 1 - y), r = Math.min(rx, ry);
    const dx = x - n / 2 + 0.5, dy = y - n / 2 + 0.5, d = Math.abs(dx) + Math.abs(dy), kr = Math.hypot(dx, dy);
    let f = hell;
    if (r === 2 || r === 5) f = dunkel;
    else if (r === 3 || r === 4) f = (x + y) % 4 < 2 ? bunt[0] : hell;   // Wellenband
    else if (d < 20 && d > 17) f = dunkel;
    else if (d <= 17 && kr > 9) f = bunt[1 % bunt.length];
    else if (kr <= 9 && kr > 7) f = bunt[2 % bunt.length];
    else if (kr <= 7) f = (Math.round(kr) % 2) ? bunt[3 % bunt.length] : hell;
    zelle(x, y, f);
  }
});

/** Wandmalerei (pompejanisch): rote Felder mit gelben Rahmen, dunkler Sockel, oben ein Fries mit Ranken. Kachel 4 m (v = Höhe). */
export const fresko = (rot: string, gelb: string, gruen: string, sockel: string) => make(`fresko|${rot}|${gelb}|${gruen}|${sockel}`, 4, (g, rng, s) => {
  g.fillStyle = rot; g.fillRect(0, 0, s, s);
  g.fillStyle = sockel; g.fillRect(0, s * 0.78, s, s * 0.22);                      // Sockel unten (v klein = unten → Bild unten)
  g.fillStyle = shade(gelb, 0.95); g.fillRect(0, s * 0.74, s, s * 0.04); g.fillRect(0, s * 0.06, s, s * 0.06);
  for (const x0 of [0.08, 0.58]) {
    g.strokeStyle = gelb; g.lineWidth = 6; g.strokeRect(s * x0, s * 0.2, s * 0.34, s * 0.46);
    g.strokeStyle = shade(gelb, 0.7); g.lineWidth = 2; g.strokeRect(s * x0 + 12, s * 0.2 + 12, s * 0.34 - 24, s * 0.46 - 24);
    g.fillStyle = gruen; g.beginPath(); g.ellipse(s * (x0 + 0.17), s * 0.43, 18, 26, 0, 0, Math.PI * 2); g.fill();   // Medaillon
  }
  g.strokeStyle = gruen; g.lineWidth = 4;
  for (let x = 0; x < s; x += 32) { g.beginPath(); g.arc(x + 16, s * 0.09, 10, Math.PI, 0); g.stroke(); }   // Ranken im Fries
  speckle(g, rng, s, 500, "#000000", 0.05, 3);
});

/** Regal voller Schriftrollen: dunkle Fächer, darin runde helle Rollen-Enden mit Holzknauf. Kachel 1,2 m. */
export const rollenregal = (holz: string, rolle: string, rand: string) => make(`rollenregal|${holz}|${rolle}|${rand}`, 1.2, (g, rng, s) => {
  g.fillStyle = holz; g.fillRect(0, 0, s, s);
  const n = 4, f = s / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g.fillStyle = shade(holz, 0.45); g.fillRect(x * f + 10, y * f + 10, f - 20, f - 20);
    for (let k = 0; k < 7; k++) {
      const cx = x * f + 30 + (k % 3) * 34 + (k > 2 ? 17 : 0) + rng.range(-3, 3), cy = y * f + f - 34 - Math.floor(k / 3) * 30;
      g.fillStyle = shade(rolle, rng.range(0.9, 1.05)); g.beginPath(); g.arc(cx, cy, 15, 0, Math.PI * 2); g.fill();
      g.strokeStyle = rand; g.lineWidth = 2; g.stroke();
      g.fillStyle = rand; g.beginPath(); g.arc(cx, cy, 5, 0, Math.PI * 2); g.fill();
    }
  }
});

/** Bauplan auf Pergament (Wand im Amt des Frontinus): Aquädukt-Linien zu einer Stadt, Bögen, Zahlen. Kachel 1 (eigene UV). */
export const bauplan = (papier: string, tinte: string, rot: string) => make(`bauplan|${papier}|${tinte}|${rot}`, 1, (g, rng, s) => {
  g.fillStyle = papier; g.fillRect(0, 0, s, s);
  speckle(g, rng, s, 700, shade(papier, 0.75), 0.25, 4);
  g.strokeStyle = tinte; g.lineWidth = 5; g.strokeRect(14, 14, s - 28, s - 28);
  g.fillStyle = rot; g.beginPath(); g.arc(s * 0.72, s * 0.62, 34, 0, Math.PI * 2); g.fill();   // die Stadt
  g.lineWidth = 4; g.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    g.strokeStyle = i % 2 ? tinte : rot; g.beginPath();
    let x = 40 + rng.range(0, 60), y = 60 + i * 70;
    g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (s * 0.72 - x) / (6 - k) + rng.range(-12, 12); y += (s * 0.62 - y) / (6 - k) + rng.range(-14, 14); g.lineTo(x, y); }
    g.stroke();
  }
  g.strokeStyle = tinte; g.lineWidth = 3;
  for (let i = 0; i < 7; i++) { g.beginPath(); g.arc(60 + i * 34, s - 70, 14, Math.PI, 0); g.stroke(); }   // Bögen-Skizze
  g.beginPath(); g.moveTo(40, s - 70); g.lineTo(60 + 7 * 34, s - 70); g.stroke();
});

/** Erdschnitt (Tunnel im Querschnitt): waagrechte Schichten in Brauntönen mit Steinen und Wurzeln. Kachel 6 m (v = Höhe). */
export const erdschnitt = (farben: string[], stein: string) => make(`erdschnitt|${farben.join(",")}|${stein}`, 6, (g, rng, s) => {
  const n = 7, h = s / n;
  for (let i = 0; i < n; i++) {
    g.fillStyle = shade(farben[i % farben.length], rng.range(0.95, 1.05));
    g.beginPath(); g.moveTo(0, i * h);
    for (let x = 0; x <= s; x += 32) g.lineTo(x, i * h + 6 * Math.sin((x / s) * Math.PI * 2 * 2 + i));
    g.lineTo(s, (i + 1) * h + 8); g.lineTo(0, (i + 1) * h + 8); g.closePath(); g.fill();
  }
  for (let i = 0; i < 70; i++) { g.fillStyle = shade(stein, rng.range(0.8, 1.15)); wrapRect(g, s, rng.range(0, s), rng.range(0, s), rng.range(8, 26), rng.range(6, 16), 6); }
  speckle(g, rng, s, 1200, "#2a1a10", 0.18, 3);
});
