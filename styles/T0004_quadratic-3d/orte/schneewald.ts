// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Ort „Verschneiter Wald“ (T0004): Schnee-Kacheln mit Verwehungen, dichter Nadelwald mit Schneekappen auf jeder Stufe,
// kahle Laubbäume mit Schnee auf den Ästen, zugefrorener Teich mit Rissen, Hochsitz, Baumstümpfe, liegende Stämme,
// verschneite Felsen und Büsche, ein Reh am Teich, Fussspuren entlang des Pfads und fallender Schnee über der Karte.
// Alles aus Quadern.
import * as THREE from "three";
import tokens from "../../../shared/design-tokens.json";
import { NOINK, Rng } from "../../../engine/v01";
import { type Extra, type Ort } from "../welt";

const S = tokens.color["quadratic-3d"].orte.schneewald;
const Kt = tokens.color["quadratic-3d"].karte;
const teich = (x: number, z: number) => (x - 4) ** 2 / 14 + (z + 4) ** 2 / 8 < 1;
const PFAD: [number, number][] = [[-11, 6], [-4, 5], [1, 1.5], [9, 1.5]];
/** Abstand eines Punkts zum Pfad (m) – auf dem Pfad ist der Schnee festgetreten (flach). */
const amPfad = (x: number, z: number) => Math.min(...PFAD.slice(1).map((c, i) => {
  const a = PFAD[i], dx = c[0] - a[0], dz = c[1] - a[1], u = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(x - a[0] - dx * u, z - a[1] - dz * u);
}));

