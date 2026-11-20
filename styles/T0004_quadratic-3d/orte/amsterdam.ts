// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Ort „Strasse in Amsterdam“ (T0004): Gracht quer über die Karte mit Kaimauern, Brücke, zwei Hausbooten (schaukeln),
// schmale hohe Grachtenhäuser an den hinteren Kanten (Treppen-, Hals- und Glockengiebel aus Quadern, weisse Fensterrahmen,
// Hissbalken), Pflaster, Ulmen, Laternen, Poller, viele Fahrräder. Alles aus Quadern.
import tokens from "../../../shared/design-tokens.json";
import { leuchte, type Extra, type Ort, type OrtKontext } from "../welt";

const A = tokens.color["quadratic-3d"].orte.amsterdam;
const G0 = -1.5, G1 = 2.5;           // Gracht von z = G0 bis G1
const STOCK = 2.6;

/** Grachtenhaus: Front zeigt nach `dir` (+z oder +x). Breite w, Stockwerke n, Giebelart. */
const haus = (c: OrtKontext, x: number, z: number, w: number, n: number, giebel: number, dir: "z" | "x") => {
  const { b, rng, Y } = c, T = 6;                       // Tiefe
  const wand = giebel === 2 ? rng.pick(A.putz) : rng.pick(A.backstein);
  const box = (sx: number, sy: number, sz: number, ox: number, oy: number, oz: number, col: string) =>
    dir === "z" ? b.box([sx, sy, sz], [x + ox, oy, z + oz], col) : b.box([sz, sy, sx], [x + oz, oy, z - ox], col);
  const hh = n * STOCK + 0.6;
  box(w - 0.01, hh, T, 0, Y + hh / 2, -T / 2, wand);   // 1 cm schmaler: Nachbarhäuser teilen keine Fläche (Flackern)
  // Fenster je Stock (2 oder 3), weisse Rahmen, Ladentür unten
  const nf = w > 3.6 ? 3 : 2;
  for (let s = 0; s < n; s++) for (let f = 0; f < nf; f++) {
    const fx = -w / 2 + (w / nf) * (f + 0.5), fy = Y + 0.6 + s * STOCK + 1.3;
    if (s === 0 && f === Math.floor(nf / 2)) {
      box(0.9, 2.0, 0.06, fx, Y + 1.0, 0.025, A.laden); box(1.1, 0.12, 0.1, fx, Y + 2.1, 0.05, A.rahmen);
      box(1.2, 0.2, 0.5, fx, Y + 0.1, 0.24, A.kai);
      if (dir === "z") c.b.teil("tuer", [0.9, 2.0, 0.06], [x + fx, Y + 1.0, z + 0.03]);
      continue;
    }
    box(0.8, 1.3, 0.06, fx, fy, 0.025, A.glas);
    box(0.95, 0.1, 0.1, fx, fy + 0.7, 0.05, A.rahmen); box(0.95, 0.1, 0.1, fx, fy - 0.7, 0.05, A.rahmen);
    box(0.08, 1.3, 0.08, fx, fy, 0.06, A.rahmen);
    if (dir === "z") c.b.teil("fenster", [0.8, 1.3, 0.06], [x + fx, fy, z + 0.03]);
  }
  box(w + 0.1, 0.18, 0.2, 0, Y + 0.6 + STOCK - 0.1, 0.05, A.rahmen);   // Gesims über dem Erdgeschoss
  // Giebel: 0 Treppengiebel, 1 Halsgiebel, 2 Glockengiebel (Stufen), dazu Hissbalken
  const top = Y + hh + 0.005;   // Giebel/Dach 5 mm über der Wand (keine deckungsgleichen Flächen)
  if (giebel === 0) [0.8, 0.6, 0.4, 0.2].forEach((k, i) => box(w * k, 0.6, 0.5, 0, top + 0.3 + i * 0.6, -0.25, wand));
  else if (giebel === 1) { box(w * 0.5, 1.8, 0.5, 0, top + 0.9, -0.25, wand); box(w * 0.7, 0.2, 0.6, 0, top + 1.9, -0.25, A.kai); box(w * 0.9, 0.6, 0.5, 0, top + 0.3, -0.25, wand); }
  else { box(w * 0.9, 0.7, 0.5, 0, top + 0.35, -0.25, wand); box(w * 0.6, 0.7, 0.5, 0, top + 1.05, -0.25, wand); box(w * 0.7, 0.15, 0.6, 0, top + 1.45, -0.25, A.kai); }
  box(0.15, 0.15, 0.9, 0, top - 0.3, 0.45, A.kai);
  box(w * 0.88, 0.3, T - 0.6, 0, top + 0.15, -T / 2 - 0.1, A.kai);   // schmaler als der Giebel (sonst deckungsgleiche Seiten)       // Dachfläche dahinter
};

