// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Die Stadt: ein fester Lageplan mit benannten Orten, aus dem Baukasten zusammengesetzt. Story und Kamera sprechen
// Orte mit Namen an (PLACES) statt mit Zahlen. Gleicher Startwert = gleiche Stadt.
//
//   Lageplan (Draufsicht, x nach rechts, z nach unten = Richtung Fluss):
//   z −6,5  ████████ Häuserzeile Nord (ganz) ████████████████████|  Park (x 90…140)
//   z  0    ══ Laborstrasse ═══════════╪══ Strasse am Kai ═══════|
//   z +6,5  ████ Häuserzeile Süd ████  | Platz | Kai-Promenade ……|
//   z 12…60                            |       ~~~ Fluss ~~~ ║ Brücke (x 45)
//   z 66    ████ Häuserzeile am anderen Ufer (Flussufer) █████████
import * as THREE from "three";
import { Rng } from "../core/random";
import { Kit } from "./kit";
import type { V3 } from "../camera/rig";
import { ground, quayWall, street, type GroundKind } from "./ground";
import { house, houseHeight, type HouseSpec } from "./house";
import { water, type WaterColors } from "./water";
import { bridge } from "./bridge";
import { bush, cloud, flowers, tree, type CloudColors } from "./nature";
import { bench, boat, crates, lantern, stand } from "./props";
import { plaster } from "./paint";
import type { WorldPalette } from "./palette";

export type TownLook = { palette: WorldPalette; water: WaterColors; clouds: CloudColors; sunColor: string; lampGlow: number };

/** Benannte Orte: Mittelpunkt (wo Figuren stehen) und zwei Kamera-Vorschläge. */
export type Place = { at: V3; wide: { pos: V3; look: V3 }; medium: { pos: V3; look: V3 }; note: string };

export const PLACES: Record<string, Place> = {
  laborstrasse: { at: [-40, 0.15, -4.6], note: "Strasse mit Häusern auf beiden Seiten; gelbes Laborhaus mit Schildhalter (x −40)",
    wide: { pos: [-33, 2.2, 4.8], look: [-41, 2.8, -4.8] }, medium: { pos: [-38.6, 1.7, 1.6], look: [-40, 1.9, -4.6] } },
  gasse: { at: [-62, 0, 0], note: "Blick die Strasse entlang in die Tiefe",
    wide: { pos: [-48, 2.0, 1.2], look: [-110, 3.5, -1] }, medium: { pos: [-56, 1.7, 1.5], look: [-64, 2.2, -1] } },
  platz: { at: [2, 0.15, 7], note: "offener Platz zwischen Strasse und Kai, mit Stand, Kisten, Laterne",
    wide: { pos: [-3, 2.4, 11], look: [5, 2.2, 0] }, medium: { pos: [0.5, 1.7, 11], look: [2.5, 1.8, 6] } },
  kai: { at: [24, 0.15, 9], note: "Promenade am Fluss mit Bank und Laternen; Blick übers Wasser zur Brücke",
    wide: { pos: [14, 2.2, 4.5], look: [40, 2.5, 30] }, medium: { pos: [22, 1.6, 4.8], look: [24, 1.5, 9.5] } },
  brueckenkopf: { at: [45, 1.0, 14], note: "Anfang der Hängebrücke am Kai",
    wide: { pos: [38, 3.0, 4], look: [46, 4, 30] }, medium: { pos: [45, 1.9, 6], look: [45, 2.0, 15] } },
  park: { at: [110, 0, 2], note: "Rasen mit Bäumen, Büschen, Blumen und Bank",
    wide: { pos: [98, 2.0, 12], look: [114, 2.5, -2] }, medium: { pos: [107, 1.6, 7.5], look: [110, 1.4, 2] } },
  flussufer: { at: [20, 0.15, 63], note: "Häuserzeile am anderen Ufer (vom Kai aus gesehen)",
    wide: { pos: [20, 2.5, 10], look: [20, 5, 62] }, medium: { pos: [20, 2.2, 22], look: [20, 4, 62] } },
};

const WIDTHS = [6.5, 7.5, 8.5, 9.5];