export const schneewald: Ort = {
  name: "schneewald", groesse: 24, oben: 6, seed: 59,
  wege: [PFAD, [[9, 2.6], [1.4, 2.6], [-3.6, 6.1]]],   // zweiter Weg parallel daneben (Figuren laufen nicht durcheinander)
  baue: ({ b, bel, rng, h, Y, kacheln, wegeFrei }) => {
    kacheln((x, z) => teich(x, z) ? [S.eis, 0.1, true] : amPfad(x, z) < 1.8 ? [S.schnee[1], 0.2] : [rng.pick(S.schnee), rng.range(0.2, 0.42)]);
    wegeFrei();
    const ex: Extra[] = [];
    // Risse im Eis, Schilf am Rand
    for (let k = 0; k < 7; k++) b.box([rng.range(0.8, 2.2), 0.02, 0.06], [4 + rng.range(-2.5, 2.5), 0.11, -4 + rng.range(-1.6, 1.6)], S.riss, undefined, [0, rng.pick([0, 30, -30, 60]), 0]);
    for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, x = 4 + Math.cos(a) * Math.sqrt(14) * 1.08, z = -4 + Math.sin(a) * Math.sqrt(8) * 1.08;
      if (bel.versuch(x, z, 0.5, 0.5)) b.box([0.08, rng.range(0.5, 0.9), 0.08], [x, Y + 0.35, z], Kt.stamm);
    }
    // Fussspuren entlang des Pfads (paarweise kleine Mulden)
    for (let i = 1; i < PFAD.length; i++) {
      const [a, c] = [PFAD[i - 1], PFAD[i]], L = Math.hypot(c[0] - a[0], c[1] - a[1]), n = Math.floor(L / 0.7);
      const nx = -(c[1] - a[1]) / L, nz = (c[0] - a[0]) / L;
      for (let k = 0; k < n; k++) {
        const u = k / n, s = k % 2 ? 0.15 : -0.15;
        b.box([0.18, 0.03, 0.18], [a[0] + (c[0] - a[0]) * u + nx * s, Y + 0.005, a[1] + (c[1] - a[1]) * u + nz * s], S.spur);
      }
    }
    // Hochsitz am Waldrand
    if (bel.versuch(-6, -1, 2.4, 2.4)) {
      for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) b.box([0.16, 3.2, 0.16], [-6 + dx, Y + 1.6, -1 + dz], S.rinde);
      b.box([2.0, 0.12, 2.0], [-6, Y + 3.2, -1], Kt.holz);
      b.box([2.0, 1.0, 0.1], [-6, Y + 3.8, -1.95], Kt.holz); b.box([0.1, 1.0, 2.0], [-6.95, Y + 3.8, -1], Kt.holz);
      b.box([2.0, 0.6, 0.1], [-6, Y + 3.55, -0.05], Kt.holz);
      b.box([2.4, 0.2, 2.4], [-6, Y + 4.45, -1], Kt.dach); b.box([2.3, 0.12, 2.3], [-6, Y + 4.61, -1], S.schnee[2]);
      for (let k = 0; k < 7; k++) b.box([0.6, 0.06, 0.08], [-4.9 + k * 0.1, Y + 0.25 + k * 0.45, -0.1 + k * 0.0], Kt.holz);
    }
    // Reh am Teich
    if (bel.versuch(0.6, -5, 1.6, 1)) {
      const rx = 0.6, rz = -5;
      b.box([1.1, 0.5, 0.4], [rx, Y + 0.85, rz], S.fell);
      for (const [dx, dz] of [[-0.4, -0.12], [0.4, -0.12], [-0.4, 0.12], [0.4, 0.12]]) b.box([0.1, 0.6, 0.1], [rx + dx, Y + 0.3, rz + dz], S.fell);
      b.box([0.16, 0.45, 0.16], [rx + 0.55, Y + 1.25, rz], S.fell); b.box([0.36, 0.22, 0.22], [rx + 0.72, Y + 1.5, rz], S.fell);
      b.box([0.08, 0.2, 0.06], [rx + 0.62, Y + 1.7, rz - 0.08], S.fell); b.box([0.08, 0.2, 0.06], [rx + 0.62, Y + 1.7, rz + 0.08], S.fell);
      b.box([0.12, 0.12, 0.2], [rx - 0.58, Y + 1.0, rz], S.schnee[2]);
    }
    // Nadelbäume mit Schneekappen, kahle Bäume, Stümpfe, Stämme, Felsen, Büsche
    for (let k = 0, n = 0; k < 900 && n < 40; k++) {
      const x = Math.round(rng.range(-h + 1, h - 1)) + 0.5, z = Math.round(rng.range(-h + 1, h - 1)) + 0.5;
      if (!bel.versuch(x, z, 2, 2)) continue;
      const s = rng.range(0.85, 1.35);
      if (rng.next() < 0.78) {
        b.box([0.34, 0.8, 0.34], [x, Y + 0.4, z], S.rinde);
        [[1.9, 0.75], [1.5, 0.75], [1.1, 0.65], [0.6, 0.6]].reduce((y, [w, th]) => {
          b.box([w * s, th * s, w * s], [x, y + (th * s) / 2, z], rng.pick(S.nadel));
          b.box([w * s * 0.88, 0.12, w * s * 0.88], [x, y + th * s + 0.06, z], rng.pick(S.schnee));   // Kappe deutlich breiter als die Stufe darüber (sonst flackern die Seiten)
          return y + th * s;
        }, Y + 0.8);
      } else {
        b.box([0.3, 3.2 * s, 0.3], [x, Y + 1.6 * s, z], S.rinde);
        for (const [dx, dz, hy] of [[0.6, 0, 1.8], [-0.5, 0.2, 2.3], [0, -0.55, 2.7], [0.2, 0.5, 2.0]]) {
          b.box([Math.abs(dx) * 2 + 0.1, 0.12, Math.abs(dz) * 2 + 0.1], [x + dx / 2, Y + hy * s, z + dz / 2], S.rinde);
          b.box([Math.abs(dx) * 2 + 0.1, 0.06, Math.abs(dz) * 2 + 0.1], [x + dx / 2, Y + hy * s + 0.09, z + dz / 2], S.schnee[2]);
        }
      }
      n++;
    }
    for (let k = 0; k < 30; k++) {
      const x = rng.range(-h + 1, h - 1), z = rng.range(-h + 1, h - 1), art = k % 4;
      if (!bel.versuch(x, z, art === 1 ? 3 : 1.2, 1.2)) continue;
      if (art === 0) { b.box([0.6, 0.45, 0.6], [x, Y + 0.23, z], S.rinde); b.box([0.62, 0.1, 0.62], [x, Y + 0.5, z], S.schnee[2]); }
      else if (art === 1) { b.box([2.6, 0.4, 0.4], [x, Y + 0.2, z], S.rinde); b.box([2.6, 0.08, 0.36], [x, Y + 0.44, z], S.schnee[0]); }
      else if (art === 2) { b.box([1.0, 0.6, 0.8], [x, Y + 0.3, z], Kt.fels); b.box([0.9, 0.2, 0.7], [x, Y + 0.7, z], S.schnee[1]); }
      else { b.box([0.9, 0.5, 0.9], [x, Y + 0.25, z], rng.pick(S.nadel)); b.box([0.8, 0.25, 0.8], [x, Y + 0.6, z], S.schnee[2]); }
    }
    // fallender Schnee über der Karte (eigene kleine Flocken, fallen und kommen oben wieder)
    const r2 = new Rng(77), n = 220;
    const flocken = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: S.schnee[2], fog: true }), n);
    flocken.name = "schneefall"; flocken.userData.kulisse = true; flocken.frustumCulled = false; flocken.layers.set(NOINK);
    const f = Array.from({ length: n }, () => ({ x: r2.range(-h, h), y: r2.range(0, 9), z: r2.range(-h, h), s: r2.range(0.06, 0.13), v: r2.range(0.5, 0.9), ph: r2.range(0, 6.28) }));
    const o = new THREE.Object3D();
    ex.push({ obj: flocken, tick: (t) => {
      f.forEach((q, i) => {
        const y = 9 - ((9 - q.y + t * q.v) % 9);
        o.position.set(q.x + Math.sin(t * 0.8 + q.ph) * 0.3, Y + 0.3 + y, q.z + Math.cos(t * 0.6 + q.ph) * 0.3);
        o.scale.setScalar(q.s); o.updateMatrix(); flocken.setMatrixAt(i, o.matrix);
      });
      flocken.instanceMatrix.needsUpdate = true;
    } });
    return ex;
  },
};
