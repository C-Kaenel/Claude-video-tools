// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Referenzbilder des Stils (Bild-Schleife Stufe 2, Skill K0003): `Ref-01` = Bild 1 (Look), `Ref-02` … `Ref-06` = andere Szenarien
// mit genau diesem Look: 02 Hotelzimmer (9:16), 03 Amsterdam (16:9), 04 Kolosseum (16:9), 05 Berghütte (9:16), 06 Schneewald (16:9). Bild: node engine/v01/qa/stills.mjs styles/T0004_quadratic-3d/pruefung/referenzen.tsx Ref-01 output/T0004_runden/ref/01_ 60 1
import { registerRoot } from "remotion";
import { motorCompositions, type Story } from "../../../engine/v01";
import tokens from "../../../shared/design-tokens.json";
import { REFERENZ, quadStyle, rautenKamera } from "../look";
import { KARTE, ortWelt, quadWelt, type Ort } from "../welt";
import { hotel } from "../orte/hotel";
import { amsterdam } from "../orte/amsterdam";
import { kolosseum } from "../orte/kolosseum";
import { berg } from "../orte/berg";
import { schneewald } from "../orte/schneewald";

const K = tokens.lens["quadratic-3d"].kamera;
const k = rautenKamera(REFERENZ, KARTE, K.look as [number, number, number], true, K.mittig, K.kartenKoerperM.unten, K.kartenKoerperM.oben);
const ref01: Story = { id: "Ref-01", format: "longform", shots: [{ id: "karte", seconds: 4, light: "kalt",
  camera: [{ at: 0, pos: k.pos, look: k.look, fov: k.fov, push: tokens.motion["quadratic-3d"].kameraPushPctProFrame }] }] };

const push = tokens.motion["quadratic-3d"].kameraPushPctProFrame;
/** Stufe 2: ein Ort mit genau dem Look von Bild 1; `quer` = Langform 16:9, sonst Kurzform 9:16. */
const ortKamera = (ort: Ort, quer: boolean) => rautenKamera(REFERENZ, ort.groesse, [0, 0, 0], quer, true, K.kartenKoerperM.unten, ort.oben);
const ortStory = (id: string, ort: Ort, quer: boolean): Story => {
  const c = rautenKamera(REFERENZ, ort.groesse, [0, 0, 0], quer, true, K.kartenKoerperM.unten, ort.oben);
  return { id, format: quer ? "longform" : "shortform", shots: [{ id: ort.name, seconds: 4, light: "kalt",
    camera: [{ at: 0, pos: c.pos, look: c.look, fov: c.fov, push }] }] };
};
const orte: [string, Ort, boolean][] = [["Ref-02", hotel, false], ["Ref-03", amsterdam, true], ["Ref-04", kolosseum, true], ["Ref-05", berg, false], ["Ref-06", schneewald, true]];

registerRoot(motorCompositions([
  { story: ref01, style: quadStyle(REFERENZ), build: quadWelt(REFERENZ) },
  ...orte.map(([id, ort, quer]) => ({ story: ortStory(id, ort, quer), style: quadStyle(REFERENZ, ortKamera(ort, quer).dist), build: ortWelt(REFERENZ, ort) })),
]));
