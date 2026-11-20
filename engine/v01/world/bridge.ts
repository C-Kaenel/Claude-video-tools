// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Hängebrücke: Holzdeck mit Geländer, zwei Steintürme mit Querbalken, Tragketten als durchhängende Bögen,
// senkrechte Hänger zum Deck, Rückspannung zu den Ankern. Die Brücke läuft entlang z, Mitte = `at`.
import * as THREE from "three";
import { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { blocks, planks, shade } from "./paint";
import type { WorldPalette } from "./palette";

export type BridgeSpec = { length: number; width: number; towerHeight: number; deckY: number; at: V3 };

export const bridge = (kit: Kit, pal: WorldPalette, o: BridgeSpec) => {
  const b = kit.batch();
  const [cx, , cz] = o.at, L = o.length, W = o.width, y = o.deckY;
  b.box([W, 0.3, L], [cx, y - 0.15, cz], "#ffffff", planks(pal.wood));
  // Geländer: Pfosten + Handlauf
  for (const s of [-1, 1]) {
    const x = cx + s * (W / 2 - 0.08);
    for (let z = -L / 2 + 0.5; z <= L / 2 - 0.5; z += 1.6) b.box([0.1, 1.0, 0.1], [x, y + 0.5, cz + z], pal.wood);
    b.box([0.12, 0.1, L - 0.6], [x, y + 1.0, cz], shade(pal.wood, 0.85));
    b.box([0.06, 0.06, L - 0.6], [x, y + 0.55, cz], shade(pal.wood, 0.85));
  }
  // Türme
  const tz = L / 2 - 4, stone = blocks(pal.quay, shade(pal.quay, 0.58));
  for (const t of [-1, 1]) {
    for (const s of [-1, 1]) b.box([1.3, o.towerHeight, 1.3], [cx + s * (W / 2 + 0.8), o.towerHeight / 2 + (y - 6), cz + t * tz], "#ffffff", stone);
    b.box([W + 3, 1.0, 1.5], [cx, y - 6 + o.towerHeight - 0.5, cz + t * tz], "#ffffff", stone);
    b.box([W + 3.4, 0.25, 1.8], [cx, y - 6 + o.towerHeight + 0.12, cz + t * tz], pal.stone);
  }
  const g = b.build("bruecke");
  // Ketten: Bogen zwischen den Turmspitzen, Rückspannung zu den Enden
  const top = y - 6 + o.towerHeight - 0.8, sag = y + 1.2;
  const chainMat = kit.mat(pal.metal);
  for (const s of [-1, 1]) {
    const x = cx + s * (W / 2 + 0.12);   // Kette direkt über der Deckkante (an der Innenseite der Turmpfeiler)
    const main: THREE.Vector3[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, z = -tz + 2 * tz * t;
      main.push(new THREE.Vector3(x, sag + (top - sag) * Math.pow(2 * t - 1, 2), cz + z));
    }
    const tube = (pts: THREE.Vector3[], r: number) => {
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 3, r, 8), chainMat);
      m.castShadow = true; g.add(m);
    };
    tube(main, 0.11);
    for (const t of [-1, 1]) tube([new THREE.Vector3(x, top, cz + t * tz), new THREE.Vector3(x, (top + y) / 2 - 0.6, cz + t * (tz + 3)), new THREE.Vector3(x, y, cz + t * (L / 2))], 0.1);
    // Hänger
    const hb = kit.batch();
    for (let z = -tz + 1.6; z < tz - 1; z += 1.6) {
      // Hänger senkrecht von der Kette bis an die Deckkante – oben und unten verbunden
      const t = (z + tz) / (2 * tz), cy = sag + (top - sag) * Math.pow(2 * t - 1, 2);
      const h = cy - (y - 0.15);
      if (h > 0.1) hb.box([0.05, h, 0.05], [x, y - 0.15 + h / 2, cz + z], pal.metal);
    }
    g.add(hb.build("haenger"));
  }
  g.userData.occluder = false;
  return g;
};
