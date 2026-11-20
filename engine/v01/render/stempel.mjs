// Herkunft: eigen (V-Video), geschrieben 2026-11-14, ohne Vorlage.
// Motor-Stempel: ein Fingerabdruck von allem, was beeinflusst, WIE ein Video gezeichnet wird (Motor-Kern, Kamera, Licht,
// Effekte, Welten, Karten, Stile, Bibliothek, Tokens, Paket-Versionen) – je Teil eine kurze Prüfsumme. Die Story eines Videos
// gehört nicht dazu (die ändert ein Teil-Render ja gerade). produziere.mjs und teilrender.mjs schreiben den Stempel in die
// MP4-Datei (Kommentar-Feld), so reist er mit dem Video mit. teilrender.mjs vergleicht ihn vor dem Render:
// gleich → Motor unverändert, Teil-Render sicher; anders → nennt die geänderten Teile und bricht ab (ganz rendern).
//
// Aufruf (aus dem Hauptordner):
//   node engine/v01/render/stempel.mjs <video.mp4>     Stempel des Videos zeigen und mit dem heutigen Stand vergleichen
//   node engine/v01/render/stempel.mjs                 heutigen Stempel zeigen
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const KENNUNG = "V-Video-Motor:";
const CODE = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".glsl"]);

/** Teile des Stempels: Name → Ordner/Dateien (relativ zum Hauptordner). */
const TEILE = {
  kern: ["engine/v01/core", "engine/v01/index.ts"], kamera: ["engine/v01/camera"], licht: ["engine/v01/light"], effekte: ["engine/v01/post"],
  welt: ["engine/v01/world"], karten: ["engine/v01/cards"], stile: ["styles"], bibliothek: ["library"],
  tokens: ["shared/design-tokens.json"], pakete: ["package-lock.json", "package.json"],
};

const dateien = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [rel];
  return fs.readdirSync(abs, { recursive: true, withFileTypes: true })
    .filter((d) => d.isFile() && CODE.has(path.extname(d.name).toLowerCase()))
    .map((d) => path.relative(ROOT, path.join(d.parentPath ?? d.path, d.name)).replace(/\\/g, "/"));
};

/** Heutiger Stempel: { teil: prüfsumme (12 Zeichen) }. Zeilenenden zählen nicht (Git unter Windows). */
export const motorStempel = () => {
  const out = {};
  for (const [teil, orte] of Object.entries(TEILE)) {
    const h = crypto.createHash("sha256");
    for (const rel of orte.flatMap(dateien).sort()) h.update(`${rel}\n`).update(fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n"));
    out[teil] = h.digest("hex").slice(0, 12);
  }
  return out;
};

/** ffmpeg-Angaben, die den Stempel in die MP4-Datei schreiben. */
export const stempelArgs = (s = motorStempel()) => ["-metadata", `comment=${KENNUNG}${JSON.stringify(s)}`];

/** Stempel aus einer MP4-Datei lesen (null = keiner). */
export const liesStempel = (video) => {
  const dir = [process.env.FFMPEG_DIR, path.join(ROOT, "tools", "ffmpeg", "bin")].filter(Boolean)
    .find((d) => fs.existsSync(path.join(d, os.platform() === "win32" ? "ffprobe.exe" : "ffprobe")));
  const FP = dir ? path.join(dir, os.platform() === "win32" ? "ffprobe.exe" : "ffprobe") : "ffprobe";
  const c = execFileSync(FP, ["-v", "error", "-show_entries", "format_tags=comment", "-of", "default=nw=1:nk=1", video], { encoding: "utf8" }).trim();
  if (!c.startsWith(KENNUNG)) return null;
  try { return JSON.parse(c.slice(KENNUNG.length)); } catch { return null; }
};

/** Geänderte Teile zwischen zwei Stempeln (leer = gleich). */
export const unterschiede = (alt, neu) => [...new Set([...Object.keys(alt), ...Object.keys(neu)])].filter((k) => alt[k] !== neu[k]);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const heute = motorStempel(), video = process.argv[2];
  if (!video) { console.log(JSON.stringify(heute, null, 1)); process.exit(0); }
  const alt = liesStempel(video);
  if (!alt) { console.log(`${video}: kein Motor-Stempel (älterer Render oder ohne produziere.mjs/teilrender.mjs gerendert).`); process.exit(1); }
  const d = unterschiede(alt, heute);
  console.log(d.length ? `Seit dem Render geändert: ${d.join(", ")} – Teil-Render nicht sicher, ganz rendern.` : "Motor seit dem Render unverändert – Teil-Render sicher.");
  process.exit(d.length ? 1 : 0);
}
