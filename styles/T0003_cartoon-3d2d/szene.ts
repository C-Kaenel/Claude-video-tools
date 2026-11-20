// Herkunft: eigen (V-Video), geschrieben 2026-11-08, ohne Vorlage.
// Szene des Stils T0003 für neue Videos: Ein Video beschreibt nur noch Daten (Shots mit Darstellern, Effekt-Karten,
// Requisiten) – diese Datei baut daraus jede Einstellung: Stadt, Requisiten, Figuren, Karten. Alle Zeiten in Sekunden des
// GANZEN Films; hier werden sie auf die Zeit im Shot umgerechnet. Figuren und Requisiten stehen automatisch auf dem Boden
// (Strasse 0, Gehsteig 0,15 m, Brücke 0,45 m).
import * as THREE from "three";
import {
  Actor, EffectActor, Kit, bench, blumentopf, karren, brunnen, koerbe, onggi, huehner, holzstapel, bush, fackel, fahne, flowers, tree, type Lebendig, hanse, ware, HANSE_PLACES, type HanseOptions, boat, cameraFromPattern, crates, crowdSpecs, korea, lantern, stand, table, town, PLACES, KOREA_PLACES, type KoreaOptions, nord, type NordOptions, nordRequisit, type NordRequisit, bayreuth, type BayreuthOptions, roemer, type RoemerOptions, roemerRequisit, type RoemerRequisit, aqua, type AquaOptions, aquaRequisit, type AquaRequisit,
  type ActorKey, type CameraKey, type CameraPattern, type EffectKey, type EffectKind, type FigureSpec, type ShotData, type Story, type V3, type WorldBuilder,
} from "../../engine/v01";
import { KAMERAS, REZEPTE } from "../../library/eintraege";
import tokens from "../../shared/design-tokens.json";
import { AQUA_LOOKS, BAYREUTH_LOOKS, HANSE_LOOKS, KOREA_LOOKS, LOOKS, NORD_LOOKS, PALETTE, ROEMER_LOOKS } from "./style";
import { CARD_COLORS, CARD_TINT, CAST, CROWD, EFFECT_COLORS } from "./figures";

/** Darsteller: Figur aus der Bibliothek (`lib`, z. B. "rufer") oder eigene Angabe (`spec`); Spur in Film-Sekunden. */
export type CastData = { lib?: string; spec?: FigureSpec; skin?: string; keys: ActorKey[]; seed: number; groundY?: number;
  /** Figur aus einer Menge: Aussehen passend zur Welt der Szene (stadt / hanse / korea). */ menge?: { seed: number; n: number; i: number };
  /** true = Figur darf aus einer anderen Epoche sein (z. B. Zeitreise); sonst meldet die Raum-Prüfung sie. */ zeitFrei?: boolean };
/** Effekt-Karte (Bibliothek B0011–B0032); `boden` = y ist Höhe über dem Boden (Schild, Telefon …). */
export type FxData = { kind: EffectKind; h: number; keys: EffectKey[]; unlit?: boolean; boden?: boolean;
  /** läuft weiter, auch wenn die Szene ein `standbild` ist (z. B. Knöpfe über dem eingefrorenen Bild des Kapitels aufruf). */ frei?: boolean };
/** Requisit: 3D-Teil aus dem Baukasten, steht auf dem Boden ("fass" / "saecke" / "tuch" = Ware der Hanse-Welt, `n` Stück).
 *  Details: "baum" (h = Höhe, Standard 5 m), "busch" (h = Grösse), "blumen" (Beet w × d m), "blumentopf" (h = Grösse),
 *  "fahne" (bewegt sich; farbe, h = Masthöhe), "fackel" (flackert). Je Epoche: "karren" (Handkarren, n = 0 leer), "brunnen" (Ziehbrunnen,
 *  farbe = Dach; Stadt/Hanse), "koerbe" (n Obstkörbe), "onggi" (n Tonkrüge, Korea), "huehner" (n Hennen), "holzstapel".
 *  `seed` = Form/Farbe (Standard aus dem Ort). */