const fahrrad = (c: OrtKontext, x: number, z: number, farbe: string, quer: boolean) => {
  const r = (sx: number, sy: number, sz: number, ox: number, oy: number) =>
    quer ? c.b.box([sz, sy, sx], [x, c.Y + oy, z + ox], farbe) : c.b.box([sx, sy, sz], [x + ox, c.Y + oy, z], farbe);
  for (const o of [-0.5, 0.5]) { r(0.55, 0.55, 0.06, o, 0.3); }
  r(0.95, 0.06, 0.06, 0, 0.5); r(0.06, 0.4, 0.06, 0.15, 0.62); r(0.25, 0.06, 0.08, 0.15, 0.84); r(0.06, 0.35, 0.06, -0.38, 0.72); r(0.06, 0.06, 0.4, -0.38, 0.9);
};

export const amsterdam: Ort = {
  name: "amsterdam", groesse: 24, oben: 11.5, seed: 23,
  wege: [[[-10, 4.6], [10, 4.6]], [[9, -3.2], [-6, -3.2]], [[3.5, -3.2], [3.5, 4.6], [-2, 4.6]]],
  baue: (c) => {
    const { b, bel, rng, h, Y, kacheln, wegeFrei } = c;
    kacheln((x, z) => z > G0 && z < G1 ? [A.kanal, 0.02, true] : [rng.pick(A.pflaster), 0.2]);
    wegeFrei();
    const ex: Extra[] = [];
    // Kaimauern (mit dunkler Kante) und Brücke über die Gracht
    for (const kz of [G0 - 0.15, G1 + 0.15]) { b.box([23.98, 0.9, 0.3], [0, -0.25, kz], A.kai); b.box([23.98, 0.12, 0.34], [0, Y + 0.06, kz], rng.pick(A.putz)); }   // 1 cm vor der Kante (Flackern)
    b.box([3.4, 0.3, G1 - G0 + 0.8], [3.5, Y - 0.1, (G0 + G1) / 2], A.backstein[2]);
    b.box([2.2, 0.8, G1 - G0 + 0.6], [3.5, -0.4, (G0 + G1) / 2], A.kai);
    for (const rx of [1.9, 5.1]) b.box([0.15, 0.6, G1 - G0 + 0.8], [rx, Y + 0.35, (G0 + G1) / 2], A.fahrrad[0]);
    bel.nimm(3.5, 0.5, 4, 6);
    // hintere Häuserzeile (Front +z) und linke Zeile (Front +x)
    let x = -h;
    while (x < h - 2) {
      const w = Math.min(h - x, rng.range(2.8, 4.4)); haus(c, x + w / 2, -5.4 + rng.pick([0, -0.3, 0.25]), w, rng.int(2, 4), rng.int(0, 2), "z"); x += w;
    }
    bel.nimm(0, -9, 24, 7.2);
    let z = 6.2;
    while (z < h - 1.5) {
      const w = Math.min(h - z, rng.range(2.8, 3.6)); haus(c, -h + 6, z + w / 2, w, rng.int(2, 4), rng.int(0, 2), "x"); z += w;
    }
    bel.nimm(-9, 9, 6.4, 6.4);
    // Ulmen, Laternen, Poller entlang der Kais; Fahrräder am Geländer
    for (const [tx, zz] of [[-8, 3.3], [-1.5, 3.3], [8.5, 3.3], [-9, -2.3], [9.5, -2.3]]) {
      if (!bel.versuch(tx, zz, 1, 1)) continue;
      b.box([0.35, 2.2, 0.35], [tx, Y + 1.1, zz], tokens.color["quadratic-3d"].karte.stamm);
      b.box([2.0, 1.4, 2.0], [tx, Y + 2.9, zz], rng.pick(tokens.color["quadratic-3d"].karte.laub));
      b.box([1.3, 0.9, 1.3], [tx + 0.2, Y + 3.9, zz - 0.1], rng.pick(tokens.color["quadratic-3d"].karte.laub));
    }
    for (const lx of [-5, 1, 7]) for (const lz of [3.3, -2.3]) {
      if (!bel.versuch(lx, lz)) continue;
      b.box([0.12, 2.4, 0.12], [lx, Y + 1.2, lz], A.fahrrad[0]);
      ex.push({ obj: leuchte(tokens.color["quadratic-3d"].karte.lampe, [0.3, 0.3, 0.3], [lx, Y + 2.5, lz]) });
    }
    for (let k = -11; k < 11; k += 1.6) for (const pz of [2.95, -1.95]) if (bel.frei(k + 0.4, pz)) b.box([0.12, 0.6, 0.12], [k + 0.4, Y + 0.3, pz], A.kai);
    for (const [fx, fz] of [[-10.5, 6.3], [-9.6, 6.3], [-8.7, 6.3], [6.0, 6.3], [6.9, 6.3], [-3.5, -4.5], [-2.6, -4.5], [8, -4.5], [10, 9], [10, 10]]) {
      if (!bel.versuch(fx, fz, 0.8, 1.2)) continue;
      fahrrad(c, fx, fz, rng.pick(A.fahrrad), true);
    }
    // Platz vorne: Café-Tische mit Stühlen, Blumenkübel
    for (const [tx, tz] of [[3, 8.5], [6, 8.5], [3, 11], [6, 11], [0, 10]]) {
      if (!bel.versuch(tx, tz, 2, 2)) continue;
      b.box([0.8, 0.06, 0.8], [tx, Y + 0.75, tz], A.rahmen); b.box([0.1, 0.72, 0.1], [tx, Y + 0.36, tz], A.fahrrad[0]);
      for (const [sx, sz] of [[-0.75, 0], [0.75, 0]]) { b.box([0.4, 0.06, 0.4], [tx + sx, Y + 0.45, tz + sz], A.laden); b.box([0.06, 0.45, 0.4], [tx + sx * 1.25, Y + 0.65, tz + sz], A.laden); }
    }
    for (const [px, pz] of [[9.5, 7], [-1.5, 7.5], [9.5, 11]]) {
      if (!bel.versuch(px, pz)) continue;
      b.box([0.8, 0.6, 0.8], [px, Y + 0.3, pz], A.kai); b.box([0.7, 0.5, 0.7], [px, Y + 0.85, pz], rng.pick(tokens.color["quadratic-3d"].karte.laub));
      b.box([0.2, 0.2, 0.2], [px + 0.2, Y + 1.2, pz], rng.pick(tokens.color["quadratic-3d"].karte.blumen));
    }
    // Hausboote (eigene Gruppen, schaukeln leicht)
    for (const [bx, farbe, ph] of [[-5.87, A.boot[0], 0], [8.63, A.boot[1], 1.7]] as const) {   // Bootsenden nicht auf Kachelgrenzen (Flackern)
      const g = c.kit.batch();
      g.box([6, 0.7, 2.4], [0, 0.1, 0], farbe); g.box([4.4, 1.2, 2.0], [-0.4, 1.05, 0], rng.pick(A.putz));
      g.box([4.6, 0.15, 2.2], [-0.4, 1.72, 0], A.kai);
      for (const wx of [-1.8, -0.4, 1.0]) g.box([0.7, 0.5, 0.05], [wx, 1.15, 1.02], A.glas);
      g.box([0.6, 0.4, 0.6], [2.4, 0.65, 0.4], rng.pick(tokens.color["quadratic-3d"].karte.laub));
      const grp = g.build("hausboot"); grp.position.set(bx, 0, (G0 + G1) / 2);
      ex.push({ obj: grp, tick: (t) => { grp.position.y = Math.sin(t * 0.9 + ph) * 0.05; grp.rotation.x = Math.sin(t * 0.7 + ph) * 0.012; } });
    }
    return ex;
  },
};
