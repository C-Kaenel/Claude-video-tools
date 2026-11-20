// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Ort „In den Bergen vor einer Berghütte“ (T0004): Gelände aus 1-m-Säulen steigt zur hinteren Ecke zum Gipfel an
// (Wiese → Fels → Schnee), vorne eine Alm mit Blockhütte (Balkenlagen, Stufendach mit Schnee, Kamin mit Rauch-Würfeln,
// Fensterläden, Blumenkästen, Veranda mit Bank und Tisch, Holzstapel), Fahnenmast mit wehender Fahne, Weg mit Zaun,
// Nadelbäume, Felsbrocken. Eine Figur steht vor der Hütte, eine wandert her. Alles aus Quadern.
import * as THREE from "three";
import tokens from "../../../shared/design-tokens.json";
import { NOINK } from "../../../engine/v01";
import { type Extra, type Ort } from "../welt";

const B = tokens.color["quadratic-3d"].orte.berg;
const Kt = tokens.color["quadratic-3d"].karte;

/** Geländehöhe über den Kacheln (m, in 0,5-m-Stufen): 0 auf der Alm, steigt zur hinteren Ecke (−x, −z). */
const hoehe = (x: number, z: number) => {
  const t = -(x + z) / Math.SQRT2;
  if (t < 3) return 0;
  const grat = Math.sin(x * 0.55) * 0.9 + Math.cos(z * 0.48) * 0.7;
  return Math.min(10, Math.max(0, Math.round(((t - 3) * 0.8 + grat) * 2) / 2));
};

const HX = 0.5, HZ = 0.2, HW = 5, HD = 4, WAND = 2.56;   // Hütte