/** Eine Häuserzeile entlang x. facing +1 = Fassade nach +z, −1 = nach −z. `special` ersetzt Häuser an bestimmten x. */
const row = (kit: Kit, pal: WorldPalette, o: { from: number; to: number; z: number; facing: 1 | -1; seed: number; depth?: number; special?: { x: number; spec: HouseSpec }[] }) => {
  const rng = new Rng(o.seed);
  const g = new THREE.Group(); g.name = "haeuserzeile";
  const todo = [...(o.special ?? [])].sort((a, b) => a.x - b.x);
  let x = o.from;
  let last = "";
  let nr = 0;   // jedes zweite Haus: Gesims und Dach 1,2 cm versetzt (Nachbarn überlappen sonst deckungsgleich → Flackern)
  while (x < o.to) {
    let spec: HouseSpec | undefined;
    let width = rng.pick(WIDTHS);
    const next = todo[0], start = next ? next.x - next.spec.width / 2 : Infinity;
    if (next && x + width > start - 0.02) {
      if (start - x >= 5) width = start - x - 0.02;   // Lücke vor dem Sonderhaus mit einem passenden Haus füllen
      else {
        // schmale Lücke (< 5 m): mit einem schmalen Haus bzw. einer Mauer schliessen – nie ins Leere sehen lassen
        const gap = start - x - 0.02;
        if (gap > 0.05) {
          const filler = gap >= 1.2
            ? house(kit, pal, { width: gap, floors: 2, wall: "plaster", color: last || pal.walls.plaster[1], shutters: null, door: null, roof: "flat", depth: o.depth, versatz: (nr++ % 2) * 0.012 })
            : kit.batch().box([gap, houseHeight(2), o.depth ?? 8], [0, houseHeight(2) / 2, -(o.depth ?? 8) / 2], "#ffffff", plaster(last || pal.walls.plaster[1])).build("mauer");
          filler.position.set(x + gap / 2, 0, o.z);
          if (o.facing < 0) filler.rotation.y = Math.PI;
          filler.userData.occluder = true; filler.name = `fueller-${Math.round(x)}`;
          g.add(filler);
        }
        spec = next.spec; x = start; todo.shift();
      }
    }
    if (!spec) {
      const brickWall = rng.next() < 0.4;
      let color = brickWall ? rng.pick(pal.walls.brick) : rng.pick(pal.walls.plaster);
      if (color === last) color = brickWall ? rng.pick(pal.walls.brick) : rng.pick(pal.walls.plaster);
      last = color;
      const cols = Math.max(1, Math.floor((width - 0.6) / 2.3));
      spec = {
        width, floors: rng.pick([2, 3, 3, 4] as const), wall: brickWall ? "brick" : "plaster", color,
        shutters: rng.next() < 0.85 ? rng.pick(pal.shutters) : null,
        door: rng.next() < 0.75 ? { column: rng.int(0, cols - 1), color: rng.pick(pal.doors) } : null,
        roof: rng.next() < 0.6 ? "gable" : "flat", roofColor: rng.pick(pal.roofs), chimney: rng.next() < 0.5, depth: o.depth,
      };
    }
    const h = house(kit, pal, { ...spec, versatz: (nr++ % 2) * 0.012 });
    h.position.set(x + spec.width / 2, 0, o.z);
    if (o.facing < 0) h.rotation.y = Math.PI;
    h.name = `haus-${Math.round(x + spec.width / 2)}`;
    g.add(h);
    x += spec.width + 0.02;
  }
  return g;
};

/** Optionen: `labX` = x-Mitte des gelben Laborhauses in der Häuserzeile Nord (Standard −40, Laborstrasse);
 *  `kaiBoden` = Belag der Strasse am Kai (Standard Kopfsteinpflaster, "slabs" = helle Platten wie ein Kai). */
