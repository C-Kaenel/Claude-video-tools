// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Zeichen-Werkzeug für flache Karten. Gezeichnet wird in festen Design-Einheiten (z. B. 600 × 1000 für Figuren);
// `k` rechnet in Leinwand-Pixel um. Jede Form kann Füllung + dunkle Kontur in einem Zug bekommen; `shadeSide` legt eine
// weiche Schattenseite in eine Form (Zwei-Ton), `clip` zeichnet nur innerhalb einer Form.
export type Pt = [number, number];
export type Paint = { fill?: string; ink?: string; width?: number; alpha?: number };
type Shape = (g: CanvasRenderingContext2D) => void;

export class Pen {
  constructor(readonly g: CanvasRenderingContext2D, readonly k: number) {
    g.setTransform(k, 0, 0, k, 0, 0);
    g.lineJoin = "round"; g.lineCap = "round";
  }

  private finish(p: Paint) {
    const g = this.g;
    g.globalAlpha = p.alpha ?? 1;
    if (p.fill) { g.fillStyle = p.fill; g.fill(); }
    if (p.ink && p.width) { g.strokeStyle = p.ink; g.lineWidth = p.width; g.stroke(); }
    g.globalAlpha = 1;
    return this;
  }

  /** Form als Pfad (für clip/shadeSide wiederverwendbar). */
  static ellipse(cx: number, cy: number, rx: number, ry: number, rot = 0): Shape {
    return (g) => { g.beginPath(); g.ellipse(cx, cy, Math.max(0.01, rx), Math.max(0.01, ry), rot, 0, Math.PI * 2); };
  }
  /** Geschlossener Linienzug; `smooth` rundet über die Mittelpunkte der Kanten (weiche Form). */
  static poly(pts: Pt[], smooth = false, closed = true): Shape {
    return (g) => {
      g.beginPath();
      if (!smooth || pts.length < 3) {
        pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      } else {
        const n = pts.length, mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        const start = closed ? mid(pts[n - 1], pts[0]) : pts[0];
        g.moveTo(...start);
        for (let i = 0; i < (closed ? n : n - 1); i++) {
          const p = pts[i], q = pts[(i + 1) % n];
          if (!closed && i === n - 2) g.quadraticCurveTo(p[0], p[1], q[0], q[1]);
          else g.quadraticCurveTo(p[0], p[1], ...mid(p, q));
        }
      }
      if (closed) g.closePath();
    };
  }
  static rrect(x: number, y: number, w: number, h: number, r: number): Shape {
    return (g) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  }

  shape(s: Shape, p: Paint) { s(this.g); return this.finish(p); }
  ellipse(cx: number, cy: number, rx: number, ry: number, p: Paint, rot = 0) { return this.shape(Pen.ellipse(cx, cy, rx, ry, rot), p); }
  poly(pts: Pt[], p: Paint, smooth = false) { return this.shape(Pen.poly(pts, smooth), p); }
  rrect(x: number, y: number, w: number, h: number, r: number, p: Paint) { return this.shape(Pen.rrect(x, y, w, h, r), p); }

  /** Offener Strich (Arme, Beine, Brauen, Münder). */
  line(pts: Pt[], width: number, color: string, smooth = false) {
    Pen.poly(pts, smooth, false)(this.g);
    this.g.strokeStyle = color; this.g.lineWidth = width; this.g.stroke();
    return this;
  }
  dot(x: number, y: number, r: number, color: string) { return this.ellipse(x, y, r, r, { fill: color }); }

  /** Text, der in `maxWidth` passt (Schrift wird bei Bedarf kleiner). */
  text(str: string, x: number, y: number, o: { font: string; size: number; color: string; maxWidth?: number; align?: CanvasTextAlign; weight?: string; rand?: { color: string; width: number } }) {   // rand = Umriss hinter der Schrift (frei vor Linien)
    const g = this.g;
    let size = o.size;
    const set = () => { g.font = `${o.weight ?? ""} ${size}px ${o.font}`.trim(); };
    set();
    if (o.maxWidth) while (size > 6 && g.measureText(str).width > o.maxWidth) { size *= 0.95; set(); }
    g.fillStyle = o.color; g.textAlign = o.align ?? "center"; g.textBaseline = "middle";
    if (o.rand) { g.lineJoin = "round"; g.lineWidth = o.rand.width; g.strokeStyle = o.rand.color; g.strokeText(str, x, y); }
    g.fillText(str, x, y);
    return this;
  }

  /** Nur innerhalb der Form zeichnen. */
  clip(s: Shape, draw: () => void) {
    const g = this.g;
    g.save(); s(g); g.clip(); draw(); g.restore();
    return this;
  }

  /** Schattenseite: Teil der Form, der nicht von der um (dx,dy) verschobenen Form bedeckt ist, in `color`. */
  shadeSide(s: Shape, color: string, dx: number, dy: number, alpha = 1) {
    const g = this.g;
    this.clip(s, () => {
      g.save(); g.translate(dx, dy); s(g); g.restore();
      g.rect(-5000, -5000, 10000, 10000);
      g.globalAlpha = alpha; g.fillStyle = color; g.fill("evenodd"); g.globalAlpha = 1;
    });
    return this;
  }

  /** Zeichnen um (dx, dy) verschoben. */
  shift(dx: number, dy: number, draw: () => void) {
    const g = this.g;
    g.save(); g.translate(dx, dy); draw(); g.restore();
    return this;
  }

  /** Zeichnen in gedrehtem/verschobenem Raum (Drehpunkt px,py, Grad). */
  turn(px: number, py: number, deg: number, draw: () => void, sx = 1, sy = 1) {
    const g = this.g;
    g.save(); g.translate(px, py); g.rotate((deg * Math.PI) / 180); g.scale(sx, sy); g.translate(-px, -py); draw(); g.restore();
    return this;
  }
}

/** Farbe mischen (Bildschirm-Werte), t = 0 → a, 1 → b. */
export const mixHex = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
};
export const darker = (hex: string, f = 0.72) => mixHex(hex, "#1a1020", 1 - f);
