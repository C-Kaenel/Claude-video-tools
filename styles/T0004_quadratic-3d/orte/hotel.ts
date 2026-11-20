// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Ort „Hotelzimmer“ (T0004): Raum als Schnitt-Modell – zwei Wände nur an den hinteren Kanten (zur Kamera offen), Parkett,
// Teppich, Bett mit Nachttischen und Lampen, Schrank, Schreibtisch am Fenster, Sessel, TV-Möbel, Koffer, Pflanze;
// Bad hinten links hinter halbhohen Wänden (Wanne, Waschtisch mit Spiegel, WC). Alles aus Quadern.
import tokens from "../../../shared/design-tokens.json";
import { leuchte, type Extra, type Ort } from "../welt";

const H = tokens.color["quadratic-3d"].orte.hotel;
const WAND = 3.2;   // Wandhöhe

export const hotel: Ort = {
  name: "hotel", groesse: 14, oben: WAND, seed: 11,
  wege: [[[2.5, 5.5], [2.5, 0.5], [5.5, 0.5]], [[5.8, 5.8], [-0.8, 5.8]]],
  baue: ({ b, bel, rng, h, Y, kacheln, wegeFrei, lk }) => {
    const K = lk.karte;
    const bad = (x: number, z: number) => x < -1.5 && z < -2;
    const teppich = (x: number, z: number) => x > -6.5 && x < -1 && z > 0 && z < 6.5;
    kacheln((x, z) => bad(x, z) ? [rng.pick(H.fliesen), 0.2] : teppich(x, z) ? [rng.pick(H.teppich), 0.24] : [rng.pick(H.parkett), 0.2]);
    wegeFrei();
    const ex: Extra[] = [];
    // Wände an den hinteren Kanten (x = −h, z = −h), Sockelleiste, Fenster in der rechten Wand, Tür in der linken
    b.box([0.3, WAND, 14], [-h - 0.15 + 0.3, Y + WAND / 2, 0], H.wandInnen);
    b.box([14, WAND, 0.3], [0, Y + WAND / 2, -h + 0.15], H.wandInnen);
    b.box([0.32, 0.12, 14], [-h + 0.15, Y + WAND + 0.06, 0], H.wandKante);
    b.box([14, 0.12, 0.32], [0, Y + WAND + 0.06, -h + 0.15], H.wandKante);
    b.box([0.06, 0.12, 13.4], [-h + 0.33, Y + 0.06, 0.3], H.holzDunkel);
    b.box([13.4, 0.12, 0.06], [0.3, Y + 0.06, -h + 0.33], H.holzDunkel);
    for (const fx of [3.2, 5.2]) {
      b.box([1.6, 1.7, 0.06], [fx, Y + 1.75, -h + 0.33], H.fenster); b.teil("fenster", [1.6, 1.7, 0.06], [fx, Y + 1.75, -h + 0.33]);
      b.box([1.8, 0.1, 0.2], [fx, Y + 0.85, -h + 0.4], H.wandKante);
    }
    b.box([0.4, 2.6, 0.5], [2.1 + 2.1, Y + 1.5, -h + 0.55], H.decke); // Vorhang zwischen den Fenstern
    b.box([0.06, 2.1, 1.0], [-h + 0.33, Y + 1.05, 5.6], H.holzDunkel); b.teil("tuer", [0.06, 2.1, 1.0], [-h + 0.33, Y + 1.05, 5.6]);
    bel.nimm(-h + 0.5, 0, 1, 14); bel.nimm(0, -h + 0.5, 14, 1);
    // Bad: halbhohe Wände mit Durchgang, Wanne, Waschtisch + Spiegel, WC, Handtuch
    b.box([5.2, 1.1, 0.2], [-4.1, Y + 0.55, -2], H.wandInnen); b.box([0.2, 1.1, 2.6], [-1.5, Y + 0.55, -5.4], H.wandInnen);
    b.box([5.2, 0.08, 0.24], [-4.1, Y + 1.14, -2], H.wandKante); b.box([0.24, 0.08, 2.6], [-1.5, Y + 1.14, -5.4], H.wandKante);
    bel.nimm(-4.1, -2, 5.2, 1); bel.nimm(-1.5, -5.4, 1, 2.6);
    b.box([2.2, 0.6, 1.0], [-5.4, Y + 0.3, -6.1], H.bett); b.box([1.8, 0.06, 0.6], [-5.4, Y + 0.61, -6.1], H.fenster);
    b.box([1.0, 0.8, 0.6], [-6.4, Y + 0.4, -3.7], H.holzDunkel); b.box([0.5, 0.1, 0.4], [-6.4, Y + 0.85, -3.7], H.bett);
    b.box([0.06, 0.9, 0.8], [-h + 0.34, Y + 1.6, -3.7], H.fenster);
    b.box([0.6, 0.45, 0.45], [-3.2, Y + 0.23, -2.7], H.bett); b.box([0.2, 0.5, 0.45], [-3.2, Y + 0.6, -2.48], H.bett);
    b.box([0.1, 0.7, 0.5], [-1.7, Y + 0.7, -3.2], H.decke);
    bel.nimm(-5.4, -6.1, 2.4, 1.2); bel.nimm(-6.4, -3.7, 1.2, 0.8); bel.nimm(-3.2, -2.7, 1, 1);
    // Bett (Kopfteil an der linken Wand), Kissen, Decke; Nachttische mit Lampen
    bel.nimm(-5.2, 3.2, 3.2, 2.6);
    b.box([2.4, 0.4, 2.2], [-5.6, Y + 0.24, 3.2], H.holzDunkel);
    b.box([2.3, 0.3, 2.1], [-5.6, Y + 0.59, 3.2], H.bett);
    b.box([1.5, 0.08, 2.14], [-5.0, Y + 0.78, 3.2], H.decke);
    for (const kz of [2.65, 3.75]) b.box([0.5, 0.18, 0.8], [-6.4, Y + 0.83, kz], H.bett);
    b.box([0.15, 1.3, 2.4], [-6.75, Y + 0.65, 3.2], H.holzDunkel);
    for (const nz of [1.6, 4.8]) {
      bel.nimm(-6.3, nz, 1, 1);
      b.box([0.6, 0.55, 0.55], [-6.3, Y + 0.28, nz], H.holzDunkel);
      b.box([0.12, 0.35, 0.12], [-6.3, Y + 0.72, nz], H.metall);
      ex.push({ obj: leuchte(K.lampe, [0.32, 0.26, 0.32], [-6.3, Y + 1.02, nz]) });
    }
    // Schrank rechts hinten, Schreibtisch + Stuhl + Laptop unter dem Fenster
    bel.nimm(0.6, -6.2, 2.2, 1.4);
    b.box([2.0, 2.4, 0.8], [0.6, Y + 1.2, -6.3], H.holzDunkel);
    b.box([0.04, 2.2, 0.02], [0.6, Y + 1.2, -5.89], H.wandKante);
    for (const gx of [0.4, 0.8]) b.box([0.06, 0.25, 0.04], [gx, Y + 1.2, -5.88], H.metall);
    bel.nimm(4.2, -6.0, 3.4, 1.4);
    b.box([2.6, 0.08, 0.8], [4.2, Y + 0.76, -6.2], H.holzDunkel);
    for (const lx of [3.0, 5.4]) b.box([0.08, 0.72, 0.7], [lx, Y + 0.36, -6.2], H.holzDunkel);
    b.box([0.6, 0.04, 0.42], [4.4, Y + 0.82, -6.25], H.metall); b.box([0.6, 0.38, 0.04], [4.4, Y + 1.0, -6.45], H.bildschirm);
    b.box([0.5, 0.08, 0.5], [4.0, Y + 0.48, -5.4], H.decke); b.box([0.5, 0.6, 0.08], [4.0, Y + 0.78, -5.17], H.decke);
    for (const [cx, cz] of [[3.8, -5.6], [4.2, -5.6], [3.8, -5.2], [4.2, -5.2]]) b.box([0.05, 0.44, 0.05], [cx, Y + 0.22, cz], H.metall);
    // TV-Möbel gegenüber dem Bett, Bildschirm
    bel.nimm(-1.4, 3.2, 1, 2.6);
    b.box([0.6, 0.6, 2.2], [-1.4, Y + 0.3, 3.2], H.holzDunkel);
    b.box([0.08, 0.8, 1.4], [-1.5, Y + 1.05, 3.2], H.bildschirm); b.box([0.2, 0.06, 0.3], [-1.45, Y + 0.63, 3.2], H.metall);
    // Sessel + Beistelltisch rechts, Stehlampe
    bel.nimm(5.6, 2.6, 2.2, 2.6);
    b.box([1.0, 0.45, 1.0], [5.6, Y + 0.23, 2.2], H.decke); b.box([1.0, 0.6, 0.25], [5.6, Y + 0.75, 2.6], H.decke);
    for (const ax of [5.1, 6.1]) b.box([0.2, 0.3, 1.0], [ax, Y + 0.6, 2.2], H.decke);
    b.box([0.6, 0.5, 0.6], [5.6, Y + 0.25, 3.5], H.holzDunkel); b.box([0.3, 0.12, 0.2], [5.6, Y + 0.56, 3.5], H.bett);
    b.box([0.08, 1.6, 0.08], [6.5, Y + 0.8, 1.4], H.metall);
    ex.push({ obj: leuchte(K.lampe, [0.4, 0.3, 0.4], [6.5, Y + 1.75, 1.4]) });
    bel.nimm(6.5, 1.4);
    // Koffer neben der Tür, Pflanze in der Ecke, Bild an der Wand
    bel.nimm(-5.6, 6.3, 1.2, 1);
    b.box([0.8, 0.6, 0.35], [-5.6, Y + 0.32, 6.3], H.koffer); b.box([0.3, 0.06, 0.06], [-5.6, Y + 0.66, 6.3], H.holzDunkel);
    bel.nimm(6.3, -6.3);
    b.box([0.5, 0.5, 0.5], [6.3, Y + 0.25, -6.3], H.wandKante);
    b.box([0.8, 0.8, 0.8], [6.3, Y + 0.9, -6.3], H.pflanze); b.box([0.5, 0.5, 0.5], [6.3, Y + 1.5, -6.3], H.pflanze);
    b.box([0.04, 0.9, 1.4], [-h + 0.32, Y + 2.0, 3.2], H.decke); b.box([0.03, 0.7, 1.2], [-h + 0.35, Y + 2.0, 3.2], H.fenster);
    return ex;
  },
};
