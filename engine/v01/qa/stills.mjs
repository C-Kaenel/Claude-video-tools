// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Testbilder einzelner Frames: node engine/v01/qa/stills.mjs <einstieg.tsx> <Composition> <ausgabe-prefix> <frame,frame,…> [massstab]
// Optional: PROPS='{"guides":true}' (Safe-Area-Linien), PROPS='{"post":{"ink":false}}' (Effekt aus), PROPS='{"punch":{...}}'
import path from "node:path";
import { browserExecutable, buendel, concurrency, gl } from "./env.mjs";
const { renderStill, selectComposition } = await import("@remotion/renderer");

const [entry, comp, prefix, frames, scale = "0.5"] = process.argv.slice(2);
if (!frames) { console.log("Aufruf: node engine/v01/qa/stills.mjs <einstieg> <Composition> <prefix> <frames> [massstab]"); process.exit(1); }
const inputProps = process.env.PROPS ? JSON.parse(process.env.PROPS) : {};
const chromiumOptions = { gl };
const serveUrl = await buendel(entry);
const composition = await selectComposition({ serveUrl, id: comp, inputProps, browserExecutable, chromiumOptions });
const log = (l) => { if (l.type === "error" || l.type === "warning") { const t = l.text.slice(0, 300); if (!t.includes("THREE.Clock")) console.log(`[${l.type}]`, t); } };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, inputProps, frame: f, output: `${prefix}${f}.png`, imageFormat: "png", scale: Number(scale),
    browserExecutable, chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog: log, logLevel: "error" });
  console.log("bild", f, ((Date.now() - t0) / 1000).toFixed(1) + " s");
}