export type PropData = { kind: "bench" | "table" | "lantern" | "crates" | "stand" | "boat" | "fass" | "saecke" | "tuch"
  | "baum" | "busch" | "blumen" | "blumentopf" | "fahne" | "fackel" | "karren" | "brunnen" | "koerbe" | "onggi" | "huehner" | "holzstapel" | "nordteil" | "roemerteil" | "aquateil";
  at: [number, number]; turn?: number; scale?: number; n?: number; h?: number; w?: number; d?: number; farbe?: string; seed?: number;
  /** Nord-Welt: welches Requisit (kind "nordteil"), z. B. "esse", "schaf", "runenstein" – Liste NORD_REQUISITEN; Römer-Welt (kind
   *  "roemerteil"), z. B. "groma", "ochsenkarren", "steinhaufen" – Liste ROEMER_REQUISITEN; Römer-Wasser-Welt (kind "aquateil") – Liste AQUA_REQUISITEN. */ art?: NordRequisit | RoemerRequisit | AquaRequisit;
};
/** `welt`: "stadt" (Standard), "korea" (Festungen, Hanok, Berge; Orte KOREA_PLACES, Varianten in `korea`),
 *  "hanse" (Hafen einer Hansestadt um 1400; Orte HANSE_PLACES, Optionen in `hanse`, Zeiten in Film-Sekunden), "nord" (Wikinger um 900,
 *  NORD_PLACES) oder "bayreuth" (Festspielhaus 1876 aussen, Saal mit Bühne, Garderobe; BAYREUTH_PLACES, Vorhang in `bayreuth`;
 *  Figuren der Epoche "stadt") oder "roemer" (Römerstrasse mit Baustelle, Landstrasse, Brücke, Forum; ROEMER_PLACES, Optionen in `roemer`)
 *  oder "aqua" (Weg des Wassers nach Rom in 12 Zonen je 600 m entlang x; AQUA_PLACES, Optionen in `aqua`; Figuren der Epoche "roemer"). */
export type SzeneDaten = { cast: CastData[]; fx?: FxData[]; props?: PropData[]; labX?: number; kaiBoden?: "cobble" | "cobble-light" | "slabs";
  welt?: "stadt" | "korea" | "hanse" | "nord" | "bayreuth" | "roemer" | "aqua"; korea?: KoreaOptions; hanse?: HanseOptions; nord?: NordOptions; bayreuth?: BayreuthOptions; roemer?: RoemerOptions; aqua?: AquaOptions;
  /** Standbild: Welt, Requisiten, Figuren und Karten bleiben auf dieser Sekunde (im Shot, darf negativ sein) stehen – nur Karten
   *  mit `frei` laufen weiter. Für das eingefrorene letzte Bild des hook im Kapitel aufruf (kapitel.ts). */ standbild?: number };

/** Langformat (16:9, 1920×1080, YouTube): dieselbe Story im Querformat. Kameras bleiben gleich (Bildwinkel `fov` ist senkrecht),
 *  das Bild zeigt links und rechts mehr Umgebung. Das Kriechen (`push`) wird auf den Langform-Bereich der Tokens begrenzt
 *  (`formats.long-form.creepPctPerFrame`, ruhiger als im Kurzformat). Standard-ID: <id>-Lang. */
export const langformat = (story: Story, id = `${story.id}-Lang`): Story => {
  const [lo, hi] = tokens.formats["long-form"].creepPctPerFrame as number[];
  const ruhig = (p: number | undefined) => { const v = p ?? 0.2; return v === 0 ? 0 : Math.sign(v) * Math.min(hi, Math.max(lo, Math.abs(v))); };
  return { ...story, id, format: "longform", shots: story.shots.map((s) => ({ ...s, camera: s.camera.map((k) => ({ ...k, push: ruhig(k.push) })) })) };
};

