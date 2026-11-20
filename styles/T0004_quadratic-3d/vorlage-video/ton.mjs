// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Schreibt die Ton-Dateien der Vorlage (ton.json, ton-lang.json) aus den Story-Dateien – die Ton-Zeiten kommen so immer aus
// denselben Kapiteln wie das Bild. Aufruf: node styles/T0004_quadratic-3d/vorlage-video/ton.mjs
// Für ein Video: node styles/T0004_quadratic-3d/vorlage-video/ton.mjs <story.ts> <export-name> <ziel.json>
import { build } from "esbuild";
import { writeFileSync, mkdtempSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const hier = path.dirname(fileURLToPath(import.meta.url));
const auftraege = process.argv.length > 4
  ? [[path.resolve(process.argv[2]), process.argv[3], path.resolve(process.argv[4])]]
  : [[path.join(hier, "story.ts"), "tonKurz", path.join(hier, "ton.json")], [path.join(hier, "story-lang.ts"), "tonLang", path.join(hier, "ton-lang.json")]];
// Zwischendatei im Projekt (output/), damit die Pakete aus node_modules gefunden werden
mkdirSync("output", { recursive: true });
const tmp = mkdtempSync(path.join("output", "t0004-ton-"));
try {
  for (const [quelle, name, ziel] of auftraege) {
    const out = path.resolve(tmp, `${name}.mjs`);
    await build({ entryPoints: [quelle], bundle: true, platform: "node", format: "esm", outfile: out, logLevel: "error",
      loader: { ".json": "json", ".ttf": "empty", ".png": "empty", ".jpg": "empty" }, external: ["remotion", "@remotion/*", "react", "react-dom", "@react-three/*", "postprocessing", "three"] });
    const mod = await import(pathToFileURL(out).href);
    writeFileSync(ziel, JSON.stringify(mod[name], null, 1) + "\n", "utf8");
    console.log("geschrieben:", path.relative(process.cwd(), ziel));
  }
} finally { rmSync(tmp, { recursive: true, force: true }); }