/** Bodenhöhe der Stadt an (x, z): Strasse 0, Gehsteige/Promenade/Ufer 0,15 m, Brückendeck 0,45 m, Wasser −1,2 m. */
export const groundAt = (x: number, z: number) => {
  if (Math.abs(x - 45) <= 2 && z >= 10 && z <= 62) return 0.45;          // Brücke
  if (z >= 12 && z <= 60) return x >= -100 && x <= 130 ? -1.2 : 0;        // Fluss
  if (z <= -3.5 && z >= -6.5 && x >= -260 && x <= 90) return 0.15;       // Gehsteig Nord
  if (z >= 3.5 && z <= 6.5 && x >= -260 && x < -10) return 0.15;         // Gehsteig Süd (Laborstrasse)
  if (z >= 3.5 && z <= 12 && x >= -10 && x <= 90) return 0.15;          // Platz + Kai-Promenade
  if (z >= 60 && z <= 66 && x >= -110 && x <= 150) return 0.15;         // Ufer gegenüber
  if (x >= 90 && x <= 140 && z >= -22 && z <= 11.5) return 0.02;        // Park (Rasen)
  return 0;
};

export const town = (kit: Kit, look: TownLook, seed = 1, opt: { labX?: number; kaiBoden?: GroundKind } = {}) => {
  const pal = look.palette;
  const root = new THREE.Group(); root.name = "stadt";
  const add = (o: THREE.Object3D) => { root.add(o); return o; };

  // Boden (ausser über dem Fluss)
  add(ground(kit, pal, "cobble", [700, 300], [0, -0.01, -138]));
  add(ground(kit, pal, "cobble", [700, 300], [0, -0.01, 216]));
  add(ground(kit, pal, "cobble", [260, 48], [-230, -0.01, 36]));  // westlich des Flusses
  add(ground(kit, pal, "grass", [300, 48], [280, -0.01, 36]));    // östlich: Wiese

  // Strassen
  add(street(kit, pal, { from: -260, to: -10, z: 0, road: 7, walk: 3 }));
  add(street(kit, pal, { from: -10, to: 90, z: 0, road: 7, walk: 3, sides: [-1], roadKind: opt.kaiBoden }));
  add(ground(kit, pal, "slabs", [100, 8.5], [40, 0.15, 7.75], 0.15));     // Kai-Promenade + Platz
  add(ground(kit, pal, "slabs", [260, 6], [20, 0.15, 63], 0.15));         // Ufer gegenüber
  add(quayWall(kit, pal, { from: -100, to: 130, edge: 12, top: 0.15, bottom: -3, s: 1 }));
  add(quayWall(kit, pal, { from: -100, to: 130, edge: 60, top: 0.15, bottom: -3, s: -1 }));

  // Häuser
  add(row(kit, pal, { from: -260, to: 88, z: -6.5, facing: 1, seed: seed * 11, special: [
    // Laborhaus: weisse Wandkacheln, keine Läden, blaue Tür in der Mitte (Platz für Laborschild + Warnlicht darüber)
    { x: opt.labX ?? -40, spec: { width: 9, floors: 3, wall: "tiles", color: "#eef1f3", shutters: null, door: { column: 1, color: "#3b5f9a" }, roof: "flat" } },
  ] }));
  add(row(kit, pal, { from: -260, to: -12, z: 6.5, facing: -1, seed: seed * 13, depth: 5 }));
  add(row(kit, pal, { from: -60, to: 100, z: 66, facing: -1, seed: seed * 17 }));
  { // Abschluss der Strasse im Westen (sonst sieht man am Ende der Gasse ins Leere): breites Haus quer über die Strasse, Front nach Osten
    const w = 13.4, h = house(kit, pal, { width: w, floors: 4, wall: "plaster", color: pal.walls.plaster[1], shutters: pal.shutters[0], door: { column: 2, color: pal.doors[0] }, roof: "gable", roofColor: pal.roofs[2], chimney: true });
    h.position.set(-260.6, 0, 0); h.rotation.y = Math.PI / 2; h.name = "haus-strassenende"; h.userData.occluder = true; add(h); }

  // Fluss + Brücke
  const river = water(look.water, [230, 48], [15, -1.2, 36], look.sunColor);
  add(river.mesh);
  add(bridge(kit, pal, { length: 52, width: 4, towerHeight: 17, deckY: 0.45, at: [45, 0, 36] }));
  add(boat(kit, pal, [28, -1.4, 18], 12));

  // Platz und Kai
  add(stand(kit, pal, [4, 0.15, 6.5], 0));
  add(crates(kit, pal, [7.2, 0.15, 6], -10));
  add(bench(kit, pal, [24, 0.15, 10.4], 180));
  const lamps: THREE.Object3D[] = [];
  for (const x of [12, 32, 52, 72]) lamps.push(add(lantern(kit, pal, [x, 0.15, 11.3], look.lampGlow)));

  // Park
  const prng = new Rng(seed * 19);
  add(ground(kit, pal, "grass", [50, 33.5], [115, 0.02, -5.25]));
  for (let i = 0; i < 14; i++) add(tree(kit, pal, [prng.range(95, 138), 0, prng.range(-20, -4)], prng.range(5, 7.5), i + 1));
  for (let i = 0; i < 4; i++) add(tree(kit, pal, [prng.range(118, 138), 0, prng.range(4, 10)], prng.range(5, 7), i + 40));
  for (let i = 0; i < 10; i++) add(bush(kit, pal, [prng.range(94, 136), 0, prng.range(-3, 10)], prng.range(0.8, 1.3), i + 1));
  add(flowers(kit, pal, [104, 0.02, -2.5], 6, 1.2, 1));
  add(flowers(kit, pal, [116, 0.02, -2.5], 6, 1.2, 2));
  add(bench(kit, pal, [110, 0, -0.5], 0));
  add(lantern(kit, pal, [104.5, 0, 0], look.lampGlow));
  // Häuser rund um den Park (Sichtschutz, sonst sieht man hinter dem Park ins Leere): Zeile Nord (Front z −25), Zeile Ost
  // (Front x 143, schaut nach Westen) und ein Querhaus an der Westseite zwischen der Häuserzeile Nord (hinten z −14,5) und z −25
  add(row(kit, pal, { from: 80, to: 153, z: -25, facing: 1, seed: seed * 29 }));
  { const ost = new Rng(seed * 31); let z = -23.6, nr = 0;
    while (z < 11) {
      const w = Math.min(ost.pick(WIDTHS), 11 - z);
      if (w < 3) break;
      const h = house(kit, pal, { width: w, floors: ost.pick([2, 3, 3] as const), wall: ost.next() < 0.4 ? "brick" : "plaster",
        color: ost.next() < 0.4 ? ost.pick(pal.walls.brick) : ost.pick(pal.walls.plaster), shutters: ost.pick(pal.shutters),
        door: null, roof: ost.next() < 0.6 ? "gable" : "flat", roofColor: ost.pick(pal.roofs), chimney: ost.next() < 0.5, versatz: (nr++ % 2) * 0.012 });
      h.position.set(143, 0, z + w / 2); h.rotation.y = -Math.PI / 2; h.name = `haus-ost-${Math.round(z + w / 2)}`; h.userData.occluder = true; add(h);
      z += w + 0.02;
    } }
  { const w = 9.8, h = house(kit, pal, { width: w, floors: 3, wall: "plaster", color: pal.walls.plaster[0], shutters: pal.shutters[2], door: null, roof: "gable", roofColor: pal.roofs[0], chimney: true });
    h.position.set(89, 0, -14.7 - w / 2); h.rotation.y = Math.PI / 2; h.name = "haus-park-west"; h.userData.occluder = true; add(h); }
  // Bäume am Ufer gegenüber (Hintergrund)
  for (let i = 0; i < 8; i++) add(tree(kit, pal, [-50 + i * 19, 0.15, 61.5], 6.5, 60 + i));

  // Wolken
  const crng = new Rng(seed * 23);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + crng.range(-0.2, 0.2), d = crng.range(260, 340);
    root.add(cloud(look.clouds, [Math.cos(a) * d, crng.range(55, 95), Math.sin(a) * d], crng.range(1.2, 1.9), i + 1));
  }
  // zweite, höhere Wolkenschicht rundum: auch über Dächern und Türmen stehen in jedem Bild Wolken am Himmel
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + crng.range(-0.15, 0.15), d = crng.range(210, 300);
    root.add(cloud(look.clouds, [Math.cos(a) * d, crng.range(85, 150), Math.sin(a) * d], crng.range(1.9, 2.8), 40 + i));
  }

  const tick = (time: number, cam: THREE.Camera, sunDir?: THREE.Vector3) => river.tick(time, cam, sunDir);
  return { root, tick, lamps, groundAt };
};
