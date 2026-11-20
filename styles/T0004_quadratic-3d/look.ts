// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Stil T0004 quadratic-3d: kalter Look – eine Karte als Raute (Vogelperspektive, 45° gedreht) schwebt im grauen Void
// mit hellgrauen Partikeln; alles aus Quadern, Figuren sehr klein. Farben aus shared/design-tokens.json (color.quadratic-3d).
// `Look` = alle Werte, die eine Variante der Bild-Schleife unterscheiden; `quadStyle()` macht daraus den Motor-Stil.
import tokens from "../../shared/design-tokens.json";
import { NEUTRAL_DAY, type Grade, type LightPreset, type Style } from "../../engine/v01";

export const Q = tokens.color["quadratic-3d"];

export type Look = {
  name: string;
  el: number;                 // Blickwinkel der Kamera über der Karte (Grad, 90 = senkrecht von oben)
  fov: number;                // klein = fast parallele Linien (Raute bleibt Raute)
  rand: number;               // wie viel Void um die Karte (1 = Karte füllt die Bildbreite halb)
  void: { dunkel: string; hell: string; modus: "radial" | "vertikal" };
  partikel: { anzahl: number; groesse: [number, number]; farbe: string };
  karte: typeof Q.karte;
  figur: typeof Q.figur;
  raster: number;             // Fuge zwischen Kacheln (0 = glatt)
  figuren: number;            // Zahl der Figuren auf der Karte
  inseln: boolean;            // kleine Neben-Karten im Void
  ink: boolean;               // dünne dunkle Kanten
  inkBreite: number;          // Kantenbreite nah (px bei 1080)
  detail: number;             // 0 = schlicht, 1 = mehr Kleinteile, 2 = viele (Brunnen, Karren, Nadelbäume …)
  licht: typeof Q.licht;
  stufe: number;              // Abstufung im Licht nach Einfallswinkel (0 = Zwei-Ton des Motors)
  grade: { contrast: number; sat: number; kalt: number };
};

export const BASIS: Look = {
  name: "basis", el: 38, fov: 18, rand: 1,
  void: { dunkel: Q.void.dunkel, hell: Q.void.hell, modus: "radial" },
  partikel: { anzahl: 420, groesse: [0.12, 0.32], farbe: Q.void.partikel },
  karte: Q.karte, figur: Q.figur, raster: 0, figuren: 1, inseln: false, ink: false, inkBreite: 2.2, detail: 0,
  licht: { ...Q.licht, sonneAz: 125, sonneEl: 52 }, stufe: 0, grade: { contrast: 1.04, sat: 0.9, kalt: 0.012 },   // Runden 1–4: Sonne wie damals
};

/** Bild 1 (Look-Referenz, Bild-Schleife Runde 4 Bild 5, abgenommen 2026-11-14) – alle Werte aus den Tokens. */
const KAM = tokens.lens["quadratic-3d"], LIN = tokens.line["quadratic-3d"], PM = tokens.motion["quadratic-3d"].partikel, GR = tokens.grade["quadratic-3d"];
export const REFERENZ: Look = {
  name: "referenz", el: KAM.kamera.elevationDeg, fov: KAM.kamera.fovDeg, rand: KAM.kamera.rand,
  void: { dunkel: Q.void.dunkel, hell: Q.void.hell, modus: Q.void.modus as "vertikal" | "radial" },
  partikel: { anzahl: PM.anzahl, groesse: PM.groesseM as [number, number], farbe: Q.void.partikel },
  karte: Q.karte, figur: Q.figur, raster: KAM.karte.raster, figuren: KAM.karte.figuren, inseln: KAM.karte.inseln,
  ink: LIN.ink, inkBreite: LIN.widthNearPx, detail: KAM.karte.detail,
  licht: Q.licht, stufe: Q.licht.stufe, grade: { contrast: GR.punch.contrast, sat: GR.punch.sat, kalt: GR.kalt },
};

/** Motor-Stil aus einem Look: eine Lichtstimmung "kalt". */
/** `abstand` (m, Kamera → Blickpunkt): Nebel wächst mit, damit weit entfernte Kameras (Hochformat) gleich klar bleiben;
 *  ohne Angabe gelten die Werte von Bild 1 (125–260 m bei 83 m Abstand). */