export const berg: Ort = {
  name: "berg", groesse: 24, oben: 10, seed: 47,
  wege: [[[-0.4, 4.2]], [[8.5, 10.2], [2.6, 4.3]]],
  baue: ({ b, bel, rng, Y, kacheln, wegeFrei, kit }) => {
    const weg = (x: number, z: number) => Math.abs(x - z) < 1.2 && x + z > 4.5 && x > 1.5;
    kacheln((x, z) => {
      if (weg(x, z)) return [rng.pick(Kt.boden), 0.2, true];
      return [hoehe(x, z) > 0 ? rng.pick(B.fels) : rng.pick(B.wiese), 0.2];
    });
    wegeFrei();
    const ex: Extra[] = [];
    // Gelände-Säulen
    for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) {
      const x = -12 + i + 0.5, z = -12 + j + 0.5, hh = hoehe(x, z);
      if (hh <= 0) continue;
      bel.nimm(x, z);
      const farbe = hh < 1.5 ? rng.pick(B.wiese) : hh < 5.5 ? rng.pick(B.fels) : rng.pick(B.schnee);
      b.box([1, hh, 1], [x, Y + hh / 2, z], farbe);
      if (hh >= 4.5 && hh < 5.5) b.box([1, 0.2, 1], [x, Y + hh + 0.1, z], rng.pick(B.schnee));
      if (hh >= 1.5 && hh < 3 && rng.next() < 0.3) b.box([1, 0.15, 1], [x, Y + hh + 0.07, z], rng.pick(B.wiese));
    }
    // Blockhütte: Balkenlagen in zwei Tönen, vorstehende Balkenköpfe an den Ecken
    bel.nimm(HX, HZ, HW + 1.4, HD + 1.4);
    const lagen = Math.round(WAND / 0.32);
    for (let l = 0; l < lagen; l++) {
      const y = Y + 0.16 + l * 0.32, c = B.balken[l % 2];
      b.box([HW, 0.32, HD], [HX, y, HZ], c);
      for (const [cx, cz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box([0.3, 0.26, 0.3], [HX + cx * (HW / 2 + 0.1), y, HZ + cz * (HD / 2 + 0.1)], B.balken[(l + 1) % 2]);
    }
    const top = Y + lagen * 0.32;
    // Stufendach (First entlang x), oberste Stufen verschneit
    for (let k = 0; k < 5; k++) b.box([HW + 0.9, 0.3, HD + 1.2 - k * 1.05], [HX, top + 0.15 + k * 0.3, HZ], k >= 3 ? B.schnee[0] : Kt.dach);
    b.box([0.7, 1.4, 0.7], [HX + 1.4, top + 1.3, HZ - 0.6], B.fels[1]); b.box([0.8, 0.12, 0.8], [HX + 1.4, top + 2.06, HZ - 0.6], B.fels[2]);
    // Tür, Fenster mit Läden und Blumenkästen (Front +z und Seite +x)
    b.box([1.0, 2.0, 0.06], [HX - 0.9, Y + 1.0, HZ + HD / 2 + 0.03], B.balken[1]); b.teil("tuer", [1.0, 2.0, 0.06], [HX - 0.9, Y + 1.0, HZ + HD / 2 + 0.03]);
    const fenster = (at: [number, number, number], seiteX: boolean) => {
      const s = (v: [number, number, number]) => seiteX ? [v[2], v[1], v[0]] as [number, number, number] : v;
      const pos = (dx: number, dy: number, dz: number) => seiteX ? [at[0] + dz, at[1] + dy, at[2] - dx] as [number, number, number] : [at[0] + dx, at[1] + dy, at[2] + dz] as [number, number, number];
      b.box(s([0.8, 0.8, 0.06]), pos(0, 0, 0), Kt.wasser); b.teil("fenster", s([0.8, 0.8, 0.06]), pos(0, 0, 0));
      b.box(s([0.35, 0.9, 0.06]), pos(-0.62, 0, 0.02), B.laden); b.box(s([0.35, 0.9, 0.06]), pos(0.62, 0, 0.02), B.laden);
      b.box(s([0.9, 0.22, 0.25]), pos(0, -0.55, 0.12), B.balken[0]);
      for (const fx of [-0.3, 0, 0.3]) b.box(s([0.18, 0.18, 0.18]), pos(fx, -0.37, 0.12), rng.pick(Kt.blumen));
    };
    fenster([HX + 1.1, Y + 1.5, HZ + HD / 2 + 0.03], false);
    fenster([HX + HW / 2 + 0.03, Y + 1.5, HZ - 0.4], true);
    // Veranda vor der Tür: Bretterboden, Bank, Tisch
    b.box([HW, 0.12, 1.2], [HX, Y + 0.06, HZ + HD / 2 + 0.7], B.balken[0]);
    b.box([1.6, 0.1, 0.4], [HX + 1.1, Y + 0.5, HZ + HD / 2 + 0.35], B.balken[1]);
    for (const dx of [0.4, 1.8]) b.box([0.1, 0.4, 0.35], [HX + dx, Y + 0.3, HZ + HD / 2 + 0.35], B.balken[1]);
    // Holzstapel an der Seite +x
    for (let r = 0; r < 3; r++) for (let q = 0; q < 6; q++) b.box([0.5, 0.26, 0.26], [HX + HW / 2 + 0.5, Y + 0.13 + r * 0.27, HZ + 0.6 + q * 0.27 - 0.6], B.balken[(r + q) % 2]);
    // Rauch aus dem Kamin (steigt, wird grösser, kommt wieder)
    const rauchMat = new THREE.MeshBasicMaterial({ color: tokens.color["quadratic-3d"].void.partikel, fog: true });
    const rauch = Array.from({ length: 6 }, (_, k) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), rauchMat); m.name = "rauch"; m.userData.kulisse = true; m.layers.set(NOINK); return { m, k }; });
    const rauchG = new THREE.Group(); rauch.forEach((r) => rauchG.add(r.m));
    ex.push({ obj: rauchG, tick: (t) => rauch.forEach(({ m, k }) => {
      const u = ((t * 0.35 + k / 6) % 1);
      m.position.set(HX + 1.4 + u * 1.2, top + 2.3 + u * 3.5, HZ - 0.6 - u * 0.6);
      m.scale.setScalar(0.25 + u * 0.55); m.rotation.set(u * 2 + k, u + k, 0);
    }) });
    // Fahnenmast mit wehender Fahne (Segmente)
    const [fx, fz] = [5.2, 0.8];
    bel.nimm(fx, fz);
    b.box([0.12, 5, 0.12], [fx, Y + 2.5, fz], Kt.wand); b.box([0.2, 0.2, 0.2], [fx, Y + 5.05, fz], Kt.wand);
    const fahne = new THREE.Group(), fMat = kit.mat(B.fahne);
    const seg = Array.from({ length: 6 }, (_, k) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.8, 0.04), fMat); m.castShadow = true; fahne.add(m); return { m, k }; });
    ex.push({ obj: fahne, tick: (t) => seg.forEach(({ m, k }) => {
      m.position.set(fx + 0.21 + k * 0.3, Y + 4.5 + Math.sin(t * 2.4 - k * 0.8) * 0.04 * k, fz + Math.sin(t * 2.4 - k * 0.8) * 0.06 * k);
    }) });
    // Zaun entlang des Wegs
    for (let k = 0; k < 7; k++) {
      const x = 3.8 + k * 1.2, z = x - 0.2 - 2.0;
      if (bel.versuch(x, z, 0.4, 0.4)) { b.box([0.14, 0.9, 0.14], [x, Y + 0.45, z], B.balken[1]); if (k < 6) b.box([1.6, 0.1, 0.08], [x + 0.6, Y + 0.7, z + 0.6], B.balken[0], undefined, [0, -45, 0]); }
    }
    // Nadelbäume (gestuft) auf der Alm und am Hangfuss, Felsbrocken
    const baeume: [number, number][] = [];
    for (let k = 0, n = 0; k < 500 && n < 22; k++) {
      const x = Math.round(rng.range(-11.5, 11.5)) + 0.5, z = Math.round(rng.range(-11.5, 11.5)) + 0.5, hh = hoehe(x, z);
      if (hh > 2 || (hh === 0 && !bel.frei(x, z, 1.6, 1.6)) || baeume.some(([bx, bz]) => Math.hypot(bx - x, bz - z) < 2)) continue;
      if (hh === 0) bel.nimm(x, z, 1.6, 1.6);
      baeume.push([x, z]);
      const y0 = Y + hh, s = rng.range(0.85, 1.25);
      b.box([0.34, 0.7, 0.34], [x, y0 + 0.35, z], Kt.stamm);
      [[1.8, 0.7], [1.4, 0.7], [1.0, 0.6], [0.5, 0.6]].reduce((y, [w, th]) => { b.box([w * s, th * s, w * s], [x, y + (th * s) / 2, z], rng.pick(Kt.laub)); return y + th * s; }, y0 + 0.7);
      n++;
    }
    for (let k = 0; k < 12; k++) {
      const x = rng.range(-11, 11), z = rng.range(-11, 11), s = rng.range(0.5, 1.2);
      if (hoehe(x, z) > 0 || !bel.versuch(x, z, 1.6, 1.6)) continue;
      b.box([s * 1.3, s * 0.8, s], [x, Y + s * 0.4, z], rng.pick(B.fels)); b.box([s * 0.7, s * 0.5, s * 0.6], [x - s * 0.2, Y + s * 1.05, z + 0.1], rng.pick(B.fels));
    }
    return ex;
  },
};