/** Shot bauen: Zeiten a/b in Frames des Films, Daten in Film-Sekunden. */
export const shot = (fps: number, o: { id: string; a: number; b: number; light?: "day" | "golden"; camera: CameraKey[]; focus?: { strength: number; point?: V3 };
  fadeIn?: number; flash?: number; kicks?: { at: number; amp?: number }[]; szene: SzeneDaten }): ShotData => ({
  id: o.id, seconds: (o.b - o.a) / fps, light: o.light ?? "day", camera: o.camera, focus: o.focus, fadeIn: o.fadeIn, flash: o.flash,
  kicks: (o.kicks ?? []).map((k) => ({ at: k.at - o.a / fps, amp: k.amp ?? 0.005 })),   // Stoss: 0,003–0,007 m (≈ 4–9 px)
  data: { start: o.a / fps, ...o.szene },
});

/** Kamera aus einem Kamera-Muster der Bibliothek (B0040–B0044) auf einen Bodenpunkt [x, z].
 *  o.blick = Richtung, in die die Figur schaut (Grad um die Hochachse, 0 = nach +z, also zur Kamera, wenn die Kamera im
 *  Süden steht; Standard 0 = Blick der Kamera nach Norden auf die Häuser). o.abstand = Faktor auf den Muster-Abstand
 *  (z. B. 1,6 für zwei Figuren nebeneinander). o.push = Schieben in % pro Frame (Standard 0,18; Nahaufnahme ≤ 0,1). */
export const kamera = (muster: "totale" | "halbnah" | "nahaufnahme" | "schulterblick" | "fahrt-entlang", at: [number, number],
  o: { push?: number; blick?: number; abstand?: number } = {}): CameraKey[] => {
  const p = (KAMERAS[muster] as { pattern: CameraPattern }).pattern;
  const pat = { ...p, distance: p.distance * (o.abstand ?? 1), side: p.side * (o.abstand ?? 1) };
  return cameraFromPattern(pat, [at[0], 0.15, at[1]], o.blick ?? 0).map((k) => ({ ...k, push: o.push ?? 0.18 }));
};

/** Ort der Stadt (B0033–B0039): { at: [x, y, z], wide: {pos, look}, medium: {pos, look}, note }. */
export const ort = (name: keyof typeof PLACES) => PLACES[name];
/** Ort der Korea-Welt (dorf, bergfestung, grenzmauer, hanyang, hwaseong): { at, wide, medium, note }. */
export const koreaOrt = (name: keyof typeof KOREA_PLACES) => KOREA_PLACES[name];
/** Ort der Hanse-Welt (strasse, kaufmannshaus, kai, kran, markt, kirche, fluss): { at, wide, medium, note }. */
export const hanseOrt = (name: keyof typeof HANSE_PLACES) => HANSE_PLACES[name];
/** Bodenpunkt [x, z] eines Ortes (für Darsteller-Spuren). */
export const ortPunkt = (name: keyof typeof PLACES): [number, number] => [PLACES[name].at[0], PLACES[name].at[2]];
/** Kamera-Schlüssel aus dem Vorschlag eines Ortes ("wide" = Totale, "medium" = Halbnah). */
export const ortKamera = (name: keyof typeof PLACES, art: "wide" | "medium", o: { push?: number; fov?: number } = {}): CameraKey[] =>
  [{ at: 0, pos: PLACES[name][art].pos, look: PLACES[name][art].look, fov: o.fov ?? (art === "wide" ? 44 : 38), push: o.push ?? 0.15 }];

/** Szenen-Rezept der Bibliothek (library/rezepte/): fertig ausgestatteter, geprüfter Ort – Welt, Requisiten und Details
 *  (Bäume, Blumen, Fahnen …), freie Standpunkte für Figuren und Kameras. In die Szene: `szene: { ...rezept("hanse-markt"), cast }`;
 *  eigene Requisiten dazu: `props: [...rezept("hanse-markt").props, …]`. */
