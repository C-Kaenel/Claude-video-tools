// Herkunft: eigen (V-Video), geschrieben 2026-11-13, ohne Vorlage.
// Welt der Prüf-Story RaumTest: jeder Shot baut seinen eigenen kleinen Ort. "sauber" ist fehlerfrei und hat genug
// Details; jeder andere Shot enthält genau einen Fehler, den die Raum-Prüfung (qa/raum.ts) finden muss – ausser
// "baeume", "wuerfelkopf" und "vogel" (Gegenproben ohne Fund; "vogel" muss genug Details zählen).
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import tokens from "../../../../shared/design-tokens.json";
import { Actor, Kit, tree, twoTone, type ActorKey, type CardColors, type FigureSpec, type WorldBuilder, type WorldPalette } from "../../index";

const C = tokens.color["cartoon-3d2d"], K = C.cards;
const FARBEN: CardColors = { ink: C.characterInk, mouth: C.mouth, tongue: C.tongue, teeth: K.teeth, sweat: K.sweat, paper: K.paper };
const SPEC: FigureSpec = { name: "pruef", zeit: "stadt", skin: "#f5c9a0", coat: "#3f6fb5", hair: { style: "side", color: "#5a3a24" } };

export const buildRaumTest: WorldBuilder = ({ scene, shot, style }) => {
  const p = style.lights[shot.light];
  const mat = (c: string) => twoTone(p, c);
  const boden = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), mat("#a39a8c"));
  boden.rotation.x = -Math.PI / 2; boden.name = "boden"; boden.receiveShadow = true;
  scene.add(boden);

  /** Gruppe mit einem Netz (zählt als Detail); `art`: occluder (Haus, Baum) oder protect (Requisit). */
  const ding = (name: string, geo: THREE.BufferGeometry, farbe: string, at: [number, number, number], art: "occluder" | "protect" | null = "protect") => {
    const g = new THREE.Group(); g.name = name; g.position.set(...at);
    const m = new THREE.Mesh(geo, mat(farbe)); m.castShadow = m.receiveShadow = true; g.add(m);
    if (art) g.userData[art] = true;
    scene.add(g); return g;
  };
  const actors: Actor[] = [];
  const figur = (keys: ActorKey[], spec: Partial<FigureSpec> = {}, seed = 1) => {
    const a = new Actor({ ...SPEC, ...spec }, keys, FARBEN, { seed, groundY: 0 });
    scene.add(a.root); actors.push(a); return a;
  };

  switch (shot.id) {
    case "sauber": {
      // 4 Häuser mit Dach, 2 Bäume, 2 Kisten, eine gehende Figur – nichts berührt sich, nichts liegt deckungsgleich
      [-5.4, 0, 5.4, 10.8].forEach((x, i) => {
        const h = 6 + (i % 2) * 1.5;
        const haus = ding(`haus${i}`, new THREE.BoxGeometry(5, h, 5), ["#a8553f", "#e6d5b0", "#c89a4a", "#b86b4b"][i], [x, h / 2, -12], "occluder");
        haus.userData.house = true;
        const dach = new THREE.Mesh(new THREE.ConeGeometry(3.9, 2.4, 4), mat("#7a4a3a"));
        dach.rotation.y = Math.PI / 4; dach.position.y = h / 2 + 1.2; haus.add(dach);
      });
      [-2.4, 2.4].forEach((x, i) => {
        const baum = ding(`baum${i}`, new THREE.CylinderGeometry(0.18, 0.24, 2.2, 10), "#6b4a2e", [x, 1.1, -5], "occluder");
        const krone = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 10), mat("#5d9a3a")); krone.position.y = 1.9; baum.add(krone);
      });
      ding("kiste0", new THREE.BoxGeometry(0.8, 0.8, 0.8), "#b5814a", [-1.7, 0.4, -1.5]);
      ding("kiste1", new THREE.BoxGeometry(0.6, 0.6, 0.6), "#c89a4a", [1.8, 0.3, -1.2]);
      figur([{ at: 0, pos: [-1.2, 0.5], side: 1 }, { at: 2, pos: [0.8, 0.5] }]);
      break;
    }
    case "flackern": {
      // Platte genau in der Höhe des Bodens: zwei Flächen deckungsgleich
      const platte = new THREE.Mesh(new THREE.PlaneGeometry(3, 3), mat("#c0504d"));
      platte.rotation.x = -Math.PI / 2; platte.name = "platte"; scene.add(platte);
      break;
    }
    case "fern-flackern":
    case "fern-schichten": {
      // weit vom Weltmittelpunkt (x = 5400, wie grosse Welten): zwei fast parallele Platten. "fern-flackern": die kleine
      // Platte ist um 0,0001 rad gekippt und liegt in ihrer Mitte genau auf der grossen – deckungsgleich, muss gefunden werden.
      // "fern-schichten": die kleine liegt 0,6 m über der grossen und ist so gekippt, dass ihr Ebenen-Abstand vom
      // Weltmittelpunkt (n·p) zufällig gleich dem der grossen ist – keine Deckung, darf nicht gemeldet werden.
      const X = 5400, hoch = shot.id === "fern-schichten" ? 0.6 : 0;
      const platte = (name: string, gr: number, farbe: string, y: number, kipp: number) => {
        const g = new THREE.Group(); g.name = name; g.position.set(X, y, 0); g.rotation.z = kipp;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(gr, gr), mat(farbe)); m.rotation.x = -Math.PI / 2; g.add(m);
        scene.add(g);
      };
      platte("platte-oben", 3, "#c0504d", hoch, hoch ? Math.asin(hoch / X) : 1e-4);   // zuerst: liegt oben, sichtbar
      platte("platte-unten", 8, "#7aa35a", 0, 0);
      break;
    }
    case "fenster-tuer": {
      // Hausfront, deren gemeldetes Fenster (Batch.teil) über die Tür reicht
      const haus = ding("haus-fehler", new THREE.BoxGeometry(5, 6, 4), "#e6d5b0", [0, 3, -3], "occluder");
      haus.userData.house = true;
      haus.userData.teile = [
        { art: "tuer", min: [-0.6, -3, 2], max: [0.6, -0.8, 2.05] },
        { art: "fenster", min: [-0.4, -1.2, 2], max: [0.4, 0, 2.05] },
      ];
      const tuer = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.06), mat("#8a4a24")); tuer.position.set(0, -1.9, 2.03); haus.add(tuer);
      const fenster = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.2, 0.08), mat("#7fb2d6")); fenster.position.set(0, -0.6, 2.04); haus.add(fenster);
      break;
    }
    case "steckt-in": {
      // Pfahl steckt mitten durch ein Brett
      ding("brett", new THREE.BoxGeometry(2, 1, 0.2), "#b5814a", [0, 0.5, 0]);
      ding("pfahl", new THREE.CylinderGeometry(0.09, 0.09, 1.6, 16, 8), "#6b4a2e", [0, 0.8, 0]);
      break;
    }
    case "laeuft-durch": {
      // Figur läuft quer durch eine Kiste
      ding("kiste", new THREE.BoxGeometry(1.2, 1.4, 1.2), "#b5814a", [0, 0.7, 0]);
      figur([{ at: 0, pos: [-3, 0], side: 1 }, { at: 2, pos: [3, 0] }]);
      break;
    }
    case "durcheinander": {
      // zwei Figuren gehen auf derselben Linie durcheinander hindurch
      figur([{ at: 0, pos: [-2.5, 0], side: 1 }, { at: 2, pos: [2.5, 0] }], {}, 1);
      figur([{ at: 0, pos: [2.5, 0], side: -1 }, { at: 2, pos: [-2.5, 0] }], { name: "pruef2", coat: "#8c3b4a" }, 2);
      break;
    }
    case "anschnitt": {
      // Kamera tief und nah: das Gesicht liegt über dem oberen Bildrand
      figur([{ at: 0, pos: [0, 0] }]);
      break;
    }
    case "verdeckt": {
      // Mauer (kein Hindernis für den Sichtlinien-Schutz) steht zwischen Kamera und Kopf
      const mauer = new THREE.Mesh(new THREE.BoxGeometry(3, 2.4, 0.25), mat("#9a8f80"));
      mauer.position.set(0, 1.2, 2); mauer.name = "mauer"; scene.add(mauer);
      figur([{ at: 0, pos: [0, 0] }]);
      break;
    }
    case "baeume": {
      // zwei echte Laubbäume (world/nature.ts) so dicht, dass die Kronen ineinander wachsen – erlaubt (wie stadt-park)
      const kit = new Kit(p, 1), pal = { bark: "#6b4a2e", leaves: ["#5d9a3a", "#4f8a32"] } as unknown as WorldPalette;
      ([[-1.6, -1.2], [1.6, 1.2]] as const).forEach(([x, z], i) => scene.add(tree(kit, pal, [x, 0, z], 6, 3 + i)));
      break;
    }
    case "wuerfelkopf": {
      // Klotz-Figur aus Quadern (Beine, Körper, Würfel-Kopf, Haar) – steht frei, nichts davor
      const g = new THREE.Group(); g.name = "klotz"; g.userData.figure = true; scene.add(g);
      ([[[0.5, 0.8, 0.26], [0, 0.4, 0], "#2e333b"], [[0.6, 0.72, 0.36], [0, 1.18, 0], "#3d6c99"], [[0.46, 0.46, 0.46], [0, 1.8, 0], "#d6c5b8"],
        [[0.5, 0.14, 0.5], [0, 2.07, 0], "#3a3633"]] as [[number, number, number], [number, number, number], string][]).forEach(([s, at, c]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(...s), mat(c)); m.position.set(...at); g.add(m);
      });
      break;
    }
    case "vogel": {
      // 8 Quader-Häuser + 6 Bäume in EINEM Netz (wie Batch: je Material zusammengefasst), Objekte über userData.objekte gemeldet
      const geos: THREE.BufferGeometry[] = [], objekte: { art: string; min: number[]; max: number[] }[] = [];
      const quader = (art: string, s: [number, number, number], at: [number, number, number]) => {
        geos.push(new THREE.BoxGeometry(...s).translate(...at));
        objekte.push({ art, min: at.map((v, i) => v - s[i] / 2), max: at.map((v, i) => v + s[i] / 2) });
      };
      for (let i = 0; i < 8; i++) quader("haus", [3, 3, 3], [-12 + (i % 4) * 8, 1.5, i < 4 ? -6 : 6]);
      for (let i = 0; i < 6; i++) quader("baum", [1, 4, 1], [-10 + i * 4, 2, 0]);
      const welt = new THREE.Group(); welt.name = "karte"; welt.userData.objekte = objekte; scene.add(welt);
      welt.add(new THREE.Mesh(mergeGeometries(geos.map((g) => g.toNonIndexed()), false)!, mat("#a3aeb6")));
      break;
    }
    case "zeit": {
      // Figur aus einer anderen Epoche (so markiert sie styles/…/szene.ts)
      figur([{ at: 0, pos: [0, 0] }], { hat: { kind: "top", color: "#1d1d22" } }).root.userData.fremdeZeit = "stadt in Welt hanse";
      break;
    }
  }
  return ({ time, camera }) => { actors.forEach((a) => a.update(time, 30, camera)); };
};
