// Herkunft: eigen (V-Video), geschrieben 2026-11-07, ohne Vorlage.
// Schreibt den Zeitplan eines Motor-Videos als JSON (Shots mit Start/Ende, Überblendung, Blitz, Schnitte im Shot;
// Langform: Kapitel mit Art, Start/Ende und Shots).
// Aufruf: node engine/v01/qa/zeitplan.mjs <einstieg.tsx> <Composition> <ausgabe.json>
import fs from "node:fs";
import path from "node:path";
import { browserExecutable, buendel, concurrency, gl } from "./env.mjs";
const { selectComposition } = await import("@remotion/renderer");

const [entry, comp, out] = process.argv.slice(2);
if (!out) { console.log("Aufruf: node engine/v01/qa/zeitplan.mjs <einstieg> <Composition> <ausgabe.json>"); process.exit(1); }
const serveUrl = await buendel(entry);
const c = await selectComposition({ serveUrl, id: comp, browserExecutable, chromiumOptions: { gl } });
const z = c.defaultProps?.zeitplan ?? c.props?.zeitplan;
if (!z) { console.log("Composition hat keinen Zeitplan (kein Motor-Video?)"); process.exit(1); }
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ ...z, width: c.width, height: c.height }, null, 1) + "\n");
console.log(`Zeitplan: ${z.shots.length} Shots${z.kapitel?.length ? `, ${z.kapitel.length} Kapitel` : ""}, ${z.frames} Frames -> ${out}`);