type Rezept = { welt: SzeneDaten["welt"]; light?: "day" | "golden"; props: PropData[]; korea?: KoreaOptions; hanse?: HanseOptions; nord?: NordOptions; bayreuth?: BayreuthOptions; roemer?: RoemerOptions; aqua?: AquaOptions;
  punkte: Record<string, [number, number]>; kameras: Record<string, { pos: V3; look: V3; fov: number }> };
const rz = (name: string) => { const r = (REZEPTE as Record<string, unknown>)[name] as Rezept | undefined; if (!r) throw new Error(`Rezept "${name}" fehlt in der Bibliothek`); return r; };
export const rezept = (name: string): Pick<SzeneDaten, "welt" | "props" | "korea" | "hanse" | "nord" | "bayreuth" | "roemer" | "aqua"> => {
  const r = rz(name);
  return { welt: r.welt, props: r.props, ...(r.korea ? { korea: r.korea } : {}), ...(r.hanse ? { hanse: r.hanse } : {}), ...(r.nord ? { nord: r.nord } : {}), ...(r.bayreuth ? { bayreuth: r.bayreuth } : {}), ...(r.roemer ? { roemer: r.roemer } : {}), ...(r.aqua ? { aqua: r.aqua } : {}) };
};
/** Freier Standpunkt [x, z] eines Rezepts für eine Figur (z. B. "mitte", "links", "rechts", "hinten"). */
export const rezeptPunkt = (name: string, punkt: string): [number, number] => {
  const p = rz(name).punkte[punkt]; if (!p) throw new Error(`Rezept "${name}" hat keinen Punkt "${punkt}" (${Object.keys(rz(name).punkte).join(", ")})`); return p;
};
/** Geprüfte Kamera eines Rezepts ("totale", "halbnah" …) als Kamera-Schlüssel; o.push = Schieben (Standard 0,15). */
export const rezeptKamera = (name: string, art: string, o: { push?: number } = {}): CameraKey[] => {
  const k = rz(name).kameras[art]; if (!k) throw new Error(`Rezept "${name}" hat keine Kamera "${art}"`);
  return [{ at: 0, pos: k.pos, look: k.look, fov: k.fov, push: o.push ?? 0.15 }];
};

/** Menschenmenge: n Figuren aus Zufall (fester Startwert) um eine Mitte [x, z] verteilt (Breite x, Tiefe z);
 *  optional gehen sie in t0…t1 um `weg` [dx, dz] Meter. Ergebnis gehört in `cast`. */
export const menge = (seed: number, n: number, mitte: [number, number], o: { breite?: number; tiefe?: number; t0?: number; t1?: number; weg?: [number, number]; expr?: ActorKey["expr"] } = {}): CastData[] => {
  const b = o.breite ?? 6, d = o.tiefe ?? 2;
  return Array.from({ length: n }, (_, i) => {
    const x = mitte[0] - b / 2 + (b * (i + 0.5)) / n, z = mitte[1] - d / 2 + d * (((i * 37) % 10) / 10);
    const keys: ActorKey[] = [{ at: -10, pos: [x, z], expr: o.expr ?? "smile" }];
    if (o.weg && o.t0 !== undefined && o.t1 !== undefined) keys.push({ at: o.t0, pos: [x, z] }, { at: o.t1, pos: [x + o.weg[0], z + o.weg[1]] });
    return { menge: { seed, n, i }, seed: seed * 100 + i, keys };
  });
};

