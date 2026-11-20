// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Freie Schriften (Tools, SIL OFL) aus assets/fonts/ – geladen per `node tools/get-fonts.mjs`, nicht in Git.
// Eine Heimat für alle Stile (Verweis statt Kopie).
import display from "../../../assets/fonts/archivo-black/ArchivoBlack-Regular.ttf";
import serif from "../../../assets/fonts/lora/Lora-Variable.ttf";
import script from "../../../assets/fonts/caveat/Caveat-Variable.ttf";
import sans from "../../../assets/fonts/inter/Inter-Variable.ttf";

/** display = fette Schlagzeilen (Cartoon), serif, script = Handschrift, sans = Inter (klare Wortfolge, 100–900, z. B. T0004). */
export const FONT = { display: "'Archivo Black', sans-serif", serif: "Lora, serif", script: "Caveat, cursive", sans: "Inter, sans-serif" };

const FACES: [string, string, string][] = [
  ["Archivo Black", display, "400"],
  ["Lora", serif, "400 700"],
  ["Caveat", script, "400 700"],
  ["Inter", sans, "100 900"],
];

let ready: Promise<void> | null = null;

/** Lädt alle Schriften genau einmal; das Versprechen wird von der Lade-Sperre (gate.ts) abgewartet. */
export const fontsReady = () => {
  if (!ready) {
    ready = typeof FontFace === "undefined"
      ? Promise.resolve()
      : Promise.all(FACES.map(([family, url, weight]) =>
          new FontFace(family, `url(${url})`, { weight }).load().then((f) => { document.fonts.add(f); }))).then(() => undefined);
  }
  return ready;
};
