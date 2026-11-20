// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Böden und Strassen: Flächen aus Kopfsteinpflaster, Platten, Gras, Holz oder Stein; Strasse mit Gehwegen und Randstein;
// Kaimauer. Alle Flächen liegen waagrecht; Masse in Metern, Mitte = `at`.
import * as THREE from "three";
import { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { blocks, cobble, grass, planks, shade, slabs } from "./paint";
import type { WorldPalette } from "./palette";

export type GroundKind = "cobble" | "cobble-light" | "slabs" | "grass" | "planks" | "quay";

const paintFor = (pal: WorldPalette, kind: GroundKind) =>
  kind === "cobble" ? cobble(pal.cobble, pal.cobbleJoint)
  : kind === "cobble-light" ? cobble(pal.slab, pal.slabJoint)   // helles Kopfsteinpflaster (Kai)
  : kind === "slabs" ? slabs(pal.slab, pal.slabJoint)
  : kind === "grass" ? grass(pal.grass)
  : kind === "planks" ? planks(pal.wood)
  : blocks(pal.quay, shade(pal.quay, 0.6));

/** Waagrechte Fläche (Breite x, Tiefe z), Oberseite auf Höhe at[1]. */
export const ground = (kit: Kit, pal: WorldPalette, kind: GroundKind, size: [number, number], at: V3, thick = 0) => {
  const geo = thick > 0 ? new THREE.BoxGeometry(size[0], thick, size[1]) : new THREE.PlaneGeometry(size[0], size[1]).rotateX(-Math.PI / 2);
  const m = kit.mesh(geo.translate(at[0], at[1] - thick / 2, at[2]), "#ffffff", paintFor(pal, kind));
  m.castShadow = thick > 0;
  m.name = `boden-${kind}`;
  return m;
};

/** Strasse entlang x: Fahrbahn (Pflaster), beidseits erhöhter Gehweg (Platten) mit Randstein. */
export const street = (kit: Kit, pal: WorldPalette, o: { from: number; to: number; z: number; road: number; walk: number; sides?: (-1 | 1)[]; roadKind?: GroundKind }) => {
  const g = new THREE.Group(); g.name = "strasse";
  const L = o.to - o.from, cx = (o.from + o.to) / 2;
  g.add(ground(kit, pal, o.roadKind ?? "cobble", [L, o.road], [cx, 0, o.z]));
  for (const s of o.sides ?? [-1, 1]) {
    const zc = o.z + s * (o.road / 2 + o.walk / 2);
    g.add(ground(kit, pal, "slabs", [L, o.walk], [cx, 0.15, zc], 0.15));
    const b = kit.batch();
    // Randstein ragt 2 cm über die Gehsteig-Kante hinaus (keine gemeinsame Fläche → kein Flackern)
    b.box([L, 0.17, 0.3], [cx, 0.085, o.z + s * (o.road / 2 + 0.13)], "#ffffff", blocks(pal.curb, shade(pal.curb, 0.62)));
    g.add(b.build("randstein"));
  }
  return g;
};

/** Kaimauer entlang x: Oberkante y=top, fällt bei z=edge bis zum Wasser (y=bottom) ab. Richtung s: Wasser liegt bei z·s > edge·s. */
export const quayWall = (kit: Kit, pal: WorldPalette, o: { from: number; to: number; edge: number; top: number; bottom: number; s: 1 | -1 }) => {
  const L = o.to - o.from, h = o.top - o.bottom;
  const b = kit.batch();
  b.box([L, h - 0.01, 1.2], [(o.from + o.to) / 2, o.bottom + (h - 0.01) / 2, o.edge - o.s * 0.6], "#ffffff", blocks(pal.quay, shade(pal.quay, 0.58)));   // 1 cm unter der Promenade
  b.box([L, 0.22, 1.5], [(o.from + o.to) / 2, o.top + 0.11, o.edge - o.s * 0.6], pal.stone); // Deckstein
  return b.build("kaimauer");
};
