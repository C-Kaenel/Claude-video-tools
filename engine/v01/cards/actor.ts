// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Darsteller: eine Figur mit Spur (Daten). Die Spur sagt, wann die Figur wo steht und was sie tut; dazwischen wird
// die Lage gleitend gerechnet. Bewegt sie sich, geht sie automatisch (Schrittphase aus der zurückgelegten Strecke –
// die Füsse rutschen nicht). Blinzeln nach festem Zufall alle 0,5–2,3 s für 4 Frames. Alles hängt nur von der Zeit ab.
import * as THREE from "three";
import { hash01, Rng } from "../core/random";
import type { Expression } from "./face";
import type { Pose } from "./pose";
import { darker } from "./draw";
import { Figure, type CardColors, type FigureSpec, type FigureState, type HatKind, type HairStyle, type Zeit } from "./figure";

export type ActorKey = {
  at: number;                       // Sekunde im Shot
  pos?: [number, number];           // Bodenpunkt (x, z); ohne = bleibt stehen
  pose?: Pose;                      // ohne = stehen, bzw. gehen wenn in Bewegung
  expr?: Expression;
  look?: number;                    // Blick −1…1
  side?: number;                    // Ansicht −1 links, 0 vorn, 1 rechts
  tilt?: number;                    // Kopf neigen (Grad)
  lean?: number;                    // Körper neigen (Grad)
  skin?: string;                    // Hautfarbe ab hier (gleitender Übergang über `skinFade` s)
  spiegeln?: boolean;               // Haltung spiegeln (linker Arm statt rechter, z. B. zum Anstossen nach links)
  skinFade?: number;
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mixHex = (a: string, b: string, t: number) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();

/** Zeit des Blinzelns: true, wenn zum Zeitpunkt t (s) die Augen zu sind. */
export const blinking = (seed: number, t: number, fps: number) => {
  let start = 0.3 + hash01(seed, 0) * 1.2;
  for (let k = 1; start <= t; k++) {
    if (t < start + 4 / fps) return true;
    start += 0.5 + hash01(seed, k) * 1.8;
  }
  return false;
};

export class Actor {
  readonly figure: Figure;
  private keys: ActorKey[];
  private ground: (x: number, z: number) => number;
  constructor(readonly spec: FigureSpec, keys: ActorKey[], colors: CardColors, o: { tint?: string; seed?: number; groundY?: number | ((x: number, z: number) => number) } = {}) {
    this.figure = new Figure(spec, colors, o.tint);
    this.keys = [...keys].sort((a, b) => a.at - b.at);
    const gy = o.groundY ?? 0.15;
    this.ground = typeof gy === "number" ? () => gy : gy;
    this.seed = o.seed ?? 1;
  }
  private seed: number;
  get root() { return this.figure.root; }

  /** Zustand zum Zeitpunkt t: Lage und Zeichen-Zustand. */
  stateAt(t: number, fps: number): { pos: [number, number]; st: FigureState; moving: boolean } {
    const ks = this.keys;
    // Lage: Abschnitte zwischen Schlüsseln mit pos
    const withPos = ks.filter((k) => k.pos);
    let pos: [number, number] = withPos[0]?.pos ?? [0, 0];
    let moving = false, dist = 0;
    for (let i = 0; i < withPos.length; i++) {
      const a = withPos[i], b = withPos[i + 1];
      if (!b) { if (t >= a.at) pos = a.pos!; break; }
      const seg = Math.hypot(b.pos![0] - a.pos![0], b.pos![1] - a.pos![1]);
      if (t >= b.at) { dist += seg; pos = b.pos!; continue; }
      if (t >= a.at) {
        const u = (t - a.at) / Math.max(1e-6, b.at - a.at);
        pos = [lerp(a.pos![0], b.pos![0], u), lerp(a.pos![1], b.pos![1], u)];
        dist += seg * u; moving = seg > 0.01;
      }
      break;
    }
    // übrige Angaben: letzter Schlüssel vor t
    const last = <K extends keyof ActorKey>(name: K, def: NonNullable<ActorKey[K]>) => {
      let v = def; for (const k of ks) if (k.at <= t && k[name] !== undefined) v = k[name] as NonNullable<ActorKey[K]>; return v;
    };
    const firstAt = ks.find((k) => k.pose)?.at ?? 0;
    const pose = last("pose", moving ? "walk" : "stand");
    const stride = 1.15 * ((this.spec.height ?? 1.75) / 1.75);
    const phase = pose === "walk" || pose === "march" ? dist / stride : pose === "fall" ? Math.min(1, (t - Math.max(firstAt, ks.filter((k) => k.pose === "fall" && k.at <= t).pop()?.at ?? 0)) / 0.5) : 0;
    // Hautfarbe mit Übergang
    let skin = this.spec.skin;
    for (const k of ks) if (k.skin && k.at <= t) { const f = k.skinFade ?? 0; skin = mixHex(skin, k.skin, f > 0 ? Math.min(1, (t - k.at) / f) : 1); }
    const st: FigureState = {
      pose: moving && pose === "stand" ? "walk" : pose, phase, time: t,
      expr: last("expr", "neutral"), look: last("look", 0), side: last("side", 0),
      headTilt: last("tilt", 0), lean: last("lean", 0), skin, mirror: last("spiegeln", false),
      blink: blinking(this.seed, t, fps),
    };
    return { pos, st, moving };
  }

  /** Pro Frame aufrufen. */
  update(t: number, fps: number, camera: THREE.Camera) {
    const { pos, st } = this.stateAt(t, fps);
    this.root.position.set(pos[0], this.ground(pos[0], pos[1]), pos[1]);
    this.figure.update(st, camera);
  }
}

export type CrowdPalette = { skins: string[]; coats: string[]; hair: string[]; hats: string[] };

/** Menschenmenge: n Varianten mit festem Startwert (Kleidung, Hautton, Haare, Hut, Grösse). */
/** Menge passend zur Epoche: "stadt" (Zylinder, Mützen, Hauben), "hanse" (Gugel, Stirnband, Frauen mit Schleier),
 *  "korea" (Gat oder Stirnband, Haarknoten; Frauen mit Haarknoten, helle Hanbok-Farben). */
export const crowdSpecs = (seed: number, n: number, pal: CrowdPalette, zeit: Zeit = "stadt"): FigureSpec[] => {
  if (zeit !== "stadt") return crowdAlt(seed, n, pal, zeit);
  const rng = new Rng(seed);
  const hats: (HatKind | null)[] = ["top", "cap", "flatcap", "bonnet", null, null];
  const hairs: HairStyle[] = ["cap", "side", "bob", "long", "bald"];
  return Array.from({ length: n }, (_, i) => {
    const dress = rng.next() < 0.4;
    const hat = rng.pick(hats);
    const hairStyle = dress ? rng.pick(["bob", "long", "cap"] as const) : rng.pick(hairs);
    return {
      name: `menge-${i}`, build: rng.next() < 0.12 ? "child" : rng.next() < 0.2 ? "stout" : "adult",
      height: rng.range(1.62, 1.85), skin: rng.pick(pal.skins), coat: rng.pick(pal.coats), garment: dress ? "dress" : "coat",
      hair: { style: hairStyle, color: rng.pick(pal.hair) },
      hat: hat && !(dress && hat !== "bonnet") ? { kind: hat, color: rng.pick(pal.hats) } : undefined,
      scarf: rng.next() < 0.25 ? rng.pick(pal.coats) : null, moustache: !dress && rng.next() < 0.2 ? rng.pick(pal.hair) : null, zeit: "stadt",
    } satisfies FigureSpec;
  });
};

const HANBOK = ["#f4f0e6", "#c9b48a", "#3f6fb5", "#8c3b4a", "#5d7a3a", "#e2b52f", "#7b5ac9", "#b5653f", "#e07a8a"];
const NORD_TRACHT = ["#c8402e", "#2f6fd0", "#3f9a48", "#e2b52f", "#8a5bc4", "#d97a2b", "#2a9d9a", "#e07a8a"];
const NORD_HAAR = ["#e6b85c", "#c9682c", "#8a5a2b", "#4a3020", "#d9c48c"];
const ROEMER_TUNIKA = ["#e8dcc0", "#c8402e", "#d9a441", "#3f6fb5", "#5d8a3a", "#b5653f", "#e07a8a", "#2a9d9a", "#f4f0e6"];
const ROEMER_HAAR = ["#2a1e18", "#4a3020", "#6b4a2a", "#1d1d22", "#8a5a2b"];
const crowdAlt = (seed: number, n: number, pal: CrowdPalette, zeit: "hanse" | "korea" | "nord" | "roemer"): FigureSpec[] => {
  const rng = new Rng(seed);
  return Array.from({ length: n }, (_, i) => {
    const frau = rng.next() < 0.4, kind = rng.next() < 0.12, r = rng.next(), coat = zeit === "korea" ? rng.pick(HANBOK) : zeit === "nord" ? rng.pick(NORD_TRACHT) : rng.pick(pal.coats);
    const base = { name: `menge-${i}`, build: kind ? "child" as const : rng.next() < 0.2 ? "stout" as const : "adult" as const, height: rng.range(1.6, 1.82),
      skin: rng.pick(pal.skins), coat, buttons: false, zeit };
    if (zeit === "nord") {   // Nord um 900: Frauen im Trägerkleid mit Fibeln und Zöpfen, Männer mit Borte, Bart, Lederkappe oder ohne
      const haar = rng.pick(NORD_HAAR), farbe = rng.pick(NORD_TRACHT);
      if (frau) return { ...base, garment: "dress" as const, hair: { style: rng.pick(["zoepfe", "bun", "long"] as const), color: haar },
        schuerze: { color: farbe === coat ? rng.pick(NORD_TRACHT.filter((c) => c !== coat)) : farbe, fibeln: "#d9a441" } };
      return { ...base, hair: { style: rng.pick(["cap", "zoepfe", "side", "long"] as const), color: haar },
        hat: r < 0.3 ? { kind: "lederkappe" as const, color: "#8a5532", band: "#5e3a22" } : undefined,
        bart: !kind && rng.next() < 0.65 ? { color: haar, art: rng.pick(["voll", "zopf", "zwei"] as const) } : null,
        belt: "#5a3a24", borte: rng.next() < 0.7 ? farbe : null, mantel: rng.next() < 0.25 ? { color: rng.pick(NORD_TRACHT), fibel: "#d9a441" } : null };
    }
    if (zeit === "roemer") {   // Rom: Männer in kurzer Tunika mit Gürtel, kurzes Haar, ab und zu ein Petasus; Frauen in Stola mit Palla, Haarknoten
      const haar = rng.pick(ROEMER_HAAR), tunika = rng.pick(ROEMER_TUNIKA);
      if (frau) return { ...base, coat: tunika, garment: "dress" as const, hair: { style: rng.pick(["bun", "bun", "long"] as const), color: haar },
        umhang: rng.next() < 0.6 ? rng.pick(ROEMER_TUNIKA.filter((c) => c !== tunika)) : null, belt: rng.next() < 0.5 ? "#d9a441" : null };
      return { ...base, coat: tunika, hair: { style: rng.pick(["cap", "side", "bald", "cap"] as const), color: haar }, belt: "#6b4a2a",
        hat: r < 0.2 ? { kind: "petasus" as const, color: "#c9a46a", band: "#7a5a32" } : undefined,
        bart: !kind && rng.next() < 0.15 ? { color: haar, art: "voll" as const } : null, saum: rng.next() < 0.4 ? darker(tunika, 0.7) : null };
    }
    if (zeit === "hanse") {
      if (frau) return { ...base, garment: "dress" as const, hat: { kind: "schleier" as const, color: "#f7f3e8", band: "#ece6d8" } };
      const hut = r < 0.55 ? { kind: "gugel" as const, color: rng.pick(pal.coats), band: rng.pick(pal.hats) } : r < 0.75 ? { kind: "headband" as const, color: "#e9e2cf" } : undefined;
      return { ...base, hair: { style: rng.pick(["cap", "side", "bald"] as const), color: rng.pick(pal.hair) }, hat: hut,
        moustache: rng.next() < 0.3 ? rng.pick(pal.hair) : null, belt: "#5a3a24" };
    }
    if (frau) return { ...base, garment: "dress" as const, hair: { style: "bun" as const, color: "#1d1d22" } };
    const hut = r < 0.4 ? { kind: "gat" as const, color: "#1d1d22" } : r < 0.75 ? { kind: "headband" as const, color: "#f4f0e6" } : undefined;
    return { ...base, hair: { style: "topknot" as const, color: "#1d1d22" }, hat: hut, moustache: rng.next() < 0.25 ? "#241c1c" : null };
  });
};
