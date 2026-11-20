// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Local settings for the render scripts, without fixed personal paths.
// Order: real environment variable > `.env` (first one found from the current folder upwards) > default.
//   CHROME_PATH   browser for Remotion (default: usual Chrome install paths; none found = Remotion's own browser)
//   REMOTION_TMP  temp folder for Remotion bundles (default: <system temp>/remotion-tmp)
//   GL            WebGL backend for 3D (default: angle – measured fastest with vulkan; angle-egl is slower)
//   RENDER_CONCURRENCY  parallel browser tabs when rendering (default 4, measured best)
//   BUNDLE_URL    already built bundle (set by render/produziere.mjs so the tools do not bundle again)
//   PYTHON        Python command for helper scripts (default: first of python, py, python3 that starts)
//   TOOL_<NAME>_PATH  spezielles Tool eines Stils (nur freigegeben + in docs/lizenzpruefung.md benannt) → spezialTool("<NAME>")
// See `.env.example` in the project root.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const loadDotEnv = () => {
  for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
    const f = path.join(dir, ".env");
    if (fs.existsSync(f)) {
      for (const line of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
        if (m && !line.trim().startsWith("#") && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
      return f;
    }
    if (path.dirname(dir) === dir) return null;
  }
};
loadDotEnv();

const CHROME_CANDIDATES = [
  process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google/Chrome/Application/chrome.exe"),
  process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Google/Chrome/Application/chrome.exe"),
  process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google/Chrome/Application/chrome.exe"),
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);

const resolvePath = (p) => (p ? path.resolve(p) : p);

/** browser executable, or undefined (Remotion then uses its own headless browser) */
export const browserExecutable = resolvePath(process.env.CHROME_PATH) || CHROME_CANDIDATES.find((p) => fs.existsSync(p));
/** WebGL backend for three.js renders */
export const gl = process.env.GL || "angle";
/** temp folder for Remotion bundles; also set as TEMP/TMP for this process */
export const tmpDir = resolvePath(process.env.REMOTION_TMP) || path.join(os.tmpdir(), "remotion-tmp");
fs.mkdirSync(tmpDir, { recursive: true });
process.env.TEMP = process.env.TMP = tmpDir;

/** Python für Hilfsskripte: PYTHON aus der Umgebung/.env, sonst der echte Pfad (sys.executable) des ersten Befehls, der
 *  startet (python, py, python3) – direkt aufgerufen, weil Startprogramme unter Windows aus Node nicht gleich laufen. */
import { spawnSync as _probe } from "node:child_process";
const _exe = (c) => {
  const r = _probe(c, ["-c", "import sys; print(sys.executable)"], { encoding: "utf8" });
  const p = r.status === 0 ? r.stdout.trim() : "";
  return p && fs.existsSync(p) ? p : null;
};
export const python = process.env.PYTHON || ["python", "py", "python3"].map(_exe).find(Boolean) || "python";

/** Parallele Browser-Tabs beim Rendern: RENDER_CONCURRENCY aus der Umgebung/.env, sonst 4 (gemessen 2026-11-12 auf
 *  Core Ultra 7 258V + Arc 140V: 2 → 36 s, 4 → 31 s, 6 → 32 s, 8 → 33 s für 90 Bilder; der Grafikchip ist der Engpass). */
export const concurrency = Math.max(1, Math.min(os.cpus().length, Number(process.env.RENDER_CONCURRENCY) || 4));

/** Bündel des Einstiegs: das von produziere.mjs schon gebaute (BUNDLE_URL) wiederverwenden, sonst neu bündeln (~10 s). */
export const buendel = async (entry) => {
  if (process.env.BUNDLE_URL && fs.existsSync(process.env.BUNDLE_URL)) return process.env.BUNDLE_URL;
  const { bundle } = await import("@remotion/bundler");
  return bundle({ entryPoint: path.resolve(entry) });
};

/** Pfad eines speziellen Tools (Stil-Werkzeug ausserhalb des Projekts): nur über TOOL_<NAME>_PATH aus Umgebung/.env.
 *  Regel: nur gratis, lokal, ohne Konto, kommerziell erlaubt; vom Nutzer freigegeben, in docs/lizenzpruefung.md benannt
 *  und in .env.example eingetragen (prüft tools/lizenz/fremd_pruefung.py). Fehlt der Pfad, bricht der Aufruf mit Anleitung ab. */
export const spezialTool = (name) => {
  const key = `TOOL_${String(name).toUpperCase().replace(/[^A-Z0-9]/g, "_")}_PATH`;
  const p = process.env[key];
  if (!p || !fs.existsSync(p)) throw new Error(`Spezielles Tool "${name}" nicht eingebunden: ${key} in .env setzen (siehe .env.example und docs/lizenzpruefung.md)${p ? ` – Pfad fehlt: ${p}` : ""}`);
  return path.resolve(p);
};