export const buildSzene: WorldBuilder = ({ scene, shot: s, style, fps }) => {
  const kit = new Kit(style.lights[s.light], 1);
  const d = s.data as unknown as SzeneDaten & { start: number };
  const t = d.welt === "korea" ? korea(kit, KOREA_LOOKS[s.light] ?? KOREA_LOOKS.day, 1, d.korea ?? {})
    : d.welt === "hanse" ? hanse(kit, HANSE_LOOKS[s.light] ?? HANSE_LOOKS.day, 1, d.hanse ?? {}, d.start)
    : d.welt === "nord" ? nord(kit, NORD_LOOKS[s.light] ?? NORD_LOOKS.day, 1, d.nord ?? {}, d.start)
    : d.welt === "bayreuth" ? bayreuth(kit, BAYREUTH_LOOKS[s.light] ?? BAYREUTH_LOOKS.day, 1, d.bayreuth ?? {}, d.start)
    : d.welt === "roemer" ? roemer(kit, ROEMER_LOOKS[s.light] ?? ROEMER_LOOKS.day, 1, d.roemer ?? {})
    : d.welt === "aqua" ? aqua(kit, AQUA_LOOKS[s.light] ?? AQUA_LOOKS.day, 1, d.aqua ?? {}, s.camera.map((k) => k.pos[0]))
    : town(kit, LOOKS[s.light] ?? LOOKS.day, 1, { labX: d.labX, kaiBoden: d.kaiBoden ?? "cobble-light" });
  scene.add(t.root);
  const t0 = d.start, tint = CARD_TINT[s.light] ?? "#ffffff";
  const leben: Lebendig[] = [];
  for (const p of d.props ?? []) {
    const at: V3 = [p.at[0], t.groundAt(p.at[0], p.at[1]), p.at[1]];
    const hp = (HANSE_LOOKS[s.light] ?? HANSE_LOOKS.day).hanse;
    const seed = p.seed ?? Math.abs(Math.round(p.at[0] * 7 + p.at[1] * 3)) + 1;
    if (p.kind === "roemerteil") {
      const o = roemerRequisit(kit, (ROEMER_LOOKS[s.light] ?? ROEMER_LOOKS.day).rp, (p.art ?? "amphoren") as RoemerRequisit, at, p.turn ?? 0, seed);
      if ("tick" in o) { leben.push(o); scene.add(o.obj); } else scene.add(o);
      continue;
    }
    if (p.kind === "aquateil") {
      const l = AQUA_LOOKS[s.light] ?? AQUA_LOOKS.day;
      const o = aquaRequisit(kit, { ap: l.ap, rp: l.rp, np: l.np }, (p.art ?? "kruege") as AquaRequisit, at, p.turn ?? 0, seed);
      if ("tick" in o) { leben.push(o); scene.add(o.obj); } else scene.add(o);
      continue;
    }
    if (p.kind === "nordteil") {
      const o = nordRequisit(kit, (NORD_LOOKS[s.light] ?? NORD_LOOKS.day).nord, (p.art ?? "fass") as NordRequisit, at, p.turn ?? 0, seed, p.farbe);
      if ("tick" in o) { leben.push(o); scene.add(o.obj); } else scene.add(o);
      continue;
    }
    if (p.kind === "fahne" || p.kind === "fackel") {
      const l = p.kind === "fahne" ? fahne(kit, at, p.farbe ?? PALETTE.flowers[seed % PALETTE.flowers.length], { h: p.h, turn: p.turn, phase: seed * 0.37 })
        : fackel(kit, at, { h: p.h, phase: seed * 0.37 });
      leben.push(l); scene.add(l.obj); continue;
    }
    if (p.kind === "baum" || p.kind === "busch" || p.kind === "blumen" || p.kind === "blumentopf") {
      const g = p.kind === "baum" ? tree(kit, PALETTE, at, p.h ?? 5, seed) : p.kind === "busch" ? bush(kit, PALETTE, at, p.h ?? 1, seed)
        : p.kind === "blumen" ? flowers(kit, PALETTE, at, p.w ?? 2, p.d ?? 0.8, seed) : blumentopf(kit, PALETTE, at, seed, p.h ?? 1);
      if (p.turn) g.rotation.y = THREE.MathUtils.degToRad(p.turn);
      scene.add(g); continue;
    }
    const neu = p.kind === "karren" ? karren(kit, PALETTE, at, p.turn ?? 0, p.n !== 0, seed) : p.kind === "brunnen" ? brunnen(kit, PALETTE, at, p.turn ?? 0, p.farbe)
      : p.kind === "koerbe" ? koerbe(kit, PALETTE, at, p.n ?? 3, seed, p.turn ?? 0) : p.kind === "onggi" ? onggi(kit, PALETTE, at, p.n ?? 5, seed, p.turn ?? 0)
      : p.kind === "huehner" ? huehner(kit, PALETTE, at, p.n ?? 4, seed) : p.kind === "holzstapel" ? holzstapel(kit, PALETTE, at, p.turn ?? 0, seed) : null;
    if (neu) { if (p.scale) neu.scale.setScalar(p.scale); scene.add(neu); continue; }
    const o = p.kind === "fass" || p.kind === "saecke" || p.kind === "tuch" ? ware(kit, hp, at, p.kind, p.n ?? 3, Math.round(p.at[0] * 7 + p.at[1] * 3), p.turn ?? 0)
      : p.kind === "bench" ? bench(kit, PALETTE, at, p.turn ?? 0) : p.kind === "table" ? table(kit, PALETTE, at) : p.kind === "lantern" ? lantern(kit, PALETTE, at)
      : p.kind === "crates" ? crates(kit, PALETTE, at, p.turn ?? 0) : p.kind === "stand" ? stand(kit, PALETTE, at, p.turn ?? 0) : boat(kit, PALETTE, at, p.turn ?? 0);
    if (p.scale) o.scale.setScalar(p.scale);
    if (p.kind === "bench" && !p.scale) o.scale.setScalar(0.85);   // Bank im Massstab der Cartoon-Figuren
    scene.add(o);
  }
  const zeit = d.welt === "bayreuth" ? "stadt" : d.welt === "aqua" ? "roemer" : d.welt ?? "stadt", mengen = new Map<string, FigureSpec[]>();
  const actors = d.cast.map((c) => {
    const ms = c.menge && (mengen.get(`${c.menge.seed}|${c.menge.n}`) ?? mengen.set(`${c.menge.seed}|${c.menge.n}`, crowdSpecs(c.menge.seed, c.menge.n, CROWD, zeit)).get(`${c.menge.seed}|${c.menge.n}`)!);
    const spec = ms ? ms[c.menge!.i] : c.spec ?? (c.lib && CAST[c.lib] ? { ...CAST[c.lib], ...(c.skin ? { skin: c.skin } : {}) } : undefined);
    if (!spec) throw new Error(`Figur "${c.lib}" fehlt in der Bibliothek`);
    const a = new Actor(spec, c.keys.map((k) => ({ ...k, at: k.at - t0 })), CARD_COLORS, { tint, seed: c.seed, groundY: c.groundY ?? t.groundAt });
    if (spec.zeit && spec.zeit !== zeit && !c.zeitFrei) a.root.userData.fremdeZeit = `${spec.zeit} in Welt ${zeit}`;
    return a;
  });
  const onGround = (k: EffectKey, f: FxData): EffectKey => (f.boden && k.pos ? { ...k, pos: [k.pos[0], k.pos[1] + t.groundAt(k.pos[0], k.pos[2]), k.pos[2]] } : k);
  const frei = (d.fx ?? []).map((f) => !!f.frei);
  const fx = (d.fx ?? []).map((f) => new EffectActor(f.kind, f.h, f.keys.map((k) => ({ ...onGround(k, f), at: k.at - t0 })), EFFECT_COLORS, { tint, unlit: f.unlit }));
  actors.forEach((a) => scene.add(a.root));
  fx.forEach((e) => scene.add(e.root));
  const sun = scene.children.find((o) => (o as THREE.DirectionalLight).isDirectionalLight);
  return ({ time, camera }) => {
    const st = d.standbild ?? time;   // Standbild: alles ausser freien Karten steht still
    t.tick(st, camera, sun?.userData.dir as THREE.Vector3 | undefined);
    leben.forEach((l) => l.tick(st));
    actors.forEach((a) => a.update(st, fps, camera));
    fx.forEach((e, i) => e.update(frei[i] ? time : st, camera));
  };
};
