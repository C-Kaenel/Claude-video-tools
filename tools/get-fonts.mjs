// Herkunft: eigen (V-Video), mit Claude geschrieben, ohne fremde Vorlage.
// Lädt die freien Schriften (SIL Open Font License 1.1) aus dem offiziellen Google-Fonts-Repository und legt sie dort ab,
// wo die Vorlagen sie erwarten. Die Schriften sind Produkte Dritter und werden darum nicht mit dem Projekt ausgeliefert.
// Aufruf aus dem Hauptordner:  node tools/get-fonts.mjs          (vorhandene Dateien werden übersprungen)
//                              node tools/get-fonts.mjs --force  (alles neu laden)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = "https://github.com/google/fonts/raw/main/ofl";
const FONTS = [
  { family: "Archivo Black", dir: "archivo-black", src: "archivoblack/ArchivoBlack-Regular.ttf", file: "ArchivoBlack-Regular.ttf", ofl: "archivoblack/OFL.txt", oflName: "OFL-ArchivoBlack.txt" },
  { family: "Lora", dir: "lora", src: "lora/Lora%5Bwght%5D.ttf", file: "Lora-Variable.ttf", ofl: "lora/OFL.txt", oflName: "OFL-Lora.txt" },
  { family: "Caveat", dir: "caveat", src: "caveat/Caveat%5Bwght%5D.ttf", file: "Caveat-Variable.ttf", ofl: "caveat/OFL.txt", oflName: "OFL-Caveat.txt" },
  { family: "Inter", dir: "inter", src: "inter/Inter%5Bopsz%2Cwght%5D.ttf", file: "Inter-Variable.ttf", ofl: "inter/OFL.txt", oflName: "OFL-Inter.txt" },
];
// Vorlagen, die einen eigenen fonts/-Ordner brauchen (damit sie beim Kopieren in eine Produktion selbständig bleiben)
const TEMPLATE_FONT_DIRS = ["templates/T0002_text-animation-2d/fonts"];

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."); // fileURLToPath: Leerzeichen im Pfad
const force = process.argv.includes("--force");

const download = async (url, dest) => {
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 0) return "vorhanden";
  let buf;
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(60000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      buf = Buffer.from(await res.arrayBuffer());
      break;
    } catch (e) {
      if (attempt >= 3) throw new Error(`Download fehlgeschlagen nach 3 Versuchen (Internet prüfen, später erneut starten): ${url}\n${e.cause?.code ?? e.message}`);
      console.log(`  Versuch ${attempt} fehlgeschlagen (${e.cause?.code ?? e.message}), neuer Versuch …`);
      await new Promise((r) => setTimeout(r, 3000 * attempt));
    }
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  return `${(buf.length / 1024).toFixed(0)} KB`;
};

for (const f of FONTS) {
  const dir = path.join(root, "assets/fonts", f.dir);
  const ttf = path.join(dir, f.file), ofl = path.join(dir, "OFL.txt");
  console.log(`${f.family}: ${await download(`${BASE}/${f.src}`, ttf)}, Lizenz: ${await download(`${BASE}/${f.ofl}`, ofl)}`);
  const head = fs.readFileSync(ttf).subarray(0, 4).toString("hex");
  if (head !== "00010000" && head !== "74727565") throw new Error(`${ttf} ist keine TrueType-Datei`);
  if (!fs.readFileSync(ofl, "utf8").includes("SIL OPEN FONT LICENSE")) throw new Error(`${ofl} ist nicht die OFL`);
  for (const t of TEMPLATE_FONT_DIRS) {
    const td = path.join(root, t);
    fs.mkdirSync(td, { recursive: true });
    fs.copyFileSync(ttf, path.join(td, f.file));
    fs.copyFileSync(ofl, path.join(td, f.oflName));
  }
}
console.log("fertig: assets/fonts/ und " + TEMPLATE_FONT_DIRS.join(", "));