export const quadStyle = (lk: Look, abstand?: number): Style => {
  const L = lk.licht;
  const kalt: LightPreset = {
    ...NEUTRAL_DAY,
    sky: { colors: [lk.void.dunkel, lk.void.hell], elevations: [-90, 90] },
    // Nebel in Void-Farbe: ferne Partikel verblassen, die Karte bleibt klar
    fog: { color: mix(lk.void.dunkel, lk.void.hell, 0.55), near: abstand ? abstand * 1.5 : 125, far: abstand ? abstand * 3.13 : 260 },
    sun: { az: L.sonneAz, el: L.sonneEl, color: L.sonne, intensity: 1 },
    lit: L.lit, litGain: L.litGain, shade: L.shade, lift: L.lift, edge: 0.3, soft: 0.06, shadows: true,
  };
  const k = lk.grade.kalt;
  const grade: Grade = {
    curve: [0, 0.08, 0.24, 0.5, 0.77, 0.92, 1], sat: [1, 1, 1],
    tint: { shadows: [-k * 0.6, 0, k], mids: [-k * 0.3, 0, k * 0.5], highs: [-k * 0.2, 0, k * 0.3] }, vignette: [0.18, 0.5],
  };
  return {
    name: `quadratic-3d-${lk.name}`,
    lights: { kalt },
    grades: { kalt: grade },
    punch: { contrast: lk.grade.contrast, sat: lk.grade.sat },
    post: {
      ink: lk.ink ? { color: "#1b1e23", widthNear: lk.inkBreite, widthFar: lk.inkBreite * 0.73, distNear: 60, distFar: 160, jump: 0.02, crease: 0.004, fogTint: 0.2 } : null,
      dof: { maxRadius: 10 },
      bloom: { threshold: 0.92, intensity: 0.25, radius: 0.8 },
      msaa: 4,
    },
    fovDefault: lk.fov,
  };
};

/** Zwei Farben mischen (Bildschirm-Werte). */
export function mix(a: string, b: string, t: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (p: number, s: number) => (p >> s) & 255;
  const c = [16, 8, 0].map((s) => Math.round(ch(pa, s) + (ch(pb, s) - ch(pa, s)) * t));
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

/** Kamera für die Raute: 45° zu den Kartenachsen, Abstand so, dass die Karte (Kante `groesse` m) mit Void-Rand ins Bild passt.
 *  `mittig`: Blickpunkt so verschoben, dass der Void über und unter der Karte gleich hoch ist (Kartenkörper von `unten` bis `oben` m). */
export const rautenKamera = (lk: Look, groesse: number, look: [number, number, number] = [0, 0, 0], quer = true,
  mittig = true, unten = -6.4, oben = 2.6) => {
  const diag = groesse * Math.SQRT2;
  const breite = diag * (1.75 + 0.6 * lk.rand);                       // sichtbare Bildbreite in m
  const e0 = (lk.el * Math.PI) / 180;
  // hohe Orte: Bildhöhe mindestens so gross wie der Kartenkörper (von `unten` bis `oben`) × 1,04 – sonst ragen sie aus dem Bild
  const spanne = groesse * Math.SQRT2 * Math.sin(e0) + (oben - unten) * Math.cos(e0);
  const hoehe = Math.max(quer ? breite * 9 / 16 : breite * 16 / 9, spanne * 1.04);
  const dist = hoehe / 2 / Math.tan((lk.fov * Math.PI) / 360);
  const e = (lk.el * Math.PI) / 180;
  let ziel: [number, number, number] = [...look];
  if (mittig) {
    // Bild-Hoch-Achse der Kamera in der Welt; Ecken des Kartenkörpers darauf abbilden (fast parallel wegen kleinem fov)
    const up = [-Math.sin(e) / Math.SQRT2, Math.cos(e), -Math.sin(e) / Math.SQRT2], g = groesse / 2;
    const ys: number[] = [];
    for (const x of [-g, g]) for (const z of [-g, g]) for (const y of [unten, oben]) ys.push(x * up[0] + y * up[1] + z * up[2]);
    const c = (Math.max(...ys) + Math.min(...ys)) / 2;
    ziel = [look[0] + c * up[0], look[1] + c * up[1], look[2] + c * up[2]];
  }
  const h = Math.cos(e) * dist / Math.SQRT2;
  return { pos: [ziel[0] + h, ziel[1] + Math.sin(e) * dist, ziel[2] + h] as [number, number, number], look: ziel, fov: lk.fov, dist };
};
